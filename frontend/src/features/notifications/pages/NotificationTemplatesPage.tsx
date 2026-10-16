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
  Typography,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  MailOutlined,
  MessageOutlined,
  EditOutlined,
  TagOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notificationsApi } from '../api'
import type { NotificationTemplate } from '@/types/notification'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { DateDisplay } from '@/components/data-display/DateDisplay'

const { Text, Paragraph } = Typography

export const NotificationTemplatesPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [form] = Form.useForm()

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['notification-templates'],
    queryFn: () => notificationsApi.getTemplates(),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<NotificationTemplate> }) =>
      notificationsApi.updateTemplate(id, data),
    onSuccess: () => {
      message.success('Notification template updated')
      queryClient.invalidateQueries({ queryKey: ['notification-templates'] })
      setIsModalOpen(false)
    },
    onError: () => {
      message.error('Failed to update template')
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: { code: string; name: string; channel: string; subject?: string; bodyTemplate: string }) =>
      notificationsApi.createTemplate(data),
    onSuccess: () => {
      message.success('Notification template created')
      queryClient.invalidateQueries({ queryKey: ['notification-templates'] })
      setIsModalOpen(false)
    },
    onError: () => {
      message.error('Failed to create template')
    },
  })

  const handleEdit = (tmpl: NotificationTemplate) => {
    setEditingTemplate(tmpl)
    form.setFieldsValue({
      name: tmpl.name,
      channel: tmpl.channel,
      subject: tmpl.subject,
      bodyTemplate: tmpl.bodyTemplate,
    })
    setIsModalOpen(true)
  }

  const handleSave = (values: any) => {
    if (editingTemplate) {
      updateMutation.mutate({
        id: editingTemplate.id,
        data: values,
      })
    } else {
      const code = values.name.toUpperCase().replace(/[^A-Z0-9]+/g, '_')
      createMutation.mutate({
        code,
        name: values.name,
        channel: values.channel || 'email',
        subject: values.subject,
        bodyTemplate: values.bodyTemplate,
      })
    }
  }

  const insertVariable = (variable: string) => {
    const current = form.getFieldValue('bodyTemplate') || ''
    form.setFieldsValue({
      bodyTemplate: `${current} {{${variable}}} `,
    })
  }

  const columns: ColumnsType<NotificationTemplate> = [
    {
      title: 'Template Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <span style={{ fontWeight: 600 }}>{name}</span>,
    },
    {
      title: 'Channel',
      dataIndex: 'channel',
      key: 'channel',
      render: (ch: string) => {
        const icon = ch === 'email' ? <MailOutlined /> : <MessageOutlined />
        return (
          <Tag icon={icon} color={ch === 'email' ? 'blue' : 'green'}>
            {ch.toUpperCase()}
          </Tag>
        )
      },
    },
    {
      title: 'Trigger Event',
      dataIndex: 'triggerEvent',
      key: 'triggerEvent',
      render: (ev: string) => <Tag>{ev.replace('_', ' ').toUpperCase()}</Tag>,
    },
    {
      title: 'Last Modified',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      render: (d: string) => <DateDisplay date={d} formatStr="MMM dd, yyyy" />,
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'right',
      render: (_, record) => (
        <Button
          size="small"
          type="text"
          icon={<EditOutlined />}
          onClick={() => handleEdit(record)}
        >
          Edit Template
        </Button>
      ),
    },
  ]

  return (
    <PageContainer>
      <PageHeader
        title="Automated Message & Notification Templates"
        subtitle="Configure dynamic content, variable placeholders, and delivery channels for transactional notifications."
        extra={
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={() => {
              setEditingTemplate(null)
              form.resetFields()
              setIsModalOpen(true)
            }}
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
          locale={{
            emptyText: (
              <div style={{ padding: '32px 0' }}>
                <Paragraph strong style={{ fontSize: 15, marginBottom: 4 }}>
                  No Templates Configured
                </Paragraph>
                <Text type="secondary">
                  Create custom transactional email or SMS notification templates for your operations.
                </Text>
              </div>
            ),
          }}
        />
      </Card>

      {/* Edit / Create Template Modal */}
      <Modal
        title={editingTemplate ? `Edit Template: ${editingTemplate.name}` : 'Create New Notification Template'}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={updateMutation.isPending}
        okText={editingTemplate ? 'Save Changes' : 'Create Template'}
        width={680}
      >
        <Form form={form} layout="vertical" onFinish={handleSave} initialValues={{ channel: 'email' }}>
          <Form.Item name="name" label="Template Name" rules={[{ required: true, message: 'Please enter template name' }]}>
            <Input placeholder="e.g. Booking Confirmation Email" size="large" />
          </Form.Item>

          {!editingTemplate && (
            <Form.Item name="channel" label="Delivery Channel" rules={[{ required: true }]}>
              <Select size="large">
                <Select.Option value="email">Email</Select.Option>
                <Select.Option value="sms">SMS</Select.Option>
                <Select.Option value="whatsapp">WhatsApp</Select.Option>
              </Select>
            </Form.Item>
          )}

          <Form.Item name="subject" label="Email Subject Line (Optional)">
            <Input placeholder="e.g. Booking Reservation {{booking_code}} Confirmed" size="large" />
          </Form.Item>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
              Available Merge Tags:
            </div>
            <Space wrap>
              {(editingTemplate?.availableVariables || ['customer_name', 'booking_code', 'vehicle_model', 'start_date', 'total_amount', 'pickup_hub']).map((v) => (
                <Tag
                  key={v}
                  icon={<TagOutlined />}
                  color="blue"
                  style={{ cursor: 'pointer' }}
                  onClick={() => insertVariable(v)}
                >
                  {`{{${v}}}`}
                </Tag>
              ))}
            </Space>
          </div>

          <Form.Item
            name="bodyTemplate"
            label="Template Body"
            rules={[{ required: true, message: 'Body is required' }]}
          >
            <Input.TextArea rows={6} style={{ fontFamily: 'monospace' }} placeholder="Dear {{customer_name}}, your booking {{booking_code}} is confirmed..." />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  )
}

export default NotificationTemplatesPage
