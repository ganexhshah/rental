import React, { useState } from 'react'
import {
  Table,
  Button,
  Tag,
  Modal,
  Form,
  Input,
  InputNumber,
  Progress,
  Space,
  Card,
  Row,
  Col,
  Statistic,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  PieChartOutlined,
  EditOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { expensesApi } from '../api'
import type { ExpenseCategory } from '@/types/expense'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { CurrencyDisplay } from '@/components/data-display/CurrencyDisplay'
import { formatCurrency } from '@/lib/currency'

interface CategoryBudget {
  key: string
  category: ExpenseCategory
  label: string
  monthlyBudget: number
  spent: number
  color: string
}

const INITIAL_BUDGETS: CategoryBudget[] = [
  { key: '1', category: 'fuel', label: 'Fuel & Supercharging', monthlyBudget: 4000, spent: 2450, color: '#fa8c16' },
  { key: '2', category: 'maintenance', label: 'Fleet Maintenance & Parts', monthlyBudget: 8000, spent: 5600, color: '#1677ff' },
  { key: '3', category: 'insurance', label: 'Fleet Insurance Premiums', monthlyBudget: 5000, spent: 4200, color: '#722ed1' },
  { key: '4', category: 'cleaning', label: 'Detailing & Sanitation', monthlyBudget: 1500, spent: 1100, color: '#13c2c2' },
  { key: '5', category: 'toll_parking', label: 'Tolls & Commercial Parking', monthlyBudget: 1200, spent: 780, color: '#eb2f96' },
  { key: '6', category: 'registration_tax', label: 'Registration & Local Taxes', monthlyBudget: 3000, spent: 2100, color: '#2f54eb' },
  { key: '7', category: 'marketing', label: 'Acquisition & Digital Ads', monthlyBudget: 3500, spent: 2900, color: '#f5222d' },
  { key: '8', category: 'office_rent', label: 'Hub Station Lease & Facilities', monthlyBudget: 4500, spent: 4500, color: '#faad14' },
]

export const ExpenseCategoriesPage: React.FC = () => {
  const [budgets, setBudgets] = useState<CategoryBudget[]>(INITIAL_BUDGETS)
  const [editingBudget, setEditingBudget] = useState<CategoryBudget | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [form] = Form.useForm()

  const totalBudget = budgets.reduce((sum, b) => sum + b.monthlyBudget, 0)
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0)
  const overallUtilization = Math.round((totalSpent / totalBudget) * 100)

  const handleEdit = (budget: CategoryBudget) => {
    setEditingBudget(budget)
    form.setFieldsValue({
      monthlyBudget: budget.monthlyBudget,
    })
    setIsModalOpen(true)
  }

  const handleSave = (values: any) => {
    if (!editingBudget) return
    setBudgets((prev) =>
      prev.map((b) =>
        b.key === editingBudget.key ? { ...b, monthlyBudget: Number(values.monthlyBudget) || b.monthlyBudget } : b
      )
    )
    message.success(`Monthly budget for ${editingBudget.label} updated`)
    setIsModalOpen(false)
  }

  const columns: ColumnsType<CategoryBudget> = [
    {
      title: 'Expense Category',
      dataIndex: 'label',
      key: 'label',
      render: (label: string, record) => (
        <span style={{ fontWeight: 600, color: record.color }}>
          {label}
        </span>
      ),
    },
    {
      title: 'Monthly Budget Cap',
      dataIndex: 'monthlyBudget',
      key: 'monthlyBudget',
      align: 'right',
      render: (v: number) => <CurrencyDisplay amount={v} bold />,
    },
    {
      title: 'Month-to-Date Spend',
      dataIndex: 'spent',
      key: 'spent',
      align: 'right',
      render: (v: number) => <CurrencyDisplay amount={v} />,
    },
    {
      title: 'Remaining Cap',
      key: 'remaining',
      align: 'right',
      render: (_, record) => {
        const rem = record.monthlyBudget - record.spent
        return (
          <span style={{ color: rem < 0 ? '#ff4d4f' : '#52c41a', fontWeight: 500 }}>
            {formatCurrency(rem)}
          </span>
        )
      },
    },
    {
      title: 'Budget Consumption',
      key: 'progress',
      render: (_, record) => {
        const percent = Math.round((record.spent / record.monthlyBudget) * 100)
        let status: 'normal' | 'exception' | 'success' = 'normal'
        if (percent >= 100) status = 'exception'
        else if (percent >= 80) status = 'normal'
        return (
          <div style={{ width: 160 }}>
            <Progress percent={percent} status={status} size="small" strokeColor={percent >= 90 ? '#ff4d4f' : record.color} />
          </div>
        )
      },
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
          Adjust Cap
        </Button>
      ),
    },
  ]

  return (
    <PageContainer>
      <PageHeader
        title="Expense Categories & Budget Allocation"
        subtitle="Manage cost-center allocations, threshold alerts, monthly ceiling caps, and variance tracking."
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <Statistic
              title="Total Fleet Monthly Cap"
              value={totalBudget}
              precision={2}
              prefix="Rs."
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <Statistic
              title="Spent Current Cycle"
              value={totalSpent}
              precision={2}
              prefix="Rs."
              valueStyle={{ color: overallUtilization >= 85 ? '#faad14' : '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <Statistic
              title="Total Budget Utilization"
              value={overallUtilization}
              suffix="%"
              valueStyle={{ color: overallUtilization >= 90 ? '#ff4d4f' : '#1677ff' }}
            />
          </Card>
        </Col>
      </Row>

      <Card bordered={false} bodyStyle={{ padding: 0 }}>
        <Table
          rowKey="key"
          columns={columns}
          dataSource={budgets}
          pagination={false}
        />
      </Card>

      {/* Adjust Cap Modal */}
      <Modal
        title={`Adjust Budget: ${editingBudget?.label}`}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
        okText="Update Budget"
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item
            name="monthlyBudget"
            label="Monthly Allocated Limit (Rs.)"
            rules={[{ required: true, message: 'Please specify budget amount' }]}
          >
            <InputNumber min={100} step={100} prefix="Rs." style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  )
}

export default ExpenseCategoriesPage
