import React, { useState } from 'react'
import {
  Space,
  Button,
  Tag,
  Modal,
  DatePicker,
  Card,
  Row,
  Col,
  Statistic,
  message,
  Tooltip,
} from 'antd'
import {
  PhoneOutlined,
  MailOutlined,
  CarOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { PageHeader } from '@/components/navigation/PageHeader'
import { PageContainer } from '@/components/navigation/PageContainer'
import { DataTable } from '@/components/data-display/DataTable'
import { CurrencyDisplay } from '@/components/data-display/CurrencyDisplay'
import { bookingsApi } from '../api'
import type { Booking } from '@/types/booking'
import type { ColumnsType } from 'antd/es/table'
import { formatDateTime } from '@/lib/formatting/date'

export const ActiveRentalsPage: React.FC = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [extendModalOpen, setExtendModalOpen] = useState(false)
  const [targetBooking, setTargetBooking] = useState<Booking | null>(null)
  const [newEndDate, setNewEndDate] = useState<string>('')

  const { data: bookings = [], isLoading, refetch } = useQuery<Booking[]>({
    queryKey: ['active-rentals'],
    queryFn: () => bookingsApi.getBookings({ status: 'active' }),
  })

  const overdueCount = bookings.filter((b) => new Date(b.endDate).getTime() < Date.now()).length

  const extendMutation = useMutation({
    mutationFn: () => bookingsApi.extendBooking(targetBooking!.id, newEndDate),
    onSuccess: () => {
      message.success('Rental duration successfully extended and recalculated.')
      setExtendModalOpen(false)
      queryClient.invalidateQueries({ queryKey: ['active-rentals'] })
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      queryClient.invalidateQueries({ queryKey: ['operations-summary'] })
    },
    onError: (err: any) => message.error(err?.message || 'Failed to extend rental.'),
  })

  const columns: ColumnsType<Booking> = [
    {
      title: 'Booking Code',
      dataIndex: 'bookingCode',
      key: 'code',
      width: 140,
      render: (t) => <strong>#{t}</strong>,
    },
    {
      title: 'Customer Contact',
      key: 'customer',
      width: 220,
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 600 }}>{r.customerName}</div>
          <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>
            <PhoneOutlined style={{ marginRight: 4 }} />
            {r.customerPhone}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>
            <MailOutlined style={{ marginRight: 4 }} />
            {r.customerEmail}
          </div>
        </div>
      ),
    },
    {
      title: 'Vehicle',
      key: 'vehicle',
      width: 200,
      render: (_, r) => (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
            <CarOutlined style={{ color: '#1677ff' }} />
            <span>{r.vehicleModel}</span>
          </div>
          <Tag color="blue" style={{ marginTop: 2 }}>{r.vehiclePlate}</Tag>
        </div>
      ),
    },
    {
      title: 'Handover / Pickup Details',
      key: 'pickup',
      width: 200,
      render: (_, r) => (
        <div>
          <div style={{ fontSize: 12 }}>
            <strong>Dispatched:</strong> {r.actualPickupAt ? formatDateTime(r.actualPickupAt) : '-'}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.5)' }}>
            Odometer Out: {r.pickupOdometer?.toLocaleString() || '-'} km
          </div>
          <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.5)' }}>
            Fuel Out: {r.pickupFuel || '100%'}
          </div>
        </div>
      ),
    },
    {
      title: 'Expected Return',
      dataIndex: 'endDate',
      key: 'due',
      width: 200,
      render: (d) => {
        const isOverdue = new Date(d).getTime() < Date.now()
        return (
          <div>
            <div style={{ fontWeight: 600, color: isOverdue ? '#ff4d4f' : 'inherit' }}>
              {formatDateTime(d)}
            </div>
            {isOverdue && (
              <Tag color="red" icon={<WarningOutlined />}>
                OVERDUE
              </Tag>
            )}
          </div>
        )
      },
    },
    {
      title: 'Balance / Deposit',
      key: 'balance',
      width: 170,
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 600 }}>
            Total: <CurrencyDisplay amount={r.totalAmount} />
          </div>
          <div style={{ fontSize: 12, color: r.balanceDue > 0 ? '#ff4d4f' : '#52c41a' }}>
            Balance Due: <CurrencyDisplay amount={r.balanceDue} />
          </div>
          <div style={{ fontSize: 11, color: '#888' }}>
            Deposit Held: <CurrencyDisplay amount={r.depositAmount} />
          </div>
        </div>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 180,
      fixed: 'right',
      render: (_, r) => (
        <Space size="small">
          <Tooltip title="Extend Rental Duration">
            <Button
              size="small"
              icon={<CalendarOutlined />}
              onClick={() => {
                setTargetBooking(r)
                setNewEndDate(dayjs(r.endDate).add(1, 'day').toISOString())
                setExtendModalOpen(true)
              }}
            >
              Extend
            </Button>
          </Tooltip>

          <Button
            type="primary"
            size="small"
            icon={<CheckCircleOutlined />}
            onClick={() => navigate(`/operations/pickup-return?mode=return&bookingId=${r.id}`)}
          >
            Check-In
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <PageContainer>
      <PageHeader
        title="Active On-Road Rentals"
        extra={
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
            Refresh
          </Button>
        }
      />

      {/* KPI Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={8}>
          <Card size="small" style={{ borderRadius: 8 }}>
            <Statistic
              title="Currently Active on Road"
              value={bookings.length}
              prefix={<CarOutlined style={{ color: '#1677ff' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8}>
          <Card size="small" style={{ borderRadius: 8 }}>
            <Statistic
              title="Overdue Beyond Scheduled Return"
              value={overdueCount}
              valueStyle={{ color: overdueCount > 0 ? '#ff4d4f' : '#52c41a' }}
              prefix={<WarningOutlined style={{ color: overdueCount > 0 ? '#ff4d4f' : '#52c41a' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8}>
          <Card size="small" style={{ borderRadius: 8 }}>
            <Statistic
              title="Security Deposits Currently Held"
              value={bookings.reduce((sum, b) => sum + (b.depositAmount || 0), 0)}
              precision={0}
              formatter={(v) => `Rs. ${Number(v).toLocaleString()}`}
            />
          </Card>
        </Col>
      </Row>

      <DataTable
        columns={columns}
        dataSource={bookings}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 15 }}
      />

      {/* Extend Rental Modal */}
      <Modal
        title={`Extend Rental for #${targetBooking?.bookingCode}`}
        open={extendModalOpen}
        onOk={() => extendMutation.mutate()}
        onCancel={() => setExtendModalOpen(false)}
        okText="Confirm Extension"
        confirmLoading={extendMutation.isPending}
      >
        <p style={{ color: 'rgba(0,0,0,0.65)' }}>
          Vehicle: <strong>{targetBooking?.vehicleModel} ({targetBooking?.vehiclePlate})</strong>
          <br />
          Current End Date: <strong>{targetBooking ? formatDateTime(targetBooking.endDate) : '-'}</strong>
        </p>

        <div style={{ marginTop: 16 }}>
          <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>
            New Extended Return Date & Time:
          </label>
          <DatePicker
            showTime={{ format: 'HH:mm' }}
            format="YYYY-MM-DD HH:mm"
            style={{ width: '100%' }}
            value={newEndDate ? dayjs(newEndDate) : undefined}
            disabledDate={(current) =>
              targetBooking
                ? current && current.isBefore(dayjs(targetBooking.endDate), 'day')
                : false
            }
            onChange={(d) => setNewEndDate(d ? d.toISOString() : '')}
          />
        </div>
      </Modal>
    </PageContainer>
  )
}
