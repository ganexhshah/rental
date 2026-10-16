import React from 'react'
import { Table, Card } from 'antd'
import type { TableProps } from 'antd'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'

export interface DataTableProps<T extends object> extends Omit<TableProps<T>, 'title'> {
  title?: React.ReactNode
  toolbar?: React.ReactNode
  error?: Error | string | null
  onRetry?: () => void
  emptyTitle?: string
  emptyDescription?: string
  emptyActionLabel?: string
  onEmptyAction?: () => void
  cardBordered?: boolean
}

export function DataTable<T extends object>({
  columns,
  dataSource,
  loading,
  error,
  onRetry,
  pagination = {
    pageSize: 10,
    showSizeChanger: true,
    pageSizeOptions: ['10', '20', '50', '100'],
    showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} records`,
  },
  scroll = { x: 'max-content' },
  toolbar,
  title,
  emptyTitle = 'No Records Found',
  emptyDescription = 'There are no records to display.',
  emptyActionLabel,
  onEmptyAction,
  cardBordered = false,
  rowKey = 'id' as keyof T,
  ...tableProps
}: DataTableProps<T>) {
  if (error) {
    return (
      <Card variant={cardBordered ? 'outlined' : 'borderless'}>
        <ErrorState
          title="Failed to Load Records"
          subTitle={typeof error === 'string' ? error : error.message}
          onRetry={onRetry}
        />
      </Card>
    )
  }

  const locale = {
    emptyText: (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        actionLabel={emptyActionLabel}
        onAction={onEmptyAction}
      />
    ),
  }

  return (
    <Card variant={cardBordered ? 'outlined' : 'borderless'} styles={{ body: { padding: 0 } }}>
      {title && (
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(0, 0, 0, 0.06)' }}>
          {title}
        </div>
      )}
      <div style={{ padding: '16px 20px' }}>
        {toolbar}
        <Table<T>
          columns={columns}
          dataSource={dataSource}
          loading={loading}
          pagination={pagination}
          scroll={scroll}
          rowKey={rowKey}
          locale={locale}
          {...tableProps}
        />
      </div>
    </Card>
  )
}
