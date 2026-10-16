import React, { useState } from 'react'
import {
  Table,
  Button,
  Tag,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Space,
  Card,
  Row,
  Col,
  Statistic,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  NotificationOutlined,
  PlusOutlined,
  MailOutlined,
  MessageOutlined,
  FundOutlined,
  UsergroupAddOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { marketingApi } from '../api'
import type { MarketingCampaign } from '@/types/marketing'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { CurrencyDisplay } from '@/components/data-display/CurrencyDisplay'
import { formatCurrency } from '@/lib/currency'
import dayjs from 'dayjs'

export const CampaignsPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [form] = Form.useForm()

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => marketingApi.getCampaigns(),
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => marketingApi.createCampaign(data),
    onSuccess: () => {
      message.success('Marketing campaign scheduled successfully')
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      setIsModalOpen(false)
      form.resetFields()
    },
    onError: () => {
      message.error('Failed to create campaign')
    },
  })

  const handleCreateSubmit = (values: any) => {
    createMutation.mutate({
      tenantId: '78248f8f-e390-4f85-a03f-58e4974fa366',
      title: values.title,
      channel: values.channel,
      status: 'scheduled',
      targetAudience: values.targetAudience,
      startDate: values.dates[0].toISOString(),
      endDate: values.dates[1].toISOString(),
      budget: Number(values.budget) || 0,
      couponCode: values.couponCode,
    })
  }

  const totalRevenue = campaigns.reduce((sum, c) => sum + c.revenueGenerated, 0)
  const totalReach = campaigns.reduce((sum, c) => sum + c.reachCount, 0)

  const columns: ColumnsType<MarketingCampaign> = [
    {
      title: 'Campaign Title',
      dataIndex: 'title',
      key: 'title',
      render: (t: string) => <span style={{ fontWeight: 600 }}>{t}</span>,
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
      title: 'Audience Target',
      dataIndex: 'targetAudience',
      key: 'targetAudience',
      render: (aud: string) => (
        <span style={{ textTransform: 'capitalize' }}>{aud.replace('_', ' ')}</span>
      ),
    },
    {
      title: 'Reach',
      dataIndex: 'reachCount',
      key: 'reachCount',
      align: 'right',
      render: (r: number) => <span>{r.toLocaleString()} users</span>,
    },
    {
      title: 'Conversions',
      dataIndex: 'conversionCount',
      key: 'conversionCount',
      align: 'right',
      render: (c: number, record) => {
        const rate = record.reachCount > 0 ? ((c / record.reachCount) * 100).toFixed(1) : 0
        return (
          <div>
            <div>{c} bookings</div>
            <div style={{ fontSize: 11, color: '#8c8c8c' }}>{rate}% conversion</div>
          </div>
        )
      },
    },
    {
      title: 'Revenue Attributed',
      dataIndex: 'revenueGenerated',
      key: 'revenueGenerated',
      align: 'right',
      render: (rev: number) => <CurrencyDisplay amount={rev} bold />,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (st: string) => {
        const colorMap: Record<string, string> = {
          active: 'success',
          scheduled: 'processing',
          draft: 'default',
          ended: 'purple',
        }
        return <Tag color={colorMap[st] || 'default'}>{st.toUpperCase()}</Tag>
      },
    },
  ]

  return (
    <PageContainer>
      <PageHeader
        title="Marketing Campaigns & Broadcasts"
        subtitle="Execute multi-channel outreach campaigns across SMS and Email with targeted audience segmentation and conversion tracking."
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsModalOpen(true)}
          >
            Launch Campaign
          </Button>
        }
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <Statistic
              title="Total Campaign Reach"
              value={totalReach}
              prefix={<UsergroupAddOutlined />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <Statistic
              title="Attributed Revenue"
              value={totalRevenue}
              precision={2}
              prefix="Rs."
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <Statistic
              title="Active Broadcasts"
              value={campaigns.filter((c) => c.status === 'active').length}
              prefix={<NotificationOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      <Card bordered={false} bodyStyle={{ padding: 0 }}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={campaigns}
          loading={isLoading}
          pagination={false}
        />
      </Card>

      {/* Launch Campaign Modal */}
      <Modal
        title="Launch Marketing Campaign"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending}
        okText="Schedule Broadcast"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateSubmit}
          initialValues={{
            channel: 'email',
            targetAudience: 'all',
            budget: 200,
            dates: [dayjs(), dayjs().add(7, 'day')],
          }}
        >
          <Form.Item
            name="title"
            label="Campaign Name"
            rules={[{ required: true, message: 'Please enter name' }]}
          >
            <Input placeholder="E.g., Autumn Weekend Escape Special" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="channel" label="Delivery Channel" rules={[{ required: true }]}>
                <Select
                  options={[
                    { label: 'Email Broadcast', value: 'email' },
                    { label: 'SMS Blast', value: 'sms' },
                    { label: 'Social Retargeting', value: 'social' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="targetAudience" label="Audience Segment" rules={[{ required: true }]}>
                <Select
                  options={[
                    { label: 'All Registered Customers', value: 'all' },
                    { label: 'VIP Repeat Renters', value: 'vip' },
                    { label: 'New Signups (No Bookings)', value: 'new_customers' },
                    { label: 'Inactive (>60 days)', value: 'inactive' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="couponCode" label="Attach Promo Code (Optional)">
                <Input placeholder="E.g., ESCAPE15" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="budget" label="Campaign Budget (Rs.)">
                <InputNumber min={0} prefix="Rs." style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="dates" label="Campaign Active Period" rules={[{ required: true }]}>
            <DatePicker.RangePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  )
}

export default CampaignsPage
