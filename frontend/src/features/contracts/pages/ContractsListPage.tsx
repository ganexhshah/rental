import React, { useState } from 'react'
import {
  Table,
  Button,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  Space,
  Card,
  Row,
  Col,
  Statistic,
  Descriptions,
  message,
  Popconfirm,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  FileTextOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  DownloadOutlined,
  EyeOutlined,
  FormOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { contractsApi } from '../api'
import { documentsApi } from '@/features/documents/api'
import type { Contract, ContractSignature } from '@/types/contract'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { CurrencyDisplay } from '@/components/data-display/CurrencyDisplay'
import { DateDisplay } from '@/components/data-display/DateDisplay'

const { Paragraph } = Typography

export const ContractsListPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isSignModalOpen, setIsSignModalOpen] = useState(false)
  const [signingContract, setSigningContract] = useState<Contract | null>(null)

  const [signForm] = Form.useForm()

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ['contracts', search, statusFilter],
    queryFn: () => contractsApi.getContracts({ search, status: statusFilter }),
  })

  const signMutation = useMutation({
    mutationFn: ({ contractId, sig }: { contractId: string; sig: ContractSignature }) =>
      contractsApi.signContract(contractId, sig),
    onSuccess: () => {
      message.success('Contract signature recorded successfully')
      queryClient.invalidateQueries({ queryKey: ['contracts'] })
      setIsSignModalOpen(false)
      signForm.resetFields()
    },
    onError: () => {
      message.error('Failed to record signature')
    },
  })

  const handleSignSubmit = (values: any) => {
    if (!signingContract) return
    signMutation.mutate({
      contractId: signingContract.id,
      sig: {
        signerName: values.signerName,
        signerRole: values.signerRole,
        signedAt: new Date().toISOString(),
        ipAddress: '192.168.1.104',
        signatureDataUrl: 'data:image/svg+xml;utf8,<svg>Verified-Signature</svg>',
      },
    })
  }

  const handleDownload = (c: Contract) => {
    message.loading({ content: `Fetching authoritative PDF agreement for ${c.contractNumber}...`, key: 'pdf' })
    try {
      documentsApi.viewDocumentPdf(c.id)
      message.success({ content: `Opening agreement ${c.contractNumber}.pdf`, key: 'pdf' })
    } catch {
      message.error({ content: `Failed to load agreement PDF`, key: 'pdf' })
    }
  }

  const totalContracts = contracts.length
  const signedCount = contracts.filter((c) => c.status === 'signed').length
  const pendingCount = contracts.filter((c) => c.status === 'pending_signature').length
  const expiredCount = contracts.filter((c) => c.status === 'expired' || c.status === 'terminated').length

  const columns: ColumnsType<Contract> = [
    {
      title: 'Contract #',
      dataIndex: 'contractNumber',
      key: 'contractNumber',
      render: (num: string, record) => (
        <a
          onClick={() => {
            setSelectedContract(record)
            setIsDetailModalOpen(true)
          }}
          style={{ fontWeight: 600, color: '#1677ff' }}
        >
          {num}
        </a>
      ),
    },
    {
      title: 'Customer',
      dataIndex: 'customerName',
      key: 'customerName',
      render: (name: string) => <span style={{ fontWeight: 500 }}>{name}</span>,
    },
    {
      title: 'Vehicle',
      dataIndex: 'vehicleInfo',
      key: 'vehicleInfo',
    },
    {
      title: 'Booking Code',
      dataIndex: 'bookingCode',
      key: 'bookingCode',
      render: (code: string) => <Tag color="geekblue">{code}</Tag>,
    },
    {
      title: 'Rental Period',
      key: 'period',
      render: (_, record) => (
        <div style={{ fontSize: 12 }}>
          <div>From: <DateDisplay date={record.startDate} formatStr="MMM dd, yyyy" /></div>
          <div>To: <DateDisplay date={record.endDate} formatStr="MMM dd, yyyy" /></div>
        </div>
      ),
    },
    {
      title: 'Total / Deposit',
      key: 'financials',
      align: 'right',
      render: (_, record) => (
        <div>
          <div><CurrencyDisplay amount={record.totalAmount} bold /></div>
          <div style={{ fontSize: 11, color: '#8c8c8c' }}>
            Dep: <CurrencyDisplay amount={record.depositAmount} />
          </div>
        </div>
      ),
    },
    {
      title: 'Signatures',
      key: 'signatures',
      render: (_, record) => (
        <Space orientation="vertical" size={2}>
          {record.customerSignature ? (
            <Tag icon={<CheckCircleOutlined />} color="success">
              Customer Signed
            </Tag>
          ) : (
            <Tag icon={<ClockCircleOutlined />} color="warning">
              Customer Awaiting
            </Tag>
          )}
          {record.agentSignature ? (
            <Tag icon={<CheckCircleOutlined />} color="blue">
              Agent Signed
            </Tag>
          ) : (
            <Tag icon={<ClockCircleOutlined />} color="default">
              Agent Awaiting
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: Contract['status']) => {
        const colorMap: Record<Contract['status'], string> = {
          signed: 'success',
          pending_signature: 'warning',
          draft: 'default',
          expired: 'error',
          terminated: 'error',
        }
        return <StatusBadge status={colorMap[status] as any} text={status.replace('_', ' ').toUpperCase()} />
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'center',
      render: (_, record) => (
        <Space orientation="horizontal" size="small">
          <Button
            type="text"
            icon={<EyeOutlined />}
            size="small"
            title="View Details"
            onClick={() => {
              setSelectedContract(record)
              setIsDetailModalOpen(true)
            }}
          />
          {record.status === 'pending_signature' && (
            <Button
              type="text"
              icon={<FormOutlined />}
              size="small"
              title="Sign Contract"
              style={{ color: '#1677ff' }}
              onClick={() => {
                setSigningContract(record)
                signForm.setFieldsValue({
                  signerName: record.customerName,
                  signerRole: record.customerSignature ? 'agent' : 'customer',
                })
                setIsSignModalOpen(true)
              }}
            />
          )}
          <Button
            type="text"
            icon={<DownloadOutlined />}
            size="small"
            title="Download PDF"
            onClick={() => handleDownload(record)}
          />
        </Space>
      ),
    },
  ]

  return (
    <PageContainer>
      <PageHeader
        title="Contracts"
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <Statistic title="Total" value={totalContracts} prefix={<FileTextOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <Statistic
              title="Signed"
              value={signedCount}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <Statistic
              title="Pending"
              value={pendingCount}
              valueStyle={{ color: '#faad14' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <Statistic
              title="Expired"
              value={expiredCount}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<CloseCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card bordered={false} style={{ marginBottom: 20 }}>
        <Row gutter={[16, 16]} align="middle" justify="space-between">
          <Col xs={24} sm={12} md={8}>
            <Input
              placeholder="Search contracts..."
              prefix={<SearchOutlined />}
              value={search}
              allowClear
              onChange={(e) => setSearch(e.target.value)}
            />
          </Col>
          <Col xs={24} sm={12} md={8} style={{ textAlign: 'right' }}>
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 180 }}
              options={[
                { label: 'All Statuses', value: 'all' },
                { label: 'Signed', value: 'signed' },
                { label: 'Pending Signature', value: 'pending_signature' },
                { label: 'Draft', value: 'draft' },
                { label: 'Expired', value: 'expired' },
                { label: 'Terminated', value: 'terminated' },
              ]}
            />
          </Col>
        </Row>
      </Card>

      <Card bordered={false} bodyStyle={{ padding: 0 }}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={contracts}
          loading={isLoading}
          pagination={{ pageSize: 10, showSizeChanger: true }}
        />
      </Card>

      {/* Contract Detail Modal */}
      <Modal
        title={
          <Space>
            <SafetyCertificateOutlined style={{ color: '#1677ff' }} />
            <span>Contract: {selectedContract?.contractNumber}</span>
            {selectedContract && (
              <Tag color={selectedContract.status === 'signed' ? 'green' : 'gold'}>
                {selectedContract.status.toUpperCase()}
              </Tag>
            )}
          </Space>
        }
        open={isDetailModalOpen}
        onCancel={() => setIsDetailModalOpen(false)}
        width={780}
        footer={[
          <Button key="close" onClick={() => setIsDetailModalOpen(false)}>
            Close
          </Button>,
          selectedContract && (
            <Button
              key="download"
              type="primary"
              icon={<DownloadOutlined />}
              onClick={() => handleDownload(selectedContract)}
            >
              Download PDF
            </Button>
          ),
        ]}
      >
        {selectedContract && (
          <div>
            <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}>
              <Descriptions.Item label="Template">{selectedContract.templateTitle}</Descriptions.Item>
              <Descriptions.Item label="Booking">
                <Tag color="geekblue">{selectedContract.bookingCode}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Customer">{selectedContract.customerName}</Descriptions.Item>
              <Descriptions.Item label="Vehicle">{selectedContract.vehicleInfo}</Descriptions.Item>
              <Descriptions.Item label="Start Date">
                <DateDisplay date={selectedContract.startDate} formatStr="MMM dd, yyyy" />
              </Descriptions.Item>
              <Descriptions.Item label="End Date">
                <DateDisplay date={selectedContract.endDate} formatStr="MMM dd, yyyy" />
              </Descriptions.Item>
              <Descriptions.Item label="Total Amount">
                <CurrencyDisplay amount={selectedContract.totalAmount} bold />
              </Descriptions.Item>
              <Descriptions.Item label="Deposit">
                <CurrencyDisplay amount={selectedContract.depositAmount} />
              </Descriptions.Item>
            </Descriptions>

            <div style={{ marginTop: 20 }}>
              <h4>Agreement Terms</h4>
              <div
                style={{
                  background: '#f9f9f9',
                  border: '1px solid #e8e8e8',
                  borderRadius: 6,
                  padding: 16,
                  maxHeight: 220,
                  overflowY: 'auto',
                  fontFamily: 'monospace',
                  fontSize: 12,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {selectedContract.renderedContent}
              </div>
            </div>

            <div style={{ marginTop: 20 }}>
              <h4>Signatures</h4>
              <Row gutter={16}>
                <Col span={12}>
                  <Card size="small" title="Customer Signature" bordered>
                    {selectedContract.customerSignature ? (
                      <div>
                        <div><strong>Signer:</strong> {selectedContract.customerSignature.signerName}</div>
                        <div><strong>Signed At:</strong> <DateDisplay date={selectedContract.customerSignature.signedAt} showTime /></div>
                        <div><strong>IP:</strong> {selectedContract.customerSignature.ipAddress || '192.168.1.104'}</div>
                        <Tag color="green" style={{ marginTop: 6 }}>Signed</Tag>
                      </div>
                    ) : (
                      <span style={{ color: '#faad14' }}>Pending</span>
                    )}
                  </Card>
                </Col>
                <Col span={12}>
                  <Card size="small" title="Agent Signature" bordered>
                    {selectedContract.agentSignature ? (
                      <div>
                        <div><strong>Signer:</strong> {selectedContract.agentSignature.signerName}</div>
                        <div><strong>Signed At:</strong> <DateDisplay date={selectedContract.agentSignature.signedAt} showTime /></div>
                        <div><strong>IP:</strong> {selectedContract.agentSignature.ipAddress || '192.168.1.1'}</div>
                        <Tag color="blue" style={{ marginTop: 6 }}>Countersigned</Tag>
                      </div>
                    ) : (
                      <span style={{ color: '#8c8c8c' }}>Pending</span>
                    )}
                  </Card>
                </Col>
              </Row>
            </div>
          </div>
        )}
      </Modal>

      {/* Sign Contract Modal */}
      <Modal
        title={`Sign Contract: ${signingContract?.contractNumber}`}
        open={isSignModalOpen}
        onCancel={() => setIsSignModalOpen(false)}
        onOk={() => signForm.submit()}
        confirmLoading={signMutation.isPending}
        okText="Sign"
      >
        <Form form={signForm} layout="vertical" onFinish={handleSignSubmit}>
          <Form.Item
            name="signerName"
            label="Signer Name"
            rules={[{ required: true, message: 'Please enter signer name' }]}
          >
            <Input placeholder="Full name of signer" />
          </Form.Item>

          <Form.Item
            name="signerRole"
            label="Role"
            rules={[{ required: true, message: 'Please select role' }]}
          >
            <Select
              options={[
                { label: 'Customer', value: 'customer' },
                { label: 'Agent', value: 'agent' },
              ]}
            />
          </Form.Item>

          <div
            style={{
              padding: 12,
              background: '#f0f5ff',
              border: '1px solid #adc6ff',
              borderRadius: 6,
              fontSize: 13,
            }}
          >
            By signing, you confirm acceptance of all contract terms and liability clauses.
          </div>
        </Form>
      </Modal>
    </PageContainer>
  )
}

export default ContractsListPage
