import React from 'react'
import { Modal, Descriptions, Space, Button, Tag } from 'antd'
import {
  FileTextOutlined,
  DownloadOutlined,
  CheckOutlined,
  CloseOutlined,
} from '@ant-design/icons'

export interface DocumentInfo {
  id: string
  title: string
  type: string
  documentNumber?: string
  expiryDate?: string
  fileUrl?: string
  status?: string
  notes?: string
}

interface DocumentViewerProps {
  open: boolean
  document: DocumentInfo | null
  onClose: () => void
  onApprove?: (id: string) => void
  onReject?: (id: string) => void
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  open,
  document,
  onClose,
  onApprove,
  onReject,
}) => {
  if (!document) return null

  return (
    <Modal
      open={open}
      title={
        <Space>
          <FileTextOutlined style={{ color: '#1677ff' }} />
          <span>{document.title}</span>
        </Space>
      }
      onCancel={onClose}
      width={680}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <Space>
            {onReject && (
              <Button danger icon={<CloseOutlined />} onClick={() => onReject(document.id)}>
                Reject Document
              </Button>
            )}
            {onApprove && (
              <Button type="primary" icon={<CheckOutlined />} onClick={() => onApprove(document.id)}>
                Approve Document
              </Button>
            )}
          </Space>
          <Button onClick={onClose}>Close</Button>
        </div>
      }
    >
      <div style={{ padding: '16px 0' }}>
        <Descriptions bordered column={2} size="small" style={{ marginBottom: 16 }}>
          <Descriptions.Item label="Document Type">{document.type}</Descriptions.Item>
          <Descriptions.Item label="Status">
            <Tag color={document.status === 'approved' || document.status === 'valid' ? 'success' : 'warning'}>
              {document.status || 'Pending'}
            </Tag>
          </Descriptions.Item>
          {document.documentNumber && (
            <Descriptions.Item label="Document Number">{document.documentNumber}</Descriptions.Item>
          )}
          {document.expiryDate && (
            <Descriptions.Item label="Expiry Date">{document.expiryDate}</Descriptions.Item>
          )}
        </Descriptions>

        <div
          style={{
            border: '1px dashed #d9d9d9',
            borderRadius: 8,
            padding: 32,
            textAlign: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.02)',
          }}
        >
          <FileTextOutlined style={{ fontSize: 48, color: '#8c8c8c', marginBottom: 12 }} />
          <div style={{ fontWeight: 500, marginBottom: 8 }}>{document.title}</div>
          <div style={{ fontSize: 12, color: 'rgba(0, 0, 0, 0.45)', marginBottom: 16 }}>
            Preview rendered in secure sandbox
          </div>
          <Button
            icon={<DownloadOutlined />}
            onClick={() => window.open(document.fileUrl || '#', '_blank')}
          >
            Download / Open Original
          </Button>
        </div>
      </div>
    </Modal>
  )
}
