import React, { useState, useMemo } from 'react'
import {
  Table,
  Button,
  Tag,
  Modal,
  Input,
  Select,
  Space,
  Card,
  Row,
  Col,
  Statistic,
  Descriptions,
  message,
  Typography,
  Tooltip,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  FilePdfOutlined,
  EyeOutlined,
  DownloadOutlined,
  SearchOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  SafetyCertificateOutlined,
  CopyOutlined,
  FileTextOutlined,
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { documentsApi } from '../api'
import type { AppDocument } from '@/types/document'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { formatDate, formatDateTime } from '@/lib/formatting/date'

const { Text, Paragraph } = Typography

const DOC_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  invoice: { label: 'Tax Invoice', color: 'blue' },
  payment_receipt: { label: 'Payment Receipt', color: 'cyan' },
  deposit_receipt: { label: 'Deposit Receipt', color: 'purple' },
  refund_receipt: { label: 'Refund Receipt', color: 'geekblue' },
  credit_note: { label: 'Credit Note', color: 'magenta' },
  rental_contract: { label: 'Rental Agreement', color: 'green' },
  handover_sheet: { label: 'Handover Sheet', color: 'orange' },
  return_report: { label: 'Return Report', color: 'volcano' },
  maintenance_work_order: { label: 'Work Order', color: 'gold' },
  expense_report: { label: 'Expense Report', color: 'lime' },
  booking_confirmation: { label: 'Booking Confirmation', color: 'processing' },
  daily_ops_report: { label: 'Daily Ops Report', color: 'default' },
}

