import React from 'react'
import { ArrowUpOutlined, ArrowDownOutlined, MinusOutlined } from '@ant-design/icons'

interface TrendWidgetProps {
  value: number
  suffix?: string
  comparisonLabel?: string
}

export const TrendWidget: React.FC<TrendWidgetProps> = ({
  value,
  suffix = '%',
  comparisonLabel = 'vs last period',
}) => {
  const isPositive = value > 0
  const isNeutral = value === 0
  const color = isNeutral ? 'rgba(0, 0, 0, 0.45)' : isPositive ? '#52c41a' : '#ff4d4f'
  const Icon = isNeutral ? MinusOutlined : isPositive ? ArrowUpOutlined : ArrowDownOutlined

  return (
    <span style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <span style={{ color, fontWeight: 600, display: 'inline-flex', alignItems: 'center' }}>
        <Icon style={{ fontSize: 11, marginRight: 2 }} />
        {Math.abs(value)}
        {suffix}
      </span>
      {comparisonLabel && <span style={{ color: 'rgba(0, 0, 0, 0.45)' }}>{comparisonLabel}</span>}
    </span>
  )
}
