import React from 'react'
import { Modal } from 'antd'
import { ExclamationCircleOutlined } from '@ant-design/icons'

interface ConfirmModalProps {
  open: boolean
  title: string
  content: React.ReactNode
  confirmLoading?: boolean
  okText?: string
  cancelText?: string
  okDanger?: boolean
  onConfirm: () => void | Promise<void>
  onCancel: () => void
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  title,
  content,
  confirmLoading = false,
  okText = 'Confirm',
  cancelText = 'Cancel',
  okDanger = false,
  onConfirm,
  onCancel,
}) => {
  return (
    <Modal
      open={open}
      title={
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <ExclamationCircleOutlined style={{ color: okDanger ? '#ff4d4f' : '#faad14' }} />
          {title}
        </span>
      }
      onOk={onConfirm}
      onCancel={onCancel}
      confirmLoading={confirmLoading}
      okText={okText}
      cancelText={cancelText}
      okButtonProps={{ danger: okDanger }}
      destroyOnHidden
    >
      <div style={{ marginTop: 12, fontSize: 14 }}>{content}</div>
    </Modal>
  )
}
