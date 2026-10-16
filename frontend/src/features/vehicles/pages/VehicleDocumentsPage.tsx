import React, { useState, useMemo } from 'react'
import {
  Space,
  Button,
  Tag,
  Badge,
  message,
  Card,
  Input,
  Select,
  Row,
  Col,
  Modal,
  Form,
  DatePicker,
  Popconfirm,
  Tooltip,
  Radio,
  Typography,
  Image,
} from 'antd'
import {
  EyeOutlined,
  UploadOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  SafetyCertificateOutlined,
  DeleteOutlined,
  SearchOutlined,
  ReloadOutlined,
  CarOutlined,
  DownloadOutlined,
  AuditOutlined,
  FilePdfOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { PageHeader } from '@/components/navigation/PageHeader'
import { PageContainer } from '@/components/navigation/PageContainer'
import { DataTable } from '@/components/data-display/DataTable'
import { StatsGrid } from '@/components/data-display/StatsGrid'
import { KPIWidget } from '@/components/data-display/KPIWidget'
import { FormDrawer } from '@/components/overlays/FormDrawer'
import { FileUploader } from '@/components/forms/FileUploader'
import { vehiclesApi } from '../api'
import type { VehicleDocument, VehicleDocType, CreateVehicleDocumentInput } from '@/types/vehicle'
import type { ColumnsType } from 'antd/es/table'
import { formatDate } from '@/lib/formatting/date'

const { Text, Paragraph } = Typography
const { TextArea } = Input

const DOC_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  bluebook: { label: 'Bluebook (Registration)', color: 'cyan' },
  insurance: { label: 'Insurance Policy', color: 'blue' },
  fitness: { label: 'Fitness & Roadworthiness', color: 'green' },
  pollution: { label: 'Pollution / Emission Test', color: 'orange' },
  permit: { label: 'Route Permit', color: 'purple' },
  road_tax: { label: 'Road Tax Token', color: 'gold' },
  ownership_lease: { label: 'Ownership / Lease', color: 'geekblue' },
  inspection_certificate: { label: 'Inspection Certificate', color: 'magenta' },
  registration: { label: 'Registration', color: 'cyan' },
  other: { label: 'General Document', color: 'default' },
}

