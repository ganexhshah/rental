import React, { useState, useCallback } from 'react'
import { Modal, Slider, Button, Space, Typography, Radio, Flex, App, Spin } from 'antd'
import {
  ScissorOutlined,
  RotateLeftOutlined,
  RotateRightOutlined,
  UndoOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  CheckOutlined,
  CloseOutlined,
} from '@ant-design/icons'
import Cropper, { type Area, type Point } from 'react-easy-crop'

const { Text } = Typography

export interface CroppedResult {
  file: File
  blob: Blob
  url: string
}

export interface ImageCropperModalProps {
  open: boolean
  imageSrc: string | null
  title?: string
  aspectRatio?: number
  allowAspectChange?: boolean
  onClose: () => void
  onCropComplete: (result: CroppedResult) => void | Promise<void>
}

// Helper: load image safely
function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.addEventListener('load', () => resolve(img))
    img.addEventListener('error', (err) => reject(err))
    // Don't set crossOrigin for data URLs to prevent security/tainted canvas issues
    if (!url.startsWith('data:')) {
      img.setAttribute('crossOrigin', 'anonymous')
    }
    img.src = url
  })
}

// Helper: get radian from degrees
function getRadianAngle(degreeValue: number) {
  return (degreeValue * Math.PI) / 180
}

// Helper: calculate rotated size
function rotateSize(width: number, height: number, rotation: number) {
  const rotRad = getRadianAngle(rotation)
  return {
    width: Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height: Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  }
}

// Helper: Canvas cropping implementation
async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  rotation = 0
): Promise<CroppedResult> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('Canvas 2D context not available')
  }

  const rotRad = getRadianAngle(rotation)
  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(image.naturalWidth, image.naturalHeight, rotation)

  // Canvas matching bounding box of rotated image
  canvas.width = bBoxWidth
  canvas.height = bBoxHeight

  ctx.translate(bBoxWidth / 2, bBoxHeight / 2)
  ctx.rotate(rotRad)
  ctx.translate(-image.naturalWidth / 2, -image.naturalHeight / 2)
  ctx.drawImage(image, 0, 0)

  // Cropped canvas
  const croppedCanvas = document.createElement('canvas')
  const croppedCtx = croppedCanvas.getContext('2d')

  if (!croppedCtx) {
    throw new Error('Cropped canvas 2D context not available')
  }

  croppedCanvas.width = Math.max(1, Math.round(pixelCrop.width))
  croppedCanvas.height = Math.max(1, Math.round(pixelCrop.height))

  croppedCtx.drawImage(
    canvas,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    croppedCanvas.width,
    croppedCanvas.height
  )

  return new Promise((resolve, reject) => {
    croppedCanvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Canvas crop export failed'))
          return
        }
        const file = new File([blob], `vehicle-cropped-${Date.now()}.jpg`, { type: 'image/jpeg' })
        const url = croppedCanvas.toDataURL('image/jpeg', 0.92)
        resolve({ file, blob, url })
      },
      'image/jpeg',
      0.92
    )
  })
}

