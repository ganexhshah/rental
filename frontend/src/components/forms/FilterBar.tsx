import React from 'react'
import { Space, Button } from 'antd'
import { ClearOutlined } from '@ant-design/icons'
import { SearchInput } from './SearchInput'

interface FilterBarProps {
  searchValue?: string
  onSearchChange?: (val: string) => void
  searchPlaceholder?: string
  children?: React.ReactNode
  onReset?: () => void
  showReset?: boolean
  style?: React.CSSProperties
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchValue,
  onSearchChange,
  searchPlaceholder,
  children,
  onReset,
  showReset = true,
  style,
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
        ...style,
      }}
    >
      <Space wrap size="middle" style={{ flex: 1 }}>
        {onSearchChange && (
          <SearchInput
            value={searchValue}
            onChange={onSearchChange}
            placeholder={searchPlaceholder}
          />
        )}
        {children}
      </Space>

      {showReset && onReset && (
        <Button icon={<ClearOutlined />} onClick={onReset}>
          Reset
        </Button>
      )}
    </div>
  )
}