export const VehicleDocumentsPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [uploadDrawerOpen, setUploadDrawerOpen] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState<VehicleDocument | null>(null)
  const [previewModalOpen, setPreviewModalOpen] = useState(false)
  const [verifyModalOpen, setVerifyModalOpen] = useState(false)
  const [verifyingDoc, setVerifyingDoc] = useState<VehicleDocument | null>(null)

  // Filters state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedVehicle, setSelectedVehicle] = useState<string>('all')
  const [selectedDocType, setSelectedDocType] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedVerificationStatus, setSelectedVerificationStatus] = useState<string>('all')

  const [uploadForm] = Form.useForm()
  const [verifyForm] = Form.useForm()
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([])

  // Queries
  const { data: summary, isLoading: summaryLoading, refetch: refetchSummary } = useQuery({
    queryKey: ['vehicle-documents-summary'],
    queryFn: vehiclesApi.getDocumentSummary,
  })

  const { data: vehicles = [], isLoading: vehiclesLoading } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => vehiclesApi.getVehicles(),
  })

  const {
    data: documents = [],
    isLoading: docsLoading,
    refetch: refetchDocs,
  } = useQuery({
    queryKey: [
      'vehicle-documents',
      selectedVehicle,
      selectedDocType,
      selectedStatus,
      selectedVerificationStatus,
      searchQuery,
    ],
    queryFn: () =>
      vehiclesApi.getAllDocuments({
        vehicleId: selectedVehicle !== 'all' ? selectedVehicle : undefined,
        docType: selectedDocType !== 'all' ? selectedDocType : undefined,
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
        verificationStatus:
          selectedVerificationStatus !== 'all' ? selectedVerificationStatus : undefined,
        search: searchQuery.trim() || undefined,
      }),
  })

  // Mutations
  const createDocMutation = useMutation({
    mutationFn: (input: CreateVehicleDocumentInput) => vehiclesApi.createDocument(input),
    onSuccess: () => {
      message.success('Fleet document uploaded and registered successfully!')
      queryClient.invalidateQueries({ queryKey: ['vehicle-documents'] })
      queryClient.invalidateQueries({ queryKey: ['vehicle-documents-summary'] })
      uploadForm.resetFields()
      setUploadedFiles([])
      setUploadDrawerOpen(false)
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.error?.message || 'Failed to upload document')
    },
  })

  const verifyDocMutation = useMutation({
    mutationFn: ({
      id,
      status,
      notes,
    }: {
      id: string
      status: 'verified' | 'rejected' | 'pending'
      notes: string
    }) => vehiclesApi.verifyDocument(id, status, notes),
    onSuccess: (updatedDoc) => {
      message.success(
        updatedDoc.verificationStatus === 'verified'
          ? 'Document verified and approved successfully!'
          : 'Document rejected with auditor remarks.'
      )
      queryClient.invalidateQueries({ queryKey: ['vehicle-documents'] })
      queryClient.invalidateQueries({ queryKey: ['vehicle-documents-summary'] })
      setVerifyModalOpen(false)
      setVerifyingDoc(null)
      verifyForm.resetFields()
      if (selectedDoc?.id === updatedDoc.id) {
        setSelectedDoc(updatedDoc)
      }
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.error?.message || 'Verification update failed')
    },
  })

  const deleteDocMutation = useMutation({
    mutationFn: (id: string) => vehiclesApi.deleteDocument(id),
    onSuccess: () => {
      message.success('Document archived successfully.')
      queryClient.invalidateQueries({ queryKey: ['vehicle-documents'] })
      queryClient.invalidateQueries({ queryKey: ['vehicle-documents-summary'] })
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.error?.message || 'Failed to delete document')
    },
  })

  // Handle upload submit
  const handleUploadSubmit = async () => {
    try {
      const values = await uploadForm.validateFields()
      const fileUrl =
        uploadedFiles.length > 0 && uploadedFiles[0].url
          ? uploadedFiles[0].url
          : values.fileUrl ||
            'https://pub-1ccd4de4be1c4425b05bfbbde47ef4e5.r2.dev/documents/placeholder.pdf'

      const matchedV = vehicles.find((v) => v.id === values.vehicleId)
      const input: CreateVehicleDocumentInput = {
        vehicleId: values.vehicleId,
        vehiclePlate: matchedV?.plateNumber,
        vehicleName: matchedV ? `${matchedV.make} ${matchedV.model}`.trim() : undefined,
        docType: values.docType,
        name: values.name.trim(),
        documentNumber: values.documentNumber?.trim(),
        issuingAuthority: values.issuingAuthority?.trim(),
        fileUrl,
        fileName: uploadedFiles[0]?.name || values.name,
        fileSize: uploadedFiles[0]?.size || 102400,
        mimeType: uploadedFiles[0]?.type || 'application/pdf',
        issueDate: values.issueDate ? values.issueDate.format('YYYY-MM-DD') : undefined,
        expiryDate: values.expiryDate ? values.expiryDate.format('YYYY-MM-DD') : undefined,
        notes: values.notes?.trim(),
      }

      createDocMutation.mutate(input)
    } catch (err) {
      // validation error
    }
  }

  // Handle verification submit
  const handleVerifySubmit = async () => {
    try {
      const values = await verifyForm.validateFields()
      if (!verifyingDoc) return
      verifyDocMutation.mutate({
        id: verifyingDoc.id,
        status: values.verificationStatus,
        notes: values.auditorNotes || '',
      })
    } catch (err) {
      // validation error
    }
  }

  const handleOpenVerify = (record: VehicleDocument, initialStatus: 'verified' | 'rejected' = 'verified') => {
    setVerifyingDoc(record)
    verifyForm.setFieldsValue({
      verificationStatus: initialStatus,
      auditorNotes: record.notes || '',
    })
    setVerifyModalOpen(true)
  }

  // Expiry days calculation helper
  const getExpiryCountdown = (expiryDateStr?: string) => {
    if (!expiryDateStr) return null
    const expiry = dayjs(expiryDateStr)
    const today = dayjs().startOf('day')
    const diffDays = expiry.diff(today, 'day')

    if (diffDays < 0) {
      return (
        <Tag color="error" style={{ margin: 0 }}>
          Expired {Math.abs(diffDays)}d ago
        </Tag>
      )
    }
    if (diffDays <= 30) {
      return (
        <Tag color="warning" style={{ margin: 0 }}>
          Expires in {diffDays}d
        </Tag>
      )
    }
    return (
      <Tag color="success" style={{ margin: 0 }}>
        Valid ({diffDays}d left)
      </Tag>
    )
  }

  const columns: ColumnsType<VehicleDocument> = [
    {
      title: 'Document Details',
      key: 'docInfo',
      render: (_, record) => (
        <div>
          <Space direction="horizontal" size={6} align="center">
            <FileTextOutlined style={{ color: '#1677ff', fontSize: 16 }} />
            <strong style={{ fontSize: 14 }}>{record.name}</strong>
          </Space>
          <div style={{ fontSize: 12, color: 'rgba(0, 0, 0, 0.45)', marginTop: 2 }}>
            {record.documentNumber ? `No: ${record.documentNumber}` : 'No ID assigned'}
            {record.issuingAuthority && ` • ${record.issuingAuthority}`}
          </div>
        </div>
      ),
    },
    {
      title: 'Vehicle',
      key: 'vehicle',
      width: 170,
      render: (_, record) => {
        const matchedVehicle = vehicles.find((v) => v.id === record.vehicleId)
        const plate = record.vehiclePlate || matchedVehicle?.plateNumber || 'N/A'
        const name = record.vehicleName || (matchedVehicle ? `${matchedVehicle.make} ${matchedVehicle.model}`.trim() : null)
        return (
          <div>
            <Tag color="blue" style={{ fontWeight: 600 }}>
              {plate}
            </Tag>
            {name && (
              <div style={{ fontSize: 12, color: 'rgba(0, 0, 0, 0.65)', marginTop: 2 }}>
                {name}
              </div>
            )}
          </div>
        )
      },
    },
    {
      title: 'Type',
      dataIndex: 'docType',
      key: 'type',
      width: 160,
      render: (type: VehicleDocType) => {
        const info = DOC_TYPE_LABELS[type] || { label: type?.toUpperCase() || 'OTHER', color: 'default' }
        return <Tag color={info.color}>{info.label}</Tag>
      },
    },
    {
      title: 'Validity & Expiry',
      key: 'validity',
      width: 200,
      render: (_, record) => (
        <div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>
            {record.expiryDate ? formatDate(record.expiryDate) : 'No Expiry'}
          </div>
          <div style={{ marginTop: 4 }}>{getExpiryCountdown(record.expiryDate)}</div>
        </div>
      ),
    },
    {
      title: 'Compliance Status',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      render: (s: string) => {
        if (s === 'valid') {
          return <Badge status="success" text="Valid & Compliant" />
        }
        if (s === 'expiring_soon') {
          return <Badge status="warning" text="Expiring Soon" />
        }
        return <Badge status="error" text="Expired (Grounded)" />
      },
    },
    {
      title: 'Verification',
      key: 'verification',
      width: 160,
      render: (_, record) => {
        const vStatus = record.verificationStatus || 'pending'
        if (vStatus === 'verified') {
          return (
            <Tooltip
              title={`Audited by: ${record.verifiedBy || 'Staff'} on ${
                record.verifiedAt ? formatDate(record.verifiedAt) : 'Recently'
              }`}
            >
              <Tag icon={<CheckCircleOutlined />} color="success">
                Verified
              </Tag>
            </Tooltip>
          )
        }
        if (vStatus === 'rejected') {
          return (
            <Tag icon={<CloseCircleOutlined />} color="error">
              Rejected
            </Tag>
          )
        }
        return (
          <Tag icon={<ClockCircleOutlined />} color="warning">
            Pending Audit
          </Tag>
        )
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 170,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="View Document Details & Preview">
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => {
                setSelectedDoc(record)
                setPreviewModalOpen(true)
              }}
            />
          </Tooltip>
          <Tooltip title="Verify / Audit Document">
            <Button
              size="small"
              icon={<AuditOutlined />}
              onClick={() => handleOpenVerify(record, 'verified')}
            />
          </Tooltip>
          <Popconfirm
            title="Archive Document"
            description="Are you sure you want to remove this fleet document from records?"
            okText="Yes, Archive"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
            onConfirm={() => deleteDocMutation.mutate(record.id)}
          >
            <Tooltip title="Archive Document">
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const vehicleOptions = useMemo(() => {
    return vehicles.map((v) => ({
      value: v.id,
      label: `${v.plateNumber} — ${v.make} ${v.model} (${v.year})`,
    }))
  }, [vehicles])

  return (
    <PageContainer>
      <PageHeader
        title="Vehicle Documents"
        extra={
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                refetchDocs()
                refetchSummary()
              }}
            >
              Refresh
            </Button>
            <Button
              type="primary"
              icon={<UploadOutlined />}
              onClick={() => setUploadDrawerOpen(true)}
            >
              Upload Document
            </Button>
          </Space>
        }
      />

      {/* KPI Stats Grid */}
      <StatsGrid columns={5}>
        <KPIWidget
          title="Total Documents"
          value={summary?.totalDocuments ?? documents.length}
          icon={<FileTextOutlined style={{ fontSize: 22, color: '#1677ff' }} />}
          onClick={() => {
            setSelectedStatus('all')
            setSelectedVerificationStatus('all')
          }}
        />
        <KPIWidget
          title="Valid"
          value={summary?.validDocuments ?? 0}
          icon={<CheckCircleOutlined style={{ fontSize: 22, color: '#52c41a' }} />}
          onClick={() => {
            setSelectedStatus('valid')
            setSelectedVerificationStatus('all')
          }}
        />
        <KPIWidget
          title="Expiring Soon"
          value={summary?.expiringSoon ?? 0}
          icon={<ExclamationCircleOutlined style={{ fontSize: 22, color: '#faad14' }} />}
          onClick={() => {
            setSelectedStatus('expiring_soon')
            setSelectedVerificationStatus('all')
          }}
        />
        <KPIWidget
          title="Expired"
          value={summary?.expiredDocuments ?? 0}
          icon={<CloseCircleOutlined style={{ fontSize: 22, color: '#ff4d4f' }} />}
          onClick={() => {
            setSelectedStatus('expired')
            setSelectedVerificationStatus('all')
          }}
        />
        <KPIWidget
          title="Pending Review"
          value={summary?.pendingVerification ?? 0}
          icon={<SafetyCertificateOutlined style={{ fontSize: 22, color: '#722ed1' }} />}
          onClick={() => {
            setSelectedVerificationStatus('pending')
            setSelectedStatus('all')
          }}
        />
      </StatsGrid>

      {/* Filter Toolbar */}
      <Card
        size="small"
        style={{ marginBottom: 16, borderRadius: 8 }}
        styles={{ body: { padding: '12px 16px' } }}
      >
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <Input
              placeholder="Search title, document #, plate..."
              prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={5}>
            <Select
              style={{ width: '100%' }}
              placeholder="Filter by Vehicle"
              value={selectedVehicle}
              onChange={setSelectedVehicle}
              showSearch
              optionFilterProp="label"
              options={[{ value: 'all', label: 'All Vehicles' }, ...vehicleOptions]}
            />
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Select
              style={{ width: '100%' }}
              placeholder="Document Type"
              value={selectedDocType}
              onChange={setSelectedDocType}
              options={[
                { value: 'all', label: 'All Document Types' },
                { value: 'bluebook', label: 'Bluebook' },
                { value: 'insurance', label: 'Insurance' },
                { value: 'fitness', label: 'Fitness & Roadworthiness' },
                { value: 'pollution', label: 'Pollution Test' },
                { value: 'permit', label: 'Route Permit' },
                { value: 'road_tax', label: 'Road Tax Token' },
                { value: 'ownership_lease', label: 'Ownership / Lease' },
                { value: 'inspection_certificate', label: 'Inspection' },
                { value: 'other', label: 'Other Documents' },
              ]}
            />
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Select
              style={{ width: '100%' }}
              placeholder="Compliance Status"
              value={selectedStatus}
              onChange={setSelectedStatus}
              options={[
                { value: 'all', label: 'All Statuses' },
                { value: 'valid', label: 'Valid' },
                { value: 'expiring_soon', label: 'Expiring Soon' },
                { value: 'expired', label: 'Expired' },
              ]}
            />
          </Col>
          <Col xs={12} sm={8} md={3}>
            <Select
              style={{ width: '100%' }}
              placeholder="Verification"
              value={selectedVerificationStatus}
              onChange={setSelectedVerificationStatus}
              options={[
                { value: 'all', label: 'All Audits' },
                { value: 'verified', label: 'Verified' },
                { value: 'pending', label: 'Pending Audit' },
                { value: 'rejected', label: 'Rejected' },
              ]}
            />
          </Col>
          <Col xs={12} sm={24} md={2} style={{ textAlign: 'right' }}>
            <Button
              onClick={() => {
                setSearchQuery('')
                setSelectedVehicle('all')
                setSelectedDocType('all')
                setSelectedStatus('all')
                setSelectedVerificationStatus('all')
              }}
            >
              Reset
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Main Table */}
      <DataTable
        columns={columns}
        dataSource={documents}
        loading={docsLoading || summaryLoading}
        rowKey="id"
        onRetry={() => {
          refetchDocs()
          refetchSummary()
        }}
      />

      {/* Upload Document Drawer */}
      <FormDrawer
        open={uploadDrawerOpen}
        title="Upload Fleet Document"
        width={560}
        onClose={() => {
          setUploadDrawerOpen(false)
          uploadForm.resetFields()
          setUploadedFiles([])
        }}
        onSubmit={handleUploadSubmit}
        loading={createDocMutation.isPending}
      >
        <Form form={uploadForm} layout="vertical" requiredMark="optional">
          <Form.Item
            name="vehicleId"
            label="Target Fleet Vehicle"
            rules={[{ required: true, message: 'Please select a vehicle' }]}
          >
            <Select
              placeholder="Select vehicle from fleet"
              showSearch
              optionFilterProp="label"
              options={vehicleOptions}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="docType"
                label="Document Classification"
                rules={[{ required: true, message: 'Please select document type' }]}
                initialValue="bluebook"
              >
                <Select
                  options={[
                    { value: 'bluebook', label: 'Bluebook (Registration)' },
                    { value: 'insurance', label: 'Insurance Policy' },
                    { value: 'fitness', label: 'Fitness / Roadworthiness' },
                    { value: 'pollution', label: 'Pollution / Emission' },
                    { value: 'permit', label: 'Route Permit' },
                    { value: 'road_tax', label: 'Road Tax Token' },
                    { value: 'ownership_lease', label: 'Ownership / Lease Agreement' },
                    { value: 'inspection_certificate', label: 'Inspection Certificate' },
                    { value: 'other', label: 'Other Document' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="documentNumber"
                label="Document / Policy Number"
              >
                <Input placeholder="e.g. POL-SHIKHAR-9921" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="name"
            label="Document Title"
            rules={[{ required: true, message: 'Please enter document title' }]}
          >
            <Input placeholder="e.g. Comprehensive Commercial Insurance 2026/27" />
          </Form.Item>

          <Form.Item
            name="issuingAuthority"
            label="Issuing Authority"
          >
            <Input placeholder="e.g. Yatayat Byabastha Karyalaya / Shikhar Insurance Ltd" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="issueDate" label="Issue Date">
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="expiryDate"
                label="Expiry Date"
                rules={[{ required: true, message: 'Please provide expiry date' }]}
              >
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Upload Document File">
            <FileUploader
              fileList={uploadedFiles}
              onChange={setUploadedFiles}
              folder="fleet-documents"
              title="Click or drag file to upload"
              description="Supports PDF, PNG, JPG up to 10MB"
            />
          </Form.Item>

          <Form.Item
            name="fileUrl"
            label="Or External Document URL (Optional)"
            extra="If the document is already hosted externally"
          >
            <Input placeholder="https://..." />
          </Form.Item>

          <Form.Item name="notes" label="Notes & Conditions">
            <TextArea rows={3} placeholder="Special conditions, coverage limits, endorsement details..." />
          </Form.Item>
        </Form>
      </FormDrawer>

      {/* Document Previewer Modal */}
      <Modal
        open={previewModalOpen}
        title={
          <Space>
            <FileTextOutlined style={{ color: '#1677ff' }} />
            <span>{selectedDoc?.name || 'Document Details'}</span>
          </Space>
        }
        onCancel={() => setPreviewModalOpen(false)}
        width={700}
        footer={[
          <Button key="close" onClick={() => setPreviewModalOpen(false)}>
            Close
          </Button>,
          selectedDoc && (
            <Button
              key="audit"
              type="primary"
              icon={<AuditOutlined />}
              onClick={() => {
                setPreviewModalOpen(false)
                handleOpenVerify(selectedDoc, 'verified')
              }}
            >
              Audit & Verify
            </Button>
          ),
        ]}
      >
        {selectedDoc && (
          <div style={{ padding: '8px 0' }}>
            <Card size="small" style={{ marginBottom: 16, backgroundColor: '#fafafa' }}>
              <Row gutter={[16, 12]}>
                <Col span={12}>
                  <Text type="secondary">Document Type:</Text>
                  <div>
                    <Tag color={DOC_TYPE_LABELS[selectedDoc.docType]?.color || 'default'}>
                      {DOC_TYPE_LABELS[selectedDoc.docType]?.label || selectedDoc.docType}
                    </Tag>
                  </div>
                </Col>
                <Col span={12}>
                  <Text type="secondary">Compliance Status:</Text>
                  <div>
                    <Badge
                      status={
                        selectedDoc.status === 'valid'
                          ? 'success'
                          : selectedDoc.status === 'expiring_soon'
                          ? 'warning'
                          : 'error'
                      }
                      text={selectedDoc.status?.toUpperCase().replace('_', ' ')}
                    />
                  </div>
                </Col>
                <Col span={12}>
                  <Text type="secondary">Vehicle:</Text>
                  <div>
                    {(() => {
                      const matchedVehicle = vehicles.find((v) => v.id === selectedDoc.vehicleId)
                      const plate = selectedDoc.vehiclePlate || matchedVehicle?.plateNumber || 'N/A'
                      const name = selectedDoc.vehicleName || (matchedVehicle ? `${matchedVehicle.make} ${matchedVehicle.model}`.trim() : '')
                      return (
                        <>
                          <strong>{plate}</strong>
                          {name && ` (${name})`}
                        </>
                      )
                    })()}
                  </div>
                </Col>
                <Col span={12}>
                  <Text type="secondary">Document Number:</Text>
                  <div>{selectedDoc.documentNumber || '-'}</div>
                </Col>
                <Col span={12}>
                  <Text type="secondary">Issuing Authority:</Text>
                  <div>{selectedDoc.issuingAuthority || '-'}</div>
                </Col>
                <Col span={12}>
                  <Text type="secondary">Expiry Date:</Text>
                  <div>
                    {selectedDoc.expiryDate ? formatDate(selectedDoc.expiryDate) : 'No Expiry'} (
                    {getExpiryCountdown(selectedDoc.expiryDate)})
                  </div>
                </Col>
                <Col span={12}>
                  <Text type="secondary">Verification Status:</Text>
                  <div>
                    <Tag
                      color={
                        selectedDoc.verificationStatus === 'verified'
                          ? 'success'
                          : selectedDoc.verificationStatus === 'rejected'
                          ? 'error'
                          : 'warning'
                      }
                    >
                      {selectedDoc.verificationStatus?.toUpperCase() || 'PENDING'}
                    </Tag>
                  </div>
                </Col>
                {selectedDoc.verifiedBy && (
                  <Col span={12}>
                    <Text type="secondary">Verified By:</Text>
                    <div>{selectedDoc.verifiedBy}</div>
                  </Col>
                )}
                {selectedDoc.notes && (
                  <Col span={24}>
                    <Text type="secondary">Notes:</Text>
                    <Paragraph style={{ margin: 0 }}>{selectedDoc.notes}</Paragraph>
                  </Col>
                )}
              </Row>
            </Card>

            {(() => {
              const pageUrls = selectedDoc.fileUrls && selectedDoc.fileUrls.length > 0 ? selectedDoc.fileUrls : selectedDoc.fileUrl ? [selectedDoc.fileUrl] : []
              const isPdf = selectedDoc.mimeType === 'application/pdf' || selectedDoc.fileUrl?.includes('.pdf') || selectedDoc.fileName?.toLowerCase().endsWith('.pdf')

              return (
                <div
                  style={{
                    border: '1px dashed #d9d9d9',
                    borderRadius: 8,
                    padding: 16,
                    backgroundColor: '#f8fafc',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>
                        {selectedDoc.fileName || selectedDoc.name}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        {pageUrls.length} Page Scan{pageUrls.length > 1 ? 's' : ''} • Securely hosted in cloud storage
                      </div>
                    </div>
                    {selectedDoc.fileUrl && (
                      <Button
                        type="primary"
                        icon={<DownloadOutlined />}
                        onClick={() => window.open(selectedDoc.fileUrl, '_blank')}
                      >
                        Download Original
                      </Button>
                    )}
                  </div>

                  {pageUrls.length > 0 ? (
                    isPdf ? (
                      <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <FilePdfOutlined style={{ fontSize: 48, color: '#ef4444', marginBottom: 12 }} />
                        <div style={{ fontWeight: 500, marginBottom: 12 }}>Adobe PDF Fleet Document</div>
                        <Button
                          type="primary"
                          icon={<EyeOutlined />}
                          onClick={() => window.open(selectedDoc.fileUrl, '_blank')}
                        >
                          Open & View PDF Document
                        </Button>
                      </div>
                    ) : (
                      <Image.PreviewGroup>
                        <Row gutter={[10, 10]}>
                          {pageUrls.map((url, idx) => (
                            <Col xs={12} sm={8} key={`${url}-${idx}`}>
                              <div style={{ position: 'relative' }}>
                                <Image
                                  src={url}
                                  alt={`Page ${idx + 1}`}
                                  style={{
                                    width: '100%',
                                    height: 140,
                                    objectFit: 'cover',
                                    borderRadius: 6,
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
                                  {idx === 0 ? 'Page 1 (Front)' : idx === 1 ? 'Page 2 (Back)' : `Page ${idx + 1}`}
                                </Tag>
                              </div>
                            </Col>
                          ))}
                        </Row>
                      </Image.PreviewGroup>
                    )
                  ) : (
                    <div style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8' }}>
                      No scan file attached
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        )}
      </Modal>

      {/* Verification / Audit Modal */}
      <Modal
        open={verifyModalOpen}
        title={
          <Space>
            <AuditOutlined style={{ color: '#722ed1' }} />
            <span>Audit & Verify Fleet Document</span>
          </Space>
        }
        onCancel={() => {
          setVerifyModalOpen(false)
          setVerifyingDoc(null)
          verifyForm.resetFields()
        }}
        onOk={handleVerifySubmit}
        okText="Confirm Verification Audit"
        confirmLoading={verifyDocMutation.isPending}
      >
        {verifyingDoc && (
          <div style={{ padding: '8px 0' }}>
            <Paragraph>
              Auditing document <strong>{verifyingDoc.name}</strong> assigned to vehicle{' '}
              <strong>{verifyingDoc.vehiclePlate}</strong>.
            </Paragraph>

            <Form form={verifyForm} layout="vertical">
              <Form.Item
                name="verificationStatus"
                label="Audit Decision"
                rules={[{ required: true }]}
              >
                <Radio.Group buttonStyle="solid">
                  <Radio.Button value="verified" style={{ color: '#52c41a' }}>
                    <CheckCircleOutlined /> Approve & Verify
                  </Radio.Button>
                  <Radio.Button value="rejected" style={{ color: '#ff4d4f' }}>
                    <CloseCircleOutlined /> Reject Document
                  </Radio.Button>
                  <Radio.Button value="pending">
                    <ClockCircleOutlined /> Leave Pending
                  </Radio.Button>
                </Radio.Group>
              </Form.Item>

              <Form.Item
                name="auditorNotes"
                label="Auditor Remarks / Justification"
                extra="Provide explanation if rejected, or policy compliance details."
              >
                <TextArea rows={3} placeholder="e.g. Validated with official Department of Transport stamp..." />
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>
    </PageContainer>
  )
}
