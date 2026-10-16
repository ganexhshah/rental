import React, { useState } from 'react'
import {
  Descriptions,
  Tabs,
  Tag,
  Button,
  Space,
  Modal,
  Input,
  DatePicker,
  InputNumber,
  App,
  Card,
  Row,
  Col,
  Alert,
  Table,
  Image,
  Divider,
} from 'antd'
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  CalendarOutlined,
  CarOutlined,
  DollarOutlined,
  UserOutlined,
  HistoryOutlined,
  FileDoneOutlined,
  WarningOutlined,
  SwapOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Booking, BookingStatus } from '@/types/booking'
import { DetailDrawer } from '@/components/overlays/DetailDrawer'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { CurrencyDisplay } from '@/components/data-display/CurrencyDisplay'
import { ActivityTimeline } from '@/components/overlays/ActivityTimeline'
import { bookingsApi } from '../api'
import { formatDateTime, formatDate } from '@/lib/formatting/date'

const { TextArea } = Input

interface BookingDetailsDrawerProps {
  booking: Booking | null
  open: boolean
  onClose: () => void
  onNavigatePickup?: (booking: Booking) => void
  onNavigateReturn?: (booking: Booking) => void
}

export const BookingDetailsDrawer: React.FC<BookingDetailsDrawerProps> = ({
  booking,
  open,
  onClose,
  onNavigatePickup,
  onNavigateReturn,
}) => {
  const { message } = App.useApp()
  const queryClient = useQueryClient()

  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelFee, setCancelFee] = useState<number>(0)

  const [noShowModalOpen, setNoShowModalOpen] = useState(false)
  const [noShowReason, setNoShowReason] = useState('')

  const [statusChangeModalOpen, setStatusChangeModalOpen] = useState(false)
  const [targetStatus, setTargetStatus] = useState<BookingStatus>('confirmed')
  const [statusReason, setStatusReason] = useState('')

  // Fetch checklists for this booking
  const { data: checklists = [], refetch: refetchChecklists } = useQuery({
    queryKey: ['booking-checklists', booking?.id],
    queryFn: () => (booking?.id ? bookingsApi.getChecklists(booking.id) : []),
    enabled: Boolean(booking?.id && open),
  })

  // Fetch audit status history for this booking
  const { data: statusHistory = [], refetch: refetchHistory } = useQuery({
    queryKey: ['booking-history', booking?.id],
    queryFn: () => (booking?.id ? bookingsApi.getStatusHistory(booking.id) : []),
    enabled: Boolean(booking?.id && open),
  })

  // Mutations
  const confirmMutation = useMutation({
    mutationFn: () => bookingsApi.confirmBooking(booking!.id),
    onSuccess: () => {
      message.success('Booking confirmed!')
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      queryClient.invalidateQueries({ queryKey: ['operations-summary'] })
      refetchHistory()
    },
    onError: (err: any) => message.error(err?.message || 'Failed to confirm booking'),
  })

  const cancelMutation = useMutation({
    mutationFn: () => bookingsApi.cancelBooking(booking!.id, cancelReason, cancelFee),
    onSuccess: () => {
      message.success('Booking cancelled.')
      setCancelModalOpen(false)
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      queryClient.invalidateQueries({ queryKey: ['operations-summary'] })
      refetchHistory()
    },
    onError: (err: any) => message.error(err?.message || 'Failed to cancel booking'),
  })

  const noShowMutation = useMutation({
    mutationFn: () => bookingsApi.noShowBooking(booking!.id, noShowReason),
    onSuccess: () => {
      message.success('Booking marked as No-Show.')
      setNoShowModalOpen(false)
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      queryClient.invalidateQueries({ queryKey: ['operations-summary'] })
      refetchHistory()
    },
    onError: (err: any) => message.error(err?.message || 'Failed to mark no-show'),
  })

  const changeStatusMutation = useMutation({
    mutationFn: () => bookingsApi.changeStatus(booking!.id, targetStatus, statusReason),
    onSuccess: () => {
      message.success(`Status updated to ${targetStatus}`)
      setStatusChangeModalOpen(false)
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      queryClient.invalidateQueries({ queryKey: ['operations-summary'] })
      refetchHistory()
    },
    onError: (err: any) => message.error(err?.message || 'Failed to update status'),
  })

  if (!booking) return null

  const pickupChecklist = checklists.find((c) => c.checklist_type === 'pickup')
  const returnChecklist = checklists.find((c) => c.checklist_type === 'return')
  const snapshot = booking.pricingSnapshot

  const tabItems = [
    {
      key: 'overview',
      label: 'Overview & Lifecycle',
      children: (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>Booking #{booking.bookingCode}</div>
              <div style={{ color: 'rgba(0,0,0,0.45)', fontSize: 13 }}>
                Created {booking.createdAt ? formatDateTime(booking.createdAt) : 'Recently'} via {(booking.source || 'ADMIN').toUpperCase()}
              </div>
            </div>
            <Space>
              <StatusBadge status={booking.status} />
              <StatusBadge status={booking.paymentStatus} />
            </Space>
          </div>

          {/* Quick Lifecycle Action Controls */}
          <Card size="small" title="Operational Actions" style={{ marginBottom: 16 }}>
            <Space wrap>
              {['pending', 'pending_confirmation', 'pending_verification', 'pending_payment'].includes(booking.status) && (
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  onClick={() => confirmMutation.mutate()}
                  loading={confirmMutation.isPending}
                >
                  Confirm Reservation
                </Button>
              )}

              {booking.status === 'confirmed' && (
                <Button
                  type="default"
                  onClick={() => {
                    setTargetStatus('pickup_scheduled')
                    setStatusReason('Customer confirmed arrival time')
                    setStatusChangeModalOpen(true)
                  }}
                >
                  Schedule Pickup
                </Button>
              )}

              {['confirmed', 'pickup_scheduled'].includes(booking.status) && onNavigatePickup && (
                <Button
                  type="primary"
                  icon={<CarOutlined />}
                  onClick={() => {
                    onClose()
                    onNavigatePickup(booking)
                  }}
                >
                  Execute Handover (Pickup)
                </Button>
              )}

              {booking.status === 'active' && onNavigateReturn && (
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  onClick={() => {
                    onClose()
                    onNavigateReturn(booking)
                  }}
                >
                  Execute Return Check-In
                </Button>
              )}

              {!['completed', 'cancelled', 'no_show', 'rejected'].includes(booking.status) && (
                <>
                  <Button danger onClick={() => setCancelModalOpen(true)}>
                    Cancel Booking
                  </Button>
                  <Button onClick={() => setNoShowModalOpen(true)}>
                    Mark No-Show
                  </Button>
                </>
              )}
            </Space>
          </Card>

          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col span={12}>
              <Card size="small" title={<Space><CarOutlined /><span>Assigned Vehicle</span></Space>}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{booking.vehicleModel}</div>
                <div style={{ margin: '4px 0' }}><Tag color="blue">{booking.vehiclePlate}</Tag></div>
                <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>Category: {booking.categoryName || 'Standard Fleet'}</div>
              </Card>
            </Col>
            <Col span={12}>
              <Card size="small" title={<Space><UserOutlined /><span>Customer Contact</span></Space>}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{booking.customerName}</div>
                <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', margin: '4px 0' }}>{booking.customerEmail}</div>
                <div style={{ fontSize: 12 }}>{booking.customerPhone}</div>
              </Card>
            </Col>
          </Row>

          <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
            <Descriptions.Item label="Pickup Station">{booking.pickupLocationName}</Descriptions.Item>
            <Descriptions.Item label="Return Station">{booking.returnLocationName}</Descriptions.Item>
            <Descriptions.Item label="Start Date">{formatDateTime(booking.startDate)}</Descriptions.Item>
            <Descriptions.Item label="End Date">{formatDateTime(booking.endDate)}</Descriptions.Item>
            <Descriptions.Item label="Actual Pickup">{booking.actualPickupAt ? formatDateTime(booking.actualPickupAt) : 'Not yet picked up'}</Descriptions.Item>
            <Descriptions.Item label="Actual Return">{booking.actualReturnAt ? formatDateTime(booking.actualReturnAt) : 'Not yet returned'}</Descriptions.Item>
            <Descriptions.Item label="Total Duration">{booking.totalDays} Day(s)</Descriptions.Item>
            <Descriptions.Item label="Digital Contract">
              {booking.contractSigned ? <Tag color="green">Executed</Tag> : <Tag color="orange">Pending</Tag>}
            </Descriptions.Item>
          </Descriptions>

          {booking.notes && (
            <div style={{ padding: 12, backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: 6, fontSize: 13, marginBottom: 16 }}>
              <strong>Operations Notes:</strong> {booking.notes}
            </div>
          )}

          {booking.cancellationReason && (
            <Alert
              title={`Booking Cancelled / No-Show`}
              description={`Reason: ${booking.cancellationReason} • Cancellation Fee: Rs. ${booking.cancellationFee}`}
              type="error"
              showIcon
              style={{ marginTop: 12 }}
            />
          )}
        </div>
      ),
    },
    {
      key: 'customer_driver',
      label: 'Customer & Driver',
      children: (
        <div>
          <Card size="small" title="Customer Identity & KYC" style={{ marginBottom: 16 }}>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="Full Name">{booking.customerName}</Descriptions.Item>
              <Descriptions.Item label="KYC Status">
                <Tag color={booking.customerKycStatus === 'verified' ? 'green' : 'orange'}>
                  {(booking.customerKycStatus || 'PENDING').toUpperCase()}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Email">{booking.customerEmail}</Descriptions.Item>
              <Descriptions.Item label="Phone">{booking.customerPhone}</Descriptions.Item>
            </Descriptions>
          </Card>

          <Card size="small" title="Authorized Driver">
            {booking.driverName ? (
              <Descriptions bordered size="small" column={2}>
                <Descriptions.Item label="Driver Name">{booking.driverName}</Descriptions.Item>
                <Descriptions.Item label="License Number">{booking.driverLicense}</Descriptions.Item>
                <Descriptions.Item label="Authorization">Verified & Authorized for Vehicle</Descriptions.Item>
              </Descriptions>
            ) : (
              <div style={{ color: 'rgba(0,0,0,0.5)', padding: 12 }}>
                Primary renter ({booking.customerName}) is the authorized driver.
              </div>
            )}
          </Card>
        </div>
      ),
    },
    {
      key: 'pricing_snapshot',
      label: 'Pricing Breakdown',
      children: (
        <div>
          <Card size="small" title="Pricing Calculation" style={{ marginBottom: 16 }}>
            <Alert
              title="Pricing Snapshot"
              description="Rates and amounts locked at booking time."
              type="info"
              showIcon
              style={{ marginBottom: 12 }}
            />
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="Billed Duration">
                {snapshot?.rental_days || booking.totalDays} Days
              </Descriptions.Item>
              <Descriptions.Item label="Base Daily Rate">
                <CurrencyDisplay amount={snapshot?.base_rental_rate || booking.dailyRate} />
              </Descriptions.Item>
              <Descriptions.Item label="Base Rental Total">
                <CurrencyDisplay amount={snapshot?.rental_amount || booking.rentalAmount} />
              </Descriptions.Item>
              <Descriptions.Item label="Comprehensive Insurance">
                <CurrencyDisplay amount={snapshot?.insurance_amount || booking.insuranceAmount} />
              </Descriptions.Item>
              <Descriptions.Item label="Extra Equipment / Logistics">
                <CurrencyDisplay amount={snapshot?.extra_charges || booking.extraCharges} />
              </Descriptions.Item>
              <Descriptions.Item label="Coupon Discount">
                <CurrencyDisplay amount={snapshot?.discount_amount || booking.discountAmount} />
              </Descriptions.Item>
              <Descriptions.Item label="Taxable Base">
                <CurrencyDisplay amount={snapshot?.taxable_base || (booking.totalAmount - booking.taxAmount)} />
              </Descriptions.Item>
              <Descriptions.Item label="Nepal VAT (13%)">
                <CurrencyDisplay amount={snapshot?.tax_amount || booking.taxAmount} />
              </Descriptions.Item>
              <Descriptions.Item label="Grand Total Payable" span={2}>
                <strong style={{ fontSize: 16 }}>
                  <CurrencyDisplay amount={snapshot?.total_amount || booking.totalAmount} strong />
                </strong>
              </Descriptions.Item>
            </Descriptions>

            {booking.extras && booking.extras.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <strong>Selected Add-on Equipment:</strong>
                <Table
                  size="small"
                  pagination={false}
                  dataSource={booking.extras}
                  rowKey="name"
                  style={{ marginTop: 8 }}
                  columns={[
                    { title: 'Item Name', dataIndex: 'name' },
                    { title: 'Qty', dataIndex: 'quantity', render: (q) => q || 1 },
                    { title: 'Unit Price', dataIndex: 'price', render: (p) => <CurrencyDisplay amount={p} /> },
                  ]}
                />
              </div>
            )}
          </Card>
        </div>
      ),
    },
    {
      key: 'deposit_payments',
      label: 'Security Deposit & Payments',
      children: (
        <div>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={12}>
              <Card size="small" title="Security Deposit Ledger">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span>Required Deposit:</span>
                  <strong><CurrencyDisplay amount={booking.depositAmount} /></strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span>Deposit Status:</span>
                  <StatusBadge status={booking.depositStatus} />
                </div>
                <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', marginTop: 8 }}>
                  Held refundable upon successful vehicle return inspection.
                </div>
              </Card>
            </Col>
            <Col span={12}>
              <Card size="small" title="Payment Balance Status">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span>Total Due:</span>
                  <strong><CurrencyDisplay amount={booking.totalAmount} /></strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span>Amount Paid:</span>
                  <span style={{ color: '#52c41a', fontWeight: 600 }}>
                    <CurrencyDisplay amount={booking.paidAmount} />
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span>Balance Due:</span>
                  <span style={{ color: booking.balanceDue > 0 ? '#ff4d4f' : 'inherit', fontWeight: 700 }}>
                    <CurrencyDisplay amount={booking.balanceDue} />
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Payment Status:</span>
                  <StatusBadge status={booking.paymentStatus} />
                </div>
              </Card>
            </Col>
          </Row>
        </div>
      ),
    },
    {
      key: 'checklists',
      label: `Inspections (${checklists.length})`,
      children: (
        <div>
          {checklists.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, color: 'rgba(0,0,0,0.45)' }}>
              No vehicle inspection checklist recorded yet for this booking.
            </div>
          ) : (
            <div>
              {pickupChecklist && (
                <Card size="small" title="Handover / Pickup Checklist" style={{ marginBottom: 16 }}>
                  <Descriptions bordered size="small" column={2}>
                    <Descriptions.Item label="Odometer Out">{pickupChecklist.odometer?.toLocaleString()} km</Descriptions.Item>
                    <Descriptions.Item label="Fuel / Battery">{pickupChecklist.fuel_level}</Descriptions.Item>
                    <Descriptions.Item label="Exterior Condition">{pickupChecklist.exterior_condition || 'Clean'}</Descriptions.Item>
                    <Descriptions.Item label="Interior Condition">{pickupChecklist.interior_condition || 'Clean'}</Descriptions.Item>
                    <Descriptions.Item label="Recorded At">{formatDateTime(pickupChecklist.created_at)}</Descriptions.Item>
                    <Descriptions.Item label="Customer Signature">
                      {pickupChecklist.customer_signature ? (
                        <Tag color="green">Digital Signature Captured</Tag>
                      ) : (
                        'Verified'
                      )}
                    </Descriptions.Item>
                  </Descriptions>
                </Card>
              )}

              {returnChecklist && (
                <Card size="small" title="Check-In / Return Checklist">
                  <Descriptions bordered size="small" column={2}>
                    <Descriptions.Item label="Odometer In">{returnChecklist.odometer?.toLocaleString()} km</Descriptions.Item>
                    <Descriptions.Item label="Fuel / Battery">{returnChecklist.fuel_level}</Descriptions.Item>
                    <Descriptions.Item label="Exterior Condition">{returnChecklist.exterior_condition || 'Clean'}</Descriptions.Item>
                    <Descriptions.Item label="Interior Condition">{returnChecklist.interior_condition || 'Clean'}</Descriptions.Item>
                    <Descriptions.Item label="Recorded At">{formatDateTime(returnChecklist.created_at)}</Descriptions.Item>
                    <Descriptions.Item label="Customer Signature">
                      {returnChecklist.customer_signature ? (
                        <Tag color="green">Digital Signature Captured</Tag>
                      ) : (
                        'Verified'
                      )}
                    </Descriptions.Item>
                  </Descriptions>
                </Card>
              )}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'history',
      label: `Audit History (${statusHistory.length})`,
      children: (
        <div>
          {statusHistory.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, color: 'rgba(0,0,0,0.45)' }}>
              No status transitions logged yet.
            </div>
          ) : (
            <Table
              size="small"
              pagination={false}
              dataSource={statusHistory}
              rowKey="id"
              columns={[
                { title: 'Timestamp', dataIndex: 'created_at', render: (t) => formatDateTime(t) },
                { title: 'Actor', dataIndex: 'changed_by' },
                {
                  title: 'Transition',
                  render: (_, r: any) => (
                    <Space>
                      <Tag>{r.from_status}</Tag>
                      <span>→</span>
                      <Tag color="blue">{r.to_status}</Tag>
                    </Space>
                  ),
                },
                { title: 'Reason / Note', dataIndex: 'reason' },
              ]}
            />
          )}
        </div>
      ),
    },
  ]

  return (
    <>
      <DetailDrawer
        open={open}
        onClose={onClose}
        width={820}
        title={`Booking #${booking.bookingCode}`}
        subtitle={`${booking.customerName} • ${booking.vehicleModel}`}
      >
        <Tabs defaultActiveKey="overview" items={tabItems} />
      </DetailDrawer>

      {/* Cancel Modal */}
      <Modal
        title="Cancel Booking Reservation"
        open={cancelModalOpen}
        onOk={() => cancelMutation.mutate()}
        onCancel={() => setCancelModalOpen(false)}
        okText="Confirm Cancellation"
        okButtonProps={{ danger: true, loading: cancelMutation.isPending }}
      >
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Cancellation Reason:</label>
          <TextArea
            rows={3}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="e.g. Customer requested cancellation due to flight change"
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Cancellation Fee (Rs.):</label>
          <InputNumber
            min={0}
            value={cancelFee}
            onChange={(v) => setCancelFee(Number(v) || 0)}
            style={{ width: '100%' }}
          />
        </div>
      </Modal>

      {/* No Show Modal */}
      <Modal
        title="Mark Booking as No-Show"
        open={noShowModalOpen}
        onOk={() => noShowMutation.mutate()}
        onCancel={() => setNoShowModalOpen(false)}
        okText="Mark No-Show"
        okButtonProps={{ danger: true, loading: noShowMutation.isPending }}
      >
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Notes / Reason:</label>
          <TextArea
            rows={3}
            value={noShowReason}
            onChange={(e) => setNoShowReason(e.target.value)}
            placeholder="e.g. Customer did not arrive within pickup window"
          />
        </div>
      </Modal>

      {/* Status Change Modal */}
      <Modal
        title="Update Booking Status"
        open={statusChangeModalOpen}
        onOk={() => changeStatusMutation.mutate()}
        onCancel={() => setStatusChangeModalOpen(false)}
        confirmLoading={changeStatusMutation.isPending}
      >
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>New Status:</label>
          <Tag color="blue">{targetStatus}</Tag>
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Reason / Audit Note:</label>
          <TextArea
            rows={2}
            value={statusReason}
            onChange={(e) => setStatusReason(e.target.value)}
          />
        </div>
      </Modal>
    </>
  )
}