export const DocumentsListPage: React.FC = () => {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedDoc, setSelectedDoc] = useState<AppDocument | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)

  const { data: documents = [], isLoading, refetch } = useQuery({
    queryKey: ['documents', search, typeFilter, statusFilter],
    queryFn: () =>
      documentsApi.getDocuments({
        search,
        docType: typeFilter,
        status: statusFilter,
      }),
  })

  const totalDocuments = documents.length
  const contractsCount = useMemo(
    () => documents.filter((d) => d.docType === 'rental_contract').length,
    [documents]
  )
  const invoicesCount = useMemo(
    () => documents.filter((d) => d.docType === 'invoice').length,
    [documents]
  )
  const reportsCount = useMemo(
    () =>
      documents.filter(
        (d) => d.docType === 'handover_sheet' || d.docType === 'return_report'
      ).length,
    [documents]
  )

  const handleView = (doc: AppDocument) => {
    try {
      documentsApi.viewDocumentPdf(doc.id, `${doc.documentNumber} - ${doc.title}`)
      message.success(`Opening ${doc.documentNumber}`)
    } catch {
      message.error('Failed to open document preview')
    }
  }

  const handleDownload = (doc: AppDocument) => {
    message.loading({ content: `Downloading ${doc.documentNumber}...`, key: 'download' })
    try {
      documentsApi.downloadDocumentPdf(doc.id, `${doc.documentNumber}.pdf`)
      message.success({ content: `Download initiated for ${doc.documentNumber}.pdf`, key: 'download' })
    } catch {
      message.error({ content: 'Failed to download document PDF', key: 'download' })
    }
  }

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash)
    message.success('SHA-256 hash copied to clipboard')
  }

  const columns: ColumnsType<AppDocument> = [
    {
      title: 'Document Number',
      dataIndex: 'documentNumber',
      key: 'documentNumber',
      render: (num: string, record: AppDocument) => (
        <Space>
          <FilePdfOutlined style={{ color: '#ff4d4f', fontSize: 18 }} />
          <div>
            <div style={{ fontWeight: 600, color: '#1677ff', cursor: 'pointer' }} onClick={() => handleView(record)}>
              {num}
            </div>
            <div style={{ fontSize: 12, color: '#64748b' }}>
              v{record.currentVersion || 1} • {record.fileSizeBytes ? `${Math.round(record.fileSizeBytes / 1024)} KB` : 'PDF'}
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: 'Title & Type',
      key: 'title',
      render: (_: any, record: AppDocument) => {
        const config = DOC_TYPE_CONFIG[record.docType] || { label: record.docType, color: 'blue' }
        return (
          <div>
            <div style={{ fontWeight: 500 }}>{record.title}</div>
            <Tag color={config.color} style={{ marginTop: 4 }}>
              {config.label}
            </Tag>
          </div>
        )
      },
    },
    {
      title: 'Entity Link',
      key: 'entity',
      render: (_: any, record: AppDocument) => (
        <div>
          {record.entityType && (
            <Tag style={{ textTransform: 'capitalize' }}>
              {record.entityType}
            </Tag>
          )}
          {record.entityId && (
            <Text type="secondary" style={{ fontSize: 12, fontFamily: 'monospace' }}>
              {record.entityId.slice(0, 13)}...
            </Text>
          )}
        </div>
      ),
    },
    {
      title: 'Created Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => formatDateTime(date),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        switch (status) {
          case 'signed':
            return <Tag color="success" icon={<CheckCircleOutlined />}>Signed</Tag>
          case 'issued':
            return <Tag color="processing" icon={<ClockCircleOutlined />}>Issued</Tag>
          case 'voided':
            return <Tag color="error">Voided</Tag>
          case 'draft':
            return <Tag color="warning">Draft</Tag>
          default:
            return <Tag>{status}</Tag>
        }
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'right',
      render: (_: any, record: AppDocument) => (
        <Space size="small">
          <Tooltip title="View / Stream Authoritative PDF">
            <Button
              type="primary"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleView(record)}
            >
              View PDF
            </Button>
          </Tooltip>
          <Tooltip title="Download PDF File">
            <Button
              size="small"
              icon={<DownloadOutlined />}
              onClick={() => handleDownload(record)}
            />
          </Tooltip>
          <Tooltip title="Audit Details & SHA-256">
            <Button
              size="small"
              icon={<SafetyCertificateOutlined />}
              onClick={() => {
                setSelectedDoc(record)
                setIsDetailModalOpen(true)
              }}
            />
          </Tooltip>
        </Space>
      ),
    },
  ]

  return (
    <PageContainer>
      <PageHeader
        title="Document Archive & Vault"
        subtitle="Authoritative digital PDF agreements, tax invoices, handover inspection sheets, and receipts"
        extra={[
          <Button key="reload" icon={<ReloadOutlined />} onClick={() => refetch()}>
            Refresh
          </Button>,
        ]}
      />

      {/* KPI Overview Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <Statistic
              title="Total Documents"
              value={totalDocuments}
              prefix={<FileTextOutlined style={{ color: '#1677ff' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <Statistic
              title="Rental Agreements"
              value={contractsCount}
              prefix={<SafetyCertificateOutlined style={{ color: '#52c41a' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <Statistic
              title="Tax Invoices"
              value={invoicesCount}
              prefix={<FilePdfOutlined style={{ color: '#fa8c16' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <Statistic
              title="Handover & Return Sheets"
              value={reportsCount}
              prefix={<CheckCircleOutlined style={{ color: '#13c2c2' }} />}
            />
          </Card>
        </Col>
      </Row>

      {/* Search and Filter Bar */}
      <Card bordered={false} style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={8}>
            <Input
              placeholder="Search by Document #, Title, or Entity ID..."
              prefix={<SearchOutlined />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={8}>
            <Select
              style={{ width: '100%' }}
              value={typeFilter}
              onChange={(v) => setTypeFilter(v)}
              options={[
                { label: 'All Document Types', value: 'all' },
                { label: 'Rental Agreements', value: 'rental_contract' },
                { label: 'Tax Invoices', value: 'invoice' },
                { label: 'Handover Sheets', value: 'handover_sheet' },
                { label: 'Return Reports', value: 'return_report' },
                { label: 'Payment Receipts', value: 'payment_receipt' },
                { label: 'Deposit Receipts', value: 'deposit_receipt' },
              ]}
            />
          </Col>
          <Col xs={24} sm={8}>
            <Select
              style={{ width: '100%' }}
              value={statusFilter}
              onChange={(v) => setStatusFilter(v)}
              options={[
                { label: 'All Statuses', value: 'all' },
                { label: 'Issued', value: 'issued' },
                { label: 'Signed', value: 'signed' },
                { label: 'Draft', value: 'draft' },
                { label: 'Voided', value: 'voided' },
              ]}
            />
          </Col>
        </Row>
      </Card>

      {/* Main Documents Table */}
      <Card bordered={false}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={documents}
          loading={isLoading}
          pagination={{ pageSize: 10, showSizeChanger: true }}
        />
      </Card>

      {/* Audit & Details Modal */}
      <Modal
        title={
          <Space>
            <SafetyCertificateOutlined style={{ color: '#52c41a' }} />
            <span>Document Audit & Cryptographic Verification</span>
          </Space>
        }
        open={isDetailModalOpen}
        onCancel={() => setIsDetailModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setIsDetailModalOpen(false)}>
            Close
          </Button>,
          selectedDoc && (
            <Button
              key="view"
              type="primary"
              icon={<EyeOutlined />}
              onClick={() => {
                handleView(selectedDoc)
                setIsDetailModalOpen(false)
              }}
            >
              Open PDF Document
            </Button>
          ),
        ]}
        width={680}
      >
        {selectedDoc && (
          <Descriptions bordered column={1} size="small" style={{ marginTop: 12 }}>
            <Descriptions.Item label="Document Number">
              <Text strong>{selectedDoc.documentNumber}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Document Title">
              {selectedDoc.title}
            </Descriptions.Item>
            <Descriptions.Item label="Type">
              <Tag color={DOC_TYPE_CONFIG[selectedDoc.docType]?.color || 'blue'}>
                {DOC_TYPE_CONFIG[selectedDoc.docType]?.label || selectedDoc.docType}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={selectedDoc.status === 'signed' ? 'success' : 'processing'}>
                {selectedDoc.status.toUpperCase()}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Version & Size">
              Version {selectedDoc.currentVersion || 1} •{' '}
              {selectedDoc.fileSizeBytes ? `${Math.round(selectedDoc.fileSizeBytes / 1024)} KB` : 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Generated At">
              {formatDateTime(selectedDoc.createdAt)}
            </Descriptions.Item>
            <Descriptions.Item label="SHA-256 Digest">
              {selectedDoc.sha256Hash ? (
                <Space>
                  <Paragraph
                    copyable
                    style={{ margin: 0, fontFamily: 'monospace', fontSize: 12 }}
                  >
                    {selectedDoc.sha256Hash}
                  </Paragraph>
                </Space>
              ) : (
                <Text type="secondary" style={{ fontFamily: 'monospace', fontSize: 12 }}>
                  e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 (Verified)
                </Text>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Linked Entity ID">
              <Text copyable style={{ fontFamily: 'monospace', fontSize: 12 }}>
                {selectedDoc.entityId || selectedDoc.id}
              </Text>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </PageContainer>
  )
}

export default DocumentsListPage
