import React, { useState } from 'react'
import {
  Calendar,
  Badge,
  Card,
  Select,
  Space,
  Tag,
  Drawer,
  Button,
} from 'antd'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/navigation/PageHeader'
import { PageContainer } from '@/components/navigation/PageContainer'
import { bookingsApi } from '../api'
import { vehiclesApi } from '@/features/vehicles/api'
import type { Booking } from '@/types/booking'
import type { Vehicle } from '@/types/vehicle'
import { formatDate } from '@/lib/formatting/date'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { CurrencyDisplay } from '@/components/data-display/CurrencyDisplay'

export const OperationsCalendarPage: React.FC = () => {
  const [vehicleFilter, setVehicleFilter] = useState<string>('all')
  const [selectedDayBookings, setSelectedDayBookings] = useState<Booking[]>([])
  const [dayDrawerOpen, setDayDrawerOpen] = useState(false)
  const [selectedDateStr, setSelectedDateStr] = useState<string>('')

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery<Booking[]>({
    queryKey: ['calendar-bookings'],
    queryFn: () => bookingsApi.getBookings(),
  })

  const { data: vehicles = [] } = useQuery<Vehicle[]>({
    queryKey: ['calendar-vehicles'],
    queryFn: () => vehiclesApi.getVehicles(),
  })

  const filteredBookings = bookings.filter((b) => {
    if (vehicleFilter !== 'all' && b.vehicleId !== vehicleFilter) return false
    return true
  })

  const getBookingsForDate = (date: Dayjs) => {
    const formatted = date.format('YYYY-MM-DD')
    return filteredBookings.filter((b) => {
      const start = b.startDate.slice(0, 10)
      const end = b.endDate.slice(0, 10)
      return formatted >= start && formatted <= end
    })
  }

  const dateCellRender = (value: Dayjs) => {
    const dayBookings = getBookingsForDate(value)

    if (dayBookings.length === 0) return null

    return (
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {dayBookings.slice(0, 3).map((item) => {
          let badgeStatus: 'success' | 'processing' | 'warning' | 'default' = 'processing'
          if (item.status === 'confirmed') badgeStatus = 'warning'
          if (item.status === 'active') badgeStatus = 'processing'
          if (item.status === 'completed') badgeStatus = 'success'

          return (
            <li key={item.id} style={{ marginBottom: 2 }}>
              <Badge
                status={badgeStatus}
                text={
                  <span style={{ fontSize: 11, fontWeight: 500 }}>
                    {item.vehiclePlate} ({item.customerName.split(' ')[0]})
                  </span>
                }
              />
            </li>
          )
        })}
        {dayBookings.length > 3 && (
          <li style={{ fontSize: 11, color: '#1677ff', fontWeight: 600 }}>
            +{dayBookings.length - 3} more
          </li>
        )}
      </ul>
    )
  }

  const onSelectDate = (date: Dayjs) => {
    const dayBookings = getBookingsForDate(date)
    setSelectedDayBookings(dayBookings)
    setSelectedDateStr(date.format('dddd, MMMM D, YYYY'))
    if (dayBookings.length > 0) {
      setDayDrawerOpen(true)
    }
  }

  return (
    <PageContainer loading={bookingsLoading}>
      <PageHeader
        title="Calendar"
        extra={
          <Select
            style={{ width: 220 }}
            value={vehicleFilter}
            onChange={setVehicleFilter}
            options={[
              { label: 'All Vehicles', value: 'all' },
              ...vehicles.map((v) => ({
                label: `${v.plateNumber} - ${v.make} ${v.model}`,
                value: v.id,
              })),
            ]}
          />
        }
      />

      <Card style={{ borderRadius: 8 }}>
        <div style={{ display: 'flex', gap: 20, marginBottom: 16, alignItems: 'center' }}>
          <Badge status="warning" text="Confirmed" />
          <Badge status="processing" text="Active" />
          <Badge status="success" text="Completed" />
        </div>

        <Calendar
          cellRender={(current, info) => {
            if (info.type === 'date') return dateCellRender(current)
            return info.originNode
          }}
          onSelect={onSelectDate}
        />
      </Card>

      {/* Date Inspection Drawer */}
      <Drawer
        open={dayDrawerOpen}
        onClose={() => setDayDrawerOpen(false)}
        title={selectedDateStr}
        size={460}
      >
        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
          {selectedDayBookings.map((b) => (
            <Card key={b.id} size="small" style={{ borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <strong>#{b.bookingCode}</strong>
                <StatusBadge status={b.status} />
              </div>
              <div style={{ fontWeight: 600 }}>{b.vehicleModel}</div>
              <Tag style={{ margin: '4px 0 8px' }}>{b.vehiclePlate}</Tag>
              <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.85)' }}>
                <strong>{b.customerName}</strong>
                {b.customerPhone && <span style={{ color: 'rgba(0,0,0,0.45)', marginLeft: 6 }}>({b.customerPhone})</span>}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', margin: '4px 0 8px' }}>
                {formatDate(b.startDate)} – {formatDate(b.endDate)}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: 8 }}>
                <CurrencyDisplay amount={b.totalAmount} strong />
                <StatusBadge status={b.paymentStatus} />
              </div>
            </Card>
          ))}
        </Space>
      </Drawer>
    </PageContainer>
  )
}
