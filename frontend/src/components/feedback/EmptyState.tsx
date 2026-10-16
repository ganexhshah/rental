import React from 'react'
import { Empty, Button } from 'antd'

interface EmptyStateProps {
  title?: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  image?: React.ReactNode
  style?: React.CSSProperties
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No Data Found',
  description = 'There are no records matching your current filter criteria.',
  actionLabel,
  onAction,
  image = Empty.PRESENTED_IMAGE_SIMPLE,
  style,
}) => {
  return (
    <div
      style={{
        padding: '48px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
      }}
    >
      <Empty
        image={image}
        description={
          <div>
            <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>{title}</div>
            <div style={{ color: 'rgba(0, 0, 0, 0.45)', maxWidth: 400 }}>{description}</div>
          </div>
        }
      >
        {actionLabel && onAction && (
          <Button type="primary" onClick={onAction}>
            {actionLabel}
          </Button>
        )}
      </Empty>
    </div>
  )
}
