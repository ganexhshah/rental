import React, { useState } from 'react'
import { Space, Tag, Button } from 'antd'
import { EyeOutlined, CarOutlined, ReloadOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/navigation/PageHeader'
import { PageContainer } from '@/components/navigation/PageContainer'
import { DataTable } from '@/components/data-display/DataTable'
import { DataTableToolbar } from '@/components/data-display/DataTableToolbar'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { CurrencyDisplay } from '@/components/data-display/CurrencyDisplay'
import { bookingsApi } from '@/features/bookings/api'
import type { Booking } from '@/types/booking'
import type { ColumnsType } from 'antd/es/table'
import { formatDate } from '@/lib/formatting/date'

export const CustomerRentalHistoryPage: React.FC = () => {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  const { data: bookings = [], isLoading, refetch } = useQuery({
    queryKey: ['all-rental-history'],
    queryFn: () => bookingsApi.getBookings(),
  })

  const filtered = bookings.filter((b) => {
    if (!search.trim()) return true
    const q = search.toLowerCase().trim()
    return (
      b.customerName?.toLowerCase().includes(q) ||
      b.bookingCode?.toLowerCase().includes(q) ||
      b.vehiclePlate?.toLowerCase().includes(q) ||
      b.vehicleModel?.toLowerCase().includes(q)
    )
  })

  const columns: ColumnsType<Booking> = [
    {
      title: 'Booking Code',
      dataIndex: 'bookingCode',
      key: 'code',
      render: (t, r) => (
        <a onClick={() => navigate(`/operations/bookings?id=${r.id}`)} style={{ fontWeight: 600 }}>
          {t || `BK-${r.id.slice(0, 6)}`}
        </a>
      ),
    },
    {
      title: 'Customer',
      dataIndex: 'customerName',
      key: 'customer',
      render: (c, r) => (
        <div>
          <div
            style={{ fontWeight: 600, color: r.customerId ? '#1677ff' : 'inherit', cursor: r.customerId ? 'pointer' : 'default' }}
            onClick={() => r.customerId && navigate(`/customers/view/${r.customerId}`)}
          >
            {c}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>{r.customerEmail || r.customerPhone}</div>
        </div>
      ),
    },
    {
      title: 'Vehicle',
      key: 'vehicle',
      render: (_, r) => (
        <Space>
          <CarOutlined style={{ color: '#1677ff' }} />
          <span>{r.vehicleModel}</span>
          {r.vehiclePlate && <Tag>{r.vehiclePlate}</Tag>}
        </Space>
      ),
    },
    {
      title: 'Duration',
      key: 'duration',
      render: (_, r) => `${formatDate(r.startDate)} - ${formatDate(r.endDate)} (${r.totalDays || 1}d)`,
    },
    {
      title: 'Total Amount',
      dataIndex: 'totalAmount',
      key: 'amt',
      render: (a) => <CurrencyDisplay amount={a} strong />,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'st',
      render: (s) => <StatusBadge status={s} />,
    },
    {
      title: 'Actions',
      key: 'act',
      render: (_, r) => (
        <Button
          size="small"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/operations/bookings?id=${r.id}`)}
        >
          View
        </Button>
      ),
    },
  ]

  return (
    <PageContainer>
      <PageHeader
        title="Rental History"
        extra={
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
            Refresh
          </Button>
        }
      />

      <DataTableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search customer, booking code, plate..."
      />

      <DataTable
        columns={columns}
        dataSource={filtered}
        loading={isLoading}
        rowKey="id"
        emptyTitle="No Rental History"
        emptyDescription="No rental bookings found."
      />
    </PageContainer>
  )
}

export default CustomerRentalHistoryPage
