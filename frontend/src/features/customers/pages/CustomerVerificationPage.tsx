import React, { useState } from 'react'
import {
  Space,
  Button,
  Tag,
  Avatar,
  Modal,
  Input,
  message,
  Card,
  Tabs,
} from 'antd'
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  UserOutlined,
  FileSearchOutlined,
  CheckOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/navigation/PageHeader'
import { PageContainer } from '@/components/navigation/PageContainer'
import { DataTable } from '@/components/data-display/DataTable'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { DocumentViewer, DocumentInfo } from '@/components/overlays/DocumentViewer'
import { customersApi } from '../api'
import type { Customer } from '@/types/customer'
import type { ColumnsType } from 'antd/es/table'

export const CustomerVerificationPage: React.FC = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false)
  const [targetCustomer, setTargetCustomer] = useState<Customer | null>(null)
  const [reasonText, setReasonText] = useState('')
  const [previewDoc, setPreviewDoc] = useState<DocumentInfo | null>(null)
  const [activeTab, setActiveTab] = useState<'pending' | 'needs_correction' | 'all'>('pending')

  const { data: customers = [], isLoading, refetch } = useQuery({
    queryKey: ['customers-verification'],
    queryFn: () => customersApi.getCustomers(),
  })

  const filtered = customers.filter((c) => {
    if (activeTab === 'pending') return c.verificationStatus === 'pending'
    if (activeTab === 'needs_correction') return c.verificationStatus === 'needs_correction'
    return true
  })

  const pendingCount = customers.filter((c) => c.verificationStatus === 'pending').length

  const actionMutation = useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: any; reason?: string }) =>
      customersApi.verifyCustomer(id, status, reason),
    onSuccess: (_, vars) => {
      message.success(`Status updated to: ${vars.status}`)
      setRejectModalOpen(false)
      setCorrectionModalOpen(false)
      setReasonText('')
      queryClient.invalidateQueries({ queryKey: ['customers-verification'] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
    onError: () => message.error('Failed to update verification status'),
  })

  const handleApprovePaperKyc = (c: Customer) => {
    actionMutation.mutate({ id: c.id, status: 'verified', reason: 'Paper KYC verified' })
  }

  const handleApproveAllPending = async () => {
    const pendingList = customers.filter((c) => c.verificationStatus === 'pending')
    for (const c of pendingList) {
      await customersApi.verifyCustomer(c.id, 'verified', 'Paper KYC verification')
    }
    message.success(`Approved ${pendingList.length} customer(s)`)
    queryClient.invalidateQueries({ queryKey: ['customers-verification'] })
    queryClient.invalidateQueries({ queryKey: ['customers'] })
  }

  const columns: ColumnsType<Customer> = [
    {
      title: 'Customer',
      key: 'name',
      render: (_, r) => (
        <Space>
          <Avatar
            src={r.avatarUrl}
            icon={<UserOutlined />}
            style={{ cursor: 'pointer', backgroundColor: '#0f172a' }}
            onClick={() => navigate(`/customers/view/${r.id}`)}
          />
          <div>
            <div
              style={{ fontWeight: 600, color: '#0f172a', cursor: 'pointer' }}
              onClick={() => navigate(`/customers/view/${r.id}`)}
            >
              {r.fullName}
            </div>
            <div style={{ fontSize: 12, color: '#64748b' }}>{r.phone || r.email}</div>
          </div>
        </Space>
      ),
    },
    {
      title: 'Document Reference',
      key: 'docRef',
      render: (_, r) => {
        const idVal = r.licenseNumber || r.citizenshipNumber || r.passportNumber || r.nationalIdNumber || 'On File'
        return (
          <Space size={6}>
            <Tag color="blue">{idVal}</Tag>
            {r.paperKycCollected && (
              <Tag color="green">Paper KYC</Tag>
            )}
          </Space>
        )
      },
    },
    {
      title: 'Nationality',
      key: 'origin',
      render: (_, r) => (
        <span>{r.originType === 'international' || r.isInternational ? r.nationality || 'Foreign' : r.nationality || 'Nepali'}</span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'verificationStatus',
      key: 'status',
      render: (s) => <StatusBadge status={s} />,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="primary"
            size="small"
            icon={<CheckOutlined />}
            style={{ backgroundColor: '#16a34a', borderColor: '#16a34a' }}
            onClick={() => handleApprovePaperKyc(record)}
          >
            Verify
          </Button>
          <Button
            size="small"
            icon={<FileSearchOutlined />}
            onClick={() => navigate(`/customers/view/${record.id}`)}
          >
            View
          </Button>
          <Button
            danger
            size="small"
            icon={<CloseCircleOutlined />}
            onClick={() => {
              setTargetCustomer(record)
              setRejectModalOpen(true)
            }}
          >
            Reject
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <PageContainer>
      <PageHeader
        title="Verification Queue"
        subtitle="Review and manage customer verification records"
        extra={
          pendingCount > 0 ? (
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={handleApproveAllPending}
              style={{ backgroundColor: '#0f172a' }}
            >
              Verify All ({pendingCount})
            </Button>
          ) : undefined
        }
      />

      <Card styles={{ body: { padding: '12px 20px 0' } }} style={{ marginBottom: 16, borderRadius: 8 }}>
        <Tabs
          activeKey={activeTab}
          onChange={(k) => setActiveTab(k as any)}
          items={[
            { key: 'pending', label: `Pending (${pendingCount})` },
            { key: 'needs_correction', label: 'Needs Correction' },
            { key: 'all', label: 'All Records' },
          ]}
        />
      </Card>

      <DataTable
        columns={columns}
        dataSource={filtered}
        loading={isLoading}
        onRetry={() => refetch()}
        emptyTitle="Queue is Empty"
        emptyDescription="No customers are currently awaiting verification."
      />

      {/* Reject Modal */}
      <Modal
        open={rejectModalOpen}
        title="Reject Verification"
        okText="Reject"
        okType="danger"
        onCancel={() => setRejectModalOpen(false)}
        onOk={() => {
          if (targetCustomer) {
            actionMutation.mutate({
              id: targetCustomer.id,
              status: 'rejected',
              reason: reasonText,
            })
          }
        }}
      >
        <Input.TextArea
          rows={3}
          placeholder="Enter reason for rejection"
          value={reasonText}
          onChange={(e) => setReasonText(e.target.value)}
        />
      </Modal>

      {/* Correction Request Modal */}
      <Modal
        open={correctionModalOpen}
        title="Request Correction"
        okText="Send"
        onCancel={() => setCorrectionModalOpen(false)}
        onOk={() => {
          if (targetCustomer) {
            actionMutation.mutate({
              id: targetCustomer.id,
              status: 'needs_correction',
              reason: reasonText,
            })
          }
        }}
      >
        <Input.TextArea
          rows={3}
          placeholder="Enter correction notes"
          value={reasonText}
          onChange={(e) => setReasonText(e.target.value)}
        />
      </Modal>

      {/* Document Previewer */}
      <DocumentViewer
        open={Boolean(previewDoc)}
        document={previewDoc}
        onClose={() => setPreviewDoc(null)}
        onApprove={() => {
          if (targetCustomer) handleApprovePaperKyc(targetCustomer)
          setPreviewDoc(null)
        }}
      />
    </PageContainer>
  )
}

export default CustomerVerificationPage
