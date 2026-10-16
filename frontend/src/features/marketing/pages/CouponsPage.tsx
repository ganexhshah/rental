import React, { useState } from 'react'
import {
  Table,
  Button,
  Tag,
  Switch,
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
  TagOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  StopOutlined,
  CopyOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { marketingApi } from '../api'
import type { Coupon } from '@/types/marketing'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { DateDisplay } from '@/components/data-display/DateDisplay'
import { formatCurrency } from '@/lib/currency'
import dayjs from 'dayjs'

export const CouponsPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [form] = Form.useForm()

  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ['coupons'],
    queryFn: () => marketingApi.getCoupons(),
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => marketingApi.createCoupon(data),
    onSuccess: () => {
      message.success('Promo code coupon created successfully')
      queryClient.invalidateQueries({ queryKey: ['coupons'] })
      setIsModalOpen(false)
      form.resetFields()
    },
    onError: () => {
      message.error('Failed to create coupon')
    },
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      marketingApi.toggleCoupon(id, active),
    onSuccess: () => {
      message.success('Coupon status updated')
      queryClient.invalidateQueries({ queryKey: ['coupons'] })
    },
  })

  const handleCreateSubmit = (values: any) => {
    createMutation.mutate({
      tenantId: '78248f8f-e390-4f85-a03f-58e4974fa366',
      code: values.code.toUpperCase(),
      description: values.description,
      discountType: values.discountType,
      discountValue: Number(values.discountValue) || 0,
      minBookingAmount: values.minBookingAmount ? Number(values.minBookingAmount) : undefined,
      maxDiscountAmount: values.maxDiscountAmount ? Number(values.maxDiscountAmount) : undefined,
      usageLimit: values.usageLimit ? Number(values.usageLimit) : undefined,
      validFrom: values.dates[0].toISOString(),
      validUntil: values.dates[1].toISOString(),
      isActive: true,
    })
  }

  const activeCount = coupons.filter((c) => c.isActive).length
  const totalUses = coupons.reduce((sum, c) => sum + c.timesUsed, 0)

  const columns: ColumnsType<Coupon> = [
    {
      title: 'Coupon Code',
      dataIndex: 'code',
      key: 'code',
      render: (code: string) => (
        <Space>
          <Tag color="geekblue" style={{ fontSize: 13, fontWeight: 700, padding: '2px 8px' }}>
            {code}
          </Tag>
          <Button
            type="text"
            size="small"
            icon={<CopyOutlined />}
            onClick={() => {
              navigator.clipboard?.writeText(code)
              message.success(`Copied ${code}`)
            }}
          />
        </Space>
      ),
    },
    {
      title: 'Offer Description',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'Discount Value',
      key: 'discount',
      render: (_, record) =>
        record.discountType === 'percentage' ? (
          <span style={{ fontWeight: 600, color: '#1677ff' }}>{record.discountValue}% OFF</span>
        ) : (
          <span style={{ fontWeight: 600, color: '#1677ff' }}>
            {formatCurrency(record.discountValue)} FLAT
          </span>
        ),
    },
    {
      title: 'Valid Dates',
      key: 'dates',
      render: (_, record) => (
        <div style={{ fontSize: 12 }}>
          <div><DateDisplay date={record.validFrom} formatStr="MMM dd, yyyy" /></div>
          <div style={{ color: '#8c8c8c' }}>to <DateDisplay date={record.validUntil} formatStr="MMM dd, yyyy" /></div>
        </div>
      ),
    },
    {
      title: 'Redemptions',
      key: 'usage',
      render: (_, record) => (
        <span>
          <strong>{record.timesUsed}</strong>
          {record.usageLimit ? ` / ${record.usageLimit}` : ' (Unlimited)'}
        </span>
      ),
    },
    {
      title: 'Active State',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (active: boolean, record) => (
        <Switch
          checked={active}
          onChange={(checked) => toggleMutation.mutate({ id: record.id, active: checked })}
        />
      ),
    },
  ]

  return (
    <PageContainer>
      <PageHeader
        title="Promotions & Discount Coupons"
        subtitle="Manage promotional discount vouchers, percent discounts, usage caps, and redemption rules."
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsModalOpen(true)}
          >
            Create Coupon
          </Button>
        }
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <Statistic
              title="Active Promotions"
              value={activeCount}
              prefix={<TagOutlined />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <Statistic
              title="Total Times Redeemed"
              value={totalUses}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <Statistic
              title="Conversion Lift"
              value={18.4}
              suffix="%"
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      <Card bordered={false} bodyStyle={{ padding: 0 }}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={coupons}
          loading={isLoading}
          pagination={false}
        />
      </Card>

      {/* Create Coupon Modal */}
      <Modal
        title="Create Promotional Coupon"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending}
        okText="Create Promo Code"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateSubmit}
          initialValues={{
            discountType: 'percentage',
            discountValue: 15,
            dates: [dayjs(), dayjs().add(30, 'day')],
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="code"
                label="Coupon Code"
                rules={[{ required: true, message: 'Please enter promo code' }]}
              >
                <Input placeholder="E.g., SUMMER2026" style={{ textTransform: 'uppercase' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="discountType"
                label="Discount Type"
                rules={[{ required: true }]}
              >
                <Select
                  options={[
                    { label: 'Percentage (%)', value: 'percentage' },
                    { label: 'Fixed Amount (Rs.)', value: 'fixed_amount' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="discountValue"
                label="Discount Value"
                rules={[{ required: true, message: 'Please input value' }]}
              >
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="minBookingAmount" label="Minimum Rental (Rs.)">
                <InputNumber min={0} prefix="Rs." style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="usageLimit" label="Usage Limit (Blank = Unlimited)">
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="dates"
                label="Validity Range"
                rules={[{ required: true }]}
              >
                <DatePicker.RangePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="Internal / Customer Description"
            rules={[{ required: true }]}
          >
            <Input placeholder="E.g., 15% discount for early summer bookings" />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  )
}

export default CouponsPage
