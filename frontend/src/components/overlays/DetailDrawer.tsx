import React from 'react'
import { Drawer, Button, Space } from 'antd'

interface DetailDrawerProps {
  open: boolean
  title: string
  subtitle?: string
  onClose: () => void
  width?: number | string
  size?: number | string
  extraActions?: React.ReactNode
  children: React.ReactNode
}

export const DetailDrawer: React.FC<DetailDrawerProps> = ({
  open,
  title,
  subtitle,
  onClose,
  width,
  size,
  extraActions,
  children,
}) => {
  const drawerSize = size || width || 720
  return (
    <Drawer
      open={open}
      onClose={onClose}
      size={drawerSize}
      title={
        <div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>{title}</div>
          {subtitle && (
            <div style={{ fontSize: 12, color: 'rgba(0, 0, 0, 0.45)', marginTop: 2 }}>
              {subtitle}
            </div>
          )}
        </div>
      }
      extra={
        <Space>
          {extraActions}
          <Button onClick={onClose}>Close</Button>
        </Space>
      }
    >
      {children}
    </Drawer>
  )
}
