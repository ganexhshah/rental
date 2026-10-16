import React, { useState } from 'react'
import {
  Descriptions,
  Tabs,
  Tag,
  Button,
  Space,
  Table,
  Badge,
  Card,
  Row,
  Col,
  Image,
  Segmented,
  Empty,
  Tooltip,
  Typography,
  Spin,
} from 'antd'
import {
  CarOutlined,
  EditOutlined,
  ToolOutlined,
  DollarOutlined,
  FileTextOutlined,
  WarningOutlined,
  DownloadOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  FilePdfOutlined,
  PictureOutlined,
  AppstoreOutlined,
  BarsOutlined,
  SafetyCertificateOutlined,
  PlusOutlined,
  CalendarOutlined,
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import type { Vehicle, VehicleDocument, VehicleDocType } from '@/types/vehicle'
import { DetailDrawer } from '@/components/overlays/DetailDrawer'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { CurrencyDisplay } from '@/components/data-display/CurrencyDisplay'
import { ImageGallery } from '@/components/overlays/ImageGallery'
import { formatDate } from '@/lib/formatting/date'
import { vehiclesApi } from '../api'

const { Text, Paragraph } = Typography

const DOC_TYPE_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  bluebook: { label: 'Bluebook (Registration)', color: 'blue', icon: <FileProtectOutlinedIcon /> },
  registration: { label: 'Vehicle Registration', color: 'blue', icon: <FileProtectOutlinedIcon /> },
  insurance: { label: 'Insurance Policy', color: 'green', icon: <SafetyCertificateOutlined /> },
  fitness: { label: 'Fitness & Roadworthiness', color: 'cyan', icon: <ToolOutlined /> },
  pollution: { label: 'Pollution / Emission Test', color: 'orange', icon: <CheckCircleOutlined /> },
  permit: { label: 'Route Permit', color: 'purple', icon: <CarOutlined /> },
  road_tax: { label: 'Road Tax Token', color: 'geekblue', icon: <DollarOutlined /> },
  ownership_lease: { label: 'Ownership / Lease', color: 'magenta', icon: <FileTextOutlined /> },
  inspection_certificate: { label: 'Inspection Certificate', color: 'gold', icon: <SafetyCertificateOutlined /> },
  other: { label: 'Official Fleet Document', color: 'default', icon: <FileTextOutlined /> },
}

function FileProtectOutlinedIcon() {
  return <SafetyCertificateOutlined />
}

interface VehicleDetailsDrawerProps {
  vehicle: Vehicle | null
  open: boolean
  onClose: () => void
  onEdit?: (vehicle: Vehicle) => void
  onStatusChange?: (vehicle: Vehicle, newStatus: string) => void
}

