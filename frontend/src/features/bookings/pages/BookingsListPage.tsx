import React, { useState } from 'react'
import {
  Space,
  Button,
  Select,
  Tag,
  Tabs,
  Card,
  Row,
  Col,
  Statistic,
  message,
  Tooltip,
} from 'antd'
import {
  PlusOutlined,
  EyeOutlined,
  CarOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
  CalendarOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/navigation/PageHeader'
import { PageContainer } from '@/components/navigation/PageContainer'
import { DataTable } from '@/components/data-display/DataTable'
import { DataTableToolbar } from '@/components/data-display/DataTableToolbar'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { CurrencyDisplay } from '@/components/data-display/CurrencyDisplay'
import { BookingDetailsDrawer } from './BookingDetailsDrawer'
import { NewBookingDrawer } from './NewBookingDrawer'
import { bookingsApi } from '../api'
import type { Booking, BookingStatus, BookingPaymentStatus, OperationsSummary } from '@/types/booking'
import type { ColumnOption } from '@/components/data-display/ColumnSettings'
import type { ColumnsType } from 'antd/es/table'
import { formatDateTime } from '@/lib/formatting/date'

export const BookingsListPage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const urlBookingId = searchParams.get('id')
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<string>('all')
  const [paymentFilter, setPaymentFilter] = useState<string>('all')
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false)

  // Fetch Operations Summary
  const { data: summary, refetch: refetchSummary } = useQuery<OperationsSummary>({
    queryKey: ['operations-summary'],
    queryFn: () => bookingsApi.getOperationsSummary(),
  })

  // Fetch Bookings
  const { data: bookings = [], isLoading, refetch } = useQuery<Booking[]>({
    queryKey: ['bookings', { search, status: activeTab, payment: paymentFilter }],
    queryFn: () =>
      bookingsApi.getBookings({
        search,
        status: activeTab === 'all' ? undefined : (activeTab as BookingStatus),
        paymentStatus: paymentFilter === 'all' ? undefined : (paymentFilter as BookingPaymentStatus),
      }),
  })

  // Auto-open booking details when id query param is present (e.g. ?id=bk-...)
  React.useEffect(() => {
    if (!urlBookingId) return
    const found = bookings.find(
      (b) => b.id === urlBookingId || b.bookingCode?.toLowerCase() === urlBookingId.toLowerCase()
    )
    if (found) {
      setSelectedBooking(found)
      setDetailsOpen(true)
    } else {
      bookingsApi
        .getBooking(urlBookingId)
        .then((b) => {
          if (b) {
            setSelectedBooking(b)
            setDetailsOpen(true)
          }
        })
        .catch(() => {})
    }
  }, [urlBookingId, bookings])

  const handleCloseDetails = () => {
    setDetailsOpen(false)
    if (urlBookingId) {
      const next = new URLSearchParams(searchParams)
      next.delete('id')
      setSearchParams(next, { replace: true })
    }
  }

  // Columns definition
  const [columnsState, setColumnsState] = useState<ColumnOption[]>([
    { key: 'code', title: 'Booking Code', visible: true },
    { key: 'customer', title: 'Customer', visible: true },
    { key: 'vehicle', title: 'Vehicle', visible: true },
    { key: 'dates', title: 'Rental Dates', visible: true },
    { key: 'status', title: 'Status', visible: true },
    { key: 'payment', title: 'Payment', visible: true },
    { key: 'total', title: 'Total / Balance', visible: true },
    { key: 'actions', title: 'Actions', visible: true },
  ])

  const columns: ColumnsType<Booking> = [
    {
      title: 'Booking Code',
      dataIndex: 'bookingCode',
      key: 'code',
      width: 140,
      render: (code: string, record: Booking) => (
        <a
          onClick={() => navigate(`/operations/bookings/${record.id}`)}
          style={{ fontWeight: 600, color: '#2563eb' }}
        >
          {code}
        </a>
      ),
    },
    {
      title: 'Customer',
      key: 'customer',
      width: 200,
      render: (_, record: Booking) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.customerName}</div>
          <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>{record.customerPhone}</div>
          {record.customerKycStatus && (
            <Tag color={record.customerKycStatus === 'verified' ? 'green' : 'orange'} style={{ fontSize: 10, marginTop: 2 }}>
              KYC {record.customerKycStatus.toUpperCase()}
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: 'Vehicle Asset',
      key: 'vehicle',
      width: 200,
      render: (_, record: Booking) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.vehicleModel}</div>
          <Tag color="blue" style={{ marginTop: 2 }}>{record.vehiclePlate}</Tag>
          {record.categoryName && <span style={{ fontSize: 11, color: '#888', marginLeft: 4 }}>{record.categoryName}</span>}
        </div>
      ),
    },
    {
      title: 'Rental Dates',
      key: 'dates',
      width: 220,
      render: (_, record: Booking) => (
        <div>
          <div style={{ fontSize: 12 }}>
            <strong>Out:</strong> {formatDateTime(record.startDate)}
          </div>
          <div style={{ fontSize: 12 }}>
            <strong>In:</strong> {formatDateTime(record.endDate)}
          </div>
          <Tag style={{ marginTop: 2 }}>{record.totalDays} Day(s)</Tag>
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status: BookingStatus) => <StatusBadge status={status} />,
    },
    {
      title: 'Payment Status',
      dataIndex: 'paymentStatus',
      key: 'payment',
      width: 130,
      render: (status: BookingPaymentStatus) => <StatusBadge status={status} />,
    },
    {
      title: 'Financials',
      key: 'total',
      width: 170,
      render: (_, record: Booking) => (
        <div>
          <div style={{ fontWeight: 600 }}>
            <CurrencyDisplay amount={record.totalAmount} />
          </div>
          <div style={{ fontSize: 11, color: record.balanceDue > 0 ? '#ff4d4f' : '#52c41a' }}>
            Balance: <CurrencyDisplay amount={record.balanceDue} />
          </div>
          {record.depositAmount > 0 && (
            <div style={{ fontSize: 11, color: '#888' }}>
              Deposit: <CurrencyDisplay amount={record.depositAmount} />
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 140,
      fixed: 'right',
      render: (_, record: Booking) => (
        <Space size="small">
          <Tooltip title="View Booking Page">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/operations/bookings/${record.id}`)}
            />
          </Tooltip>

          {['confirmed', 'pickup_scheduled'].includes(record.status) && (
            <Tooltip title="Process Handover (Pickup)">
              <Button
                type="primary"
                size="small"
                icon={<CarOutlined />}
                onClick={() => navigate('/operations/pickup-return')}
              />
            </Tooltip>
          )}

          {record.status === 'active' && (
            <Tooltip title="Process Return Check-In">
              <Button
                type="default"
                size="small"
                icon={<CheckCircleOutlined />}
                style={{ borderColor: '#52c41a', color: '#52c41a' }}
                onClick={() => navigate('/operations/pickup-return')}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ]

  const visibleColumns = columns.filter((col) => {
    const opt = columnsState.find((c) => c.key === col.key)
    return opt ? opt.visible : true
  })

  const tabItems = [
    { key: 'all', label: 'All Reservations' },
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'pickup_scheduled', label: 'Pickup Scheduled' },
    { key: 'active', label: 'Active Rentals' },
    { key: 'pending_confirmation', label: 'Pending Confirmation' },
    { key: 'completed', label: 'Completed' },
    { key: 'cancelled', label: 'Cancelled' },
  ]

  return (
    <PageContainer>
      <PageHeader
        title="Bookings & Rental Operations"
        extra={
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                refetch()
                refetchSummary()
              }}
            >
              Refresh
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/operations/bookings/new')}
            >
              Create Booking
            </Button>
          </Space>
        }
      />

      {/* Top Operations KPI Summary */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={8} md={4}>
          <Card size="small" style={{ borderRadius: 8 }}>
            <Statistic
              title="Active Rentals"
              value={summary?.active_rentals_count ?? 0}
              prefix={<CarOutlined style={{ color: '#1677ff' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card size="small" style={{ borderRadius: 8 }}>
            <Statistic
              title="Pickups Today"
              value={summary?.pickups_today_count ?? 0}
              prefix={<ClockCircleOutlined style={{ color: '#52c41a' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card size="small" style={{ borderRadius: 8 }}>
            <Statistic
              title="Returns Today"
              value={summary?.returns_today_count ?? 0}
              prefix={<CheckCircleOutlined style={{ color: '#faad14' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card size="small" style={{ borderRadius: 8 }}>
            <Statistic
              title="Pending Approval"
              value={summary?.pending_confirmation_count ?? 0}
              prefix={<ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card size="small" style={{ borderRadius: 8 }}>
            <Statistic
              title="Overdue Returns"
              value={summary?.overdue_returns_count ?? 0}
              styles={{ content: { color: (summary?.overdue_returns_count ?? 0) > 0 ? '#ff4d4f' : undefined } }}
              prefix={<WarningOutlined style={{ color: '#ff4d4f' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card size="small" style={{ borderRadius: 8 }}>
            <Statistic
              title="Deposits Held"
              value={summary?.total_deposits_held ?? 0}
              precision={0}
              prefix={<DollarOutlined style={{ color: '#722ed1' }} />}
              formatter={(val) => `Rs. ${Number(val).toLocaleString()}`}
            />
          </Card>
        </Col>
      </Row>

      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key)}
        items={tabItems}
        style={{ marginBottom: 16 }}
      />

      <DataTableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search booking code, customer, or plate..."
        columns={columnsState}
        onColumnChange={setColumnsState}
        filterContent={
          <Select
            value={paymentFilter}
            onChange={setPaymentFilter}
            style={{ width: 160 }}
            options={[
              { value: 'all', label: 'All Payment Statuses' },
              { value: 'paid', label: 'Fully Paid' },
              { value: 'partially_paid', label: 'Partially Paid' },
              { value: 'unpaid', label: 'Unpaid' },
            ]}
          />
        }
      />

      <DataTable
        columns={visibleColumns}
        dataSource={bookings}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 15 }}
      />

      {/* Booking Details Drawer */}
      <BookingDetailsDrawer
        booking={selectedBooking}
        open={detailsOpen}
        onClose={handleCloseDetails}
        onNavigatePickup={() => navigate('/operations/pickup-return')}
        onNavigateReturn={() => navigate('/operations/pickup-return')}
      />

      {/* Create New Booking Drawer */}
      <NewBookingDrawer
        open={createDrawerOpen}
        onClose={() => setCreateDrawerOpen(false)}
        onSuccess={() => {
          refetch()
          refetchSummary()
        }}
      />
    </PageContainer>
  )
}
