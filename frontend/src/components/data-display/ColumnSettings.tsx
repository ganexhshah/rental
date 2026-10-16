import React from 'react'
import { Popover, Checkbox, Button, Space, Tooltip } from 'antd'
import { SettingOutlined } from '@ant-design/icons'

export interface ColumnOption {
  key: string
  title: string
  visible: boolean
}

interface ColumnSettingsProps {
  columns: ColumnOption[]
  onChange: (updated: ColumnOption[]) => void
}

export const ColumnSettings: React.FC<ColumnSettingsProps> = ({ columns, onChange }) => {
  const handleToggle = (key: string, checked: boolean) => {
    const updated = columns.map((col) => (col.key === key ? { ...col, visible: checked } : col))
    onChange(updated)
  }

  const handleReset = () => {
    const reset = columns.map((col) => ({ ...col, visible: true }))
    onChange(reset)
  }

  const content = (
    <div style={{ width: 200 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, paddingBottom: 4, borderBottom: '1px solid rgba(0, 0, 0, 0.06)' }}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>Columns</span>
        <Button type="link" size="small" style={{ padding: 0, height: 'auto' }} onClick={handleReset}>
          Reset
        </Button>
      </div>
      <Space direction="vertical" style={{ width: '100%' }}>
        {columns.map((col) => (
          <Checkbox
            key={col.key}
            checked={col.visible}
            onChange={(e) => handleToggle(col.key, e.target.checked)}
          >
            {col.title}
          </Checkbox>
        ))}
      </Space>
    </div>
  )

  return (
    <Popover placement="bottomRight" content={content} trigger="click">
      <Tooltip title="Customize Columns">
        <Button icon={<SettingOutlined />} />
      </Tooltip>
    </Popover>
  )
}