export const VehicleDetailsDrawer: React.FC<VehicleDetailsDrawerProps> = ({
  vehicle,
  open,
  onClose,
  onEdit,
}) => {
  const [activeTab, setActiveTab] = useState('overview')
  const [docViewMode, setDocViewMode] = useState<'cards' | 'table'>('cards')

  // Dynamically fetch vehicle full details and attached documents
  const { data: fullVehicle } = useQuery({
    queryKey: ['vehicle', vehicle?.id],
    queryFn: () => (vehicle?.id ? vehiclesApi.getVehicleById(vehicle.id) : null),
    enabled: Boolean(vehicle?.id) && open,
    initialData: vehicle || undefined,
  })

  const { data: serverDocs = [], isLoading: docsLoading } = useQuery({
    queryKey: ['vehicle-documents', vehicle?.id],
    queryFn: () => (vehicle?.id ? vehiclesApi.getVehicleDocuments(vehicle.id) : []),
    enabled: Boolean(vehicle?.id) && open,
  })

  const currentVehicle: Vehicle | null = fullVehicle || vehicle || null

  // Merge and deduplicate documents from server query and vehicle object
  const mergedDocs: VehicleDocument[] = React.useMemo(() => {
    if (!currentVehicle) return []
    const map = new Map<string, VehicleDocument>()
    const all = [...(currentVehicle.documents || []), ...serverDocs]
    all.forEach((d) => {
      if (d && d.id) {
        map.set(d.id, d)
      }
    })
    return Array.from(map.values())
  }, [currentVehicle?.documents, serverDocs])

  // Get all unique exterior/interior photos of the vehicle
  const allVehiclePhotos = React.useMemo(() => {
    if (!currentVehicle) return []
    const list = [
      currentVehicle.primaryImage,
      ...(currentVehicle.images || []),
    ].filter(Boolean) as string[]
    return Array.from(new Set(list))
  }, [currentVehicle?.primaryImage, currentVehicle?.images])

  if (!currentVehicle) return null

  // Helper to check if a URL is an image vs PDF
  const isImageFile = (url?: string, mimeType?: string, fileName?: string) => {
    if (!url) return false
    if (mimeType?.startsWith('image/')) return true
    if (url.includes('.pdf') || fileName?.toLowerCase().endsWith('.pdf') || mimeType === 'application/pdf') {
      return false
    }
    return true
  }

  const items = [
    {
      key: 'overview',
      label: 'Overview & Gallery',
      children: (
        <div>
          <div style={{ marginBottom: 20 }}>
            {allVehiclePhotos.length > 0 ? (
              <Image.PreviewGroup>
                <div style={{ position: 'relative', marginBottom: 12 }}>
                  <Image
                    src={allVehiclePhotos[0]}
                    alt={`${currentVehicle.make} ${currentVehicle.model}`}
                    style={{
                      width: '100%',
                      maxHeight: 300,
                      objectFit: 'cover',
                      borderRadius: 10,
                      border: '1px solid #f0f0f0',
                    }}
                  />
                  <Tag
                    color="blue"
                    style={{
                      position: 'absolute',
                      bottom: 12,
                      left: 12,
                      padding: '4px 10px',
                      fontSize: 12,
                      fontWeight: 600,
                      borderRadius: 6,
                    }}
                  >
                    Primary Fleet Photo
                  </Tag>
                </div>
                {allVehiclePhotos.length > 1 && (
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: 'rgba(0,0,0,0.65)' }}>
                      Fleet Gallery ({allVehiclePhotos.length} Photos) — Click to view high-res
                    </div>
                    <Row gutter={[8, 8]}>
                      {allVehiclePhotos.slice(1).map((img, idx) => (
                        <Col xs={8} sm={6} md={4} key={`${img}-${idx}`}>
                          <Image
                            src={img}
                            alt={`Photo ${idx + 2}`}
                            style={{
                              width: '100%',
                              height: 75,
                              objectFit: 'cover',
                              borderRadius: 6,
                              border: '1px solid #e8e8e8',
                            }}
                          />
                        </Col>
                      ))}
                    </Row>
                  </div>
                )}
              </Image.PreviewGroup>
            ) : (
              <div
                style={{
                  height: 180,
                  backgroundColor: '#f5f5f5',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#999',
                  marginBottom: 16,
                }}
              >
                <CarOutlined style={{ fontSize: 36, marginRight: 8 }} />
                <span>No vehicle photos uploaded</span>
              </div>
            )}
          </div>

          <Descriptions bordered column={2} size="small" style={{ marginBottom: 16 }}>
            <Descriptions.Item label="Registration Plate">
              <strong style={{ fontSize: 14 }}>{currentVehicle.plateNumber}</strong>
            </Descriptions.Item>
            <Descriptions.Item label="Type">
              <Tag color="blue">{currentVehicle.type.toUpperCase()}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Make & Model">
              {currentVehicle.make} {currentVehicle.model}
            </Descriptions.Item>
            <Descriptions.Item label="Year">{currentVehicle.year}</Descriptions.Item>
            <Descriptions.Item label="Category">{currentVehicle.categoryName || '-'}</Descriptions.Item>
            <Descriptions.Item label="Station Location">{currentVehicle.locationName || '-'}</Descriptions.Item>
            <Descriptions.Item label="Status">
              <StatusBadge status={currentVehicle.status} />
            </Descriptions.Item>
            <Descriptions.Item label="Current Odometer">
              {currentVehicle.specs.mileageOdometer?.toLocaleString()} km
            </Descriptions.Item>
          </Descriptions>

          {currentVehicle.currentRentalBookingId && (
            <Card
              size="small"
              title="Current Rental Details"
              style={{ marginBottom: 16, borderColor: '#91caff', backgroundColor: '#e6f4ff' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div>
                    Booking Reference: <strong>#{currentVehicle.currentRentalBookingId}</strong>
                  </div>
                  <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.65)' }}>
                    Rented to: <strong>{currentVehicle.currentRenterName || 'Registered Renter'}</strong>
                  </div>
                </div>
                <Tag color="processing">In Active Use</Tag>
              </div>
            </Card>
          )}

          {currentVehicle.notes && (
            <Card size="small" title="Internal Notes" style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.65)' }}>{currentVehicle.notes}</div>
            </Card>
          )}
        </div>
      ),
    },
    {
      key: 'documents',
      label: (
        <span>
          <FileTextOutlined style={{ marginRight: 6 }} />
          Documents ({mergedDocs.length})
        </span>
      ),
      children: docsLoading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin tip="Loading verified fleet documents..." />
        </div>
      ) : mergedDocs.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No official documents (Bluebook, Insurance, Route Permit) attached yet"
          style={{ padding: '30px 0' }}
        >
          {onEdit && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => onEdit(currentVehicle)}
            >
              Attach Official Documents
            </Button>
          )}
        </Empty>
      ) : (
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <Text type="secondary" style={{ fontSize: 13 }}>
              Showing {mergedDocs.length} official compliance document{mergedDocs.length > 1 ? 's' : ''} for{' '}
              <strong>{currentVehicle.plateNumber}</strong>
            </Text>
            <Segmented
              size="small"
              options={[
                { value: 'cards', icon: <AppstoreOutlined />, label: 'Visual Cards' },
                { value: 'table', icon: <BarsOutlined />, label: 'Table' },
              ]}
              value={docViewMode}
              onChange={(val) => setDocViewMode(val as 'cards' | 'table')}
            />
          </div>

          {docViewMode === 'cards' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {mergedDocs.map((doc, docIdx) => {
                const meta = DOC_TYPE_META[doc.docType || doc.type] || {
                  label: doc.name || 'Document',
                  color: 'blue',
                  icon: <FileTextOutlined />,
                }
                const pageUrls = doc.fileUrls && doc.fileUrls.length > 0 ? doc.fileUrls : doc.fileUrl ? [doc.fileUrl] : []

                return (
                  <Card
                    key={doc.id || docIdx}
                    size="small"
                    style={{
                      borderRadius: 10,
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    }}
                    styles={{ body: { padding: '16px' } }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div>
                        <Space size={8} wrap align="center">
                          <Tag color={meta.color} icon={meta.icon} style={{ fontSize: 12, padding: '2px 8px' }}>
                            {meta.label}
                          </Tag>
                          <strong style={{ fontSize: 15, color: '#1e293b' }}>{doc.name}</strong>
                        </Space>
                        {doc.documentNumber && (
                          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                            Document / Policy No: <strong>{doc.documentNumber}</strong>
                            {doc.issuingAuthority && ` • Authority: ${doc.issuingAuthority}`}
                          </div>
                        )}
                      </div>

                      <Space size={6}>
                        <Tag
                          color={
                            doc.status === 'valid'
                              ? 'success'
                              : doc.status === 'expiring_soon'
                              ? 'warning'
                              : 'error'
                          }
                        >
                          {(doc.status || 'valid').replace('_', ' ').toUpperCase()}
                        </Tag>
                        {doc.verificationStatus && (
                          <Tag
                            color={
                              doc.verificationStatus === 'verified'
                                ? 'green'
                                : doc.verificationStatus === 'rejected'
                                ? 'red'
                                : 'orange'
                            }
                          >
                            {(doc.verificationStatus).toUpperCase()}
                          </Tag>
                        )}
                      </Space>
                    </div>

                    <Row gutter={[16, 8]} style={{ marginBottom: 14, backgroundColor: '#f8fafc', padding: '10px 12px', borderRadius: 6 }}>
                      <Col span={12}>
                        <Text type="secondary" style={{ fontSize: 12 }}>Issue Date:</Text>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>
                          {doc.issueDate ? formatDate(doc.issueDate) : 'Not specified'}
                        </div>
                      </Col>
                      <Col span={12}>
                        <Text type="secondary" style={{ fontSize: 12 }}>Expiry Date:</Text>
                        <div style={{ fontSize: 13, fontWeight: 500, color: doc.expiryDate ? '#0f172a' : '#64748b' }}>
                          {doc.expiryDate ? formatDate(doc.expiryDate) : 'Perpetual / No Expiry'}
                        </div>
                      </Col>
                    </Row>

                    {/* Scanned Document Photos / Pages */}
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 8 }}>
                        Attached Document Scans ({pageUrls.length} Page{pageUrls.length > 1 ? 's' : ''}):
                      </div>

                      {pageUrls.length > 0 ? (
                        <Image.PreviewGroup>
                          <Row gutter={[10, 10]}>
                            {pageUrls.map((url, pageIdx) => {
                              const isImg = isImageFile(url, doc.mimeType, doc.fileName)
                              const pageLabel = pageIdx === 0 ? 'Page 1 (Front)' : pageIdx === 1 ? 'Page 2 (Back)' : `Page ${pageIdx + 1}`

                              if (!isImg) {
                                return (
                                  <Col xs={12} sm={8} key={`${url}-${pageIdx}`}>
                                    <div
                                      style={{
                                        border: '1px solid #cbd5e1',
                                        borderRadius: 8,
                                        padding: 12,
                                        textAlign: 'center',
                                        backgroundColor: '#ffffff',
                                        height: 120,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                      }}
                                    >
                                      <FilePdfOutlined style={{ fontSize: 32, color: '#ef4444', marginBottom: 6 }} />
                                      <div style={{ fontSize: 11, fontWeight: 600, color: '#334155' }}>
                                        {pageLabel} (PDF)
                                      </div>
                                      <Button
                                        size="small"
                                        type="link"
                                        icon={<DownloadOutlined />}
                                        onClick={() => window.open(url, '_blank')}
                                        style={{ padding: 0, height: 'auto', marginTop: 4 }}
                                      >
                                        Open PDF
                                      </Button>
                                    </div>
                                  </Col>
                                )
                              }

                              return (
                                <Col xs={12} sm={8} md={6} key={`${url}-${pageIdx}`}>
                                  <div style={{ position: 'relative' }}>
                                    <Image
                                      src={url}
                                      alt={`${doc.name} - ${pageLabel}`}
                                      style={{
                                        width: '100%',
                                        height: 120,
                                        objectFit: 'cover',
                                        borderRadius: 8,
                                        border: '1px solid #cbd5e1',
                                      }}
                                    />
                                    <Tag
                                      color="blue"
                                      style={{
                                        position: 'absolute',
                                        bottom: 6,
                                        left: 6,
                                        margin: 0,
                                        fontSize: 10,
                                        fontWeight: 600,
                                        borderRadius: 4,
                                        pointerEvents: 'none',
                                      }}
                                    >
                                      {pageLabel}
                                    </Tag>
                                  </div>
                                </Col>
                              )
                            })}
                          </Row>
                        </Image.PreviewGroup>
                      ) : (
                        <div
                          style={{
                            padding: '12px',
                            backgroundColor: '#f8fafc',
                            borderRadius: 6,
                            textAlign: 'center',
                            color: '#94a3b8',
                            fontSize: 12,
                          }}
                        >
                          No scanned photo or file attached
                        </div>
                      )}
                    </div>

                    {doc.notes && (
                      <div style={{ marginTop: 10, fontSize: 12, color: '#64748b', fontStyle: 'italic' }}>
                        Notes: {doc.notes}
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          ) : (
            <Table
              dataSource={mergedDocs}
              rowKey="id"
              pagination={false}
              size="small"
              columns={[
                {
                  title: 'Document Title',
                  dataIndex: 'name',
                  key: 'name',
                  render: (t, r) => (
                    <div>
                      <strong>{t}</strong>
                      {r.documentNumber && (
                        <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)' }}>
                          No: {r.documentNumber}
                        </div>
                      )}
                    </div>
                  ),
                },
                {
                  title: 'Type',
                  key: 'type',
                  render: (_, r) => {
                    const m = DOC_TYPE_META[r.docType || r.type] || { label: r.docType || 'DOCUMENT', color: 'blue' }
                    return <Tag color={m.color}>{m.label}</Tag>
                  },
                },
                {
                  title: 'Expiry',
                  dataIndex: 'expiryDate',
                  key: 'exp',
                  render: (d) => (d ? formatDate(d) : 'Perpetual'),
                },
                {
                  title: 'Status',
                  dataIndex: 'status',
                  key: 'st',
                  render: (s) => (
                    <Badge
                      status={s === 'valid' ? 'success' : s === 'expiring_soon' ? 'warning' : 'error'}
                      text={s?.replace('_', ' ').toUpperCase()}
                    />
                  ),
                },
                {
                  title: 'Audit',
                  dataIndex: 'verificationStatus',
                  key: 'vst',
                  render: (v) => (
                    <Tag color={v === 'verified' ? 'success' : v === 'rejected' ? 'error' : 'warning'}>
                      {(v || 'PENDING').toUpperCase()}
                    </Tag>
                  ),
                },
                {
                  title: 'Scans',
                  key: 'file',
                  render: (_, r) => {
                    const urls = r.fileUrls && r.fileUrls.length > 0 ? r.fileUrls : r.fileUrl ? [r.fileUrl] : []
                    if (urls.length === 0) return '-'
                    return (
                      <Image.PreviewGroup>
                        <Space size={4}>
                          {urls.map((u, i) => (
                            <Image
                              key={i}
                              src={u}
                              width={32}
                              height={32}
                              style={{ objectFit: 'cover', borderRadius: 4 }}
                            />
                          ))}
                        </Space>
                      </Image.PreviewGroup>
                    )
                  },
                },
              ]}
            />
          )}
        </div>
      ),
    },
    {
      key: 'specs',
      label: 'Specifications',
      children: (
        <div>
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="Transmission">{currentVehicle.specs?.transmission || '-'}</Descriptions.Item>
            <Descriptions.Item label="Fuel / Powertrain">{currentVehicle.specs?.fuelType || '-'}</Descriptions.Item>
            <Descriptions.Item label="Engine Capacity (CC)">
              {currentVehicle.specs?.engineCapacity
                ? String(currentVehicle.specs.engineCapacity).toLowerCase().includes('cc')
                  ? currentVehicle.specs.engineCapacity
                  : `${currentVehicle.specs.engineCapacity} CC`
                : 'Standard'}
            </Descriptions.Item>
            <Descriptions.Item label="Seating Capacity">{currentVehicle.specs?.seatingCapacity || 1} Passengers</Descriptions.Item>
            <Descriptions.Item label="Exterior Color">{currentVehicle.specs?.color || '-'}</Descriptions.Item>
            <Descriptions.Item label="VIN / Chassis">{currentVehicle.specs?.vinOrChassisNumber || '-'}</Descriptions.Item>
            <Descriptions.Item label="Air Conditioning">{currentVehicle.specs?.hasAC ? 'Yes' : 'No'}</Descriptions.Item>
            <Descriptions.Item label="GPS Telematics">{currentVehicle.specs?.hasGPS ? 'Installed' : 'None'}</Descriptions.Item>
            <Descriptions.Item label="Bluetooth Audio">{currentVehicle.specs?.hasBluetooth ? 'Yes' : 'No'}</Descriptions.Item>
            <Descriptions.Item label="Helmet Included">{currentVehicle.specs?.helmetIncluded ? 'Yes' : 'N/A'}</Descriptions.Item>
            {Array.isArray(currentVehicle.specs?.features) && currentVehicle.specs.features.length > 0 && (
              <Descriptions.Item label="Additional Amenities" span={2}>
                <Space wrap size={[4, 6]}>
                  {currentVehicle.specs.features.map((feat) => (
                    <Tag key={feat} color="blue">
                      {feat}
                    </Tag>
                  ))}
                </Space>
              </Descriptions.Item>
            )}
          </Descriptions>
        </div>
      ),
    },
    {
      key: 'pricing',
      label: 'Rates & Pricing',
      children: (
        <div>
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Card size="small" title="Standard Rates">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span>Daily Rate:</span>
                  <strong><CurrencyDisplay amount={currentVehicle.pricing.dailyRate} /></strong>
                </div>
                {currentVehicle.pricing.weeklyRate && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span>Weekly Rate:</span>
                    <strong><CurrencyDisplay amount={currentVehicle.pricing.weeklyRate} /></strong>
                  </div>
                )}
                {currentVehicle.pricing.monthlyRate && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span>Monthly Rate:</span>
                    <strong><CurrencyDisplay amount={currentVehicle.pricing.monthlyRate} /></strong>
                  </div>
                )}
                {currentVehicle.pricing.hourlyRate && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span>Hourly Rate:</span>
                    <strong><CurrencyDisplay amount={currentVehicle.pricing.hourlyRate} /></strong>
                  </div>
                )}
              </Card>
            </Col>
            <Col span={12}>
              <Card size="small" title="Security & Limits">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span>Deposit Amount:</span>
                  <strong><CurrencyDisplay amount={currentVehicle.pricing.depositAmount} /></strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span>Allowed Daily km:</span>
                  <strong>{currentVehicle.pricing.allowedKmPerDay || 'Unlimited'} km</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span>Extra km Rate:</span>
                  <strong>
                    {currentVehicle.pricing.extraKmRate ? `Rs. ${currentVehicle.pricing.extraKmRate}/km` : 'N/A'}
                  </strong>
                </div>
              </Card>
            </Col>
          </Row>
        </div>
      ),
    },
    {
      key: 'damages',
      label: `Damage Log (${currentVehicle.damages?.length || 0})`,
      children: (
        <Table
          dataSource={currentVehicle.damages || []}
          rowKey="id"
          pagination={false}
          size="small"
          columns={[
            { title: 'Date', dataIndex: 'date', key: 'd', render: (d) => formatDate(d) },
            { title: 'Description', dataIndex: 'description', key: 'desc' },
            { title: 'Severity', dataIndex: 'severity', key: 'sev', render: (s) => <Tag color={s === 'severe' ? 'red' : 'orange'}>{s?.toUpperCase()}</Tag> },
            { title: 'Estimated Cost', dataIndex: 'estimatedCost', key: 'cost', render: (c) => <CurrencyDisplay amount={c} /> },
            { title: 'Status', dataIndex: 'status', key: 'st', render: (s) => <Tag>{s}</Tag> },
          ]}
        />
      ),
    },
  ]

  return (
    <DetailDrawer
      open={open}
      onClose={onClose}
      width={780}
      title={`${currentVehicle.make} ${currentVehicle.model} (${currentVehicle.year})`}
      subtitle={`Plate: ${currentVehicle.plateNumber} • ${currentVehicle.categoryName || currentVehicle.type}`}
      extraActions={
        onEdit && (
          <Button type="primary" icon={<EditOutlined />} onClick={() => onEdit(currentVehicle)}>
            Edit Vehicle
          </Button>
        )
      }
    >
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={items} />
    </DetailDrawer>
  )
}