export const ImageCropperModal: React.FC<ImageCropperModalProps> = ({
  open,
  imageSrc,
  title = 'Crop & Adjust Photo',
  aspectRatio = 16 / 9,
  allowAspectChange = true,
  onClose,
  onCropComplete,
}) => {
  const { message } = App.useApp()
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState<number>(1)
  const [rotation, setRotation] = useState<number>(0)
  const [aspect, setAspect] = useState<number>(aspectRatio)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const onCropChange = useCallback((newCrop: Point) => {
    setCrop(newCrop)
  }, [])

  const onZoomChange = useCallback((newZoom: number) => {
    setZoom(newZoom)
  }, [])

  const onCropCompleteHandler = useCallback((_croppedArea: Area, currentCroppedAreaPixels: Area) => {
    setCroppedAreaPixels(currentCroppedAreaPixels)
  }, [])

  const handleReset = () => {
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setRotation(0)
    setAspect(aspectRatio)
  }

  const handleConfirm = async () => {
    if (!imageSrc || !croppedAreaPixels) {
      message.error('Unable to crop: no image or selection area found')
      return
    }

    try {
      setIsProcessing(true)
      const cropped = await getCroppedImg(imageSrc, croppedAreaPixels, rotation)
      await onCropComplete(cropped)
      handleReset()
      onClose()
    } catch (err) {
      console.error('Failed to crop image:', err)
      message.error('Failed to process cropped image.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCancel = () => {
    handleReset()
    onClose()
  }

  return (
    <Modal
      open={open}
      title={
        <Space>
          <ScissorOutlined style={{ color: '#1677ff' }} />
          <span>{title}</span>
        </Space>
      }
      width={760}
      onCancel={handleCancel}
      destroyOnClose
      footer={
        <Flex justify="space-between" align="center" style={{ width: '100%' }}>
          <Button icon={<UndoOutlined />} onClick={handleReset} disabled={isProcessing}>
            Reset
          </Button>
          <Space>
            <Button icon={<CloseOutlined />} onClick={handleCancel} disabled={isProcessing}>
              Cancel
            </Button>
            <Button
              type="primary"
              icon={<CheckOutlined />}
              onClick={handleConfirm}
              loading={isProcessing}
            >
              Apply Crop & Save
            </Button>
          </Space>
        </Flex>
      }
    >
      <div style={{ marginTop: 12 }}>
        {/* Cropper Container */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: 380,
            background: '#0a0a0a',
            borderRadius: 8,
            overflow: 'hidden',
          }}
        >
          {imageSrc ? (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={aspect}
              onCropChange={onCropChange}
              onZoomChange={onZoomChange}
              onRotationChange={setRotation}
              onCropComplete={onCropCompleteHandler}
            />
          ) : (
            <Flex justify="center" align="center" style={{ height: '100%' }}>
              <Spin tip="Loading image..." />
            </Flex>
          )}
        </div>

        {/* Controls Bar */}
        <div style={{ marginTop: 16 }}>
          {/* Zoom Slider */}
          <Flex align="center" gap={12} style={{ marginBottom: 12 }}>
            <ZoomOutOutlined style={{ color: '#8c8c8c' }} />
            <Text style={{ minWidth: 40, fontSize: 13 }}>Zoom</Text>
            <Slider
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={setZoom}
              style={{ flex: 1 }}
            />
            <ZoomInOutlined style={{ color: '#8c8c8c' }} />
            <Text type="secondary" style={{ width: 44, textAlign: 'right', fontSize: 12 }}>
              {zoom.toFixed(1)}x
            </Text>
          </Flex>

          <Flex justify="space-between" align="center" wrap="wrap" gap={12}>
            {/* Rotation Controls */}
            <Space>
              <Text style={{ fontSize: 13 }}>Rotation:</Text>
              <Button
                size="small"
                icon={<RotateLeftOutlined />}
                onClick={() => setRotation((prev) => (prev - 90 + 360) % 360)}
              >
                -90°
              </Button>
              <Button
                size="small"
                icon={<RotateRightOutlined />}
                onClick={() => setRotation((prev) => (prev + 90) % 360)}
              >
                +90°
              </Button>
              {rotation !== 0 && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  ({rotation}°)
                </Text>
              )}
            </Space>

            {/* Aspect Ratio Options */}
            {allowAspectChange && (
              <Space>
                <Text style={{ fontSize: 13 }}>Aspect Ratio:</Text>
                <Radio.Group
                  size="small"
                  value={aspect}
                  onChange={(e) => setAspect(e.target.value)}
                  optionType="button"
                  buttonStyle="solid"
                >
                  <Radio.Button value={16 / 9}>16:9 (Fleet Hero)</Radio.Button>
                  <Radio.Button value={4 / 3}>4:3 (Photo)</Radio.Button>
                  <Radio.Button value={1}>1:1 (Square)</Radio.Button>
                </Radio.Group>
              </Space>
            )}
          </Flex>
        </div>
      </div>
    </Modal>
  )
}
