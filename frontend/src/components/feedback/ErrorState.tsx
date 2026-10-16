import React from 'react'
import { Result, Button } from 'antd'

interface ErrorStateProps {
  title?: string
  subTitle?: string
  onRetry?: () => void
  style?: React.CSSProperties
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Failed to Load Data',
  subTitle = 'An error occurred while fetching information from the server.',
  onRetry,
  style,
}) => {
  return (
    <div style={{ padding: '48px 24px', ...style }}>
      <Result
        status="error"
        title={title}
        subTitle={subTitle}
        extra={
          onRetry && (
            <Button type="primary" onClick={onRetry}>
              Retry Request
            </Button>
          )
        }
      />
    </div>
  )
}
