import React, { useState } from 'react'
import { Upload, Modal, App } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import type { UploadFile, UploadProps } from 'antd'
import { uploadToR2, isCloudUrl } from '@/lib/storage/r2'

interface ImageUploaderProps {
  fileList?: UploadFile[]
  onChange?: (fileList: UploadFile[]) => void
  maxCount?: number
  disabled?: boolean
  folder?: string
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  fileList = [],
  onChange,
  maxCount = 6,
  disabled = false,
  folder = 'images',
}) => {
  const { message } = App.useApp()
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewImage, setPreviewImage] = useState('')
  const [previewTitle, setPreviewTitle] = useState('')

  const handlePreview = async (file: UploadFile) => {
    setPreviewImage(file.url || (file.thumbUrl as string))
    setPreviewOpen(true)
    setPreviewTitle(file.name || file.url?.substring(file.url.lastIndexOf('/') + 1) || 'Image Preview')
  }

  const customUpload: UploadProps['customRequest'] = async (options) => {
    const { file, onSuccess, onError } = options
    const rawFile = file as File
    const ext = rawFile.name.split('.').pop() || 'jpg'
    const key = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${ext}`

    try {
      const res = await uploadToR2(rawFile, key, rawFile.type)
      if (res?.url && isCloudUrl(res.url)) {
        const uploadedFile: UploadFile = {
          uid: `${Date.now()}`,
          name: rawFile.name,
          status: 'done',
          url: res.url,
        }
        onSuccess?.(res, rawFile as any)
        onChange?.([...fileList, uploadedFile])
        message.success('Uploaded successfully!')
      } else {
        throw new Error('Upload failed')
      }
    } catch (err: any) {
      console.error('Upload failed in ImageUploader:', err)
      message.error(`Failed to upload ${rawFile.name}: ${err?.message || 'Upload error'}`)
      onError?.(err as any)
    }
  }

  const handleChange: UploadProps['onChange'] = ({ fileList: newFileList }) => {
    onChange?.(newFileList)
  }

  const uploadButton = (
    <div>
      <PlusOutlined />
      <div style={{ marginTop: 8, fontSize: 13 }}>Upload</div>
    </div>
  )

  return (
    <>
      <Upload
        listType="picture-card"
        fileList={fileList}
        onPreview={handlePreview}
        onChange={handleChange}
        customRequest={customUpload}
        maxCount={maxCount}
        disabled={disabled}
        accept="image/png,image/jpeg,image/webp"
      >
        {fileList.length >= maxCount ? null : uploadButton}
      </Upload>

      <Modal
        open={previewOpen}
        title={previewTitle}
        footer={null}
        onCancel={() => setPreviewOpen(false)}
      >
        <img alt="preview" style={{ width: '100%', borderRadius: 8 }} src={previewImage} />
      </Modal>
    </>
  )
}
