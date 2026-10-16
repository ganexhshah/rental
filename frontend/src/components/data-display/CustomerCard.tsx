import React from 'react'
import { Card, Avatar, Tag, Button, Rate } from 'antd'
import { UserOutlined, MailOutlined, PhoneOutlined, EyeOutlined } from '@ant-design/icons'
import type { Customer } from '@/types/customer'
import { StatusBadge } from './StatusBadge'
import { CurrencyDisplay } from './CurrencyDisplay'

interface CustomerCardProps {
  customer: Customer
  onView?: (customer: Customer) => void
}

export const CustomerCard: React.FC<CustomerCardProps> = ({ customer, onView }) => {
  return (
    <Card
      hoverable
      style={{ borderRadius: 8, height: '100%' }}
      styles={{
        body: { padding: 16 }
      }}
    >
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
        <Avatar
          size={52}
          src={customer.avatarUrl}
          icon={<UserOutlined />}
          style={{ backgroundColor: '#1677ff' }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {customer.fullName}
            </span>
            <StatusBadge status={customer.verificationStatus} />
          </div>
          {customer.blacklistStatus === 'blacklisted' && (
            <Tag color="volcano" style={{ marginTop: 2 }}>BLACKLISTED</Tag>
          )}
          <div style={{ marginTop: 2 }}>
            <Rate disabled allowHalf value={customer.rating} style={{ fontSize: 12 }} />
          </div>
        </div>
      </div>

      <div style={{ fontSize: 12, color: 'rgba(0, 0, 0, 0.65)', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <MailOutlined style={{ color: 'rgba(0, 0, 0, 0.45)' }} />
          <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
            {customer.email}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <PhoneOutlined style={{ color: 'rgba(0, 0, 0, 0.45)' }} />
          <span>{customer.phone}</span>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '8px 12px',
          backgroundColor: 'rgba(0, 0, 0, 0.02)',
          borderRadius: 6,
          marginBottom: 12,
          fontSize: 12,
        }}
      >
        <div>
          <span style={{ color: 'rgba(0, 0, 0, 0.45)' }}>Rentals: </span>
          <strong>{customer.totalBookingsCount}</strong>
        </div>
        <div>
          <span style={{ color: 'rgba(0, 0, 0, 0.45)' }}>Total Spent: </span>
          <CurrencyDisplay amount={customer.totalSpent} strong />
        </div>
      </div>

      {onView && (
        <Button block icon={<EyeOutlined />} onClick={() => onView(customer)}>
          View Customer Profile
        </Button>
      )}
    </Card>
  )
}
