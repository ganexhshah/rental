import React, { useState, useMemo } from 'react'
import {
  Card,
  Row,
  Col,
  Space,
  Button,
  Tag,
  Typography,
  Tabs,
  Descriptions,
  Table,
  Image,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Empty,
  Spin,
  App,
  Tooltip,
  Divider,
  Alert,
  Steps,
  Dropdown,
} from 'antd'
import type { MenuProps } from 'antd'
import {
  CarOutlined,
  ArrowLeftOutlined,
  EditOutlined,
  PrinterOutlined,
  FileTextOutlined,
  DollarOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  UserOutlined,
  SafetyCertificateOutlined,
  FileDoneOutlined,
  AuditOutlined,
  PhoneOutlined,
  MailOutlined,
  PlusOutlined,
  SwapOutlined,
  DownOutlined,
  IdcardOutlined,
  WarningOutlined,
  BankOutlined,
  PictureOutlined,
} from '@ant-design/icons'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/navigation/PageHeader'
import { PageContainer } from '@/components/navigation/PageContainer'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { CurrencyDisplay } from '@/components/data-display/CurrencyDisplay'
import { formatDate, formatDateTime } from '@/lib/formatting/date'
import { bookingsApi } from '../api'
import { vehiclesApi } from '@/features/vehicles/api'
import { customersApi } from '@/features/customers/api'
import { paymentsApi } from '@/features/payments/api'
import {
  printBookingAgreement,
  printBookingInvoice,
  printHandoverSheet,
} from '@/features/bookings/utils/printTemplates'
import type { Booking, BookingStatus } from '@/types/booking'
import type { PaymentTransaction } from '@/types/payment'

const { Text, Title } = Typography
const { TextArea } = Input

