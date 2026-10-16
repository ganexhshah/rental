import React, { useState } from 'react'
import {
  Table,
  Button,
  Tag,
  Switch,
  Modal,
  Form,
  Input,
  Select,
  Space,
  Card,
  Row,
  Col,
  message,
  Popconfirm,
  Tabs,
  Badge,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  PlusOutlined,
  EditOutlined,
  CopyOutlined,
  FileDoneOutlined,
  CheckCircleOutlined,
  TagOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { contractsApi } from '../api'
import type { ContractTemplate } from '@/types/contract'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { DateDisplay } from '@/components/data-display/DateDisplay'

const PLACEHOLDERS = [
  '{{customer_name}}',
  '{{customer_email}}',
  '{{customer_license}}',
  '{{vehicle_plate}}',
  '{{vehicle_info}}',
  '{{start_date}}',
  '{{end_date}}',
  '{{deposit_amount}}',
  '{{total_amount}}',
  '{{company_name}}',
]

export const ContractTemplatesPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<ContractTemplate | null>(null)
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor')

  const [form] = Form.useForm()

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['contract-templates'],
    queryFn: () => contractsApi.getTemplates(),
  })

  const saveMutation = useMutation({
    mutationFn: (data: any) => contractsApi.saveTemplate(data),
    onSuccess: () => {
      message.success('Contract template saved successfully')
      queryClient.invalidateQueries({ queryKey: ['contract-templates'] })
      setIsEditorOpen(false)
      form.resetFields()
      setEditingTemplate(null)
    },
    onError: () => {
      message.error('Failed to save contract template')
    },
  })

  const openCreateModal = () => {
    setEditingTemplate(null)
    form.resetFields()
    form.setFieldsValue({
      vehicleType: 'all',
      version: '1.0',
      isDefault: false,
      content: `STANDARD VEHICLE RENTAL AGREEMENT

This Agreement is entered into on {{start_date}} between {{company_name}} ("Owner") and {{customer_name}} ("Renter").

1. VEHICLE DETAILS:
The Owner leases vehicle {{vehicle_info}} (License Plate: {{vehicle_plate}}) to the Renter for the agreed term concluding on {{end_date}}.

2. FEES & SECURITY DEPOSIT:
Total calculated rental fee is {{total_amount}}. A refundable security deposit of {{deposit_amount}} has been authorized.

3. INSURANCE & LIABILITY:
The Renter accepts primary liability for any reckless conduct, unauthorized drivers, or violation of traffic regulations during the possession period.

Signed and agreed:
Customer: {{customer_name}}`,
    })
    setActiveTab('editor')
    setIsEditorOpen(true)
  }

  const openEditModal = (template: ContractTemplate) => {
    setEditingTemplate(template)
    form.setFieldsValue({
      title: template.title,
      vehicleType: template.vehicleType,
      version: template.version,
      isDefault: template.isDefault,
      content: template.content,
    })
    setActiveTab('editor')
    setIsEditorOpen(true)
  }

  const handleInsertPlaceholder = (placeholder: string) => {
    const current = form.getFieldValue('content') || ''
    form.setFieldsValue({
      content: `${current} ${placeholder} `,
    })
  }

  const handleFormSubmit = (values: any) => {
    saveMutation.mutate({
      id: editingTemplate?.id,
      tenantId: '78248f8f-e390-4f85-a03f-58e4974fa366',
      title: values.title,
      vehicleType: values.vehicleType,
      version: values.version,
      content: values.content,
      variables: PLACEHOLDERS,
      isDefault: !!values.isDefault,
    })
  }

  const getPreviewContent = () => {
    const text = form.getFieldValue('content') || ''
    return text
      .replace(/{{customer_name}}/g, 'Alex Rivera')
      .replace(/{{customer_email}}/g, 'alex.rivera@example.com')
      .replace(/{{customer_license}}/g, 'DL-98218-CA')
      .replace(/{{vehicle_plate}}/g, '7XYZ890')
      .replace(/{{vehicle_info}}/g, '2024 Tesla Model Y (EV)')
      .replace(/{{start_date}}/g, 'Oct 10, 2026')
      .replace(/{{end_date}}/g, 'Oct 15, 2026')
      .replace(/{{deposit_amount}}/g, '$500.00')
      .replace(/{{total_amount}}/g, '$425.00')
      .replace(/{{company_name}}/g, 'Himalayan Rides Nepal')
  }

  const columns: ColumnsType<ContractTemplate> = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record) => (
        <div>
          <div style={{ fontWeight: 600 }}>{title}</div>
          {record.isDefault && (
            <Tag color="cyan" style={{ marginTop: 4 }}>
              Default
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: 'Fleet Category',
      dataIndex: 'vehicleType',
      key: 'vehicleType',
      render: (type: string) => {
        const colorMap: Record<string, string> = {
          all: 'geekblue',
          car: 'blue',
          bike: 'green',
          scooter: 'orange',
        }
        return <Tag color={colorMap[type] || 'default'}>{type.toUpperCase()}</Tag>
      },
    },
    {
      title: 'Version',
      dataIndex: 'version',
      key: 'version',
      render: (v: string) => <Tag>v{v}</Tag>,
    },
    {
      title: 'Last Modified',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      render: (date: string) => <DateDisplay date={date} formatStr="MMM dd, yyyy HH:mm" />,
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'right',
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => openEditModal(record)}
          >
            Edit
          </Button>
          <Button
            type="text"
            icon={<CopyOutlined />}
            onClick={() => {
              openEditModal({
                ...record,
                id: '',
                title: `${record.title} (Copy)`,
                isDefault: false,
              })
            }}
          >
            Clone
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <PageContainer>
      <PageHeader
        title="Templates"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={openCreateModal}
          >
            Create Template
          </Button>
        }
      />

      <Card bordered={false} bodyStyle={{ padding: 0 }}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={templates}
          loading={isLoading}
          pagination={false}
        />
      </Card>

      {/* Editor & Preview Modal */}
      <Modal
        title={editingTemplate ? 'Edit Template' : 'New Template'}
        open={isEditorOpen}
        onCancel={() => setIsEditorOpen(false)}
        width={820}
        onOk={() => form.submit()}
        confirmLoading={saveMutation.isPending}
        okText="Save"
      >
        <Tabs
          activeKey={activeTab}
          onChange={(k) => setActiveTab(k as any)}
          items={[
            {
              key: 'editor',
              label: 'Editor',
              children: (
                <Form form={form} layout="vertical">
                  <Row gutter={16}>
                    <Col span={14}>
                      <Form.Item
                        name="title"
                        label="Title"
                        rules={[{ required: true, message: 'Please provide template title' }]}
                      >
                        <Input placeholder="E.g., Standard Rental Agreement" />
                      </Form.Item>
                    </Col>
                    <Col span={6}>
                      <Form.Item
                        name="vehicleType"
                        label="Fleet Category"
                        rules={[{ required: true }]}
                      >
                        <Select
                          options={[
                            { label: 'All Fleet Types', value: 'all' },
                            { label: 'Cars / SUVs', value: 'car' },
                            { label: 'Motorcycles', value: 'bike' },
                            { label: 'Scooters', value: 'scooter' },
                          ]}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={4}>
                      <Form.Item name="version" label="Version">
                        <Input placeholder="1.0" />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Form.Item name="isDefault" valuePropName="checked">
                    <Switch />
                    <span style={{ marginLeft: 8 }}>Set as default</span>
                  </Form.Item>

                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                      Variables:
                    </div>
                    <Space wrap orientation="horizontal" size={[6, 6]}>
                      {PLACEHOLDERS.map((ph) => (
                        <Tag
                          key={ph}
                          icon={<TagOutlined />}
                          color="blue"
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleInsertPlaceholder(ph)}
                        >
                          {ph}
                        </Tag>
                      ))}
                    </Space>
                  </div>

                  <Form.Item
                    name="content"
                    label="Agreement Content"
                    rules={[{ required: true, message: 'Template body cannot be empty' }]}
                  >
                    <Input.TextArea
                      rows={12}
                      style={{ fontFamily: 'monospace', fontSize: 13 }}
                      placeholder="Enter legal terms and conditions..."
                    />
                  </Form.Item>
                </Form>
              ),
            },
            {
              key: 'preview',
              label: 'Preview',
              children: (
                <div style={{ padding: '8px 0' }}>
                  <div
                    style={{
                      background: '#fafafa',
                      border: '1px solid #e8e8e8',
                      borderRadius: 6,
                      padding: 16,
                      maxHeight: 380,
                      overflowY: 'auto',
                      whiteSpace: 'pre-wrap',
                      fontFamily: 'monospace',
                      fontSize: 13,
                    }}
                  >
                    {getPreviewContent()}
                  </div>
                </div>
              ),
            },
          ]}
        />
      </Modal>
    </PageContainer>
  )
}

export default ContractTemplatesPage
