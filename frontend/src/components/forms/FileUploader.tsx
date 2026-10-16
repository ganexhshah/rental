import React, { useState } from 'react'
import { Upload, Modal, Button, Space, Typography, App } from 'antd'
import {
  InboxOutlined,
  EyeOutlined,
  DeleteOutlined,
  FileImageOutlined,
  FilePdfOutlined,
  PlusOutlined,
} from '@ant-design/icons'
import type { UploadProps, UploadFile } from 'antd'
import { uploadToR2, isCloudUrl } from '@/lib/storage/r2'

const { Text } = Typography

export interface FileUploaderProps {
  accept?: string
  maxSizeMB?: number
  multiple?: boolean
  fileList?: UploadFile[]
  onChange?: (fileList: UploadFile[]) => void
  disabled?: boolean
  title?: string
  description?: string
  folder?: string
  uploadOnSelect?: boolean // false by default: deferred upload on save with instant local preview
}

/**
 * Upload any pending local files (with originFileObj) to Cloudflare R2 on form save
 */
export async function uploadFileOnSave(
  fileItem?: UploadFile | null,
  folder: string = 'documents'
): Promise<string | undefined> {
  if (!fileItem) return undefined
  if (fileItem.url && isCloudUrl(fileItem.url)) {
    return fileItem.url
  }
  const rawFile = fileItem.originFileObj as File | undefined
  if (!rawFile) {
    return fileItem.url
  }

  const ext = rawFile.name.split('.').pop() || 'dat'
  const key = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${ext}`
  const res = await uploadToR2(rawFile, key, rawFile.type)
  return res.url
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  accept = 'image/*,.pdf',
  maxSizeMB = 10,
  multiple = false,
  fileList = [],
  onChange,
  disabled = false,
  title = 'Click or drop file here',
  description = 'PNG, JPG, or PDF up to 10MB',
  folder = 'documents',
  uploadOnSelect = false,
}) => {
  const { message } = App.useApp()
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewImage, setPreviewImage] = useState('')
  const [previewTitle, setPreviewTitle] = useState('')

  const handlePreview = (file: UploadFile) => {
    const previewUrl = file.url || file.thumbUrl || (file.originFileObj ? URL.createObjectURL(file.originFileObj) : '')
    setPreviewImage(previewUrl)
    setPreviewTitle(file.name || 'Document Preview')
    setPreviewOpen(true)
  }

  const handleRemove = (file: UploadFile) => {
    const updated = fileList.filter((f) => f.uid !== file.uid)
    onChange?.(updated)
  }

  const beforeUpload = (file: File) => {
    const isLtMax = file.size / 1024 / 1024 < maxSizeMB
    if (!isLtMax) {
      message.error(`File must be smaller than ${maxSizeMB}MB!`)
      return Upload.LIST_IGNORE
    }

    const localUrl = URL.createObjectURL(file)
    const newUploadFile: UploadFile = {
      uid: `local-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      name: file.name,
      status: 'done',
      url: localUrl,
      thumbUrl: localUrl,
      size: file.size,
      type: file.type,
      originFileObj: file as any,
    }

    if (uploadOnSelect) {
      // Immediate upload if configured
      const ext = file.name.split('.').pop() || 'dat'
      const key = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${ext}`
      uploadToR2(file, key, file.type)
        .then((res) => {
          newUploadFile.url = res.url
          newUploadFile.thumbUrl = res.url
          const nextList = multiple ? [...fileList, newUploadFile] : [newUploadFile]
          onChange?.(nextList)
          message.success(`${file.name} uploaded`)
        })
        .catch((err) => {
          message.error(`Upload error: ${err?.message || 'Failed'}`)
        })
    } else {
      // Instant local preview without waiting for network
      const nextList = multiple ? [...fileList, newUploadFile] : [newUploadFile]
      onChange?.(nextList)
    }

    return false // prevent default browser upload
  }

  const hasFiles = fileList && fileList.length > 0

  return (
    <div>
      {/* If file(s) exist and single upload mode, render dedicated preview card */}
      {!multiple && hasFiles ? (
        <div
          style={{
            border: '1px solid #cbd5e1',
            borderRadius: 10,
            padding: '12px 14px',
            backgroundColor: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', flex: 1, minWidth: 0 }}
            onClick={() => handlePreview(fileList[0])}
          >
            {fileList[0].type?.includes('pdf') ? (
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 8,
                  backgroundColor: '#fee2e2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <FilePdfOutlined style={{ fontSize: 28, color: '#ef4444' }} />
              </div>
            ) : (
              <img
                src={fileList[0].url || fileList[0].thumbUrl}
                alt={fileList[0].name}
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 8,
                  objectFit: 'cover',
                  backgroundColor: '#f1f5f9',
                  border: '1px solid #e2e8f0',
                  flexShrink: 0,
                }}
              />
            )}

            <div style={{ minWidth: 0 }}>
              <Text strong style={{ fontSize: 13, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {fileList[0].name}
              </Text>
              <Text type="secondary" style={{ fontSize: 11 }}>
                {fileList[0].size ? `${(fileList[0].size / 1024).toFixed(1)} KB` : 'Ready to save'} • Click to view
              </Text>
            </div>
          </div>

          <Space size="small">
            <Button
              size="middle"
              icon={<EyeOutlined />}
              onClick={() => handlePreview(fileList[0])}
            />
            <Button
              size="middle"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleRemove(fileList[0])}
            />
          </Space>
        </div>
      ) : (
        /* Upload Drag Drop Area */
        <Upload.Dragger
          accept={accept}
          multiple={multiple}
          fileList={fileList}
          disabled={disabled}
          beforeUpload={beforeUpload}
          showUploadList={false}
          style={{
            padding: '16px 12px',
            backgroundColor: '#f8fafc',
            borderRadius: 10,
            borderColor: '#cbd5e1',
          }}
        >
          <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'center' }}>
            <img src="/bg/uplaod.svg" alt="Upload" style={{ width: 38, height: 38, objectFit: 'contain' }} />
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
            {title}
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
            {description}
          </div>
        </Upload.Dragger>
      )}

      {/* Multiple Files List Preview if multiple=true */}
      {multiple && hasFiles && (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {fileList.map((f) => (
            <div
              key={f.uid}
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: '8px 12px',
                backgroundColor: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                onClick={() => handlePreview(f)}
              >
                {f.type?.includes('pdf') ? (
                  <FilePdfOutlined style={{ fontSize: 20, color: '#ef4444' }} />
                ) : (
                  <img
                    src={f.url || f.thumbUrl}
                    alt={f.name}
                    style={{ width: 36, height: 36, borderRadius: 4, objectFit: 'cover' }}
                  />
                )}
                <span style={{ fontSize: 13, fontWeight: 500 }}>{f.name}</span>
              </div>
              <Button
                size="small"
                danger
                type="text"
                icon={<DeleteOutlined />}
                onClick={() => handleRemove(f)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      <Modal
        open={previewOpen}
        title={previewTitle}
        footer={null}
        onCancel={() => setPreviewOpen(false)}
        width={650}
        centered
      >
        <div style={{ textAlign: 'center', padding: '10px 0' }}>
          {previewImage.includes('.pdf') ? (
            <iframe
              src={previewImage}
              title="PDF Preview"
              style={{ width: '100%', height: 480, border: 'none' }}
            />
          ) : (
            <img
              alt="Preview"
              style={{ width: '100%', maxHeight: 480, objectFit: 'contain', borderRadius: 8 }}
              src={previewImage}
            />
          )}
        </div>
      </Modal>
    </div>
  )
}
