import React, { useState } from 'react'
import {
  Space,
  Button,
  Tag,
  Card,
  Input,
  Select,
  App,
  Row,
  Col,
} from 'antd'
import {
  FileTextOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  EyeOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/navigation/PageHeader'
import { PageContainer } from '@/components/navigation/PageContainer'
import { DataTable } from '@/components/data-display/DataTable'
import { customersApi } from '../api'
import type { CustomerDocument } from '@/types/customer'
import type { ColumnsType } from 'antd/es/table'
import { formatDate } from '@/lib/formatting/date'

export const CustomerDocumentsPage: React.FC = () => {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [docTypeFilter, setDocTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const { data: documents = [], isLoading, refetch } = useQuery<CustomerDocument[]>({
    queryKey: ['all-customer-documents', { search, type: docTypeFilter, status: statusFilter }],
    queryFn: () =>
      customersApi.getAllCustomerDocuments({
        search: search.trim() || undefined,
        docType: docTypeFilter === 'all' ? undefined : docTypeFilter,
        verificationStatus: statusFilter === 'all' ? undefined : statusFilter,
      }),
  })

  const verifyDocMutation = useMutation({
    mutationFn: ({ docId, status, reason }: { docId: string; status: 'verified' | 'rejected'; reason?: string }) =>
      customersApi.verifyCustomerDocument(docId, status, reason),
    onSuccess: (_, vars) => {
      message.success(vars.status === 'verified' ? 'Document approved' : 'Document rejected')
      queryClient.invalidateQueries({ queryKey: ['all-customer-documents'] })
      queryClient.invalidateQueries({ queryKey: ['customer-docs'] })
      refetch()
    },
    onError: () => message.error('Failed to update document status'),
  })

  const columns: ColumnsType<CustomerDocument> = [
    {
      title: 'Customer',
      dataIndex: 'customerName',
      key: 'customer',
      render: (name, record) => (
        <div>
          <div
            style={{ fontWeight: 600, color: '#1677ff', cursor: record.customerId ? 'pointer' : 'default' }}
            onClick={() => record.customerId && navigate(`/customers/view/${record.customerId}`)}
          >
            {name || 'Customer'}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>{record.customerEmail}</div>
        </div>
      ),
    },
    {
      title: 'Document Type',
      dataIndex: 'docType',
      key: 'docType',
      render: (type) => (
        <Tag color="blue">{String(type || 'document').toUpperCase().replace(/_/g, ' ')}</Tag>
      ),
    },
    {
      title: 'Document Number',
      dataIndex: 'documentNumber',
      key: 'number',
      render: (num) => num || '-',
    },
    {
      title: 'Expiry Date',
      dataIndex: 'expiryDate',
      key: 'expiry',
      render: (d) => {
        if (!d) return '-'
        const isExp = new Date(d).getTime() < Date.now()
        return (
          <span style={{ color: isExp ? '#ff4d4f' : 'inherit', fontWeight: isExp ? 600 : 'normal' }}>
            {formatDate(d)} {isExp ? '(EXPIRED)' : ''}
          </span>
        )
      },
    },
    {
      title: 'Status',
      dataIndex: 'verificationStatus',
      key: 'status',
      render: (s) => {
        let color = 'orange'
        if (s === 'verified') color = 'green'
        if (s === 'rejected') color = 'red'
        return <Tag color={color}>{String(s || 'pending').toUpperCase()}</Tag>
      },
    },
    {
      title: 'File',
      key: 'file',
      render: (_, r) =>
        r.fileUrl ? (
          <Button
            size="small"
            type="link"
            icon={<EyeOutlined />}
            href={r.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            View File
          </Button>
        ) : (
          '-'
        ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          {record.verificationStatus !== 'verified' && (
            <Button
              size="small"
              type="text"
              icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              onClick={() => verifyDocMutation.mutate({ docId: record.id, status: 'verified' })}
              loading={verifyDocMutation.isPending}
            >
              Verify
            </Button>
          )}
          {record.verificationStatus !== 'rejected' && (
            <Button
              size="small"
              type="text"
              danger
              icon={<CloseCircleOutlined />}
              onClick={() => verifyDocMutation.mutate({ docId: record.id, status: 'rejected', reason: 'Unclear document' })}
              loading={verifyDocMutation.isPending}
            >
              Reject
            </Button>
          )}
        </Space>
      ),
    },
  ]

  return (
    <PageContainer>
      <PageHeader
        title="Customer Documents"
        extra={
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
            Refresh
          </Button>
        }
      />

      <Card size="small" style={{ marginBottom: 16, borderRadius: 8 }} styles={{ body: { padding: '12px 16px' } }}>
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={10} md={8}>
            <Input
              placeholder="Search document or customer..."
              prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={12} sm={7} md={5}>
            <Select
              style={{ width: '100%' }}
              value={docTypeFilter}
              onChange={setDocTypeFilter}
              options={[
                { value: 'all', label: 'All Document Types' },
                { value: 'driving_licence', label: 'Driving Licence' },
                { value: 'citizenship', label: 'Citizenship' },
                { value: 'passport', label: 'Passport' },
                { value: 'national_id', label: 'National ID' },
              ]}
            />
          </Col>
          <Col xs={12} sm={7} md={5}>
            <Select
              style={{ width: '100%' }}
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'all', label: 'All Statuses' },
                { value: 'verified', label: 'Verified' },
                { value: 'pending', label: 'Pending' },
                { value: 'rejected', label: 'Rejected' },
              ]}
            />
          </Col>
        </Row>
      </Card>

      <Card style={{ borderRadius: 8 }}>
        <DataTable
          columns={columns}
          dataSource={documents}
          rowKey="id"
          loading={isLoading}
          pagination={{ pageSize: 15 }}
          emptyTitle="No Documents Found"
          emptyDescription="No customer documents matched your filters."
        />
      </Card>
    </PageContainer>
  )
}

export default CustomerDocumentsPage
