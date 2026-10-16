import React from 'react'
import { Card } from 'antd'
import { TrendWidget } from './TrendWidget'

interface KPIWidgetProps {
  title: string
  value: React.ReactNode
  icon?: React.ReactNode
  trend?: number
  trendLabel?: string
  color?: string
  prefix?: React.ReactNode
  suffix?: React.ReactNode
  loading?: boolean
  onClick?: () => void
  valueStyle?: React.CSSProperties
}

export const KPIWidget: React.FC<KPIWidgetProps> = ({
  title,
  value,
  icon,
  trend,
  trendLabel,
  color,
  prefix,
  suffix,
  loading = false,
  onClick,
  valueStyle,
}) => {
  return (
    <Card
      loading={loading}
      hoverable={!!onClick}
      onClick={onClick}
      style={{
        height: '100%',
        borderRadius: 8,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
      }}
      styles={{
        body: { padding: '20px' }
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 13, color: 'rgba(0, 0, 0, 0.55)', marginBottom: 6, fontWeight: 500 }}>
            {title}
          </div>
          <div
            style={{
              fontSize: 26,
              fontWeight: 700,
              lineHeight: 1.2,
              color: 'inherit',
              fontFamily: 'var(--font-display)',
              letterSpacing: '-0.015em',
              ...valueStyle,
            }}
          >
            {prefix}
            {value}
            {suffix}
          </div>
        </div>
        {icon && (
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 8,
              backgroundColor: color ? `${color}15` : 'rgba(22, 119, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              color: color || '#1677ff',
            }}
          >
            {icon}
          </div>
        )}
      </div>

      {trend !== undefined && (
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(0, 0, 0, 0.06)' }}>
          <TrendWidget value={trend} comparisonLabel={trendLabel} />
        </div>
      )}
    </Card>
  )
}
