import React from 'react'
import { Card } from 'antd'

interface ChartCardProps {
  title: React.ReactNode
  subtitle?: React.ReactNode
  extra?: React.ReactNode
  loading?: boolean
  children: React.ReactNode
  style?: React.CSSProperties
  height?: number | string
}

export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  subtitle,
  extra,
  loading = false,
  children,
  style,
  height,
}) => {
  return (
    <Card
      loading={loading}
      style={{ borderRadius: 8, height: '100%', ...style }}
      title={
        <div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{title}</div>
          {subtitle && (
            <div style={{ fontSize: 12, fontWeight: 400, color: 'rgba(0, 0, 0, 0.45)', marginTop: 2 }}>
              {subtitle}
            </div>
          )}
        </div>
      }
      extra={extra}
      styles={{
        body: { padding: '20px', minHeight: height }
      }}
    >
      {children}
    </Card>
  )
}
