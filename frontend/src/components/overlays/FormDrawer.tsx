import React from 'react'
import { Drawer, Space, Button } from 'antd'

export interface FormDrawerProps {
  open: boolean
  title: string
  onClose: () => void
  onSubmit?: () => void
  loading?: boolean
  confirmLoading?: boolean
  submitText?: string
  cancelText?: string
  width?: number | string
  size?: number | string
  children: React.ReactNode
  destroyOnClose?: boolean
  extraFooter?: React.ReactNode
}

export const FormDrawer: React.FC<FormDrawerProps> = ({
  open,
  title,
  onClose,
  onSubmit,
  loading = false,
  confirmLoading = false,
  submitText = 'Save Changes',
  cancelText = 'Cancel',
  width,
  size,
  children,
  destroyOnClose = true,
  extraFooter,
}) => {
  const isLoading = loading || confirmLoading
  const drawerSize = size || width || 620

  return (
    <Drawer
      open={open}
      title={title}
      onClose={onClose}
      size={drawerSize}
      destroyOnHidden={destroyOnClose}
      extra={
        <Space>
          <Button onClick={onClose} disabled={isLoading}>
            {cancelText}
          </Button>
          {onSubmit && (
            <Button type="primary" onClick={onSubmit} loading={isLoading}>
              {submitText}
            </Button>
          )}
        </Space>
      }
      footer={
        extraFooter ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {extraFooter}
          </div>
        ) : null
      }
    >
      {children}
    </Drawer>
  )
}

export default FormDrawer