export const BookingViewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { message } = App.useApp()
  const queryClient = useQueryClient()

  // Tab State
  const [activeTab, setActiveTab] = useState('overview')

  // Modals
  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelFee, setCancelFee] = useState<number>(0)

  const [noShowModalOpen, setNoShowModalOpen] = useState(false)
  const [noShowReason, setNoShowReason] = useState('')

  const [statusModalOpen, setStatusModalOpen] = useState(false)
  const [targetStatus, setTargetStatus] = useState<BookingStatus>('confirmed')
  const [statusReason, setStatusReason] = useState('')

  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [paymentForm] = Form.useForm()

  const [reassignModalOpen, setReassignModalOpen] = useState(false)
  const [reassignVehicleId, setReassignVehicleId] = useState<string>('')
  const [reassignReason, setReassignReason] = useState('')

  // 1. Fetch Main Booking
  const {
    data: booking,
    isLoading: isBookingLoading,
    refetch: refetchBooking,
  } = useQuery({
    queryKey: ['booking', id],
    queryFn: () => (id ? bookingsApi.getBooking(id) : null),
    enabled: Boolean(id),
  })

  // 2. Fetch Vehicle Details
  const { data: vehicle } = useQuery({
    queryKey: ['vehicle', booking?.vehicleId],
    queryFn: () => (booking?.vehicleId ? vehiclesApi.getVehicleById(booking.vehicleId) : null),
    enabled: Boolean(booking?.vehicleId),
  })

  // 3. Fetch Customer Details
  const { data: customer } = useQuery({
    queryKey: ['customer', booking?.customerId],
    queryFn: () => (booking?.customerId ? customersApi.getCustomerById(booking.customerId) : null),
    enabled: Boolean(booking?.customerId),
  })

  // 4. Fetch Checklists
  const { data: checklists = [], refetch: refetchChecklists } = useQuery({
    queryKey: ['booking-checklists', id],
    queryFn: () => (id ? bookingsApi.getChecklists(id) : []),
    enabled: Boolean(id),
  })

  // 5. Fetch Status History
  const { data: statusHistory = [], refetch: refetchHistory } = useQuery({
    queryKey: ['booking-history', id],
    queryFn: () => (id ? bookingsApi.getStatusHistory(id) : []),
    enabled: Boolean(id),
  })

  // 6. Fetch Payment Transactions for this booking
  const { data: allTransactions = [], refetch: refetchPayments } = useQuery({
    queryKey: ['payments-for-booking', id],
    queryFn: () => paymentsApi.getTransactions(),
    enabled: Boolean(id),
  })

  // Filter transactions for this booking
  const bookingTransactions = useMemo(() => {
    if (!booking) return []
    return allTransactions.filter(
      (tx) =>
        tx.bookingId === booking.id ||
        (booking.bookingCode && tx.bookingId === booking.bookingCode)
    )
  }, [allTransactions, booking])

  // 7. Fetch Available Vehicles for Reassignment Modal
  const { data: fleetVehicles = [] } = useQuery({
    queryKey: ['available-vehicles-for-reassign'],
    queryFn: () => vehiclesApi.getVehicles({ status: 'available' }),
    enabled: reassignModalOpen,
  })

  // Mutations
  const confirmMutation = useMutation({
    mutationFn: () => bookingsApi.confirmBooking(id!),
    onSuccess: () => {
      message.success('Booking reservation confirmed!')
      queryClient.invalidateQueries({ queryKey: ['booking', id] })
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      refetchHistory()
    },
    onError: (err: any) => message.error(err?.message || 'Failed to confirm booking'),
  })

  const cancelMutation = useMutation({
    mutationFn: () => bookingsApi.cancelBooking(id!, cancelReason, cancelFee),
    onSuccess: () => {
      message.success('Booking has been cancelled.')
      setCancelModalOpen(false)
      setCancelReason('')
      setCancelFee(0)
      queryClient.invalidateQueries({ queryKey: ['booking', id] })
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      refetchHistory()
    },
    onError: (err: any) => message.error(err?.message || 'Failed to cancel booking'),
  })

  const noShowMutation = useMutation({
    mutationFn: () => bookingsApi.noShowBooking(id!, noShowReason),
    onSuccess: () => {
      message.success('Booking marked as No-Show.')
      setNoShowModalOpen(false)
      setNoShowReason('')
      queryClient.invalidateQueries({ queryKey: ['booking', id] })
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      refetchHistory()
    },
    onError: (err: any) => message.error(err?.message || 'Failed to mark no-show'),
  })

  const changeStatusMutation = useMutation({
    mutationFn: () => bookingsApi.changeStatus(id!, targetStatus, statusReason),
    onSuccess: () => {
      message.success(`Status updated to ${targetStatus}`)
      setStatusModalOpen(false)
      setStatusReason('')
      queryClient.invalidateQueries({ queryKey: ['booking', id] })
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      refetchHistory()
    },
    onError: (err: any) => message.error(err?.message || 'Failed to update status'),
  })

  const reassignMutation = useMutation({
    mutationFn: () => bookingsApi.assignVehicle(id!, reassignVehicleId, reassignReason),
    onSuccess: () => {
      message.success('Vehicle successfully reassigned!')
      setReassignModalOpen(false)
      setReassignVehicleId('')
      setReassignReason('')
      queryClient.invalidateQueries({ queryKey: ['booking', id] })
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      refetchHistory()
    },
    onError: (err: any) => message.error(err?.message || 'Failed to reassign vehicle'),
  })

  const recordPaymentMutation = useMutation({
    mutationFn: async (values: any) => {
      if (!booking) return
      await paymentsApi.recordPayment({
        bookingId: booking.id,
        customerId: booking.customerId,
        amount: values.amount,
        currency: 'NPR',
        category: values.category || 'rental',
        method: values.method || 'cash',
        gateway: values.gateway || 'In-Person Desk',
        status: 'completed',
        notes: values.notes,
      })

      // Update booking paid and balance amounts
      const newPaid = (booking.paidAmount || 0) + Number(values.amount)
      const newBalance = Math.max(0, (booking.totalAmount || 0) - newPaid)
      const newPaymentStatus =
        newBalance <= 0 ? 'paid' : newPaid > 0 ? 'partially_paid' : 'unpaid'

      await bookingsApi.updateBooking(booking.id, {
        paid_amount: newPaid,
        balance_due: newBalance,
        payment_status: newPaymentStatus,
      })
    },
    onSuccess: () => {
      message.success('Payment recorded successfully!')
      setPaymentModalOpen(false)
      paymentForm.resetFields()
      refetchBooking()
      refetchPayments()
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
    },
    onError: (err: any) => message.error(err?.message || 'Failed to record payment'),
  })

  // Print Handlers
  const handlePrintAgreement = () => {
    if (!booking) return
    const collateralData = (booking as any).collateral
    printBookingAgreement(booking, vehicle, customer, collateralData)
  }

  const handlePrintInvoice = () => {
    if (!booking) return
    printBookingInvoice(booking, vehicle, customer)
  }

  const handlePrintHandover = () => {
    if (!booking) return
    printHandoverSheet(booking, vehicle, customer)
  }

  // Print Dropdown Menu
  const printMenuItems: MenuProps['items'] = [
    {
      key: 'agreement',
      icon: <FileTextOutlined />,
      label: 'Print Rental Agreement',
      onClick: handlePrintAgreement,
    },
    {
      key: 'invoice',
      icon: <DollarOutlined />,
      label: 'Print Tax Invoice',
      onClick: handlePrintInvoice,
    },
    {
      key: 'handover',
      icon: <FileDoneOutlined />,
      label: 'Print Handover Sheet',
      onClick: handlePrintHandover,
    },
  ]

  if (isBookingLoading) {
    return (
      <PageContainer>
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
          <Spin size="large" tip="Loading booking details..." />
        </div>
      </PageContainer>
    )
  }

  if (!booking) {
    return (
      <PageContainer>
        <Card style={{ textAlign: 'center', padding: '60px 0' }}>
          <Empty
            description="Booking not found or has been removed."
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button type="primary" onClick={() => navigate('/operations/bookings')}>
              Back to Bookings
            </Button>
          </Empty>
        </Card>
      </PageContainer>
    )
  }

  const snapshot = booking.pricingSnapshot
  const pickupChecklist = checklists.find((c) => c.checklist_type === 'pickup')
  const returnChecklist = checklists.find((c) => c.checklist_type === 'return')
  const collateral = (booking as any).collateral || {}

  // Lifecycle Steps
  const getStepCurrent = (status: BookingStatus) => {
    switch (status) {
      case 'pending':
      case 'pending_confirmation':
      case 'pending_payment':
      case 'pending_verification':
      case 'quote':
        return 0
      case 'confirmed':
      case 'pickup_scheduled':
        return 1
      case 'pickup_in_progress':
      case 'active':
        return 2
      case 'return_in_progress':
      case 'completed':
        return 3
      case 'cancelled':
      case 'no_show':
      case 'rejected':
        return 1
      default:
        return 0
    }
  }

  const isTerminal = ['cancelled', 'no_show', 'rejected'].includes(booking.status)

  return (
    <PageContainer>
      {/* Top Header */}
      <PageHeader
        title={
          <Space align="center" size="middle" wrap>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/operations/bookings')}
            />
            <Title level={4} style={{ margin: 0 }}>
              Booking #{booking.bookingCode}
            </Title>
            <StatusBadge status={booking.status} />
            <Tag
              color={
                booking.paymentStatus === 'paid'
                  ? 'success'
                  : booking.paymentStatus === 'partially_paid'
                  ? 'warning'
                  : 'error'
              }
              style={{ fontWeight: 600, textTransform: 'uppercase' }}
            >
              {booking.paymentStatus?.replace('_', ' ')}
            </Tag>
            {booking.source && (
              <Tag style={{ textTransform: 'capitalize' }}>
                Channel: {booking.source}
              </Tag>
            )}
          </Space>
        }
        extra={
          <Space wrap size="small">
            {/* Direct Print Menu */}
            <Dropdown menu={{ items: printMenuItems }} placement="bottomRight">
              <Button icon={<PrinterOutlined />}>
                Print Documents <DownOutlined />
              </Button>
            </Dropdown>

            {/* Workflow Quick Actions */}
            {['pending', 'pending_confirmation'].includes(booking.status) && (
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                loading={confirmMutation.isPending}
                onClick={() => confirmMutation.mutate()}
              >
                Confirm Reservation
              </Button>
            )}

            {['confirmed', 'pickup_scheduled'].includes(booking.status) && (
              <Button
                type="primary"
                icon={<CarOutlined />}
                style={{ backgroundColor: '#2563eb' }}
                onClick={() => navigate('/operations/pickup-return')}
              >
                Dispatch Handover
              </Button>
            )}

            {booking.status === 'active' && (
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                style={{ backgroundColor: '#16a34a' }}
                onClick={() => navigate('/operations/pickup-return')}
              >
                Process Return Check-In
              </Button>
            )}

            {/* Record Payment Button */}
            <Button
              icon={<DollarOutlined />}
              onClick={() => {
                paymentForm.setFieldsValue({
                  amount: booking.balanceDue > 0 ? booking.balanceDue : undefined,
                  category: booking.balanceDue > 0 ? 'rental' : 'deposit',
                  method: 'cash',
                })
                setPaymentModalOpen(true)
              }}
            >
              + Record Payment
            </Button>

            {/* Reassign Vehicle */}
            {!['completed', 'cancelled', 'no_show'].includes(booking.status) && (
              <Button
                icon={<SwapOutlined />}
                onClick={() => setReassignModalOpen(true)}
              >
                Swap Vehicle
              </Button>
            )}

            {/* Status Change / More */}
            <Button
              icon={<EditOutlined />}
              onClick={() => {
                setTargetStatus(booking.status)
                setStatusModalOpen(true)
              }}
            >
              Change Status
            </Button>

            {!['completed', 'cancelled', 'no_show'].includes(booking.status) && (
              <Button danger onClick={() => setCancelModalOpen(true)}>
                Cancel Booking
              </Button>
            )}
          </Space>
        }
      />

      {/* Terminal Status Alert */}
      {booking.status === 'cancelled' && (
        <Alert
          type="error"
          showIcon
          title="This booking is cancelled"
          description={`Reason: ${booking.cancellationReason || 'Not specified'}${
            booking.cancellationFee ? ` • Cancellation Fee Applied: Rs. ${booking.cancellationFee}` : ''
          }`}
          style={{ marginBottom: 16 }}
        />
      )}

      {booking.status === 'no_show' && (
        <Alert
          type="warning"
          showIcon
          title="Customer marked as No-Show"
          description={booking.cancellationReason || 'Customer did not arrive at scheduled pickup time.'}
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Quick Status Stepper */}
      <Card size="small" style={{ marginBottom: 16, borderRadius: 8 }}>
        <Steps
          size="small"
          current={getStepCurrent(booking.status)}
          status={isTerminal ? 'error' : undefined}
          items={[
            {
              title: 'Reservation Placed',
              description: formatDateTime(booking.createdAt),
            },
            {
              title: 'Confirmed',
              description:
                ['confirmed', 'pickup_scheduled', 'active', 'completed'].includes(booking.status)
                  ? 'Ready for pickup'
                  : isTerminal
                  ? 'Aborted'
                  : 'Pending confirmation',
            },
            {
              title: 'Dispatched / Active',
              description:
                booking.actualPickupAt
                  ? formatDateTime(booking.actualPickupAt)
                  : booking.status === 'active'
                  ? 'Vehicle on road'
                  : 'Awaiting handover',
            },
            {
              title: 'Returned & Completed',
              description:
                booking.actualReturnAt || booking.completedAt
                  ? formatDateTime(booking.actualReturnAt || booking.completedAt)
                  : 'Pending return',
            },
          ]}
        />
      </Card>

      {/* KPI Key Details Strip */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {/* Schedule */}
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" style={{ height: '100%', borderRadius: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <CalendarOutlined style={{ color: '#2563eb', fontSize: 18 }} />
              <Text strong style={{ fontSize: 13, textTransform: 'uppercase', color: '#64748b' }}>
                Rental Duration
              </Text>
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
              {booking.totalDays} Day{booking.totalDays > 1 ? 's' : ''}
            </div>
            <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>
              <strong>From:</strong> {formatDateTime(booking.startDate)}
            </div>
            <div style={{ fontSize: 12, color: '#475569' }}>
              <strong>To:</strong> {formatDateTime(booking.endDate)}
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>
              <EnvironmentOutlined /> {booking.pickupLocationName || 'Kathmandu HQ'}
            </div>
          </Card>
        </Col>

        {/* Assigned Vehicle */}
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" style={{ height: '100%', borderRadius: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CarOutlined style={{ color: '#059669', fontSize: 18 }} />
                <Text strong style={{ fontSize: 13, textTransform: 'uppercase', color: '#64748b' }}>
                  Assigned Vehicle
                </Text>
              </div>
              {booking.vehicleId && (
                <Link to={`/vehicles/${booking.vehicleId}`} style={{ fontSize: 11 }}>
                  View Vehicle &rarr;
                </Link>
              )}
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
              {booking.vehicleModel}
            </div>
            <div style={{ marginTop: 4 }}>
              <Tag color="blue" style={{ fontWeight: 600, fontSize: 12 }}>
                {booking.vehiclePlate}
              </Tag>
              {booking.categoryName && (
                <Tag style={{ fontSize: 11 }}>{booking.categoryName}</Tag>
              )}
            </div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>
              Odometer: {vehicle?.specs?.mileageOdometer ? `${vehicle.specs.mileageOdometer.toLocaleString()} km` : 'Standard'}
            </div>
          </Card>
        </Col>

        {/* Customer & Driver */}
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" style={{ height: '100%', borderRadius: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <UserOutlined style={{ color: '#d97706', fontSize: 18 }} />
                <Text strong style={{ fontSize: 13, textTransform: 'uppercase', color: '#64748b' }}>
                  Renter Profile
                </Text>
              </div>
              {booking.customerId && (
                <Link to={`/customers/${booking.customerId}`} style={{ fontSize: 11 }}>
                  View Profile &rarr;
                </Link>
              )}
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
              {booking.customerName}
            </div>
            <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>
              <PhoneOutlined /> {booking.customerPhone || 'No phone'}
            </div>
            <div style={{ fontSize: 12, color: '#475569' }}>
              <MailOutlined /> {booking.customerEmail || 'No email'}
            </div>
            <div style={{ marginTop: 4 }}>
              <Tag
                color={booking.customerKycStatus === 'verified' ? 'green' : 'orange'}
                style={{ fontSize: 10 }}
              >
                KYC {(booking.customerKycStatus || 'PENDING').toUpperCase()}
              </Tag>
            </div>
          </Card>
        </Col>

        {/* Financial Overview */}
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" style={{ height: '100%', borderRadius: 8, backgroundColor: '#fafafa' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <DollarOutlined style={{ color: '#7c3aed', fontSize: 18 }} />
              <Text strong style={{ fontSize: 13, textTransform: 'uppercase', color: '#64748b' }}>
                Billing &amp; Settlement
              </Text>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
              <span>Total Payable:</span>
              <strong><CurrencyDisplay amount={booking.totalAmount} /></strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
              <span>Paid to Date:</span>
              <span style={{ color: '#16a34a', fontWeight: 600 }}>
                <CurrencyDisplay amount={booking.paidAmount} />
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, paddingTop: 4, borderTop: '1px dashed #cbd5e1' }}>
              <span>Balance Due:</span>
              <span style={{ color: booking.balanceDue > 0 ? '#dc2626' : '#16a34a', fontWeight: 700 }}>
                <CurrencyDisplay amount={booking.balanceDue} />
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b', marginTop: 4 }}>
              <span>Security Deposit:</span>
              <span><CurrencyDisplay amount={booking.depositAmount} /></span>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Main Tabs Container */}
      <Card style={{ borderRadius: 8 }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            // Tab 1: Overview
            {
              key: 'overview',
              label: (
                <span>
                  <FileTextOutlined /> Overview &amp; Specifications
                </span>
              ),
              children: (
                <div>
                  <Row gutter={[24, 24]}>
                    <Col xs={24} lg={14}>
                      <Card title="Reservation Particulars" size="small" style={{ marginBottom: 16 }}>
                        <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}>
                          <Descriptions.Item label="Booking Reference">
                            <Text strong copyable>{booking.bookingCode}</Text>
                          </Descriptions.Item>
                          <Descriptions.Item label="Booking ID">
                            <Text code>{booking.id}</Text>
                          </Descriptions.Item>
                          <Descriptions.Item label="Created At">
                            {formatDateTime(booking.createdAt)}
                          </Descriptions.Item>
                          <Descriptions.Item label="Booking Channel">
                            {booking.source || 'Desk Walk-in'}
                          </Descriptions.Item>
                          <Descriptions.Item label="Pickup Station">
                            {booking.pickupLocationName || 'Kathmandu Central'}
                          </Descriptions.Item>
                          <Descriptions.Item label="Return Station">
                            {booking.returnLocationName || 'Kathmandu Central'}
                          </Descriptions.Item>
                          <Descriptions.Item label="Scheduled Pickup">
                            {formatDateTime(booking.startDate)}
                          </Descriptions.Item>
                          <Descriptions.Item label="Scheduled Return">
                            {formatDateTime(booking.endDate)}
                          </Descriptions.Item>
                          <Descriptions.Item label="Actual Handover">
                            {booking.actualPickupAt ? formatDateTime(booking.actualPickupAt) : '—'}
                          </Descriptions.Item>
                          <Descriptions.Item label="Actual Check-In">
                            {booking.actualReturnAt ? formatDateTime(booking.actualReturnAt) : '—'}
                          </Descriptions.Item>
                          <Descriptions.Item label="Digital Contract">
                            {booking.contractSigned ? (
                              <Tag color="green">Executed &amp; Signed</Tag>
                            ) : (
                              <Tag color="orange">Pending Signature</Tag>
                            )}
                          </Descriptions.Item>
                          <Descriptions.Item label="Security Deposit Status">
                            <Tag color={booking.depositAmount > 0 ? 'green' : 'default'}>
                              {booking.depositStatus?.toUpperCase() || 'HELD'}
                            </Tag>
                          </Descriptions.Item>
                        </Descriptions>
                      </Card>

                      {booking.notes && (
                        <Card title="Operational Notes &amp; Special Instructions" size="small">
                          <p style={{ margin: 0, whiteSpace: 'pre-line' }}>{booking.notes}</p>
                        </Card>
                      )}
                    </Col>

                    <Col xs={24} lg={10}>
                      {/* Vehicle Snapshot Card */}
                      <Card
                        title="Allocated Vehicle Asset"
                        size="small"
                        extra={
                          booking.vehicleId ? (
                            <Link to={`/vehicles/${booking.vehicleId}`}>Full Fleet Record &rarr;</Link>
                          ) : null
                        }
                        style={{ marginBottom: 16 }}
                      >
                        <Descriptions bordered size="small" column={1}>
                          <Descriptions.Item label="Vehicle">
                            <strong>{booking.vehicleModel}</strong>
                          </Descriptions.Item>
                          <Descriptions.Item label="License Plate">
                            <Tag color="blue">{booking.vehiclePlate}</Tag>
                          </Descriptions.Item>
                          <Descriptions.Item label="Type / Category">
                            {vehicle?.type || booking.vehicleType} • {vehicle?.categoryName || booking.categoryName || 'Standard'}
                          </Descriptions.Item>
                          <Descriptions.Item label="Fuel &amp; Transmission">
                            {vehicle?.specs?.fuelType || 'Petrol'} • {vehicle?.specs?.transmission || 'Manual'}
                          </Descriptions.Item>
                          <Descriptions.Item label="Handover Odometer">
                            {booking.pickupOdometer ? `${booking.pickupOdometer.toLocaleString()} km` : vehicle?.specs?.mileageOdometer ? `${vehicle.specs.mileageOdometer.toLocaleString()} km` : '—'}
                          </Descriptions.Item>
                          <Descriptions.Item label="Handover Fuel Level">
                            {booking.pickupFuel || '100% Full'}
                          </Descriptions.Item>
                        </Descriptions>
                      </Card>

                      {/* Driver & Customer Card */}
                      <Card
                        title="Authorized Operator"
                        size="small"
                        extra={
                          booking.customerId ? (
                            <Link to={`/customers/${booking.customerId}`}>Full Profile &rarr;</Link>
                          ) : null
                        }
                      >
                        <Descriptions bordered size="small" column={1}>
                          <Descriptions.Item label="Full Name">
                            <strong>{booking.customerName}</strong>
                          </Descriptions.Item>
                          <Descriptions.Item label="Contact">
                            {booking.customerPhone} • {booking.customerEmail}
                          </Descriptions.Item>
                          <Descriptions.Item label="KYC Verification">
                            <Tag color={booking.customerKycStatus === 'verified' ? 'green' : 'orange'}>
                              KYC {(booking.customerKycStatus || 'PENDING').toUpperCase()}
                            </Tag>
                          </Descriptions.Item>
                          <Descriptions.Item label="Driver License No.">
                            {customer?.licenseNumber || booking.driverLicense || 'Verified at Counter'}
                          </Descriptions.Item>
                          {customer?.emergencyContactName && (
                            <Descriptions.Item label="Emergency Contact">
                              {customer.emergencyContactName} ({customer.emergencyContactPhone || '—'})
                            </Descriptions.Item>
                          )}
                        </Descriptions>
                      </Card>
                    </Col>
                  </Row>
                </div>
              ),
            },

            // Tab 2: Financials & Payments
            {
              key: 'financials',
              label: (
                <span>
                  <DollarOutlined /> Financial Schedule &amp; Payments ({bookingTransactions.length})
                </span>
              ),
              children: (
                <div>
                  <Row gutter={[24, 24]}>
                    <Col xs={24} lg={12}>
                      <Card title="Rental Pricing Schedule" size="small" style={{ marginBottom: 16 }}>
                        <Descriptions bordered size="small" column={2}>
                          <Descriptions.Item label="Billed Duration">
                            {snapshot?.rental_days || booking.totalDays} Day(s)
                          </Descriptions.Item>
                          <Descriptions.Item label="Agreed Daily Rate">
                            <CurrencyDisplay amount={snapshot?.base_rental_rate || booking.dailyRate} />
                          </Descriptions.Item>
                          <Descriptions.Item label="Base Rental Subtotal">
                            <CurrencyDisplay amount={snapshot?.rental_amount || booking.rentalAmount} />
                          </Descriptions.Item>
                          <Descriptions.Item label="Comprehensive Insurance">
                            <CurrencyDisplay amount={snapshot?.insurance_amount || booking.insuranceAmount} />
                          </Descriptions.Item>
                          <Descriptions.Item label="Logistics / Add-ons">
                            <CurrencyDisplay amount={snapshot?.extra_charges || booking.extraCharges} />
                          </Descriptions.Item>
                          <Descriptions.Item label="Coupon Discount">
                            <CurrencyDisplay amount={snapshot?.discount_amount || booking.discountAmount} />
                          </Descriptions.Item>
                          <Descriptions.Item label="Taxable Net">
                            <CurrencyDisplay amount={snapshot?.taxable_base || (booking.totalAmount - booking.taxAmount)} />
                          </Descriptions.Item>
                          <Descriptions.Item label="Nepal VAT (13%)">
                            <CurrencyDisplay amount={snapshot?.tax_amount || booking.taxAmount} />
                          </Descriptions.Item>
                          <Descriptions.Item label="Total Rental Amount" span={2}>
                            <strong style={{ fontSize: 16, color: '#0f172a' }}>
                              <CurrencyDisplay amount={snapshot?.total_amount || booking.totalAmount} strong />
                            </strong>
                          </Descriptions.Item>
                          <Descriptions.Item label="Total Paid Settlement">
                            <span style={{ color: '#16a34a', fontWeight: 600 }}>
                              <CurrencyDisplay amount={booking.paidAmount} />
                            </span>
                          </Descriptions.Item>
                          <Descriptions.Item label="Balance Outstanding">
                            <span style={{ color: booking.balanceDue > 0 ? '#dc2626' : '#16a34a', fontWeight: 700 }}>
                              <CurrencyDisplay amount={booking.balanceDue} />
                            </span>
                          </Descriptions.Item>
                        </Descriptions>

                        {/* Extra Items Table */}
                        {booking.extras && booking.extras.length > 0 && (
                          <div style={{ marginTop: 16 }}>
                            <Text strong>Included Add-on Options:</Text>
                            <Table
                              size="small"
                              pagination={false}
                              dataSource={booking.extras}
                              rowKey="name"
                              style={{ marginTop: 6 }}
                              columns={[
                                { title: 'Item', dataIndex: 'name' },
                                { title: 'Quantity', dataIndex: 'quantity', render: (q) => q || 1 },
                                {
                                  title: 'Price',
                                  dataIndex: 'price',
                                  render: (p) => <CurrencyDisplay amount={p} />,
                                },
                              ]}
                            />
                          </div>
                        )}
                      </Card>
                    </Col>

                    <Col xs={24} lg={12}>
                      <Card
                        title="Payment Receipts &amp; Ledger"
                        size="small"
                        extra={
                          <Button
                            type="primary"
                            size="small"
                            icon={<PlusOutlined />}
                            onClick={() => {
                              paymentForm.setFieldsValue({
                                amount: booking.balanceDue > 0 ? booking.balanceDue : undefined,
                                category: 'rental',
                                method: 'cash',
                              })
                              setPaymentModalOpen(true)
                            }}
                          >
                            Record Payment
                          </Button>
                        }
                      >
                        {bookingTransactions.length === 0 ? (
                          <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description="No explicit payment transactions recorded in this ledger yet."
                          >
                            <Button
                              type="dashed"
                              icon={<DollarOutlined />}
                              onClick={() => setPaymentModalOpen(true)}
                            >
                              Add First Payment
                            </Button>
                          </Empty>
                        ) : (
                          <Table
                            size="small"
                            pagination={false}
                            dataSource={bookingTransactions}
                            rowKey="id"
                            columns={[
                              {
                                title: 'Date',
                                dataIndex: 'timestamp',
                                render: (t) => formatDateTime(t),
                              },
                              {
                                title: 'Category',
                                dataIndex: 'category',
                                render: (c) => <Tag>{c?.toUpperCase()}</Tag>,
                              },
                              {
                                title: 'Method',
                                dataIndex: 'method',
                                render: (m) => <Tag color="blue">{m?.toUpperCase()}</Tag>,
                              },
                              {
                                title: 'Amount',
                                dataIndex: 'amount',
                                render: (amt) => (
                                  <strong style={{ color: '#16a34a' }}>
                                    <CurrencyDisplay amount={amt} />
                                  </strong>
                                ),
                              },
                              {
                                title: 'Status',
                                dataIndex: 'status',
                                render: (s) => (
                                  <Tag color={s === 'completed' ? 'green' : 'orange'}>
                                    {s}
                                  </Tag>
                                ),
                              },
                            ]}
                          />
                        )}
                      </Card>

                      {/* Security Deposit Ledger Card */}
                      <Card title="Security Deposit Ledger" size="small" style={{ marginTop: 16 }}>
                        <Descriptions bordered size="small" column={2}>
                          <Descriptions.Item label="Required Deposit">
                            <strong><CurrencyDisplay amount={booking.depositAmount} /></strong>
                          </Descriptions.Item>
                          <Descriptions.Item label="Deposit Status">
                            <Tag color={booking.depositAmount > 0 ? 'green' : 'default'}>
                              {booking.depositStatus?.toUpperCase() || 'HELD'}
                            </Tag>
                          </Descriptions.Item>
                          <Descriptions.Item label="Collateral Form" span={2}>
                            {collateral.collateralType === 'bank_cheque'
                              ? `Bank Cheque (${collateral.chequeBankName || 'Nabil Bank Ltd.'})`
                              : collateral.collateralType === 'original_document'
                              ? `Document Held (${collateral.originalDocType || 'Passport'})`
                              : collateral.collateralType === 'cash_card'
                              ? 'Refundable Cash / Card Hold'
                              : 'Standard Deposit'}
                          </Descriptions.Item>
                        </Descriptions>
                      </Card>
                    </Col>
                  </Row>
                </div>
              ),
            },

            // Tab 3: Handover & Inspection Checklists
            {
              key: 'inspections',
              label: (
                <span>
                  <CheckCircleOutlined /> Handover Checklists ({checklists.length})
                </span>
              ),
              children: (
                <div>
                  <Row gutter={[24, 24]}>
                    <Col xs={24} md={12}>
                      <Card
                        title="Dispatch / Pickup Inspection"
                        size="small"
                        extra={
                          pickupChecklist ? (
                            <Tag color="green">Completed</Tag>
                          ) : (
                            <Tag color="orange">Pending Handover</Tag>
                          )
                        }
                      >
                        {pickupChecklist ? (
                          <Descriptions bordered size="small" column={1}>
                            <Descriptions.Item label="Odometer Out">
                              <strong>{pickupChecklist.odometer?.toLocaleString()} km</strong>
                            </Descriptions.Item>
                            <Descriptions.Item label="Fuel / Battery Level">
                              {pickupChecklist.fuel_level}
                            </Descriptions.Item>
                            <Descriptions.Item label="Exterior Condition">
                              {pickupChecklist.exterior_condition || 'Clean, No Dent'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Interior Condition">
                              {pickupChecklist.interior_condition || 'Clean'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Inspection Timestamp">
                              {formatDateTime(pickupChecklist.created_at)}
                            </Descriptions.Item>
                            <Descriptions.Item label="Customer Signature">
                              {pickupChecklist.customer_signature ? (
                                <Tag color="green">Digital Signature Captured</Tag>
                              ) : (
                                'Signed on Print Agreement'
                              )}
                            </Descriptions.Item>
                          </Descriptions>
                        ) : (
                          <div style={{ textAlign: 'center', padding: '24px 0', color: '#64748b' }}>
                            <CarOutlined style={{ fontSize: 32, color: '#cbd5e1', marginBottom: 8 }} />
                            <div>Pickup inspection has not been completed yet.</div>
                            <Button
                              type="primary"
                              size="small"
                              style={{ marginTop: 12 }}
                              onClick={() => navigate('/operations/pickup-return')}
                            >
                              Start Handover Checklist
                            </Button>
                          </div>
                        )}
                      </Card>
                    </Col>

                    <Col xs={24} md={12}>
                      <Card
                        title="Return / Check-In Inspection"
                        size="small"
                        extra={
                          returnChecklist ? (
                            <Tag color="green">Checked In</Tag>
                          ) : (
                            <Tag color="default">Pending Return</Tag>
                          )
                        }
                      >
                        {returnChecklist ? (
                          <Descriptions bordered size="small" column={1}>
                            <Descriptions.Item label="Odometer In">
                              <strong>{returnChecklist.odometer?.toLocaleString()} km</strong>
                            </Descriptions.Item>
                            <Descriptions.Item label="Fuel / Battery Level">
                              {returnChecklist.fuel_level}
                            </Descriptions.Item>
                            <Descriptions.Item label="Exterior Condition">
                              {returnChecklist.exterior_condition || 'Satisfactory'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Interior Condition">
                              {returnChecklist.interior_condition || 'Satisfactory'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Check-In Timestamp">
                              {formatDateTime(returnChecklist.created_at)}
                            </Descriptions.Item>
                            <Descriptions.Item label="Customer Signature">
                              {returnChecklist.customer_signature ? (
                                <Tag color="green">Digital Signature Captured</Tag>
                              ) : (
                                'Signed at Desk'
                              )}
                            </Descriptions.Item>
                          </Descriptions>
                        ) : (
                          <div style={{ textAlign: 'center', padding: '24px 0', color: '#64748b' }}>
                            <CheckCircleOutlined style={{ fontSize: 32, color: '#cbd5e1', marginBottom: 8 }} />
                            <div>Vehicle has not completed return check-in yet.</div>
                            {booking.status === 'active' && (
                              <Button
                                type="primary"
                                size="small"
                                style={{ marginTop: 12, backgroundColor: '#16a34a' }}
                                onClick={() => navigate('/operations/pickup-return')}
                              >
                                Process Check-In Checklist
                              </Button>
                            )}
                          </div>
                        )}
                      </Card>
                    </Col>
                  </Row>
                </div>
              ),
            },

            // Tab 4: Collateral & Security Guarantee
            {
              key: 'collateral',
              label: (
                <span>
                  <BankOutlined /> Collateral &amp; Guarantee
                </span>
              ),
              children: (
                <div>
                  <Row gutter={[24, 24]}>
                    <Col xs={24} md={12}>
                      <Card title="Collateral Security Structure" size="small">
                        <Descriptions bordered size="small" column={1}>
                          <Descriptions.Item label="Guarantee Method">
                            <Tag color="purple" style={{ fontWeight: 600 }}>
                              {collateral.collateralType === 'bank_cheque'
                                ? 'BANK CHEQUE GUARANTEE'
                                : collateral.collateralType === 'original_document'
                                ? 'ORIGINAL DOCUMENT VAULT'
                                : collateral.collateralType === 'cash_card'
                                ? 'CASH / DIGITAL ESCROW'
                                : collateral.collateralType === 'guarantor_only'
                                ? 'GUARANTOR GUARANTEE ONLY'
                                : 'CORPORATE / WAIVED'}
                            </Tag>
                          </Descriptions.Item>
                          <Descriptions.Item label="Deposit Amount">
                            <strong><CurrencyDisplay amount={collateral.depositAmount ?? booking.depositAmount} /></strong>
                          </Descriptions.Item>

                          {collateral.collateralType === 'bank_cheque' && (
                            <>
                              <Descriptions.Item label="Bank Name">
                                {collateral.chequeBankName || 'Nabil Bank Ltd.'}
                              </Descriptions.Item>
                              <Descriptions.Item label="Cheque Number">
                                <Text code>{collateral.chequeNumber || 'On Record'}</Text>
                              </Descriptions.Item>
                              <Descriptions.Item label="Cheque Nature">
                                {collateral.isBlankCheque !== false ? (
                                  <Tag color="cyan">Blank Cheque (Security Collateral)</Tag>
                                ) : (
                                  `Fixed Value (Rs. ${collateral.chequeAmount?.toLocaleString() || booking.depositAmount})`
                                )}
                              </Descriptions.Item>
                              <Descriptions.Item label="Account Holder">
                                {collateral.chequeAccountHolder || booking.customerName}
                              </Descriptions.Item>
                            </>
                          )}

                          {collateral.collateralType === 'original_document' && (
                            <>
                              <Descriptions.Item label="Document Type">
                                {collateral.originalDocType || 'Original Passport'}
                              </Descriptions.Item>
                              <Descriptions.Item label="Document / ID No.">
                                <Text code>{collateral.originalDocNumber || '—'}</Text>
                              </Descriptions.Item>
                              <Descriptions.Item label="Vault / Safe Reference">
                                {collateral.lockerReference || 'Main Safe Locker #1'}
                              </Descriptions.Item>
                            </>
                          )}
                        </Descriptions>
                      </Card>
                    </Col>

                    <Col xs={24} md={12}>
                      <Card title="Guarantor &amp; Emergency Verification" size="small">
                        {collateral.hasGuarantor && collateral.guarantorName ? (
                          <Descriptions bordered size="small" column={1}>
                            <Descriptions.Item label="Guarantor Name">
                              <strong>{collateral.guarantorName}</strong>
                            </Descriptions.Item>
                            <Descriptions.Item label="Relationship">
                              {collateral.guarantorRelationship || 'Relative'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Phone Number">
                              {collateral.guarantorPhone || '—'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Citizenship / ID No.">
                              <Text code>{collateral.guarantorIdNumber || '—'}</Text>
                            </Descriptions.Item>
                            <Descriptions.Item label="Permanent Address">
                              {collateral.guarantorAddress || '—'}
                            </Descriptions.Item>
                          </Descriptions>
                        ) : (
                          <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description="No third-party guarantor attached. Verified under direct customer KYC."
                          />
                        )}
                      </Card>
                    </Col>
                  </Row>
                </div>
              ),
            },

            // Tab 5: Audit History & Status Log
            {
              key: 'history',
              label: (
                <span>
                  <AuditOutlined /> Audit &amp; Status Logs ({statusHistory.length})
                </span>
              ),
              children: (
                <div>
                  {statusHistory.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                      <ClockCircleOutlined style={{ fontSize: 32, color: '#cbd5e1', marginBottom: 8 }} />
                      <div>No status changes recorded yet for this booking.</div>
                    </div>
                  ) : (
                    <Table
                      size="small"
                      dataSource={statusHistory}
                      rowKey="id"
                      columns={[
                        {
                          title: 'Date & Time',
                          dataIndex: 'created_at',
                          render: (t) => formatDateTime(t),
                          width: 200,
                        },
                        {
                          title: 'Transition',
                          render: (_, r: any) => (
                            <Space>
                              <Tag>{r.from_status}</Tag>
                              <span>&rarr;</span>
                              <Tag color="blue">{r.to_status}</Tag>
                            </Space>
                          ),
                          width: 240,
                        },
                        {
                          title: 'Operator',
                          dataIndex: 'changed_by',
                          render: (op) => op || 'Operations Staff',
                          width: 180,
                        },
                        {
                          title: 'Reason / Notes',
                          dataIndex: 'reason',
                          render: (reason) => reason || 'System update',
                        },
                      ]}
                    />
                  )}
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* ========================================================
          MODALS
          ======================================================== */}

      {/* 1. Record Payment Modal */}
      <Modal
        title="Record Payment Receipt"
        open={paymentModalOpen}
        onCancel={() => setPaymentModalOpen(false)}
        onOk={() => paymentForm.submit()}
        confirmLoading={recordPaymentMutation.isPending}
        okText="Record Payment"
      >
        <Form
          form={paymentForm}
          layout="vertical"
          onFinish={(values) => recordPaymentMutation.mutate(values)}
        >
          <Form.Item
            name="amount"
            label="Payment Amount (Rs.)"
            rules={[{ required: true, message: 'Please enter payment amount' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={1}
              placeholder="e.g. 5000"
            />
          </Form.Item>

          <Form.Item name="category" label="Payment Category" initialValue="rental">
            <Select>
              <Select.Option value="rental">Base Rental Fee</Select.Option>
              <Select.Option value="deposit">Security Deposit</Select.Option>
              <Select.Option value="extra">Add-ons &amp; Accessories</Select.Option>
              <Select.Option value="damage">Damage / Repair Reimbursement</Select.Option>
              <Select.Option value="late_fee">Late Return Fee</Select.Option>
              <Select.Option value="other">Other Settlement</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="method" label="Payment Method" initialValue="cash">
            <Select>
              <Select.Option value="cash">Cash (Counter Desk)</Select.Option>
              <Select.Option value="qr_fonepay">Fonepay / QR Instant</Select.Option>
              <Select.Option value="bank_transfer">Bank Transfer (NPR)</Select.Option>
              <Select.Option value="card">Credit / Debit Card</Select.Option>
              <Select.Option value="cheque">Bank Cheque</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="gateway" label="Transaction Reference / Note">
            <Input placeholder="e.g. Fonepay Ref: 98402941" />
          </Form.Item>

          <Form.Item name="notes" label="Staff Remarks">
            <TextArea rows={2} placeholder="Optional notes for internal ledger" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 2. Reassign Vehicle Modal */}
      <Modal
        title="Reassign / Swap Vehicle"
        open={reassignModalOpen}
        onCancel={() => setReassignModalOpen(false)}
        onOk={() => reassignMutation.mutate()}
        confirmLoading={reassignMutation.isPending}
        okButtonProps={{ disabled: !reassignVehicleId }}
        okText="Confirm Swap"
      >
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
            Select Replacement Vehicle:
          </label>
          <Select
            style={{ width: '100%' }}
            placeholder="Choose available vehicle"
            value={reassignVehicleId || undefined}
            onChange={setReassignVehicleId}
          >
            {fleetVehicles.map((v) => (
              <Select.Option key={v.id} value={v.id}>
                {v.make} {v.model} ({v.plateNumber}) • Rs. {v.pricing?.dailyRate}/d
              </Select.Option>
            ))}
          </Select>
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
            Reason for Swap:
          </label>
          <TextArea
            rows={3}
            value={reassignReason}
            onChange={(e) => setReassignReason(e.target.value)}
            placeholder="e.g. Customer upgraded category or mechanical maintenance"
          />
        </div>
      </Modal>

      {/* 3. Status Change Modal */}
      <Modal
        title="Update Booking Status"
        open={statusModalOpen}
        onCancel={() => setStatusModalOpen(false)}
        onOk={() => changeStatusMutation.mutate()}
        confirmLoading={changeStatusMutation.isPending}
        okText="Apply Status"
      >
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
            Target Status:
          </label>
          <Select
            style={{ width: '100%' }}
            value={targetStatus}
            onChange={(v) => setTargetStatus(v as BookingStatus)}
          >
            <Select.Option value="confirmed">Confirmed</Select.Option>
            <Select.Option value="pickup_scheduled">Pickup Scheduled</Select.Option>
            <Select.Option value="pickup_in_progress">Pickup In Progress</Select.Option>
            <Select.Option value="active">Active (On Road)</Select.Option>
            <Select.Option value="return_in_progress">Return In Progress</Select.Option>
            <Select.Option value="completed">Completed</Select.Option>
            <Select.Option value="overdue">Overdue</Select.Option>
            <Select.Option value="cancelled">Cancelled</Select.Option>
            <Select.Option value="no_show">No-Show</Select.Option>
          </Select>
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
            Audit Reason / Staff Note:
          </label>
          <TextArea
            rows={3}
            value={statusReason}
            onChange={(e) => setStatusReason(e.target.value)}
            placeholder="Why is this status being modified?"
          />
        </div>
      </Modal>

      {/* 4. Cancel Booking Modal */}
      <Modal
        title="Cancel Booking Reservation"
        open={cancelModalOpen}
        onCancel={() => setCancelModalOpen(false)}
        onOk={() => cancelMutation.mutate()}
        confirmLoading={cancelMutation.isPending}
        okText="Confirm Cancellation"
        okButtonProps={{ danger: true }}
      >
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
            Cancellation Reason:
          </label>
          <TextArea
            rows={3}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Reason for cancellation"
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
            Cancellation Penalty Fee (Rs.):
          </label>
          <InputNumber
            min={0}
            style={{ width: '100%' }}
            value={cancelFee}
            onChange={(val) => setCancelFee(Number(val) || 0)}
          />
        </div>
      </Modal>

      {/* 5. Mark No-Show Modal */}
      <Modal
        title="Mark Booking as No-Show"
        open={noShowModalOpen}
        onCancel={() => setNoShowModalOpen(false)}
        onOk={() => noShowMutation.mutate()}
        confirmLoading={noShowMutation.isPending}
        okText="Mark No-Show"
        okButtonProps={{ danger: true }}
      >
        <div>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
            Staff Observations:
          </label>
          <TextArea
            rows={3}
            value={noShowReason}
            onChange={(e) => setNoShowReason(e.target.value)}
            placeholder="Customer failed to arrive within scheduled window"
          />
        </div>
      </Modal>
    </PageContainer>
  )
}

export default BookingViewPage

