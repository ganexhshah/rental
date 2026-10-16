import React, { useState, useEffect } from 'react'
import { Input } from 'antd'
import { SearchOutlined } from '@ant-design/icons'

interface SearchInputProps {
  value?: string
  onChange?: (val: string) => void
  placeholder?: string
  debounceMs?: number
  allowClear?: boolean
  style?: React.CSSProperties
  className?: string
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value = '',
  onChange,
  placeholder = 'Search by keyword...',
  debounceMs = 300,
  allowClear = true,
  style,
  className,
}) => {
  const [internalVal, setInternalVal] = useState(value)

  useEffect(() => {
    setInternalVal(value)
  }, [value])

  useEffect(() => {
    const handler = setTimeout(() => {
      if (internalVal !== value) {
        onChange?.(internalVal)
      }
    }, debounceMs)

    return () => clearTimeout(handler)
  }, [internalVal, debounceMs, onChange, value])

  return (
    <Input
      prefix={<SearchOutlined style={{ color: 'rgba(0, 0, 0, 0.45)' }} />}
      placeholder={placeholder}
      value={internalVal}
      onChange={(e) => setInternalVal(e.target.value)}
      allowClear={allowClear}
      style={{ width: 240, ...style }}
      className={className}
    />
  )
}
