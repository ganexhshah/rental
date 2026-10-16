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
  Switch,
  Space,
  Card,
  Row,
  Col,
  Statistic,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  DollarOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  SearchOutlined,
  CarOutlined,
  FileDoneOutlined,
  UploadOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { expensesApi } from '../api'
import { vehiclesApi } from '@/features/vehicles/api'
import type { Expense, ExpenseCategory } from '@/types/expense'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { CurrencyDisplay } from '@/components/data-display/CurrencyDisplay'
import { DateDisplay } from '@/components/data-display/DateDisplay'
import { FormDrawer } from '@/components/overlays/FormDrawer'
import dayjs from 'dayjs'

export const ExpensesListPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false)

  const [form] = Form.useForm()

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['expenses-list', search, categoryFilter, statusFilter],
    queryFn: () => expensesApi.getExpenses({ search, category: categoryFilter, status: statusFilter }),
  })

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles-for-expenses'],
    queryFn: () => vehiclesApi.getVehicles(),
  })

  const createExpenseMutation = useMutation({
    mutationFn: (data: any) => expensesApi.createExpense(data),
    onSuccess: () => {
      message.success('Expense recorded successfully')
      queryClient.invalidateQueries({ queryKey: ['expenses-list'] })
      setIsAddDrawerOpen(false)
      form.resetFields()
    },
    onError: () => {
      message.error('Failed to record expense')
    },
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'approved' | 'rejected' }) =>
      expensesApi.updateStatus(id, status),
    onSuccess: (_, vars) => {
      message.success(`Expense ${vars.status}`)
      queryClient.invalidateQueries({ queryKey: ['expenses-list'] })
    },
  })

  const handleCreateSubmit = (values: any) => {
    const selectedVeh = vehicles.find((v) => v.id === values.vehicleId)
    createExpenseMutation.mutate({
      tenantId: '78248f8f-e390-4f85-a03f-58e4974fa366',
      category: values.category,
      title: values.title,
      description: values.description,
      amount: Number(values.amount) || 0,
      currency: 'NPR',
      date: values.date ? values.date.toISOString() : new Date().toISOString(),
      vehicleId: values.vehicleId,
      vehiclePlate: selectedVeh ? selectedVeh.plateNumber : undefined,
      vendor: values.vendor,
      paymentMethod: values.paymentMethod,
      recordedBy: 'Finance Lead',
      isTaxDeductible: !!values.isTaxDeductible,
      status: 'approved',
    })
  }

  const totalExpenseAmount = expenses.reduce((sum, e) => sum + e.amount, 0)
  const fuelExpenses = expenses.filter((e) => e.category === 'fuel').reduce((sum, e) => sum + e.amount, 0)
  const maintenanceExpenses = expenses.filter((e) => e.category === 'maintenance').reduce((sum, e) => sum + e.amount, 0)
  const taxDeductibleTotal = expenses.filter((e) => e.isTaxDeductible).reduce((sum, e) => sum + e.amount, 0)

  const columns: ColumnsType<Expense> = [
    {
      title: 'Expense #',
      dataIndex: 'expenseNumber',
      key: 'expenseNumber',
      render: (num: string) => <span style={{ fontWeight: 600 }}>{num}</span>,
    },
    {
      title: 'Title & Vendor',
      key: 'title',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.title}</div>
          <div style={{ fontSize: 12, color: '#8c8c8c' }}>
            {record.vendor ? `Vendor: ${record.vendor}` : 'Internal Allocation'}
          </div>
        </div>
      ),
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (cat: ExpenseCategory) => {
        const colorMap: Record<ExpenseCategory, string> = {
          fuel: 'orange',
          maintenance: 'red',
          insurance: 'blue',
          cleaning: 'cyan',
          toll_parking: 'purple',
          registration_tax: 'geekblue',
          marketing: 'magenta',
          salaries: 'volcano',
          office_rent: 'gold',
          utilities: 'lime',
          other: 'default',
        }
        return <Tag color={colorMap[cat]}>{cat.replace('_', ' ').toUpperCase()}</Tag>
      },
    },
    {
      title: 'Allocated Vehicle',
      key: 'vehicle',
      render: (_, record) =>
        record.vehiclePlate ? (
          <Tag icon={<CarOutlined />} color="blue">
            {record.vehiclePlate}
          </Tag>
        ) : (
          <span style={{ color: '#8c8c8c', fontSize: 12 }}>Fleet Overhead</span>
        ),
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (d: string) => <DateDisplay date={d} formatStr="MMM dd, yyyy" />,
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      render: (val: number) => <CurrencyDisplay amount={val} bold />,
    },
    {
      title: 'Tax Deductible',
      dataIndex: 'isTaxDeductible',
      key: 'isTaxDeductible',
      align: 'center',
      render: (deduct: boolean) => (deduct ? <Tag color="green">Yes</Tag> : <Tag>No</Tag>),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (st: Expense['status']) => {
        const colorMap: Record<Expense['status'], string> = {
          approved: 'success',
          pending_approval: 'warning',
          rejected: 'error',
        }
        return <StatusBadge status={colorMap[st] as any} text={st.replace('_', ' ').toUpperCase()} />
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'right',
      render: (_, record) =>
        record.status === 'pending_approval' ? (
          <Space size="small">
            <Button
              size="small"
              type="primary"
              ghost
              onClick={() => statusMutation.mutate({ id: record.id, status: 'approved' })}
            >
              Approve
            </Button>
            <Button
              size="small"
              danger
              onClick={() => statusMutation.mutate({ id: record.id, status: 'rejected' })}
            >
              Reject
            </Button>
          </Space>
        ) : null,
    },
  ]

  return (
    <PageContainer>
      <PageHeader
        title="Operating Expenses Ledger"
        subtitle="Track fleet operating costs, vehicle repairs, fuel, insurance, toll road reimbursements, and general overhead."
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsAddDrawerOpen(true)}
          >
            Record Expense
          </Button>
        }
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <Statistic
              title="Total Fleet Expenses"
              value={totalExpenseAmount}
              precision={2}
              prefix="Rs."
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <Statistic
              title="Fuel & Power Spend"
              value={fuelExpenses}
              precision={2}
              prefix="Rs."
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <Statistic
              title="Maintenance & Parts"
              value={maintenanceExpenses}
              precision={2}
              prefix="Rs."
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <Statistic
              title="Tax Deductible Sum"
              value={taxDeductibleTotal}
              precision={2}
              prefix="Rs."
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      <Card bordered={false} style={{ marginBottom: 20 }}>
        <Row gutter={[16, 16]} align="middle" justify="space-between">
          <Col xs={24} sm={12} md={8}>
            <Input
              placeholder="Search expense #, title, vendor, vehicle..."
              prefix={<SearchOutlined />}
              value={search}
              allowClear
              onChange={(e) => setSearch(e.target.value)}
            />
          </Col>
          <Col xs={24} sm={12} md={12} style={{ textAlign: 'right' }}>
            <Space wrap>
              <Select
                value={categoryFilter}
                onChange={setCategoryFilter}
                style={{ width: 160 }}
                options={[
                  { label: 'All Categories', value: 'all' },
                  { label: 'Fuel', value: 'fuel' },
                  { label: 'Maintenance', value: 'maintenance' },
                  { label: 'Insurance', value: 'insurance' },
                  { label: 'Cleaning', value: 'cleaning' },
                  { label: 'Tolls & Parking', value: 'toll_parking' },
                  { label: 'Registration & Tax', value: 'registration_tax' },
                  { label: 'Marketing', value: 'marketing' },
                  { label: 'Salaries', value: 'salaries' },
                  { label: 'Office Rent', value: 'office_rent' },
                  { label: 'Utilities', value: 'utilities' },
                  { label: 'Other', value: 'other' },
                ]}
              />
              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                style={{ width: 150 }}
                options={[
                  { label: 'All Statuses', value: 'all' },
                  { label: 'Approved', value: 'approved' },
                  { label: 'Pending Approval', value: 'pending_approval' },
                  { label: 'Rejected', value: 'rejected' },
                ]}
              />
            </Space>
          </Col>
        </Row>
      </Card>

      <Card bordered={false} bodyStyle={{ padding: 0 }}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={expenses}
          loading={isLoading}
          pagination={{ pageSize: 10, showSizeChanger: true }}
        />
      </Card>

      {/* Record Expense Drawer */}
      <FormDrawer
        title="Record Operational Expense"
        open={isAddDrawerOpen}
        onClose={() => setIsAddDrawerOpen(false)}
        onSubmit={() => form.submit()}
        confirmLoading={createExpenseMutation.isPending}
        width={560}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateSubmit}
          initialValues={{
            category: 'fuel',
            paymentMethod: 'company_account',
            date: dayjs(),
            isTaxDeductible: true,
          }}
        >
          <Form.Item
            name="title"
            label="Expense Description / Title"
            rules={[{ required: true, message: 'Please enter title' }]}
          >
            <Input placeholder="E.g., Fleet Diesel Refuel" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="category"
                label="Expense Category"
                rules={[{ required: true }]}
              >
                <Select
                  options={[
                    { label: 'Fuel & Supercharging', value: 'fuel' },
                    { label: 'Maintenance & Parts', value: 'maintenance' },
                    { label: 'Fleet Insurance', value: 'insurance' },
                    { label: 'Detailing & Cleaning', value: 'cleaning' },
                    { label: 'Tolls & Parking', value: 'toll_parking' },
                    { label: 'Registration & Taxes', value: 'registration_tax' },
                    { label: 'Marketing & Ads', value: 'marketing' },
                    { label: 'Salaries & Wages', value: 'salaries' },
                    { label: 'Hub Rent & Facilities', value: 'office_rent' },
                    { label: 'Utilities', value: 'utilities' },
                    { label: 'Other Operational', value: 'other' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="amount"
                label="Total Amount (Rs.)"
                rules={[{ required: true, message: 'Please input amount' }]}
              >
                <InputNumber min={0.01} step={0.01} prefix="Rs." style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="vehicleId" label="Allocated Vehicle (Optional)">
                <Select
                  placeholder="Select vehicle if applicable"
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  options={vehicles.map((v) => ({
                    label: `${v.plateNumber} - ${v.make} ${v.model}`,
                    value: v.id,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="date"
                label="Expense Date"
                rules={[{ required: true }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="vendor" label="Vendor / Payee">
                <Input placeholder="E.g., Nepal Oil Corporation, Shikhar Insurance" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="paymentMethod"
                label="Payment Method"
                rules={[{ required: true }]}
              >
                <Select
                  options={[
                    { label: 'Company Bank Account', value: 'company_account' },
                    { label: 'Corporate Credit Card', value: 'credit_card' },
                    { label: 'Direct Bank Wire', value: 'bank_transfer' },
                    { label: 'Petty Cash', value: 'petty_cash' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="isTaxDeductible" valuePropName="checked">
            <Switch />
            <span style={{ marginLeft: 8 }}>Eligible for Business Tax Deduction</span>
          </Form.Item>

          <Form.Item name="description" label="Internal Notes / Justification">
            <Input.TextArea rows={3} placeholder="Add invoice number, receipt details, or audit notes..." />
          </Form.Item>
        </Form>
      </FormDrawer>
    </PageContainer>
  )
}

export default ExpensesListPage
