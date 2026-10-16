import React, { useState } from 'react'
import {
  Table,
  Button,
  Tag,
  Modal,
  Form,
  DatePicker,
  InputNumber,
  Space,
  Card,
  Row,
  Col,
  Statistic,
  Alert,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  WarningOutlined,
  CalendarOutlined,
  BellOutlined,
  RollbackOutlined,
  CheckCircleOutlined,
  FieldTimeOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { contractsApi } from '../api'
import type { Contract } from '@/types/contract'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { CurrencyDisplay } from '@/components/data-display/CurrencyDisplay'
import { DateDisplay } from '@/components/data-display/DateDisplay'
import dayjs from 'dayjs'

export const ExpiringContractsPage: React.FC = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [extendingContract, setExtendingContract] = useState<Contract | null>(null)
  const [isExtendModalOpen, setIsExtendModalOpen] = useState(false)

  const [form] = Form.useForm()

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ['contracts-expiring'],
    queryFn: () => contractsApi.getContracts(),
  })

  // Filter contracts expiring soon (e.g. within 14 days or expired)
  const now = new Date()
  const expiringContracts = contracts.filter((c) => {
    const end = new Date(c.endDate)
    const diffDays = (end.getTime() - now.getTime()) / (1000 * 3600 * 24)
    return diffDays <= 14 && c.status !== 'terminated'
  })

  const expiredCount = expiringContracts.filter((c) => new Date(c.endDate) < now).length
  const expiringIn3Days = expiringContracts.filter((c) => {
    const d = (new Date(c.endDate).getTime() - now.getTime()) / (1000 * 3600 * 24)
    return d >= 0 && d <= 3
  }).length

  const handleSendReminder = (c: Contract) => {
    message.success(`Automated expiration reminder sent to ${c.customerName}`)
  }

  const handleExtendSubmit = (values: any) => {
    message.success(`Contract ${extendingContract?.contractNumber} extended until ${values.newEndDate.format('YYYY-MM-DD')}`)
    setIsExtendModalOpen(false)
    form.resetFields()
    queryClient.invalidateQueries({ queryKey: ['contracts-expiring'] })
  }

  const columns: ColumnsType<Contract> = [
    {
      title: 'Contract #',
      dataIndex: 'contractNumber',
      key: 'contractNumber',
      render: (num: string) => <span style={{ fontWeight: 600 }}>{num}</span>,
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
      title: 'End Date',
      dataIndex: 'endDate',
      key: 'endDate',
      render: (date: string) => {
        const isPast = new Date(date) < now
        return (
          <div>
            <div style={{ color: isPast ? '#ff4d4f' : '#faad14', fontWeight: 600 }}>
              <DateDisplay date={date} formatStr="MMM dd, yyyy HH:mm" />
            </div>
            <div style={{ fontSize: 11, color: isPast ? '#ff4d4f' : '#8c8c8c' }}>
              {isPast ? 'EXPIRED' : `In ${Math.ceil((new Date(date).getTime() - now.getTime()) / (1000 * 3600 * 24))} days`}
            </div>
          </div>
        )
      },
    },
    {
      title: 'Total Amount',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      align: 'right',
      render: (v: number) => <CurrencyDisplay amount={v} bold />,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: Contract['status'], record) => {
        const isPast = new Date(record.endDate) < now
        if (isPast) {
          return <Tag color="error">OVERDUE</Tag>
        }
        return <StatusBadge status={status === 'signed' ? 'processing' : 'warning'} text={status.toUpperCase()} />
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            size="small"
            icon={<BellOutlined />}
            onClick={() => handleSendReminder(record)}
          >
            Reminder
          </Button>
          <Button
            size="small"
            type="primary"
            ghost
            icon={<FieldTimeOutlined />}
            onClick={() => {
              setExtendingContract(record)
              form.setFieldsValue({
                newEndDate: dayjs(record.endDate).add(3, 'day'),
                additionalCharge: 150,
              })
              setIsExtendModalOpen(true)
            }}
          >
            Extend
          </Button>
          <Button
            size="small"
            type="primary"
            danger
            icon={<RollbackOutlined />}
            onClick={() => navigate('/bookings/pickup-return')}
          >
            Return
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <PageContainer>
      <PageHeader
        title="Expiring Contracts"
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <Statistic
              title="Expiring (< 14 Days)"
              value={expiringContracts.length}
              prefix={<CalendarOutlined />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <Statistic
              title="Expiring (< 3 Days)"
              value={expiringIn3Days}
              prefix={<WarningOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <Statistic
              title="Overdue"
              value={expiredCount}
              prefix={<WarningOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      <Card bordered={false} bodyStyle={{ padding: 0 }}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={expiringContracts}
          loading={isLoading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* Extension Modal */}
      <Modal
        title={`Extend: ${extendingContract?.contractNumber}`}
        open={isExtendModalOpen}
        onCancel={() => setIsExtendModalOpen(false)}
        onOk={() => form.submit()}
        okText="Extend"
      >
        <Form form={form} layout="vertical" onFinish={handleExtendSubmit}>
          <Form.Item
            name="newEndDate"
            label="New End Date"
            rules={[{ required: true, message: 'Please select new end date' }]}
          >
            <DatePicker showTime format="YYYY-MM-DD HH:mm" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="additionalCharge"
            label="Additional Fee (Rs.)"
            rules={[{ required: true, message: 'Please input fee' }]}
          >
            <InputNumber min={0} prefix="Rs." style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  )
}

export default ExpiringContractsPage
