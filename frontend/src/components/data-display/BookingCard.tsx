import React from 'react'
import { Card, Space, Tag, Button } from 'antd'
import { CalendarOutlined, CarOutlined, UserOutlined, EyeOutlined } from '@ant-design/icons'
import type { Booking } from '@/types/booking'
import { StatusBadge } from './StatusBadge'
import { CurrencyDisplay } from './CurrencyDisplay'
import { formatDate } from '@/lib/formatting/date'

interface BookingCardProps {
  booking: Booking
  onView?: (booking: Booking) => void
  onAction?: (booking: Booking, action: string) => void
}

export const BookingCard: React.FC<BookingCardProps> = ({ booking, onView, onAction }) => {
  return (
    <Card
      hoverable
      style={{ borderRadius: 8, height: '100%' }}
      styles={{
        body: { padding: 16 }
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Space>
          <span style={{ fontWeight: 700, fontSize: 15 }}>{booking.bookingCode}</span>
          <StatusBadge status={booking.status} />
        </Space>
        <StatusBadge status={booking.paymentStatus} />
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, marginBottom: 4 }}>
          <CarOutlined style={{ color: '#1677ff' }} />
          <span>{booking.vehicleModel}</span>
          <Tag>{booking.vehiclePlate}</Tag>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'rgba(0, 0, 0, 0.65)' }}>
          <UserOutlined style={{ color: 'rgba(0, 0, 0, 0.45)' }} />
          <span>{booking.customerName}</span>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 12,
          color: 'rgba(0, 0, 0, 0.55)',
          marginBottom: 12,
          padding: '6px 10px',
          backgroundColor: 'rgba(0, 0, 0, 0.02)',
          borderRadius: 4,
        }}
      >
        <CalendarOutlined />
        <span>
          {formatDate(booking.startDate)} — {formatDate(booking.endDate)} ({booking.totalDays}d)
        </span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(0, 0, 0, 0.06)', paddingTop: 10 }}>
        <div>
          <div style={{ fontSize: 11, color: 'rgba(0, 0, 0, 0.45)' }}>Total Amount</div>
          <CurrencyDisplay amount={booking.totalAmount} strong style={{ fontSize: 16 }} />
        </div>
        <Space>
          {onView && (
            <Button size="small" icon={<EyeOutlined />} onClick={() => onView(booking)}>
              View
            </Button>
          )}
          {booking.status === 'confirmed' && onAction && (
            <Button size="small" type="primary" onClick={() => onAction(booking, 'pickup')}>
              Pickup
            </Button>
          )}
          {booking.status === 'active' && onAction && (
            <Button size="small" type="primary" onClick={() => onAction(booking, 'return')}>
              Return
            </Button>
          )}
        </Space>
      </div>
    </Card>
  )
}
