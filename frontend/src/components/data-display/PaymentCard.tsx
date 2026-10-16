import React from 'react'
import { Card, Space } from 'antd'
import { CreditCardOutlined } from '@ant-design/icons'
import type { PaymentTransaction } from '@/types/payment'
import { CurrencyDisplay } from './CurrencyDisplay'
import { StatusBadge } from './StatusBadge'
import { formatDateTime } from '@/lib/formatting/date'

interface PaymentCardProps {
  payment: PaymentTransaction
  onView?: (payment: PaymentTransaction) => void
}

export const PaymentCard: React.FC<PaymentCardProps> = ({ payment, onView }) => {
  return (
    <Card
      hoverable={!!onView}
      onClick={() => onView?.(payment)}
      style={{ borderRadius: 8 }}
      styles={{
        body: { padding: 16 }
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Space>
          <CreditCardOutlined style={{ color: '#1677ff', fontSize: 16 }} />
          <span style={{ fontWeight: 600 }}>{payment.transactionNumber}</span>
        </Space>
        <StatusBadge status={payment.status} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <div>
          <span style={{ fontSize: 12, color: 'rgba(0, 0, 0, 0.45)' }}>Customer: </span>
          <span style={{ fontSize: 13, fontWeight: 500 }}>{payment.customerName}</span>
        </div>
        <CurrencyDisplay amount={payment.amount} currency={payment.currency} strong style={{ fontSize: 18 }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(0, 0, 0, 0.45)' }}>
        <span>{payment.gateway || payment.method}</span>
        <span>{formatDateTime(payment.timestamp)}</span>
      </div>
    </Card>
  )
}
