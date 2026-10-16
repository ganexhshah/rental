import React, { useState, useMemo, useEffect } from 'react'
import {
  Modal,
  Tabs,
  Input,
  Button,
  Space,
  Tag,
  Row,
  Col,
  Checkbox,
  Upload,
  Spin,
  message,
  Empty,
  Typography,
  theme,
} from 'antd'
import {
  PictureOutlined,
  CloudUploadOutlined,
  SearchOutlined,
  CheckCircleFilled,
  DeleteOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { vehiclesApi } from '@/features/vehicles/api'
import { uploadToR2, isCloudUrl } from '@/lib/storage/r2'
import type { Vehicle, VehicleDocument } from '@/types/vehicle'

const { Text } = Typography

export interface MediaLibraryItem {
  id: string
  url: string
  title?: string
  category?: 'car' | 'bike' | 'scooter' | 'document' | 'other'
  uploadedAt: string
}

export interface MediaLibraryModalProps {
  open: boolean
  onClose: () => void
  onSelect: (selectedUrls: string[]) => void
  multiple?: boolean
  title?: string
  currentSelected?: string[]
}

const STORAGE_KEY = 'rental_fleet_media_library'

export const MediaLibraryModal: React.FC<MediaLibraryModalProps> = ({
  open,
  onClose,
  onSelect,
  multiple = true,
  title = 'Fleet Media & Image Library',
  currentSelected = [],
}) => {
  const { token } = theme.useToken()
  const [activeTab, setActiveTab] = useState<'library' | 'upload'>('library')
  const [selectedUrls, setSelectedUrls] = useState<string[]>(currentSelected)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'car' | 'bike' | 'scooter' | 'document' | 'uploaded'>('all')
  const [isUploading, setIsUploading] = useState<boolean>(false)

  // Local storage uploaded media
  const [localMedia, setLocalMedia] = useState<MediaLibraryItem[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) return JSON.parse(stored)
    } catch (_) {}
    return []
  })

  // Sync selected on modal open
  useEffect(() => {
    if (open) {
      setSelectedUrls(currentSelected || [])
    }
  }, [open, currentSelected])

  // Fetch all vehicles from backend
  const { data: vehicles = [], isLoading: isVehiclesLoading, refetch: refetchVehicles } = useQuery<Vehicle[]>({
    queryKey: ['vehicles-media-library'],
    queryFn: () => vehiclesApi.getVehicles(),
    enabled: open,
  })

  // Fetch all vehicle documents from backend
  const { data: documents = [], isLoading: isDocsLoading, refetch: refetchDocs } = useQuery<VehicleDocument[]>({
    queryKey: ['vehicle-docs-media-library'],
    queryFn: () => vehiclesApi.getAllDocuments(),
    enabled: open,
  })

  const isLoadingData = isVehiclesLoading || isDocsLoading

  // Combine vehicle images, document scans, and user uploaded items from backend & local storage
  const allMediaItems = useMemo<MediaLibraryItem[]>(() => {
    const items: MediaLibraryItem[] = []
    const seenUrls = new Set<string>()

    // 1. User uploaded media items (highest priority)
    localMedia.forEach((m: MediaLibraryItem) => {
      if (m.url && !seenUrls.has(m.url)) {
        seenUrls.add(m.url)
        items.push(m)
      }
    })

    // 2. Images attached to existing vehicles from backend
    vehicles.forEach((v: Vehicle) => {
      const vImages = (v.images && v.images.length > 0 ? v.images : v.primaryImage ? [v.primaryImage] : []).filter(
        (url: string) => url && typeof url === 'string' && url.trim().length > 0
      )
      vImages.forEach((url: string, idx: number) => {
        if (!seenUrls.has(url)) {
          seenUrls.add(url)
          items.push({
            id: `veh-${v.id}-${idx}`,
            url,
            title: `${v.make} ${v.model} (${v.plateNumber})`,
            category: (v.type as any) || 'car',
            uploadedAt: v.createdAt || new Date().toISOString(),
          })
        }
      })
    })

    // 3. Document image scans from backend
    documents.forEach((d: VehicleDocument) => {
      const docUrls = (d.fileUrls && d.fileUrls.length > 0 ? d.fileUrls : d.fileUrl ? [d.fileUrl] : []).filter(
        (url: string) => {
          if (!url || typeof url !== 'string') return false
          const lower = url.toLowerCase()
          return (
            lower.endsWith('.png') ||
            lower.endsWith('.jpg') ||
            lower.endsWith('.jpeg') ||
            lower.endsWith('.webp') ||
            lower.includes('image') ||
            (d.mimeType && d.mimeType.startsWith('image/'))
          )
        }
      )
      docUrls.forEach((url: string, idx: number) => {
        if (!seenUrls.has(url)) {
          seenUrls.add(url)
          items.push({
            id: `doc-${d.id}-${idx}`,
            url,
            title: `${d.vehiclePlate ? `${d.vehiclePlate} - ` : ''}${d.name || 'Vehicle Document'}`,
            category: 'document',
            uploadedAt: d.createdAt || new Date().toISOString(),
          })
        }
      })
    })

    return items
  }, [vehicles, documents, localMedia])

  // Filter items by query & category
  const filteredItems = useMemo(() => {
    return allMediaItems.filter((item) => {
      if (categoryFilter === 'uploaded') {
        const isUserUpload = localMedia.some((lm) => lm.url === item.url)
        if (!isUserUpload) return false
      } else if (categoryFilter === 'document') {
        if (item.category !== 'document') return false
      } else if (categoryFilter !== 'all' && item.category !== categoryFilter) {
        return false
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchesTitle = item.title?.toLowerCase().includes(q)
        const matchesUrl = item.url?.toLowerCase().includes(q)
        return Boolean(matchesTitle || matchesUrl)
      }

      return true
    })
  }, [allMediaItems, categoryFilter, searchQuery, localMedia])

  // Handle image toggle selection
  const handleToggleSelect = (url: string) => {
    if (!multiple) {
      setSelectedUrls([url])
      return
    }
    setSelectedUrls((prev) => {
      if (prev.includes(url)) {
        return prev.filter((u) => u !== url)
      } else {
        return [...prev, url]
      }
    })
  }

  // Select / Deselect All visible
  const handleSelectAllVisible = () => {
    const visibleUrls = filteredItems.map((i) => i.url)
    const allSelected = visibleUrls.every((u) => selectedUrls.includes(u))
    if (allSelected) {
      setSelectedUrls((prev) => prev.filter((u) => !visibleUrls.includes(u)))
    } else {
      setSelectedUrls((prev) => Array.from(new Set([...prev, ...visibleUrls])))
    }
  }

  // Handle uploading new files directly inside the media library
  const handleUploadFiles = async (fileList: File[]) => {
    const validFiles = Array.from(fileList).filter((f) => f.type.startsWith('image/'))
    if (validFiles.length === 0) {
      message.error('Please upload valid image files (PNG, JPG, WEBP)')
      return false
    }

    setIsUploading(true)
    const hideMsg = message.loading(`Uploading ${validFiles.length} photo${validFiles.length > 1 ? 's' : ''}...`, 0)
    const newItems: MediaLibraryItem[] = []
    const newUrls: string[] = []

    for (const file of validFiles) {
      try {
        const ext = file.name.split('.').pop() || 'jpg'
        const key = `fleet-media/${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${ext}`
        const res = await uploadToR2(file, key, file.type)

        if (res?.url && isCloudUrl(res.url)) {
          const item: MediaLibraryItem = {
            id: `upload-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            url: res.url,
            title: file.name.replace(/\.[^/.]+$/, ''),
            uploadedAt: new Date().toISOString(),
          }
          newItems.push(item)
          newUrls.push(res.url)
        }
      } catch (err: any) {
        console.error('Media library file upload failed:', file.name, err)
      }
    }

    hideMsg()
    setIsUploading(false)

    if (newItems.length > 0) {
      const updatedLocal = [...newItems, ...localMedia]
      setLocalMedia(updatedLocal)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedLocal))
      } catch (_) {}

      // Auto select uploaded items
      if (multiple) {
        setSelectedUrls((prev) => [...newUrls, ...prev])
      } else {
        setSelectedUrls([newUrls[0]])
      }

      message.success('Uploaded successfully!')
      setActiveTab('library')
    } else {
      message.error('Upload failed. Please try again.')
    }

    return false
  }

  // Confirm selection and pass to parent
  const handleConfirm = () => {
    if (selectedUrls.length === 0) {
      message.warning('Please select at least one photo from the library')
      return
    }
    onSelect(selectedUrls)
    onClose()
  }

  const handleRefresh = () => {
    refetchVehicles()
    refetchDocs()
  }

  return (
    <Modal
      open={open}
      title={
        <Space>
          <PictureOutlined style={{ color: token.colorPrimary }} />
          <span>{title}</span>
          {selectedUrls.length > 0 && (
            <Tag color="blue">{selectedUrls.length} selected</Tag>
          )}
        </Space>
      }
      onCancel={onClose}
      width={880}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            {selectedUrls.length > 0 && (
              <Button size="small" type="text" onClick={() => setSelectedUrls([])}>
                Clear Selection ({selectedUrls.length})
              </Button>
            )}
          </div>
          <Space>
            <Button onClick={onClose}>Cancel</Button>
            <Button
              type="primary"
              onClick={handleConfirm}
              disabled={selectedUrls.length === 0}
            >
              {multiple
                ? `Use Selected ${selectedUrls.length > 0 ? `(${selectedUrls.length})` : ''}`
                : 'Use Selected Photo'}
            </Button>
          </Space>
        </div>
      }
      destroyOnClose
    >
      <Tabs
        activeKey={activeTab}
        onChange={(k) => setActiveTab(k as any)}
        items={[
          {
            key: 'library',
            label: (
              <Space>
                <PictureOutlined />
                <span>Browse Fleet Gallery ({allMediaItems.length})</span>
              </Space>
            ),
          },
          {
            key: 'upload',
            label: (
              <Space>
                <CloudUploadOutlined />
                <span>Upload New Photos</span>
              </Space>
            ),
          },
        ]}
      />

      {activeTab === 'library' && (
        <div>
          {/* Filter Bar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
              marginBottom: 16,
            }}
          >
            <Space wrap>
              <Input
                placeholder="Search photos by vehicle or plate..."
                prefix={<SearchOutlined style={{ color: token.colorTextSecondary }} />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                allowClear
                style={{ width: 240 }}
              />
              <Space size={6} wrap>
                <Button
                  size="small"
                  type={categoryFilter === 'all' ? 'primary' : 'default'}
                  onClick={() => setCategoryFilter('all')}
                >
                  All ({allMediaItems.length})
                </Button>
                <Button
                  size="small"
                  type={categoryFilter === 'car' ? 'primary' : 'default'}
                  onClick={() => setCategoryFilter('car')}
                >
                  Cars & SUVs
                </Button>
                <Button
                  size="small"
                  type={categoryFilter === 'bike' ? 'primary' : 'default'}
                  onClick={() => setCategoryFilter('bike')}
                >
                  Bikes
                </Button>
                <Button
                  size="small"
                  type={categoryFilter === 'scooter' ? 'primary' : 'default'}
                  onClick={() => setCategoryFilter('scooter')}
                >
                  Scooters
                </Button>
                <Button
                  size="small"
                  type={categoryFilter === 'document' ? 'primary' : 'default'}
                  onClick={() => setCategoryFilter('document')}
                >
                  Documents
                </Button>
                <Button
                  size="small"
                  type={categoryFilter === 'uploaded' ? 'primary' : 'default'}
                  onClick={() => setCategoryFilter('uploaded')}
                >
                  Uploads ({localMedia.length})
                </Button>
              </Space>
            </Space>

            <Space>
              <Button size="small" icon={<ReloadOutlined />} onClick={handleRefresh} loading={isLoadingData} />
              {filteredItems.length > 0 && multiple && (
                <Button size="small" onClick={handleSelectAllVisible}>
                  {filteredItems.every((i) => selectedUrls.includes(i.url)) ? 'Deselect All' : 'Select All'}
                </Button>
              )}
            </Space>
          </div>

          {/* Image Grid */}
          <div style={{ maxHeight: '420px', minHeight: '200px', overflowY: 'auto', paddingRight: 4 }}>
            {isLoadingData ? (
              <div style={{ padding: '60px 0', textAlign: 'center' }}>
                <Spin size="large" />
                <div style={{ marginTop: 12, color: token.colorTextSecondary }}>Loading fleet media library...</div>
              </div>
            ) : filteredItems.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={searchQuery ? 'No photos matching your search' : 'No photos in fleet media library yet'}
              >
                <Button type="primary" icon={<CloudUploadOutlined />} onClick={() => setActiveTab('upload')}>
                  Upload New Photos
                </Button>
              </Empty>
            ) : (
              <Row gutter={[12, 12]}>
                {filteredItems.map((item) => {
                  const isSelected = selectedUrls.includes(item.url)
                  return (
                    <Col xs={12} sm={8} md={6} key={item.id}>
                      <div
                        onClick={() => handleToggleSelect(item.url)}
                        style={{
                          position: 'relative',
                          border: `2px solid ${isSelected ? token.colorPrimary : token.colorBorderSecondary}`,
                          borderRadius: 8,
                          overflow: 'hidden',
                          cursor: 'pointer',
                          background: token.colorFillAlter,
                          transition: 'all 0.2s ease',
                          boxShadow: isSelected ? `0 0 0 2px ${token.colorPrimaryBorder}` : 'none',
                        }}
                      >
                        {/* Image Thumbnail */}
                        <div style={{ height: 110, width: '100%', overflow: 'hidden', background: '#000' }}>
                          <img
                            src={item.url}
                            alt={item.title || 'Fleet Photo'}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              opacity: isSelected ? 0.9 : 1,
                              transition: 'transform 0.3s ease',
                            }}
                          />
                        </div>

                        {/* Top Select Checkmark Badge */}
                        <div
                          style={{
                            position: 'absolute',
                            top: 6,
                            right: 6,
                            background: isSelected ? token.colorPrimary : 'rgba(0,0,0,0.45)',
                            color: '#fff',
                            borderRadius: '50%',
                            width: 22,
                            height: 22,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                          }}
                        >
                          {isSelected ? (
                            <CheckCircleFilled style={{ fontSize: 16 }} />
                          ) : (
                            <Checkbox checked={false} style={{ pointerEvents: 'none' }} />
                          )}
                        </div>

                        {/* Title Footer */}
                        <div
                          style={{
                            padding: '6px 8px',
                            background: token.colorBgContainer,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            fontSize: 12,
                            fontWeight: 500,
                          }}
                          title={item.title || item.url}
                        >
                          {item.title || 'Vehicle Photo'}
                        </div>
                      </div>
                    </Col>
                  )
                })}
              </Row>
            )}
          </div>
        </div>
      )}

      {activeTab === 'upload' && (
        <div style={{ padding: '20px 0' }}>
          <Upload.Dragger
            accept="image/png,image/jpeg,image/webp,image/jpg"
            multiple
            showUploadList={false}
            beforeUpload={(file, fileList) => {
              if (file === fileList[0] || (file as any).uid === (fileList[0] as any)?.uid) {
                handleUploadFiles(fileList as File[])
              }
              return false
            }}
            disabled={isUploading}
            style={{
              padding: '36px 16px',
              background: token.colorFillAlter,
              borderRadius: 10,
              border: `1.5px dashed ${token.colorBorder}`,
            }}
          >
            {isUploading ? (
              <Space direction="vertical" align="center" style={{ padding: '24px 0' }}>
                <Spin size="large" />
                <Text strong style={{ fontSize: 15 }}>Uploading...</Text>
              </Space>
            ) : (
              <>
                <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}>
                  <img src="/bg/uplaod.svg" alt="Upload" style={{ width: 56, height: 56, objectFit: 'contain' }} />
                </div>
                <p style={{ fontSize: 16, fontWeight: 600, margin: 0, color: token.colorText }}>
                  Click or drag vehicle photos here to upload
                </p>
              </>
            )}
          </Upload.Dragger>
        </div>
      )}
    </Modal>
  )
}
