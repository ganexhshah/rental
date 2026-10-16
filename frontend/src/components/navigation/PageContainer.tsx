import React from 'react'
import { Spin } from 'antd'
import { ErrorState } from '@/components/feedback/ErrorState'

export interface PageContainerProps {
  children: React.ReactNode
  loading?: boolean
  error?: Error | string | null
  onRetry?: () => void
  maxWidth?: number | string
  style?: React.CSSProperties
  className?: string
}

export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  loading = false,
  error,
  onRetry,
  maxWidth,
  style,
  className,
}) => {
  if (error) {
    return (
      <div
        style={{
          padding: '16px 0',
          maxWidth: maxWidth || '100%',
          width: '100%',
          flex: 1,
          boxSizing: 'border-box',
          ...style,
        }}
      >
        <ErrorState
          title="Failed to Load Page Data"
          subTitle={typeof error === 'string' ? error : error.message}
          onRetry={onRetry}
        />
      </div>
    )
  }

  return (
    <div
      className={className}
      style={{
        padding: '0',
        maxWidth: maxWidth || '100%',
        width: '100%',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      <Spin
        spinning={loading}
        size="large"
        classNames={{ root: 'page-container-spin' }}
        style={{ width: '100%', flex: 1 }}
      >
        {children}
      </Spin>
    </div>
  )
}
