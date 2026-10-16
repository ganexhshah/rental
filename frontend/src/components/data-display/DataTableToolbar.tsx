import React from 'react'
import { Space, Button, Tooltip } from 'antd'
import { ReloadOutlined, DownloadOutlined } from '@ant-design/icons'
import { SearchInput } from '@/components/forms/SearchInput'
import { ColumnSettings, ColumnOption } from './ColumnSettings'

interface DataTableToolbarProps {
  searchValue?: string
  onSearchChange?: (val: string) => void
  searchPlaceholder?: string
  filterContent?: React.ReactNode
  onRefresh?: () => void
  onExport?: () => void
  columns?: ColumnOption[]
  onColumnChange?: (updated: ColumnOption[]) => void
  actions?: React.ReactNode
  selectedCount?: number
  batchActions?: React.ReactNode
}

export const DataTableToolbar: React.FC<DataTableToolbarProps> = ({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Quick search...',
  filterContent,
  onRefresh,
  onExport,
  columns,
  onColumnChange,
  actions,
  selectedCount = 0,
  batchActions,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 16,
      }}
    >
      <Space wrap size="middle">
        {onSearchChange && (
          <SearchInput
            value={searchValue}
            onChange={onSearchChange}
            placeholder={searchPlaceholder}
          />
        )}
        {filterContent}
      </Space>

      <Space wrap size="small">
        {selectedCount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 8 }}>
            <span style={{ fontSize: 13, color: '#1677ff', fontWeight: 500 }}>
              {selectedCount} selected
            </span>
            {batchActions}
          </div>
        )}

        {onRefresh && (
          <Tooltip title="Refresh data">
            <Button icon={<ReloadOutlined />} onClick={onRefresh} />
          </Tooltip>
        )}

        {onExport && (
          <Tooltip title="Export to CSV">
            <Button icon={<DownloadOutlined />} onClick={onExport} />
          </Tooltip>
        )}

        {columns && onColumnChange && (
          <ColumnSettings columns={columns} onChange={onColumnChange} />
        )}

        {actions}
      </Space>
    </div>
  )
}
