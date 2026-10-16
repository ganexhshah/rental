import React, { useState, useMemo } from 'react'
import {
  Card,
  Row,
  Col,
  Space,
  Button,
  Tag,
  Badge,
  Avatar,
  Typography,
  Tabs,
  Descriptions,
  Table,
  Image,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Segmented,
  Empty,
  Spin,
  App,
  Popconfirm,
  Tooltip,
  Divider,
  Alert,
  Rate,
  Progress,
} from 'antd'
import {
  UserOutlined,
  ArrowLeftOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  FileTextOutlined,
  SafetyCertificateOutlined,
  CarOutlined,
  DollarOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  DownloadOutlined,
  StopOutlined,
  AuditOutlined,
  PhoneOutlined,
  MailOutlined,
  IdcardOutlined,
  TeamOutlined,
  AppstoreOutlined,
  BarsOutlined,
  DashboardOutlined,
  HistoryOutlined,
  CreditCardOutlined,
  ExclamationCircleOutlined,
  GlobalOutlined,
  HomeOutlined,
  BankOutlined,
  FilePdfOutlined,
  EyeOutlined,
  CheckOutlined,
  WarningOutlined,
  SyncOutlined,
} from '@ant-design/icons'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { PageHeader } from '@/components/navigation/PageHeader'
import { PageContainer } from '@/components/navigation/PageContainer'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { CurrencyDisplay } from '@/components/data-display/CurrencyDisplay'
import { FileUploader, uploadFileOnSave } from '@/components/forms/FileUploader'
import { formatDate, formatDateTime } from '@/lib/formatting/date'
import { customersApi } from '../api'
import { bookingsApi } from '@/features/bookings/api'
import { paymentsApi } from '@/features/payments/api'
import type {
  Customer,
  CustomerDocument,
  CustomerDriver,
  CustomerDocType,
  CustomerVerificationStatus,
  CustomerStatus,
  CreateCustomerDocumentInput,
  CreateDriverInput,
} from '@/types/customer'
import type { Booking } from '@/types/booking'
import type { PaymentTransaction, Invoice } from '@/types/payment'
import type { UploadFile } from 'antd'

const { Text, Title, Paragraph } = Typography
const { TextArea } = Input

const DOC_TYPE_META: Record<string, { label: string; color: string }> = {
  citizenship: { label: 'Citizenship Certificate', color: 'blue' },
  passport: { label: 'International Passport', color: 'purple' },
  driving_licence: { label: 'Driving Licence', color: 'cyan' },
  license_front: { label: 'Licence Front', color: 'cyan' },
  license_back: { label: 'Licence Back', color: 'cyan' },
  national_id: { label: 'National ID / NID Card', color: 'geekblue' },
  visa_residency: { label: 'Visa / Resident Permit', color: 'magenta' },
  address_proof: { label: 'Address Verification', color: 'volcano' },
  business_registration: { label: 'Business Registration (PAN/VAT)', color: 'gold' },
  tax_pan_vat: { label: 'Tax Clearance / VAT Certificate', color: 'gold' },
  signed_form: { label: 'Signed Agreement / KYC Form', color: 'green' },
  other: { label: 'KYC Document', color: 'default' },
}

