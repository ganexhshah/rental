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
  Descriptions,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  ToolOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  AlertOutlined,
  EyeOutlined,
  CheckOutlined,
  SearchOutlined,
  CarOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { maintenanceApi } from '../api'
import { vehiclesApi } from '@/features/vehicles/api'
import type { MaintenanceTask, MaintenancePriority, MaintenanceStatus } from '@/types/maintenance'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { CurrencyDisplay } from '@/components/data-display/CurrencyDisplay'
import { DateDisplay } from '@/components/data-display/DateDisplay'
import { FormDrawer } from '@/components/overlays/FormDrawer'
import dayjs from 'dayjs'

export const MaintenanceQueuePage: React.FC = () => {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<MaintenanceTask | null>(null)
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false)

  const [createForm] = Form.useForm()
  const [completeForm] = Form.useForm()

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['maintenance-tasks', search, statusFilter, priorityFilter],
    queryFn: () => maintenanceApi.getTasks({ search, status: statusFilter, priority: priorityFilter }),
  })

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles-for-maintenance'],
    queryFn: () => vehiclesApi.getVehicles(),
  })

  const { data: vendors = [] } = useQuery({
    queryKey: ['maintenance-vendors'],
    queryFn: () => maintenanceApi.getVendors(),
  })

  const createTaskMutation = useMutation({
    mutationFn: (data: any) => maintenanceApi.createTask(data),
    onSuccess: () => {
      message.success('Work order created. Vehicle status set to Maintenance.')
      queryClient.invalidateQueries({ queryKey: ['maintenance-tasks'] })
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      setIsCreateOpen(false)
      createForm.resetFields()
    },
    onError: () => {
      message.error('Failed to create work order')
    },
  })

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<MaintenanceTask> }) =>
      maintenanceApi.updateTask(id, updates),
    onSuccess: () => {
      message.success('Work order updated successfully')
      queryClient.invalidateQueries({ queryKey: ['maintenance-tasks'] })
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      setIsCompleteModalOpen(false)
      setSelectedTask(null)
      completeForm.resetFields()
    },
    onError: () => {
      message.error('Failed to update task')
    },
  })

  const handleCreateSubmit = (values: any) => {
    const v = vehicles.find((veh) => veh.id === values.vehicleId)
    const vnd = vendors.find((vend) => vend.id === values.vendorId)
    createTaskMutation.mutate({
      tenantId: '78248f8f-e390-4f85-a03f-58e4974fa366',
      vehicleId: values.vehicleId,
      vehiclePlate: v?.plateNumber || '',
      vehicleModel: v ? `${v.make} ${v.model}` : '',
      serviceType: values.serviceType,
      title: values.title,
      description: values.description || '',
      priority: values.priority,
      status: 'scheduled',
      vendorId: values.vendorId,
      vendorName: vnd?.name || 'In-House Fleet Workshop',
      scheduledDate: values.scheduledDate ? values.scheduledDate.toISOString() : new Date().toISOString(),
      odometerReading: values.odometerReading || v?.specs?.mileageOdometer || 0,
      estimatedCost: Number(values.estimatedCost) || 0,
    })
  }

  const handleCompleteSubmit = (values: any) => {
    if (!selectedTask) return
    updateTaskMutation.mutate({
      id: selectedTask.id,
      updates: {
        status: 'completed',
        completedDate: new Date().toISOString(),
        actualCost: Number(values.actualCost) || selectedTask.estimatedCost,
        odometerReading: Number(values.odometerReading) || selectedTask.odometerReading,
        mechanicNotes: values.mechanicNotes,
        invoiceNumber: values.invoiceNumber,
      },
    })
  }

  const inProgressCount = tasks.filter((t) => t.status === 'in_progress').length
  const scheduledCount = tasks.filter((t) => t.status === 'scheduled').length
  const urgentCount = tasks.filter((t) => t.priority === 'urgent' && t.status !== 'completed').length
  const totalCost = tasks.reduce((sum, t) => sum + (t.actualCost || t.estimatedCost), 0)

  const columns: ColumnsType<MaintenanceTask> = [
    {
      title: 'Work Order #',
      dataIndex: 'workOrderNumber',
      key: 'workOrderNumber',
      render: (num: string, record) => (
        <a
          onClick={() => setSelectedTask(record)}
          style={{ fontWeight: 600, color: '#1677ff' }}
        >
          {num}
        </a>
      ),
    },
    {
      title: 'Vehicle',
      key: 'vehicle',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.vehiclePlate}</div>
          <div style={{ fontSize: 12, color: '#8c8c8c' }}>{record.vehicleModel}</div>
        </div>
      ),
    },
    {
      title: 'Service & Title',
      key: 'title',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.title}</div>
          <Tag style={{ textTransform: 'capitalize', fontSize: 11 }}>
            {record.serviceType.replace('_', ' ')}
          </Tag>
        </div>
      ),
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      render: (p: MaintenancePriority) => {
        const colorMap: Record<MaintenancePriority, string> = {
          urgent: 'error',
          high: 'warning',
          medium: 'blue',
          low: 'default',
        }
        return <Tag color={colorMap[p]}>{p.toUpperCase()}</Tag>
      },
    },
    {
      title: 'Scheduled Date',
      dataIndex: 'scheduledDate',
      key: 'scheduledDate',
      render: (date: string) => <DateDisplay date={date} formatStr="MMM dd, yyyy" />,
    },
    {
      title: 'Vendor / Shop',
      dataIndex: 'vendorName',
      key: 'vendorName',
      render: (name: string) => name || 'In-House Workshop',
    },
    {
      title: 'Est. / Actual Cost',
      key: 'cost',
      align: 'right',
      render: (_, record) => (
        <div>
          <div>
            <CurrencyDisplay amount={record.actualCost !== undefined ? record.actualCost : record.estimatedCost} bold />
          </div>
          {record.actualCost !== undefined && (
            <div style={{ fontSize: 11, color: '#8c8c8c' }}>
              Est: <CurrencyDisplay amount={record.estimatedCost} />
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: MaintenanceStatus) => {
        const colorMap: Record<MaintenanceStatus, string> = {
          completed: 'success',
          in_progress: 'processing',
          scheduled: 'default',
          waiting_parts: 'warning',
          cancelled: 'error',
        }
        return <StatusBadge status={colorMap[status] as any} text={status.replace('_', ' ').toUpperCase()} />
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EyeOutlined />}
            size="small"
            onClick={() => setSelectedTask(record)}
          />
          {record.status === 'scheduled' && (
            <Button
              size="small"
              type="link"
              onClick={() => {
                updateTaskMutation.mutate({ id: record.id, updates: { status: 'in_progress' } })
              }}
            >
              Start
            </Button>
          )}
          {record.status === 'in_progress' && (
            <Button
              size="small"
              type="primary"
              ghost
              icon={<CheckOutlined />}
              onClick={() => {
                setSelectedTask(record)
                completeForm.setFieldsValue({
                  actualCost: record.estimatedCost,
                  odometerReading: record.odometerReading,
                })
                setIsCompleteModalOpen(true)
              }}
            >
              Complete
            </Button>
          )}
        </Space>
      ),
    },
  ]

  return (
    <PageContainer>
      <PageHeader
        title="Maintenance Queue"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsCreateOpen(true)}
          >
            Create Work Order
          </Button>
        }
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <Statistic
              title="In Progress"
              value={inProgressCount}
              prefix={<ToolOutlined />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <Statistic
              title="Scheduled"
              value={scheduledCount}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <Statistic
              title="Urgent"
              value={urgentCount}
              prefix={<AlertOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <Statistic
              title="Total Maintenance Spend"
              value={totalCost}
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
              placeholder="Search work order #, vehicle plate, model, vendor..."
              prefix={<SearchOutlined />}
              value={search}
              allowClear
              onChange={(e) => setSearch(e.target.value)}
            />
          </Col>
          <Col xs={24} sm={12} md={12} style={{ textAlign: 'right' }}>
            <Space wrap>
              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                style={{ width: 150 }}
                options={[
                  { label: 'All Statuses', value: 'all' },
                  { label: 'Scheduled', value: 'scheduled' },
                  { label: 'In Progress', value: 'in_progress' },
                  { label: 'Waiting Parts', value: 'waiting_parts' },
                  { label: 'Completed', value: 'completed' },
                  { label: 'Cancelled', value: 'cancelled' },
                ]}
              />
              <Select
                value={priorityFilter}
                onChange={setPriorityFilter}
                style={{ width: 140 }}
                options={[
                  { label: 'All Priorities', value: 'all' },
                  { label: 'Urgent', value: 'urgent' },
                  { label: 'High', value: 'high' },
                  { label: 'Medium', value: 'medium' },
                  { label: 'Low', value: 'low' },
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
          dataSource={tasks}
          loading={isLoading}
          pagination={{ pageSize: 10, showSizeChanger: true }}
        />
      </Card>

      {/* Task Details Modal */}
      <Modal
        title={`Work Order: ${selectedTask?.workOrderNumber}`}
        open={!!selectedTask && !isCompleteModalOpen}
        onCancel={() => setSelectedTask(null)}
        footer={[
          <Button key="close" onClick={() => setSelectedTask(null)}>
            Close
          </Button>,
          selectedTask?.status === 'in_progress' && (
            <Button
              key="complete"
              type="primary"
              onClick={() => {
                completeForm.setFieldsValue({
                  actualCost: selectedTask.estimatedCost,
                  odometerReading: selectedTask.odometerReading,
                })
                setIsCompleteModalOpen(true)
              }}
            >
              Complete Work Order
            </Button>
          ),
        ]}
        width={680}
      >
        {selectedTask && (
          <div>
            <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}>
              <Descriptions.Item label="Vehicle">
                {selectedTask.vehiclePlate} ({selectedTask.vehicleModel})
              </Descriptions.Item>
              <Descriptions.Item label="Service Type">
                {selectedTask.serviceType.replace('_', ' ').toUpperCase()}
              </Descriptions.Item>
              <Descriptions.Item label="Priority">
                <Tag color={selectedTask.priority === 'urgent' ? 'red' : 'blue'}>
                  {selectedTask.priority.toUpperCase()}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Current Status">
                <Tag color={selectedTask.status === 'completed' ? 'green' : 'gold'}>
                  {selectedTask.status.replace('_', ' ').toUpperCase()}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Service Vendor">
                {selectedTask.vendorName || 'In-House Workshop'}
              </Descriptions.Item>
              <Descriptions.Item label="Scheduled Date">
                <DateDisplay date={selectedTask.scheduledDate} formatStr="MMM dd, yyyy" />
              </Descriptions.Item>
              <Descriptions.Item label="Estimated Cost">
                <CurrencyDisplay amount={selectedTask.estimatedCost} />
              </Descriptions.Item>
              <Descriptions.Item label="Actual Cost">
                <CurrencyDisplay amount={selectedTask.actualCost || 0} />
              </Descriptions.Item>
              <Descriptions.Item label="Odometer at Service">
                {selectedTask.odometerReading?.toLocaleString()} km
              </Descriptions.Item>
              <Descriptions.Item label="Completed Date">
                {selectedTask.completedDate ? (
                  <DateDisplay date={selectedTask.completedDate} formatStr="MMM dd, yyyy" />
                ) : (
                  'Pending'
                )}
              </Descriptions.Item>
            </Descriptions>

            <div style={{ marginTop: 16 }}>
              <h4>Work Description</h4>
              <p style={{ background: '#fafafa', padding: 12, borderRadius: 6 }}>
                {selectedTask.description || 'Routine scheduled inspection & maintenance protocol.'}
              </p>
            </div>

            {selectedTask.mechanicNotes && (
              <div style={{ marginTop: 16 }}>
                <h4>Mechanic / Technician Notes</h4>
                <p style={{ background: '#f6ffed', padding: 12, borderRadius: 6, border: '1px solid #b7eb8f' }}>
                  {selectedTask.mechanicNotes}
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Complete Work Order Modal */}
      <Modal
        title={`Complete Work Order: ${selectedTask?.workOrderNumber}`}
        open={isCompleteModalOpen}
        onCancel={() => setIsCompleteModalOpen(false)}
        onOk={() => completeForm.submit()}
        confirmLoading={updateTaskMutation.isPending}
        okText="Confirm Completion"
      >
        <Form form={completeForm} layout="vertical" onFinish={handleCompleteSubmit}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="actualCost"
                label="Final Billed Cost (Rs.)"
                rules={[{ required: true, message: 'Enter actual cost' }]}
              >
                <InputNumber min={0} prefix="Rs." style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="odometerReading"
                label="Updated Odometer (km)"
                rules={[{ required: true, message: 'Enter current odometer reading' }]}
              >
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="invoiceNumber" label="Vendor Invoice / Receipt #">
            <Input placeholder="E.g., VEND-INV-88910" />
          </Form.Item>

          <Form.Item name="mechanicNotes" label="Technician Work Done & Notes">
            <Input.TextArea
              rows={3}
              placeholder="E.g., Replaced front brake pads and rotors. Tested brake pressure. All clear for operation."
            />
          </Form.Item>

          <p style={{ fontSize: 13, color: '#52c41a' }}>
            Upon confirming completion, vehicle {selectedTask?.vehiclePlate} will be automatically released back to the Available fleet.
          </p>
        </Form>
      </Modal>

      {/* Create Work Order Drawer */}
      <FormDrawer
        title="Schedule Maintenance Work Order"
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={() => createForm.submit()}
        confirmLoading={createTaskMutation.isPending}
        width={580}
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreateSubmit}
          initialValues={{
            serviceType: 'regular_service',
            priority: 'medium',
            scheduledDate: dayjs(),
          }}
        >
          <Form.Item
            name="vehicleId"
            label="Target Fleet Vehicle"
            rules={[{ required: true, message: 'Please select a vehicle' }]}
          >
            <Select
              showSearch
              placeholder="Select vehicle"
              optionFilterProp="label"
              options={vehicles.map((v) => ({
                label: `${v.plateNumber} - ${v.make} ${v.model} (${v.status})`,
                value: v.id,
              }))}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="serviceType"
                label="Service Type"
                rules={[{ required: true }]}
              >
                <Select
                  options={[
                    { label: 'Regular Service', value: 'regular_service' },
                    { label: 'Oil Change', value: 'oil_change' },
                    { label: 'Brake Inspection', value: 'brake_inspection' },
                    { label: 'Tire Change & Balance', value: 'tire_change' },
                    { label: 'Engine Repair', value: 'engine_repair' },
                    { label: 'Body Damage Repair', value: 'body_damage' },
                    { label: 'Electrical & Battery', value: 'electrical' },
                    { label: 'Other', value: 'other' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="priority"
                label="Priority Severity"
                rules={[{ required: true }]}
              >
                <Select
                  options={[
                    { label: 'Low (Scheduled)', value: 'low' },
                    { label: 'Medium (Standard)', value: 'medium' },
                    { label: 'High (Immediate Attention)', value: 'high' },
                    { label: 'Urgent (Safety Grounding)', value: 'urgent' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="title"
            label="Service Title"
            rules={[{ required: true, message: 'Enter summary title' }]}
          >
            <Input placeholder="E.g., 20,000 km Major Service & Fluid Flush" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="vendorId" label="Assigned Vendor / Workshop">
                <Select
                  placeholder="Select vendor"
                  allowClear
                  options={vendors.map((v) => ({
                    label: `${v.name} (${v.serviceType})`,
                    value: v.id,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="scheduledDate"
                label="Scheduled Date"
                rules={[{ required: true }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="estimatedCost" label="Estimated Cost (Rs.)">
                <InputNumber min={0} prefix="Rs." style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="odometerReading" label="Current Odometer (km)">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="Detailed Work Instructions">
            <Input.TextArea rows={3} placeholder="Provide instructions for the mechanic..." />
          </Form.Item>
        </Form>
      </FormDrawer>
    </PageContainer>
  )
}

export default MaintenanceQueuePage
