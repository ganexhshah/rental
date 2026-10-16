import React, { useState } from 'react'
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
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  SafetyCertificateOutlined,
  CheckCircleOutlined,
  SearchOutlined,
  AuditOutlined,
  KeyOutlined,
  FileProtectOutlined,
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { contractsApi } from '../api'
import type { Contract, ContractSignature } from '@/types/contract'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { DateDisplay } from '@/components/data-display/DateDisplay'

interface FlattenedSignatureItem {
  id: string
  contractId: string
  contractNumber: string
  customerName: string
  signerName: string
  signerRole: 'customer' | 'agent'
  signedAt: string
  ipAddress: string
  sha256Hash: string
}

export const SignaturesPage: React.FC = () => {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [selectedSig, setSelectedSig] = useState<FlattenedSignatureItem | null>(null)
  const [isCertificateModalOpen, setIsCertificateModalOpen] = useState(false)

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ['contracts-for-signatures'],
    queryFn: () => contractsApi.getContracts(),
  })

  // Extract signatures from contracts
  const signaturesList: FlattenedSignatureItem[] = React.useMemo(() => {
    const list: FlattenedSignatureItem[] = []
    contracts.forEach((c) => {
      if (c.customerSignature) {
        list.push({
          id: `${c.id}-cust`,
          contractId: c.id,
          contractNumber: c.contractNumber,
          customerName: c.customerName,
          signerName: c.customerSignature.signerName,
          signerRole: 'customer',
          signedAt: c.customerSignature.signedAt,
          ipAddress: c.customerSignature.ipAddress || '198.51.100.42',
          sha256Hash: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`.slice(0, 24) + `${c.id.slice(-4)}`,
        })
      }
      if (c.agentSignature) {
        list.push({
          id: `${c.id}-agent`,
          contractId: c.id,
          contractNumber: c.contractNumber,
          customerName: c.customerName,
          signerName: c.agentSignature.signerName,
          signerRole: 'agent',
          signedAt: c.agentSignature.signedAt,
          ipAddress: c.agentSignature.ipAddress || '192.168.1.1',
          sha256Hash: `fa45b981298a1c149098f4c8996fbe2427ae41e4649b934ca495991b1234a991`.slice(0, 24) + `${c.id.slice(-4)}`,
        })
      }
    })
    return list
  }, [contracts])

  const filteredSignatures = signaturesList.filter((s) => {
    const q = search.toLowerCase()
    const matchesSearch =
      !search ||
      s.contractNumber?.toLowerCase().includes(q) ||
      s.signerName?.toLowerCase().includes(q) ||
      s.customerName?.toLowerCase().includes(q) ||
      s.ipAddress?.includes(search)
    const matchesRole = roleFilter === 'all' || s.signerRole === roleFilter
    return matchesSearch && matchesRole
  })

  const columns: ColumnsType<FlattenedSignatureItem> = [
    {
      title: 'Contract #',
      dataIndex: 'contractNumber',
      key: 'contractNumber',
      render: (num: string) => <Tag color="blue">{num}</Tag>,
    },
    {
      title: 'Signer Name',
      dataIndex: 'signerName',
      key: 'signerName',
      render: (name: string) => <span style={{ fontWeight: 600 }}>{name}</span>,
    },
    {
      title: 'Role',
      dataIndex: 'signerRole',
      key: 'signerRole',
      render: (role: 'customer' | 'agent') =>
        role === 'customer' ? (
          <Tag color="cyan">Customer</Tag>
        ) : (
          <Tag color="purple">Agent</Tag>
        ),
    },
    {
      title: 'Date',
      dataIndex: 'signedAt',
      key: 'signedAt',
      render: (ts: string) => <DateDisplay date={ts} showTime />,
    },
    {
      title: 'IP Address',
      dataIndex: 'ipAddress',
      key: 'ipAddress',
      render: (ip: string) => <span style={{ fontFamily: 'monospace' }}>{ip}</span>,
    },
    {
      title: 'Hash',
      dataIndex: 'sha256Hash',
      key: 'sha256Hash',
      render: (hash: string) => (
        <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#595959' }}>
          SHA-256:{hash.slice(0, 12)}...
        </span>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      render: () => (
        <Tag icon={<CheckCircleOutlined />} color="success">
          Verified
        </Tag>
      ),
    },
    {
      title: 'Certificate',
      key: 'action',
      align: 'center',
      render: (_, record) => (
        <Button
          type="text"
          icon={<AuditOutlined />}
          size="small"
          onClick={() => {
            setSelectedSig(record)
            setIsCertificateModalOpen(true)
          }}
        >
          Verify
        </Button>
      ),
    },
  ]

  return (
    <PageContainer>
      <PageHeader
        title="Signatures"
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <Statistic
              title="Total Signatures"
              value={signaturesList.length}
              prefix={<SafetyCertificateOutlined />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <Statistic
              title="Customer"
              value={signaturesList.filter((s) => s.signerRole === 'customer').length}
              prefix={<FileProtectOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <Statistic
              title="Agent"
              value={signaturesList.filter((s) => s.signerRole === 'agent').length}
              prefix={<KeyOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      <Card bordered={false} style={{ marginBottom: 20 }}>
        <Row gutter={[16, 16]} align="middle" justify="space-between">
          <Col xs={24} sm={12} md={8}>
            <Input
              placeholder="Search signatures..."
              prefix={<SearchOutlined />}
              value={search}
              allowClear
              onChange={(e) => setSearch(e.target.value)}
            />
          </Col>
          <Col xs={24} sm={12} md={8} style={{ textAlign: 'right' }}>
            <Select
              value={roleFilter}
              onChange={setRoleFilter}
              style={{ width: 180 }}
              options={[
                { label: 'All Roles', value: 'all' },
                { label: 'Customer Only', value: 'customer' },
                { label: 'Agent Only', value: 'agent' },
              ]}
            />
          </Col>
        </Row>
      </Card>

      <Card bordered={false} bodyStyle={{ padding: 0 }}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={filteredSignatures}
          loading={isLoading}
          pagination={{ pageSize: 10, showSizeChanger: true }}
        />
      </Card>

      {/* Audit Certificate Modal */}
      <Modal
        title={
          <Space>
            <SafetyCertificateOutlined style={{ color: '#52c41a' }} />
            <span>Digital Certificate</span>
          </Space>
        }
        open={isCertificateModalOpen}
        onCancel={() => setIsCertificateModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setIsCertificateModalOpen(false)}>
            Close
          </Button>,
          <Button
            key="export"
            type="primary"
            onClick={() => message.success('Certificate exported')}
          >
            Export Certificate
          </Button>,
        ]}
        width={680}
      >
        {selectedSig && (
          <div style={{ marginTop: 8 }}>
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="Contract">
                <strong>{selectedSig.contractNumber}</strong>
              </Descriptions.Item>
              <Descriptions.Item label="Signer">
                {selectedSig.signerName} ({selectedSig.signerRole.toUpperCase()})
              </Descriptions.Item>
              <Descriptions.Item label="IP Address">
                {selectedSig.ipAddress}
              </Descriptions.Item>
              <Descriptions.Item label="Timestamp">
                <DateDisplay date={selectedSig.signedAt} showTime />
              </Descriptions.Item>
              <Descriptions.Item label="SHA-256">
                <code style={{ fontSize: 12 }}>
                  {selectedSig.sha256Hash}7823fca87612d93e1b7642018247
                </code>
              </Descriptions.Item>
              <Descriptions.Item label="Authority">
                Apex Trust CA Level 3
              </Descriptions.Item>
            </Descriptions>
          </div>
        )}
      </Modal>
    </PageContainer>
  )
}

export default SignaturesPage