export const CustomerViewPage: React.FC = () => {
  const { message } = App.useApp()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState<string>('overview')
  const [docViewMode, setDocViewMode] = useState<'cards' | 'table'>('cards')

  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false)
  const [verifyStatus, setVerifyStatus] = useState<CustomerVerificationStatus>('verified')
  const [verifyNotes, setVerifyNotes] = useState('')

  const [isBlacklistModalOpen, setIsBlacklistModalOpen] = useState(false)
  const [blacklistReason, setBlacklistReason] = useState('')

  const [isAddDocModalOpen, setIsAddDocModalOpen] = useState(false)
  const [docFileList, setDocFileList] = useState<UploadFile[]>([])

  const [isAddDriverModalOpen, setIsAddDriverModalOpen] = useState(false)

  // Forms
  const [editForm] = Form.useForm()
  const [docForm] = Form.useForm()
  const [driverForm] = Form.useForm()

  // 1. Fetch Customer Details
  const {
    data: customer,
    isLoading: customerLoading,
    error: customerError,
    refetch: refetchCustomer,
  } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => (id ? customersApi.getCustomerById(id) : null),
    enabled: Boolean(id),
  })

  // 2. Fetch Customer Documents
  const {
    data: serverDocs = [],
    isLoading: docsLoading,
    refetch: refetchDocs,
  } = useQuery({
    queryKey: ['customer-docs', id],
    queryFn: () => (id ? customersApi.getCustomerDocuments(id) : []),
    enabled: Boolean(id),
  })

  // 3. Fetch Customer Drivers
  const {
    data: serverDrivers = [],
    isLoading: driversLoading,
    refetch: refetchDrivers,
  } = useQuery({
    queryKey: ['customer-drivers', id],
    queryFn: () => (id ? customersApi.getCustomerDrivers(id) : []),
    enabled: Boolean(id),
  })

  // 4. Fetch Customer Bookings & Rentals
  const {
    data: customerBookings = [],
    isLoading: bookingsLoading,
  } = useQuery({
    queryKey: ['customer-bookings', id],
    queryFn: async () => {
      if (!id) return []
      const [directBookings, allBookings] = await Promise.all([
        customersApi.getCustomerBookings(id).catch(() => []),
        bookingsApi.getBookings().catch(() => []),
      ])

      const merged = new Map<string, Booking>()
      directBookings.forEach((b: Booking) => b && b.id && merged.set(b.id, b))
      allBookings.forEach((b: Booking) => {
        if (
          b.customerId === id ||
          (customer?.email && b.customerEmail && b.customerEmail.toLowerCase() === customer.email.toLowerCase()) ||
          (customer?.fullName && b.customerName && b.customerName.toLowerCase() === customer.fullName.toLowerCase())
        ) {
          merged.set(b.id, b)
        }
      })
      return Array.from(merged.values())
    },
    enabled: Boolean(id),
  })

  // 5. Fetch Payments & Transactions for this Customer
  const { data: allTransactions = [], isLoading: txLoading } = useQuery({
    queryKey: ['customer-transactions', id],
    queryFn: async () => {
      if (!id) return []
      const txs = await paymentsApi.getTransactions()
      return txs.filter(
        (t: PaymentTransaction) =>
          t.customerId === id ||
          (customer?.fullName && t.customerName && t.customerName.toLowerCase() === customer.fullName.toLowerCase())
      )
    },
    enabled: Boolean(id),
  })

  // Merge Documents
  const mergedDocs: CustomerDocument[] = useMemo(() => {
    if (!customer) return []
    const map = new Map<string, CustomerDocument>()
    const combined = [...(customer.documents || []), ...serverDocs]
    combined.forEach((doc) => {
      if (doc && doc.id) {
        map.set(doc.id, doc)
      }
    })
    return Array.from(map.values())
  }, [customer?.documents, serverDocs])

  // Merge Drivers
  const mergedDrivers: CustomerDriver[] = useMemo(() => {
    if (!customer) return []
    const map = new Map<string, CustomerDriver>()
    const combined = [...(customer.drivers || []), ...serverDrivers]
    combined.forEach((drv) => {
      if (drv && drv.id) {
        map.set(drv.id, drv)
      }
    })
    return Array.from(map.values())
  }, [customer?.drivers, serverDrivers])

  // Document Stats
  const validDocs = mergedDocs.filter((d) => d.verificationStatus === 'verified' || d.status === 'valid').length
  const pendingDocs = mergedDocs.filter((d) => d.verificationStatus === 'pending').length
  const rejectedDocs = mergedDocs.filter((d) => d.verificationStatus === 'rejected').length

  // Financial Stats
  const totalRevenue = useMemo(() => {
    if (customer?.totalSpent && customer.totalSpent > 0) return customer.totalSpent
    return customerBookings.reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0)
  }, [customer?.totalSpent, customerBookings])

  const totalBookingsCount = useMemo(() => {
    return Math.max(customer?.totalBookingsCount || 0, customerBookings.length)
  }, [customer?.totalBookingsCount, customerBookings])

  // Active bookings count
  const activeBookingsCount = useMemo(() => {
    return customerBookings.filter((b) => b.status === 'active' || b.status === 'pickup_in_progress').length
  }, [customerBookings])

  // --- MUTATIONS ---

  // Update Customer Mutation
  const updateMutation = useMutation({
    mutationFn: (values: Partial<Customer>) => customersApi.updateCustomer(id!, values),
    onSuccess: () => {
      message.success('Customer profile updated successfully')
      queryClient.invalidateQueries({ queryKey: ['customer', id] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['customers-summary'] })
      setIsEditModalOpen(false)
    },
    onError: () => message.error('Failed to update customer details'),
  })

  // KYC Verification Mutation
  const verifyMutation = useMutation({
    mutationFn: ({ status, notes }: { status: CustomerVerificationStatus; notes?: string }) =>
      customersApi.verifyCustomer(id!, status, notes),
    onSuccess: (updated) => {
      message.success(`KYC status successfully updated to: ${updated.verificationStatus.toUpperCase()}`)
      queryClient.invalidateQueries({ queryKey: ['customer', id] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['customers-summary'] })
      setIsVerifyModalOpen(false)
      setVerifyNotes('')
    },
    onError: () => message.error('Failed to update KYC verification decision'),
  })

  // Blacklist Toggle Mutation
  const blacklistMutation = useMutation({
    mutationFn: ({ isBlacklisted, reason }: { isBlacklisted: boolean; reason?: string }) =>
      customersApi.toggleBlacklist(id!, isBlacklisted, reason),
    onSuccess: (updated) => {
      if (updated.isBlacklisted) {
        message.warning('Customer marked as blacklisted and restricted from rentals')
      } else {
        message.success('Blacklist restriction removed from customer account')
      }
      queryClient.invalidateQueries({ queryKey: ['customer', id] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['customers-summary'] })
      setIsBlacklistModalOpen(false)
      setBlacklistReason('')
    },
    onError: () => message.error('Failed to update blacklist restriction'),
  })

  // Add Document Mutation
  const addDocMutation = useMutation({
    mutationFn: async (values: any) => {
      let fileUrl = ''
      let fileName = ''
      let fileSize = 0

      if (docFileList.length > 0) {
        const fileItem = docFileList[0]
        const uploadedUrl = await uploadFileOnSave(fileItem, 'customer-documents')
        fileUrl = uploadedUrl || fileItem.url || ''
        fileName = fileItem.name || 'Document'
        fileSize = fileItem.size || 0
      }

      const input: CreateCustomerDocumentInput = {
        customerId: id!,
        docType: values.docType,
        name: values.name,
        documentNumber: values.documentNumber,
        issuingAuthority: values.issuingAuthority,
        fileUrl: fileUrl || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80',
        fileName: fileName,
        fileSize: fileSize,
        issueDate: values.issueDate ? values.issueDate.format('YYYY-MM-DD') : undefined,
        expiryDate: values.expiryDate ? values.expiryDate.format('YYYY-MM-DD') : undefined,
        notes: values.notes,
      }

      return customersApi.createCustomerDocument(input)
    },
    onSuccess: () => {
      message.success('Official KYC document attached successfully')
      refetchDocs()
      refetchCustomer()
      queryClient.invalidateQueries({ queryKey: ['customer-documents'] })
      queryClient.invalidateQueries({ queryKey: ['customer-documents-summary'] })
      setIsAddDocModalOpen(false)
      docForm.resetFields()
      setDocFileList([])
    },
    onError: (err: any) =>
      message.error(err?.response?.data?.error?.message || 'Failed to attach document'),
  })

  // Verify Single Document Mutation
  const verifyDocMutation = useMutation({
    mutationFn: ({ docId, status }: { docId: string; status: 'verified' | 'rejected' }) =>
      customersApi.verifyCustomerDocument(docId, status),
    onSuccess: (_, vars) => {
      message.success(`Document marked as ${vars.status}`)
      refetchDocs()
      refetchCustomer()
    },
    onError: () => message.error('Failed to update document audit status'),
  })

  // Delete Document Mutation
  const deleteDocMutation = useMutation({
    mutationFn: (docId: string) => customersApi.deleteCustomerDocument(docId),
    onSuccess: () => {
      message.success('Document deleted successfully')
      refetchDocs()
      refetchCustomer()
    },
    onError: () => message.error('Failed to delete document'),
  })

  // Add Authorized Driver Mutation
  const addDriverMutation = useMutation({
    mutationFn: async (values: any) => {
      const input: CreateDriverInput = {
        customerId: id!,
        fullName: values.fullName,
        phone: values.phone,
        email: values.email,
        dateOfBirth: values.dateOfBirth ? values.dateOfBirth.format('YYYY-MM-DD') : undefined,
        relationship: values.relationship || 'authorized_driver',
        licenseNumber: values.licenseNumber,
        licenseCategory: values.licenseCategory || 'B',
        licenseIssueDate: values.licenseIssueDate ? values.licenseIssueDate.format('YYYY-MM-DD') : undefined,
        licenseExpiryDate: values.licenseExpiryDate ? values.licenseExpiryDate.format('YYYY-MM-DD') : undefined,
        notes: values.notes,
      }
      return customersApi.createCustomerDriver(input)
    },
    onSuccess: () => {
      message.success('Authorized driver linked to customer account')
      refetchDrivers()
      refetchCustomer()
      queryClient.invalidateQueries({ queryKey: ['customer-drivers'] })
      setIsAddDriverModalOpen(false)
      driverForm.resetFields()
    },
    onError: (err: any) =>
      message.error(err?.response?.data?.error?.message || 'Failed to add driver'),
  })

  // Delete Driver Mutation
  const deleteDriverMutation = useMutation({
    mutationFn: (driverId: string) => customersApi.deleteCustomerDriver(id!, driverId),
    onSuccess: () => {
      message.success('Authorized driver removed')
      refetchDrivers()
      refetchCustomer()
      queryClient.invalidateQueries({ queryKey: ['customer-drivers'] })
    },
    onError: () => message.error('Failed to remove driver'),
  })

  // Delete Customer Mutation
  const deleteCustomerMutation = useMutation({
    mutationFn: () => customersApi.deleteCustomer(id!),
    onSuccess: () => {
      message.success('Customer profile removed successfully')
      navigate('/customers/all')
    },
    onError: () => message.error('Failed to delete customer'),
  })

  const openEditModal = () => {
    if (!customer) return
    editForm.setFieldsValue({
      fullName: customer.fullName,
      customerType: customer.customerType || 'individual',
      customerCode: customer.customerCode,
      email: customer.email,
      phone: customer.phone,
      secondaryPhone: customer.secondaryPhone,
      dateOfBirth: customer.dateOfBirth ? dayjs(customer.dateOfBirth) : null,
      gender: customer.gender,
      nationality: customer.nationality || 'Nepalese',
      address: customer.address,
      province: customer.province || 'Bagmati',
      districtCity: customer.districtCity || customer.city || 'Kathmandu',
      postalCode: customer.postalCode,
      billingAddress: customer.billingAddress,
      companyName: customer.companyName,
      companyTaxId: customer.companyTaxId,
      licenseNumber: customer.licenseNumber,
      licenseCategory: customer.licenseCategory || 'B',
      licenseExpiry: customer.licenseExpiry ? dayjs(customer.licenseExpiry) : null,
      emergencyContactName: customer.emergencyContactName,
      emergencyContactRelationship: customer.emergencyContactRelationship,
      emergencyContactPhone: customer.emergencyContactPhone,
      rentalEligibilityStatus: customer.rentalEligibilityStatus || 'eligible',
      notes: customer.notes,
    })
    setIsEditModalOpen(true)
  }

  const handleEditSubmit = async () => {
    try {
      const values = await editForm.validateFields()
      const payload: Partial<Customer> = {
        ...values,
        dateOfBirth: values.dateOfBirth ? values.dateOfBirth.format('YYYY-MM-DD') : undefined,
        licenseExpiry: values.licenseExpiry ? values.licenseExpiry.format('YYYY-MM-DD') : undefined,
      }
      updateMutation.mutate(payload)
    } catch (e) {
      // validation error
    }
  }

  if (customerLoading) {
    return (
      <PageContainer>
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
          <Spin size="large" tip="Loading customer profile..." />
        </div>
      </PageContainer>
    )
  }

  if (customerError || !customer) {
    return (
      <PageContainer>
        <div style={{ padding: '60px 0', textAlign: 'center' }}>
          <Empty
            description="Customer profile not found or may have been deleted"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button
              type="primary"
              size="large"
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/customers/all')}
            >
              Back to Customer Directory
            </Button>
          </Empty>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      {/* 1. Header with Avatar, Details & Quick Action Buttons */}
      <PageHeader
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <Avatar
              size={48}
              src={customer.profilePhoto || customer.avatarUrl}
              icon={<UserOutlined />}
              style={{ backgroundColor: '#1677ff', fontSize: 22 }}
            />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>
                  {customer.fullName}
                </span>
                {customer.customerCode && (
                  <Tag
                    color="black"
                    style={{ fontSize: 13, padding: '2px 8px', fontWeight: 600, borderRadius: 6 }}
                  >
                    {customer.customerCode}
                  </Tag>
                )}
                <Tag
                  color={customer.customerType === 'business' ? 'purple' : customer.customerType === 'organization' ? 'cyan' : 'blue'}
                  style={{ fontSize: 13, padding: '2px 8px', borderRadius: 4, textTransform: 'uppercase', fontWeight: 600 }}
                >
                  {customer.customerType || 'Individual'}
                </Tag>
                <StatusBadge status={customer.verificationStatus || 'pending'} />
                {customer.isBlacklisted ? (
                  <Tag color="error" icon={<StopOutlined />} style={{ fontWeight: 600 }}>
                    BLACKLISTED
                  </Tag>
                ) : (
                  <Tag color="success" icon={<CheckCircleOutlined />} style={{ fontWeight: 600 }}>
                    ACTIVE
                  </Tag>
                )}
              </div>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 4, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <span>
                  <MailOutlined style={{ marginRight: 4 }} />
                  {customer.email}
                </span>
                <span>•</span>
                <span>
                  <PhoneOutlined style={{ marginRight: 4 }} />
                  {customer.phone}
                </span>
                <span>•</span>
                <span>
                  <EnvironmentOutlined style={{ marginRight: 4 }} />
                  {customer.districtCity || customer.city || 'Kathmandu'}, {customer.country || 'Nepal'}
                </span>
              </div>
            </div>
          </div>
        }
        extra={
          <Space wrap size="middle">
            <Button size="large" icon={<ArrowLeftOutlined />} onClick={() => navigate('/customers/all')}>
              Back
            </Button>

            <Button size="large" icon={<EditOutlined />} onClick={openEditModal}>
              Edit Customer
            </Button>

            <Button
              size="large"
              icon={<AuditOutlined />}
              onClick={() => {
                setVerifyStatus(customer.verificationStatus === 'verified' ? 'verified' : 'verified')
                setIsVerifyModalOpen(true)
              }}
            >
              Audit KYC
            </Button>

            {!customer.isBlacklisted ? (
              <Button
                size="large"
                danger
                icon={<StopOutlined />}
                onClick={() => setIsBlacklistModalOpen(true)}
              >
                Blacklist
              </Button>
            ) : (
              <Button
                size="large"
                icon={<CheckCircleOutlined />}
                onClick={() => blacklistMutation.mutate({ isBlacklisted: false })}
                loading={blacklistMutation.isPending}
              >
                Remove Blacklist
              </Button>
            )}

            <Button
              type="primary"
              size="large"
              icon={<CarOutlined />}
              style={{ fontWeight: 600 }}
              onClick={() => navigate(`/operations/bookings/new?customerId=${customer.id}`)}
            >
              New Booking
            </Button>
          </Space>
        }
      />

      {/* Blacklist Alert Banner if applicable */}
      {customer.isBlacklisted && (
        <Alert
          type="error"
          showIcon
          icon={<StopOutlined style={{ fontSize: 20 }} />}
          title={
            <span style={{ fontWeight: 700, fontSize: 15 }}>
              Account Restricted / Blacklisted
            </span>
          }
          description={
            <div>
              <p style={{ margin: '4px 0 0 0' }}>
                Reason: <strong>{customer.blacklistReason || 'Restricted by operations manager'}</strong>
              </p>
              {customer.blacklistedAt && (
                <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.55)', marginTop: 4 }}>
                  Flagged on {formatDateTime(customer.blacklistedAt)}{' '}
                  {customer.blacklistedBy ? `by ${customer.blacklistedBy}` : ''}
                </div>
              )}
            </div>
          }
          style={{ marginBottom: 20, borderRadius: 10 }}
          action={
            <Button
              size="small"
              type="primary"
              ghost
              onClick={() => blacklistMutation.mutate({ isBlacklisted: false })}
              loading={blacklistMutation.isPending}
            >
              Unblacklist Customer
            </Button>
          }
        />
      )}

      {/* 2. Top Metric KPI Summary Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {/* Total Bookings */}
        <Col xs={24} sm={12} md={6}>
          <Card
            bordered={false}
            style={{
              borderRadius: 12,
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
            }}
            styles={{ body: { padding: '16px 20px' } }}
          >
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>
              Total Rental Bookings
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#1677ff' }}>
              {totalBookingsCount}
              <span style={{ fontSize: 13, fontWeight: 400, color: '#64748b', marginLeft: 6 }}>
                Trips
              </span>
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
              Active Now: <strong>{activeBookingsCount}</strong> rentals on road
            </div>
          </Card>
        </Col>

        {/* Lifetime Spent */}
        <Col xs={24} sm={12} md={6}>
          <Card
            bordered={false}
            style={{
              borderRadius: 12,
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
            }}
            styles={{ body: { padding: '16px 20px' } }}
          >
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>
              Lifetime Revenue
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>
              <CurrencyDisplay amount={totalRevenue} />
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
              Total paid across completed rentals
            </div>
          </Card>
        </Col>

        {/* Outstanding Balance */}
        <Col xs={24} sm={12} md={6}>
          <Card
            bordered={false}
            style={{
              borderRadius: 12,
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
            }}
            styles={{ body: { padding: '16px 20px' } }}
          >
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>
              Outstanding Balance
            </div>
            <div
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: (customer.outstandingBalance || 0) > 0 ? '#ef4444' : '#10b981',
              }}
            >
              <CurrencyDisplay amount={customer.outstandingBalance || 0} />
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
              {(customer.outstandingBalance || 0) > 0 ? 'Payment Overdue / Pending' : 'Account Settled & Clear'}
            </div>
          </Card>
        </Col>

        {/* KYC & Compliance */}
        <Col xs={24} sm={12} md={6}>
          <Card
            bordered={false}
            style={{
              borderRadius: 12,
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
            }}
            styles={{ body: { padding: '16px 20px' } }}
          >
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>
              KYC Documents Status
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color:
                    customer.verificationStatus === 'verified'
                      ? '#10b981'
                      : customer.verificationStatus === 'rejected'
                      ? '#ef4444'
                      : '#f59e0b',
                }}
              >
                {validDocs}/{mergedDocs.length}
              </span>
              <Tag
                color={
                  customer.verificationStatus === 'verified'
                    ? 'success'
                    : customer.verificationStatus === 'rejected'
                    ? 'error'
                    : 'warning'
                }
              >
                {(customer.verificationStatus || 'PENDING').toUpperCase()}
              </Tag>
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
              {mergedDrivers.length} Authorized Driver{mergedDrivers.length === 1 ? '' : 's'} linked
            </div>
          </Card>
        </Col>
      </Row>

      {/* 3. Main Detailed Tabs Workspace */}
      <Card
        style={{
          borderRadius: 12,
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
        styles={{ body: { padding: '20px 24px' } }}
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          size="large"
          items={[
            // TAB 1: OVERVIEW & PROFILE
            {
              key: 'overview',
              label: (
                <span>
                  <DashboardOutlined style={{ marginRight: 6 }} />
                  Overview & Profile
                </span>
              ),
              children: (
                <div>
                  <Row gutter={[24, 24]}>
                    {/* Left Column: Personal, Address & Corporate Info */}
                    <Col xs={24} lg={15}>
                      {/* Identity & Personal Info */}
                      <Title level={5} style={{ marginBottom: 12 }}>
                        Personal & Contact Information
                      </Title>
                      <Descriptions bordered column={{ xs: 1, sm: 2 }} size="middle" style={{ marginBottom: 20 }}>
                        <Descriptions.Item label="Full Legal Name">
                          <strong style={{ fontSize: 14 }}>{customer.fullName}</strong>
                        </Descriptions.Item>
                        <Descriptions.Item label="Account Type">
                          <Tag color={customer.customerType === 'business' ? 'purple' : 'blue'}>
                            {(customer.customerType || 'INDIVIDUAL').toUpperCase()}
                          </Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="Primary Email">
                          <a href={`mailto:${customer.email}`} style={{ color: '#1677ff' }}>
                            {customer.email}
                          </a>
                        </Descriptions.Item>
                        <Descriptions.Item label="Primary Phone">
                          <a href={`tel:${customer.phone}`} style={{ color: '#1677ff' }}>
                            {customer.phone}
                          </a>
                        </Descriptions.Item>
                        <Descriptions.Item label="Secondary / WhatsApp">
                          {customer.secondaryPhone || '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Nationality">
                          {customer.nationality || 'Nepalese'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Date of Birth">
                          {customer.dateOfBirth ? (
                            <span>
                              {formatDate(customer.dateOfBirth)}{' '}
                              <span style={{ color: '#64748b', fontSize: 12 }}>
                                ({dayjs().diff(dayjs(customer.dateOfBirth), 'year')} years old)
                              </span>
                            </span>
                          ) : (
                            '-'
                          )}
                        </Descriptions.Item>
                        <Descriptions.Item label="Gender">
                          {customer.gender ? customer.gender.toUpperCase() : 'Not specified'}
                        </Descriptions.Item>
                      </Descriptions>

                      {/* Residential Address Info */}
                      <Title level={5} style={{ marginBottom: 12 }}>
                        Address & Location
                      </Title>
                      <Descriptions bordered column={{ xs: 1, sm: 2 }} size="middle" style={{ marginBottom: 20 }}>
                        <Descriptions.Item label="Province / State">
                          {customer.province || 'Bagmati'}
                        </Descriptions.Item>
                        <Descriptions.Item label="District / City">
                          {customer.districtCity || customer.city || 'Kathmandu'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Postal Code">
                          {customer.postalCode || '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Country">
                          {customer.country || 'Nepal'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Street Address" span={2}>
                          {customer.address || '-'}
                        </Descriptions.Item>
                      </Descriptions>

                      {/* Corporate Information if present */}
                      {(customer.customerType === 'business' || customer.companyName) && (
                        <div style={{ marginBottom: 20 }}>
                          <Title level={5} style={{ marginBottom: 12 }}>
                            Corporate & Business Information
                          </Title>
                          <Descriptions bordered column={{ xs: 1, sm: 2 }} size="middle">
                            <Descriptions.Item label="Company Legal Name" span={2}>
                              <strong style={{ fontSize: 14 }}>{customer.companyName || '-'}</strong>
                            </Descriptions.Item>
                            <Descriptions.Item label="PAN / VAT Number">
                              <Tag color="gold" style={{ fontSize: 13, padding: '2px 8px' }}>
                                {customer.companyTaxId || 'Not specified'}
                              </Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="Corporate Billing Address" span={2}>
                              {customer.billingAddress || customer.address || '-'}
                            </Descriptions.Item>
                          </Descriptions>
                        </div>
                      )}

                      {/* Operational Notes */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <Title level={5} style={{ margin: 0 }}>
                            Internal Operational Notes
                          </Title>
                          <Button size="small" icon={<EditOutlined />} onClick={openEditModal}>
                            Edit Note
                          </Button>
                        </div>
                        <div
                          style={{
                            padding: '14px 18px',
                            backgroundColor: '#f8fafc',
                            borderRadius: 8,
                            color: '#334155',
                            fontSize: 13,
                            border: '1px solid #e2e8f0',
                            minHeight: 60,
                            whiteSpace: 'pre-wrap',
                          }}
                        >
                          {customer.notes || 'No internal remarks or notes recorded for this customer.'}
                        </div>
                      </div>
                    </Col>

                    {/* Right Column: Licence, Emergency Contact & Eligibility */}
                    <Col xs={24} lg={9}>
                      {/* Driving Licence Card */}
                      <Card
                        title={
                          <Space>
                            <IdcardOutlined style={{ color: '#1677ff' }} />
                            <span>Driving Licence</span>
                          </Space>
                        }
                        size="small"
                        style={{
                          borderRadius: 10,
                          border: '1px solid #e2e8f0',
                          marginBottom: 16,
                          backgroundColor: '#f8fafc',
                        }}
                      >
                        <div style={{ padding: '8px 0' }}>
                          <div style={{ fontSize: 12, color: '#64748b' }}>Licence Number</div>
                          <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: '2px 0 10px 0' }}>
                            {customer.licenseNumber ? (
                              <span>{customer.licenseNumber}</span>
                            ) : (
                              <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No Licence Provided</span>
                            )}
                          </div>

                          <Row gutter={[12, 12]}>
                            <Col span={12}>
                              <div style={{ fontSize: 12, color: '#64748b' }}>Category</div>
                              <Tag color="cyan" style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>
                                Category {customer.licenseCategory || 'B'}
                              </Tag>
                            </Col>
                            <Col span={12}>
                              <div style={{ fontSize: 12, color: '#64748b' }}>Expiry Date</div>
                              <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>
                                {customer.licenseExpiry ? (
                                  <span>
                                    {formatDate(customer.licenseExpiry)}
                                    {dayjs(customer.licenseExpiry).isBefore(dayjs()) && (
                                      <Tag color="error" style={{ marginLeft: 4 }}>
                                        EXPIRED
                                      </Tag>
                                    )}
                                  </span>
                                ) : (
                                  '-'
                                )}
                              </div>
                            </Col>
                          </Row>
                        </div>
                      </Card>

                      {/* Emergency Contact Card */}
                      <Card
                        title={
                          <Space>
                            <PhoneOutlined style={{ color: '#52c41a' }} />
                            <span>Emergency Contact</span>
                          </Space>
                        }
                        size="small"
                        style={{
                          borderRadius: 10,
                          border: '1px solid #e2e8f0',
                          marginBottom: 16,
                        }}
                      >
                        <Descriptions column={1} size="small">
                          <Descriptions.Item label="Contact Name">
                            <strong>{customer.emergencyContactName || '-'}</strong>
                          </Descriptions.Item>
                          <Descriptions.Item label="Relationship">
                            {customer.emergencyContactRelationship || '-'}
                          </Descriptions.Item>
                          <Descriptions.Item label="Contact Phone">
                            {customer.emergencyContactPhone ? (
                              <a href={`tel:${customer.emergencyContactPhone}`} style={{ color: '#1677ff' }}>
                                {customer.emergencyContactPhone}
                              </a>
                            ) : (
                              '-'
                            )}
                          </Descriptions.Item>
                        </Descriptions>
                      </Card>

                      {/* Risk & Rental Eligibility Card */}
                      <Card
                        title={
                          <Space>
                            <SafetyCertificateOutlined style={{ color: '#fa8c16' }} />
                            <span>Risk & Eligibility</span>
                          </Space>
                        }
                        size="small"
                        style={{
                          borderRadius: 10,
                          border: '1px solid #e2e8f0',
                          marginBottom: 16,
                        }}
                      >
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>
                            Rental Eligibility
                          </div>
                          <Tag
                            color={
                              customer.rentalEligibilityStatus === 'eligible'
                                ? 'success'
                                : customer.rentalEligibilityStatus === 'restricted'
                                ? 'warning'
                                : 'error'
                            }
                            style={{ fontSize: 13, padding: '4px 10px', fontWeight: 600 }}
                          >
                            {(customer.rentalEligibilityStatus || 'ELIGIBLE').toUpperCase()}
                          </Tag>
                        </div>

                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>
                            Customer Trust Rating
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Rate disabled defaultValue={customer.rating || 5} allowHalf style={{ fontSize: 16 }} />
                            <span style={{ fontWeight: 600, fontSize: 14 }}>{customer.rating || 5.0} / 5</span>
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>
                            Account Registration Date
                          </div>
                          <div style={{ fontSize: 13 }}>
                            {customer.createdAt ? formatDateTime(customer.createdAt) : 'Registered in system'}
                          </div>
                        </div>
                      </Card>

                      {/* Quick Profile Actions Card */}
                      <Card
                        size="small"
                        style={{
                          borderRadius: 10,
                          border: '1px solid #e2e8f0',
                          backgroundColor: '#fafafa',
                        }}
                      >
                        <Space direction="vertical" style={{ width: '100%' }}>
                          <Button
                            block
                            type="primary"
                            icon={<CarOutlined />}
                            onClick={() => navigate(`/operations/bookings/new?customerId=${customer.id}`)}
                          >
                            Create Booking for {customer.fullName.split(' ')[0]}
                          </Button>
                          <Button
                            block
                            icon={<FileTextOutlined />}
                            onClick={() => setIsAddDocModalOpen(true)}
                          >
                            Attach KYC Document
                          </Button>
                          <Button
                            block
                            icon={<TeamOutlined />}
                            onClick={() => setIsAddDriverModalOpen(true)}
                          >
                            Add Authorized Driver
                          </Button>
                          <Popconfirm
                            title="Delete Customer Profile"
                            description={`Are you sure you want to permanently remove ${customer.fullName}? This cannot be undone.`}
                            okText="Yes, Delete"
                            okType="danger"
                            onConfirm={() => deleteCustomerMutation.mutate()}
                          >
                            <Button block danger icon={<DeleteOutlined />}>
                              Delete Customer
                            </Button>
                          </Popconfirm>
                        </Space>
                      </Card>
                    </Col>
                  </Row>
                </div>
              ),
            },

            // TAB 2: KYC & COMPLIANCE DOCUMENTS
            {
              key: 'documents',
              label: (
                <span>
                  <FileTextOutlined style={{ marginRight: 6 }} />
                  KYC Documents ({mergedDocs.length})
                </span>
              ),
              children: (
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 16,
                      flexWrap: 'wrap',
                      gap: 12,
                    }}
                  >
                    <div>
                      <Text strong style={{ fontSize: 15 }}>
                        Official Identification & KYC Records
                      </Text>
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        {validDocs} Verified • {pendingDocs} Pending Verification • {rejectedDocs} Rejected
                      </div>
                    </div>

                    <Space wrap>
                      <Segmented
                        size="middle"
                        options={[
                          { value: 'cards', icon: <AppstoreOutlined />, label: 'Visual Cards' },
                          { value: 'table', icon: <BarsOutlined />, label: 'Table' },
                        ]}
                        value={docViewMode}
                        onChange={(val) => setDocViewMode(val as 'cards' | 'table')}
                      />
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => setIsAddDocModalOpen(true)}
                      >
                        Attach Document
                      </Button>
                    </Space>
                  </div>

                  {docsLoading ? (
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
                      <Spin tip="Loading verified KYC documents..." />
                    </div>
                  ) : mergedDocs.length === 0 ? (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="No official KYC documents (Licence, Citizenship, Passport) attached yet"
                      style={{ padding: '30px 0' }}
                    >
                      <Button
                        type="primary"
                        size="large"
                        icon={<PlusOutlined />}
                        onClick={() => setIsAddDocModalOpen(true)}
                      >
                        Attach Official Documents
                      </Button>
                    </Empty>
                  ) : docViewMode === 'cards' ? (
                    /* Visual Document Cards */
                    <Row gutter={[16, 16]}>
                      {mergedDocs.map((doc, docIdx) => {
                        const meta = DOC_TYPE_META[doc.docType] || {
                          label: doc.name || 'Document',
                          color: 'blue',
                        }
                        const isImage = doc.fileUrl && !doc.fileUrl.toLowerCase().endsWith('.pdf')

                        return (
                          <Col xs={24} sm={12} lg={8} key={doc.id || docIdx}>
                            <Card
                              size="small"
                              style={{
                                borderRadius: 10,
                                border: '1px solid #e2e8f0',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                              }}
                              styles={{ body: { padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' } }}
                            >
                              {/* Header badge & title */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                                <Tag color={meta.color} style={{ fontSize: 12, padding: '2px 8px' }}>
                                  {meta.label}
                                </Tag>
                                <Tag
                                  color={
                                    doc.verificationStatus === 'verified'
                                      ? 'success'
                                      : doc.verificationStatus === 'rejected'
                                      ? 'error'
                                      : 'warning'
                                  }
                                >
                                  {(doc.verificationStatus || 'pending').toUpperCase()}
                                </Tag>
                              </div>

                              <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a', marginBottom: 4 }}>
                                {doc.name}
                              </div>

                              {doc.documentNumber && (
                                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
                                  Document ID: <strong>{doc.documentNumber}</strong>
                                </div>
                              )}

                              {/* Document Scanned Photo Preview */}
                              <div style={{ margin: '10px 0', textAlign: 'center', backgroundColor: '#f1f5f9', borderRadius: 8, padding: 6 }}>
                                {doc.fileUrl ? (
                                  isImage ? (
                                    <Image
                                      src={doc.fileUrl}
                                      alt={doc.name}
                                      style={{
                                        width: '100%',
                                        height: 140,
                                        objectFit: 'cover',
                                        borderRadius: 6,
                                      }}
                                    />
                                  ) : (
                                    <div
                                      style={{
                                        height: 140,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#ef4444',
                                      }}
                                    >
                                      <FilePdfOutlined style={{ fontSize: 42, marginBottom: 6 }} />
                                      <span style={{ fontSize: 12, color: '#475569' }}>PDF Document</span>
                                    </div>
                                  )
                                ) : (
                                  <div
                                    style={{
                                      height: 140,
                                      display: 'flex',
                                      flexDirection: 'column',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      color: '#94a3b8',
                                    }}
                                  >
                                    <FileTextOutlined style={{ fontSize: 36, marginBottom: 4 }} />
                                    <span style={{ fontSize: 12 }}>No image attached</span>
                                  </div>
                                )}
                              </div>

                              {/* Dates breakdown */}
                              <div style={{ fontSize: 12, color: '#475569', marginBottom: 12, flex: 1 }}>
                                <div>
                                  Issue Date: <strong>{doc.issueDate ? formatDate(doc.issueDate) : 'N/A'}</strong>
                                </div>
                                <div style={{ marginTop: 2 }}>
                                  Expiry Date:{' '}
                                  <strong style={{ color: doc.expiryDate && dayjs(doc.expiryDate).isBefore(dayjs()) ? '#ef4444' : 'inherit' }}>
                                    {doc.expiryDate ? formatDate(doc.expiryDate) : 'No Expiry'}
                                  </strong>
                                </div>
                                {doc.issuingAuthority && (
                                  <div style={{ marginTop: 2 }}>
                                    Authority: <strong>{doc.issuingAuthority}</strong>
                                  </div>
                                )}
                              </div>

                              <Divider style={{ margin: '8px 0 12px 0' }} />

                              {/* Quick Action buttons */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                                <Space size={4}>
                                  {doc.fileUrl && (
                                    <Button
                                      size="small"
                                      icon={<DownloadOutlined />}
                                      onClick={() => window.open(doc.fileUrl, '_blank')}
                                    >
                                      View
                                    </Button>
                                  )}
                                  {doc.verificationStatus !== 'verified' && (
                                    <Button
                                      size="small"
                                      type="primary"
                                      icon={<CheckOutlined />}
                                      onClick={() => verifyDocMutation.mutate({ docId: doc.id, status: 'verified' })}
                                      loading={verifyDocMutation.isPending}
                                    >
                                      Approve
                                    </Button>
                                  )}
                                </Space>

                                <Popconfirm
                                  title="Delete Document"
                                  description="Remove this official document?"
                                  okText="Delete"
                                  okType="danger"
                                  onConfirm={() => deleteDocMutation.mutate(doc.id)}
                                >
                                  <Button size="small" danger icon={<DeleteOutlined />} />
                                </Popconfirm>
                              </div>
                            </Card>
                          </Col>
                        )
                      })}
                    </Row>
                  ) : (
                    /* Table Mode */
                    <Table
                      dataSource={mergedDocs}
                      rowKey="id"
                      pagination={{ pageSize: 8 }}
                      size="middle"
                      columns={[
                        {
                          title: 'Document Name & Number',
                          key: 'name',
                          render: (_, r) => (
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 14 }}>{r.name}</div>
                              {r.documentNumber && (
                                <div style={{ fontSize: 12, color: '#64748b' }}>
                                  ID / No: <strong>{r.documentNumber}</strong>
                                </div>
                              )}
                            </div>
                          ),
                        },
                        {
                          title: 'Type',
                          dataIndex: 'docType',
                          key: 'docType',
                          render: (t) => {
                            const meta = DOC_TYPE_META[t] || { label: t || 'Document', color: 'blue' }
                            return <Tag color={meta.color}>{meta.label}</Tag>
                          },
                        },
                        {
                          title: 'Authority',
                          dataIndex: 'issuingAuthority',
                          key: 'auth',
                          render: (a) => a || '-',
                        },
                        {
                          title: 'Validity',
                          key: 'validity',
                          render: (_, r) => (
                            <div>
                              <div>Issue: {r.issueDate ? formatDate(r.issueDate) : '-'}</div>
                              <div style={{ color: r.expiryDate && dayjs(r.expiryDate).isBefore(dayjs()) ? '#ef4444' : 'inherit' }}>
                                Expiry: {r.expiryDate ? formatDate(r.expiryDate) : 'No Expiry'}
                              </div>
                            </div>
                          ),
                        },
                        {
                          title: 'KYC Status',
                          dataIndex: 'verificationStatus',
                          key: 'status',
                          render: (s) => (
                            <Tag color={s === 'verified' ? 'success' : s === 'rejected' ? 'error' : 'warning'}>
                              {(s || 'pending').toUpperCase()}
                            </Tag>
                          ),
                        },
                        {
                          title: 'Actions',
                          key: 'act',
                          render: (_, r) => (
                            <Space size="small">
                              {r.fileUrl && (
                                <Button
                                  size="small"
                                  icon={<EyeOutlined />}
                                  onClick={() => window.open(r.fileUrl, '_blank')}
                                >
                                  View
                                </Button>
                              )}
                              {r.verificationStatus !== 'verified' && (
                                <Button
                                  size="small"
                                  type="primary"
                                  icon={<CheckOutlined />}
                                  onClick={() => verifyDocMutation.mutate({ docId: r.id, status: 'verified' })}
                                >
                                  Approve
                                </Button>
                              )}
                              <Popconfirm
                                title="Delete Document"
                                description="Delete this document?"
                                okText="Delete"
                                okType="danger"
                                onConfirm={() => deleteDocMutation.mutate(r.id)}
                              >
                                <Button size="small" danger icon={<DeleteOutlined />} />
                              </Popconfirm>
                            </Space>
                          ),
                        },
                      ]}
                    />
                  )}
                </div>
              ),
            },

            // TAB 3: AUTHORIZED DRIVERS
            {
              key: 'drivers',
              label: (
                <span>
                  <TeamOutlined style={{ marginRight: 6 }} />
                  Authorized Drivers ({mergedDrivers.length})
                </span>
              ),
              children: (
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 16,
                      flexWrap: 'wrap',
                      gap: 12,
                    }}
                  >
                    <div>
                      <Text strong style={{ fontSize: 15 }}>
                        Authorized & Linked Chauffeurs / Drivers
                      </Text>
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        Drivers eligible to operate vehicles rented under this customer account
                      </div>
                    </div>

                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => setIsAddDriverModalOpen(true)}
                    >
                      Add Authorized Driver
                    </Button>
                  </div>

                  {driversLoading ? (
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
                      <Spin tip="Loading linked drivers..." />
                    </div>
                  ) : mergedDrivers.length === 0 ? (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="No additional authorized drivers linked to this customer"
                      style={{ padding: '30px 0' }}
                    >
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => setIsAddDriverModalOpen(true)}
                      >
                        Add Authorized Driver
                      </Button>
                    </Empty>
                  ) : (
                    <Table
                      dataSource={mergedDrivers}
                      rowKey="id"
                      pagination={false}
                      size="middle"
                      columns={[
                        {
                          title: 'Driver Full Name',
                          key: 'name',
                          render: (_, r) => (
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 14 }}>{r.fullName}</div>
                              <div style={{ fontSize: 12, color: '#64748b' }}>
                                <PhoneOutlined style={{ marginRight: 4 }} />
                                {r.phone}
                                {r.email && ` • ${r.email}`}
                              </div>
                            </div>
                          ),
                        },
                        {
                          title: 'Relationship',
                          dataIndex: 'relationship',
                          key: 'rel',
                          render: (rel) => (
                            <Tag color="blue">{String(rel || 'authorized_driver').replace('_', ' ').toUpperCase()}</Tag>
                          ),
                        },
                        {
                          title: 'Licence Number & Category',
                          key: 'lic',
                          render: (_, r) => (
                            <div>
                              <strong>{r.licenseNumber}</strong>
                              <div>
                                <Tag color="cyan" style={{ marginTop: 2 }}>
                                  Cat {r.licenseCategory || 'B'}
                                </Tag>
                              </div>
                            </div>
                          ),
                        },
                        {
                          title: 'Licence Expiry',
                          dataIndex: 'licenseExpiryDate',
                          key: 'exp',
                          render: (d) => (
                            <span style={{ color: d && dayjs(d).isBefore(dayjs()) ? '#ef4444' : 'inherit' }}>
                              {d ? formatDate(d) : 'Perpetual / Not set'}
                            </span>
                          ),
                        },
                        {
                          title: 'Status',
                          dataIndex: 'verificationStatus',
                          key: 'st',
                          render: (st) => (
                            <Tag color={st === 'verified' ? 'success' : 'warning'}>
                              {(st || 'pending').toUpperCase()}
                            </Tag>
                          ),
                        },
                        {
                          title: 'Actions',
                          key: 'act',
                          render: (_, r) => (
                            <Popconfirm
                              title="Remove Driver"
                              description={`Remove ${r.fullName} from authorized drivers?`}
                              okText="Yes, Remove"
                              okType="danger"
                              onConfirm={() => deleteDriverMutation.mutate(r.id)}
                            >
                              <Button size="small" danger icon={<DeleteOutlined />}>
                                Remove
                              </Button>
                            </Popconfirm>
                          ),
                        },
                      ]}
                    />
                  )}
                </div>
              ),
            },

            // TAB 4: BOOKINGS & RENTALS
            {
              key: 'bookings',
              label: (
                <span>
                  <CarOutlined style={{ marginRight: 6 }} />
                  Rentals & Bookings ({customerBookings.length})
                </span>
              ),
              children: (
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 16,
                      flexWrap: 'wrap',
                      gap: 12,
                    }}
                  >
                    <div>
                      <Text strong style={{ fontSize: 15 }}>
                        Rental Contracts & History
                      </Text>
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        All historical, active, and scheduled bookings for {customer.fullName}
                      </div>
                    </div>

                    <Button
                      type="primary"
                      icon={<CarOutlined />}
                      onClick={() => navigate(`/operations/bookings/new?customerId=${customer.id}`)}
                    >
                      Create New Booking
                    </Button>
                  </div>

                  {bookingsLoading ? (
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
                      <Spin tip="Loading rental bookings..." />
                    </div>
                  ) : customerBookings.length === 0 ? (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="No bookings found for this customer"
                      style={{ padding: '30px 0' }}
                    >
                      <Button
                        type="primary"
                        icon={<CarOutlined />}
                        onClick={() => navigate(`/operations/bookings/new?customerId=${customer.id}`)}
                      >
                        Create First Booking
                      </Button>
                    </Empty>
                  ) : (
                    <Table
                      dataSource={customerBookings}
                      rowKey="id"
                      pagination={{ pageSize: 8 }}
                      size="middle"
                      columns={[
                        {
                          title: 'Booking Code',
                          dataIndex: 'bookingCode',
                          key: 'code',
                          render: (code, r) => (
                            <div>
                              <strong style={{ color: '#1677ff', cursor: 'pointer' }} onClick={() => navigate(`/operations/bookings?id=${r.id}`)}>
                                {code || `BK-${r.id.slice(0, 6)}`}
                              </strong>
                              <div style={{ fontSize: 11, color: '#94a3b8' }}>
                                Booked {formatDate(r.createdAt || r.startDate)}
                              </div>
                            </div>
                          ),
                        },
                        {
                          title: 'Vehicle',
                          key: 'veh',
                          render: (_, r) => (
                            <Space size={8}>
                              <CarOutlined style={{ color: '#1677ff' }} />
                              <div>
                                <div style={{ fontWeight: 600 }}>{r.vehicleModel || 'Fleet Vehicle'}</div>
                                {r.vehiclePlate && <Tag style={{ fontSize: 11, marginTop: 2 }}>{r.vehiclePlate}</Tag>}
                              </div>
                            </Space>
                          ),
                        },
                        {
                          title: 'Rental Period',
                          key: 'period',
                          render: (_, r) => (
                            <div>
                              <div>{formatDate(r.startDate)} → {formatDate(r.endDate)}</div>
                              <div style={{ fontSize: 12, color: '#64748b' }}>
                                Duration: <strong>{r.totalDays || dayjs(r.endDate).diff(dayjs(r.startDate), 'day') || 1} days</strong>
                              </div>
                            </div>
                          ),
                        },
                        {
                          title: 'Total Amount',
                          dataIndex: 'totalAmount',
                          key: 'amt',
                          render: (amt, r) => (
                            <div>
                              <CurrencyDisplay amount={amt || 0} strong />
                              {r.paymentStatus && (
                                <div style={{ fontSize: 11, marginTop: 2 }}>
                                  <Tag
                                    color={
                                      r.paymentStatus === 'paid'
                                        ? 'success'
                                        : r.paymentStatus === 'partially_paid'
                                        ? 'warning'
                                        : 'default'
                                    }
                                  >
                                    {r.paymentStatus.toUpperCase()}
                                  </Tag>
                                </div>
                              )}
                            </div>
                          ),
                        },
                        {
                          title: 'Rental Status',
                          dataIndex: 'status',
                          key: 'status',
                          render: (status) => <StatusBadge status={status || 'pending'} />,
                        },
                        {
                          title: 'Action',
                          key: 'action',
                          render: (_, r) => (
                            <Button
                              size="small"
                              icon={<EyeOutlined />}
                              onClick={() => navigate(`/operations/bookings?id=${r.id}`)}
                            >
                              View Details
                            </Button>
                          ),
                        },
                      ]}
                    />
                  )}
                </div>
              ),
            },

            // TAB 5: FINANCIALS & PAYMENTS
            {
              key: 'financials',
              label: (
                <span>
                  <CreditCardOutlined style={{ marginRight: 6 }} />
                  Financials & Payments
                </span>
              ),
              children: (
                <div>
                  <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                    <Col xs={24} sm={8}>
                      <Card
                        size="small"
                        style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8 }}
                      >
                        <div style={{ fontSize: 12, color: '#166534' }}>Total Payments Made</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: '#15803d', marginTop: 4 }}>
                          <CurrencyDisplay amount={totalRevenue} />
                        </div>
                      </Card>
                    </Col>
                    <Col xs={24} sm={8}>
                      <Card
                        size="small"
                        style={{
                          backgroundColor: (customer.outstandingBalance || 0) > 0 ? '#fff1f2' : '#f8fafc',
                          border: `1px solid ${(customer.outstandingBalance || 0) > 0 ? '#fecdd3' : '#e2e8f0'}`,
                          borderRadius: 8,
                        }}
                      >
                        <div style={{ fontSize: 12, color: '#64748b' }}>Outstanding Balance</div>
                        <div
                          style={{
                            fontSize: 20,
                            fontWeight: 700,
                            color: (customer.outstandingBalance || 0) > 0 ? '#e11d48' : '#0f172a',
                            marginTop: 4,
                          }}
                        >
                          <CurrencyDisplay amount={customer.outstandingBalance || 0} />
                        </div>
                      </Card>
                    </Col>
                    <Col xs={24} sm={8}>
                      <Card
                        size="small"
                        style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8 }}
                      >
                        <div style={{ fontSize: 12, color: '#1e40af' }}>Security Deposit Status</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: '#2563eb', marginTop: 4 }}>
                          Clear
                        </div>
                      </Card>
                    </Col>
                  </Row>

                  <Title level={5} style={{ marginBottom: 12 }}>
                    Payment Transactions Ledger
                  </Title>

                  {txLoading ? (
                    <div style={{ textAlign: 'center', padding: '30px 0' }}>
                      <Spin tip="Loading payment transactions..." />
                    </div>
                  ) : allTransactions.length === 0 ? (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="No payments or transactions recorded for this customer yet"
                      style={{ padding: '20px 0' }}
                    />
                  ) : (
                    <Table
                      dataSource={allTransactions}
                      rowKey="id"
                      pagination={{ pageSize: 8 }}
                      size="middle"
                      columns={[
                        {
                          title: 'Txn Number',
                          dataIndex: 'transactionNumber',
                          key: 'txn',
                          render: (txn) => <strong>{txn}</strong>,
                        },
                        {
                          title: 'Date & Time',
                          dataIndex: 'timestamp',
                          key: 'time',
                          render: (t) => formatDateTime(t),
                        },
                        {
                          title: 'Category',
                          dataIndex: 'category',
                          key: 'cat',
                          render: (c) => <Tag color="blue">{String(c || 'rental').toUpperCase()}</Tag>,
                        },
                        {
                          title: 'Payment Method',
                          dataIndex: 'method',
                          key: 'method',
                          render: (m) => <Tag color="cyan">{String(m || 'cash').toUpperCase()}</Tag>,
                        },
                        {
                          title: 'Amount',
                          dataIndex: 'amount',
                          key: 'amount',
                          render: (amt) => <CurrencyDisplay amount={amt} strong />,
                        },
                        {
                          title: 'Status',
                          dataIndex: 'status',
                          key: 'status',
                          render: (st) => (
                            <Tag color={st === 'completed' ? 'success' : st === 'pending' ? 'warning' : 'error'}>
                              {(st || 'completed').toUpperCase()}
                            </Tag>
                          ),
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

      {/* 4. MODALS */}

      {/* EDIT CUSTOMER MODAL */}
      <Modal
        title={
          <div style={{ fontSize: 18, fontWeight: 700 }}>
            Edit Customer Profile - {customer.fullName}
          </div>
        }
        open={isEditModalOpen}
        onCancel={() => setIsEditModalOpen(false)}
        onOk={handleEditSubmit}
        confirmLoading={updateMutation.isPending}
        okText="Save Changes"
        width={760}
      >
        <Form form={editForm} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="fullName"
                label="Full Legal Name"
                rules={[{ required: true, message: 'Full name is required' }]}
              >
                <Input placeholder="e.g. Ramesh Thapa" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={6}>
              <Form.Item name="customerType" label="Customer Type">
                <Select
                  options={[
                    { label: 'Individual', value: 'individual' },
                    { label: 'Business / Corporate', value: 'business' },
                    { label: 'Organization / NGO', value: 'organization' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={6}>
              <Form.Item name="customerCode" label="Customer Code">
                <Input placeholder="e.g. CUST-2026-01" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="email"
                label="Primary Email"
                rules={[{ required: true, type: 'email', message: 'Valid email is required' }]}
              >
                <Input placeholder="name@domain.com" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="phone"
                label="Primary Phone Number"
                rules={[{ required: true, message: 'Phone number is required' }]}
              >
                <Input placeholder="e.g. +977 9801234567" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="secondaryPhone" label="Secondary Phone / WhatsApp">
                <Input placeholder="e.g. +977 9841000000" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={6}>
              <Form.Item name="gender" label="Gender">
                <Select
                  options={[
                    { label: 'Male', value: 'male' },
                    { label: 'Female', value: 'female' },
                    { label: 'Other', value: 'other' },
                  ]}
                  allowClear
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={6}>
              <Form.Item name="dateOfBirth" label="Date of Birth">
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ margin: '12px 0' }} />

          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Form.Item name="province" label="Province">
                <Input placeholder="e.g. Bagmati" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="districtCity" label="District / City">
                <Input placeholder="e.g. Kathmandu" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="country" label="Country">
                <Input placeholder="Nepal" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="address" label="Street Residential Address">
            <Input placeholder="e.g. Baluwatar, Ward 4, House 120" />
          </Form.Item>

          <Divider style={{ margin: '12px 0' }} />

          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Form.Item name="licenseNumber" label="Driving Licence Number">
                <Input placeholder="e.g. 01-06-0023412" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="licenseCategory" label="Licence Category">
                <Select
                  options={[
                    { label: 'Category A (Motorcycle)', value: 'A' },
                    { label: 'Category B (Car / Jeep / Van)', value: 'B' },
                    { label: 'Category C (Heavy Vehicle / Bus)', value: 'C' },
                    { label: 'Category D (Heavy Machinery)', value: 'D' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="licenseExpiry" label="Licence Expiry Date">
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="companyName" label="Corporate Company Name">
                <Input placeholder="e.g. Himalayan Ventures Pvt Ltd" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="companyTaxId" label="Company PAN / VAT Number">
                <Input placeholder="e.g. 600123456" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Form.Item name="emergencyContactName" label="Emergency Contact Person">
                <Input placeholder="e.g. Sunita Thapa" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="emergencyContactRelationship" label="Relationship">
                <Input placeholder="e.g. Spouse / Brother" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="emergencyContactPhone" label="Emergency Phone">
                <Input placeholder="e.g. +977 9800000000" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="notes" label="Internal Staff Remarks">
            <TextArea rows={3} placeholder="Add operational notes or special instructions regarding this client..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* KYC AUDIT / VERIFICATION DECISION MODAL */}
      <Modal
        title={
          <div style={{ fontSize: 18, fontWeight: 700 }}>
            KYC Identity Audit Decision - {customer.fullName}
          </div>
        }
        open={isVerifyModalOpen}
        onCancel={() => setIsVerifyModalOpen(false)}
        onOk={() => verifyMutation.mutate({ status: verifyStatus, notes: verifyNotes })}
        confirmLoading={verifyMutation.isPending}
        okText="Confirm Verification Decision"
        width={560}
      >
        <div style={{ padding: '10px 0' }}>
          <Paragraph type="secondary">
            Audit identity records and documents for {customer.fullName} (Licence: {customer.licenseNumber || 'N/A'}).
          </Paragraph>

          <div style={{ marginBottom: 16 }}>
            <Text strong>Select Audit Decision:</Text>
            <div style={{ marginTop: 8, display: 'flex', gap: 10 }}>
              <Button
                type={verifyStatus === 'verified' ? 'primary' : 'default'}
                icon={<CheckCircleOutlined />}
                onClick={() => setVerifyStatus('verified')}
                style={verifyStatus === 'verified' ? { backgroundColor: '#10b981', borderColor: '#10b981' } : {}}
              >
                Approve & Mark Verified
              </Button>
              <Button
                danger={verifyStatus === 'rejected'}
                type={verifyStatus === 'rejected' ? 'primary' : 'default'}
                icon={<CloseCircleOutlined />}
                onClick={() => setVerifyStatus('rejected')}
              >
                Reject KYC
              </Button>
              <Button
                type={verifyStatus === 'needs_correction' ? 'primary' : 'default'}
                icon={<WarningOutlined />}
                onClick={() => setVerifyStatus('needs_correction')}
              >
                Needs Correction
              </Button>
            </div>
          </div>

          <Form.Item label="Auditor Remarks / Audit Trail">
            <TextArea
              rows={3}
              placeholder="e.g. Driving Licence and Citizenship verified against government portal and physical inspection..."
              value={verifyNotes}
              onChange={(e) => setVerifyNotes(e.target.value)}
            />
          </Form.Item>
        </div>
      </Modal>

      {/* BLACKLIST / RESTRICTION MODAL */}
      <Modal
        title={
          <div style={{ fontSize: 18, fontWeight: 700, color: '#ef4444' }}>
            Blacklist Customer & Restrict Bookings
          </div>
        }
        open={isBlacklistModalOpen}
        onCancel={() => setIsBlacklistModalOpen(false)}
        onOk={() =>
          blacklistMutation.mutate({
            isBlacklisted: true,
            reason: blacklistReason || 'Non-compliance with rental agreement or high risk profile',
          })
        }
        confirmLoading={blacklistMutation.isPending}
        okText="Confirm Blacklist"
        okType="danger"
      >
        <div style={{ padding: '8px 0' }}>
          <Alert
            type="error"
            showIcon
            title="Rental Blacklist"
            description="Blacklisting this customer will immediately prevent reservations and trigger fraud alerts on linked drivers."
            style={{ marginBottom: 16 }}
          />

          <Form.Item
            label="Mandatory Reason for Blacklisting"
            required
          >
            <TextArea
              rows={3}
              placeholder="State formal reason (e.g. vehicle damage unpaid, fraudulent credit card, overdue return, unauthorized driver)..."
              value={blacklistReason}
              onChange={(e) => setBlacklistReason(e.target.value)}
            />
          </Form.Item>
        </div>
      </Modal>

      {/* ATTACH OFFICIAL DOCUMENT MODAL */}
      <Modal
        title="Attach Official KYC Document"
        open={isAddDocModalOpen}
        onCancel={() => setIsAddDocModalOpen(false)}
        onOk={() => docForm.submit()}
        confirmLoading={addDocMutation.isPending}
        okText="Upload & Attach Document"
        width={620}
      >
        <Form
          form={docForm}
          layout="vertical"
          onFinish={(values) => addDocMutation.mutate(values)}
          style={{ marginTop: 16 }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="docType"
                label="Document Classification"
                rules={[{ required: true, message: 'Please select document type' }]}
                initialValue="driving_licence"
              >
                <Select
                  options={[
                    { label: 'Driving Licence', value: 'driving_licence' },
                    { label: 'Citizenship Certificate', value: 'citizenship' },
                    { label: 'Passport', value: 'passport' },
                    { label: 'National ID (NID)', value: 'national_id' },
                    { label: 'Address Proof / Utility Bill', value: 'address_proof' },
                    { label: 'Business Registration / PAN', value: 'business_registration' },
                    { label: 'Signed KYC Form', value: 'signed_form' },
                    { label: 'Other Document', value: 'other' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="name"
                label="Document Title"
                rules={[{ required: true, message: 'Document title is required' }]}
                initialValue="Driving Licence Front & Back"
              >
                <Input placeholder="e.g. Driving Licence Front" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="documentNumber" label="Document / Certificate No.">
                <Input placeholder="e.g. 01-06-0023412" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="issuingAuthority" label="Issuing Authority">
                <Input placeholder="e.g. Yatayat Karyalaya, Ekantakuna" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="issueDate" label="Issue Date">
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="expiryDate" label="Expiry Date">
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Upload Scanned File / Photo">
            <FileUploader
              fileList={docFileList}
              onChange={setDocFileList}
              title="Click or drag KYC document photo / PDF here"
              description="Supports PNG, JPG, or PDF up to 10MB"
              multiple={false}
              folder="customer-documents"
            />
          </Form.Item>

          <Form.Item name="notes" label="Notes / Verification Comments">
            <TextArea rows={2} placeholder="Optional notes about this document..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* ADD AUTHORIZED DRIVER MODAL */}
      <Modal
        title="Add Authorized Driver to Account"
        open={isAddDriverModalOpen}
        onCancel={() => setIsAddDriverModalOpen(false)}
        onOk={() => driverForm.submit()}
        confirmLoading={addDriverMutation.isPending}
        okText="Link Driver"
        width={620}
      >
        <Form
          form={driverForm}
          layout="vertical"
          onFinish={(values) => addDriverMutation.mutate(values)}
          style={{ marginTop: 16 }}
        >
          <Row gutter={16}>
            <Col span={14}>
              <Form.Item
                name="fullName"
                label="Driver Full Name"
                rules={[{ required: true, message: 'Driver name is required' }]}
              >
                <Input placeholder="e.g. Bikash Sharma" />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item
                name="relationship"
                label="Relationship to Customer"
                initialValue="authorized_driver"
              >
                <Select
                  options={[
                    { label: 'Authorized Driver', value: 'authorized_driver' },
                    { label: 'Company Chauffeur / Staff', value: 'chauffeur' },
                    { label: 'Family Member', value: 'family' },
                    { label: 'Spouse', value: 'spouse' },
                    { label: 'Self', value: 'self' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="phone"
                label="Driver Phone Number"
                rules={[{ required: true, message: 'Phone is required' }]}
              >
                <Input placeholder="e.g. +977 9801234567" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="email" label="Driver Email">
                <Input placeholder="driver@email.com" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="licenseNumber"
                label="Driving Licence Number"
                rules={[{ required: true, message: 'Licence number is required' }]}
              >
                <Input placeholder="e.g. 02-05-9988112" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="licenseCategory" label="Licence Category" initialValue="B">
                <Select
                  options={[
                    { label: 'Category A (Two Wheeler)', value: 'A' },
                    { label: 'Category B (Light Vehicle / Car)', value: 'B' },
                    { label: 'Category C (Heavy Vehicle)', value: 'C' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="dateOfBirth" label="Driver Date of Birth">
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="licenseExpiryDate" label="Licence Expiry Date">
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="notes" label="Notes">
            <TextArea rows={2} placeholder="Optional notes on driver qualification..." />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  )
}

export default CustomerViewPage

