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
  ScheduleOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  ToolOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { maintenanceApi } from '../api'
import { vehiclesApi } from '@/features/vehicles/api'
import type { MaintenanceSchedule } from '@/types/maintenance'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { DateDisplay } from '@/components/data-display/DateDisplay'
import dayjs from 'dayjs'

export const MaintenanceSchedulesPage: React.FC = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [form] = Form.useForm()

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ['maintenance-schedules'],
    queryFn: () => maintenanceApi.getSchedules(),
  })

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles-for-schedules'],
    queryFn: () => vehiclesApi.getVehicles(),
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => maintenanceApi.createSchedule(data),
    onSuccess: () => {
      message.success('Preventive schedule configured successfully')
      queryClient.invalidateQueries({ queryKey: ['maintenance-schedules'] })
      setIsModalOpen(false)
      form.resetFields()
    },
    onError: () => {
      message.error('Failed to configure schedule')
    },
  })

  const handleCreateSubmit = (values: any) => {
    createMutation.mutate({
      tenantId: '78248f8f-e390-4f85-a03f-58e4974fa366',
      vehicleId: values.vehicleId,
      serviceName: values.serviceName,
      intervalKm: values.intervalKm,
      intervalMonths: values.intervalMonths,
      lastPerformedKm: values.lastPerformedKm || 0,
      lastPerformedDate: values.lastPerformedDate ? values.lastPerformedDate.toISOString() : new Date().toISOString(),
      nextDueKm: values.intervalKm ? (values.lastPerformedKm || 0) + values.intervalKm : undefined,
      nextDueDate: values.nextDueDate ? values.nextDueDate.toISOString() : undefined,
      status: 'ok',
    })
  }

  const overdueCount = schedules.filter((s) => s.status === 'overdue').length
  const dueSoonCount = schedules.filter((s) => s.status === 'due_soon').length
  const okCount = schedules.filter((s) => s.status === 'ok').length

  const columns: ColumnsType<MaintenanceSchedule> = [
    {
      title: 'Service Name',
      dataIndex: 'serviceName',
      key: 'serviceName',
      render: (name: string) => <span style={{ fontWeight: 600 }}>{name}</span>,
    },
    {
      title: 'Target Vehicle',
      dataIndex: 'vehicleId',
      key: 'vehicleId',
      render: (id: string) => {
        const v = vehicles.find((veh) => veh.id === id)
        return v ? `${v.plateNumber} (${v.make} ${v.model})` : 'All Fleet (Generic)'
      },
    },
    {
      title: 'Interval Criteria',
      key: 'interval',
      render: (_, record) => (
        <div>
          {record.intervalKm && <div>Every {record.intervalKm.toLocaleString()} km</div>}
          {record.intervalMonths && <div>Every {record.intervalMonths} month(s)</div>}
        </div>
      ),
    },
    {
      title: 'Last Serviced',
      key: 'last',
      render: (_, record) => (
        <div style={{ fontSize: 12 }}>
          {record.lastPerformedDate && (
            <div>Date: <DateDisplay date={record.lastPerformedDate} formatStr="MMM dd, yyyy" /></div>
          )}
          {record.lastPerformedKm !== undefined && (
            <div style={{ color: '#8c8c8c' }}>At {record.lastPerformedKm.toLocaleString()} km</div>
          )}
        </div>
      ),
    },
    {
      title: 'Next Due Threshold',
      key: 'next',
      render: (_, record) => (
        <div style={{ fontSize: 12 }}>
          {record.nextDueDate && (
            <div style={{ fontWeight: 500 }}>
              Date: <DateDisplay date={record.nextDueDate} formatStr="MMM dd, yyyy" />
            </div>
          )}
          {record.nextDueKm && (
            <div style={{ color: '#1677ff' }}>At {record.nextDueKm.toLocaleString()} km</div>
          )}
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: MaintenanceSchedule['status']) => {
        const colorMap: Record<MaintenanceSchedule['status'], string> = {
          ok: 'success',
          due_soon: 'warning',
          overdue: 'error',
        }
        return <Tag color={colorMap[status]}>{status.replace('_', ' ').toUpperCase()}</Tag>
      },
    },
    {
      title: 'Action',
      key: 'action',
      align: 'right',
      render: (_, record) => (
        <Button
          size="small"
          type="primary"
          ghost
          icon={<ToolOutlined />}
          onClick={() => navigate('/maintenance/queue')}
        >
          Dispatch Work Order
        </Button>
      ),
    },
  ]

  return (
    <PageContainer>
      <PageHeader
        title="Preventive Maintenance Schedules"
        subtitle="Automated mileage and time-interval thresholds for oil changes, inspections, tire rotations, and scheduled fleet care."
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsModalOpen(true)}
          >
            Configure Schedule
          </Button>
        }
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <Statistic
              title="Active Recurring Rules"
              value={schedules.length}
              prefix={<ScheduleOutlined />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <Statistic
              title="Due Soon (< 500 km / 7 days)"
              value={dueSoonCount}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <Statistic
              title="Overdue Maintenance"
              value={overdueCount}
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
          dataSource={schedules}
          loading={isLoading}
          pagination={false}
        />
      </Card>

      {/* Configure Schedule Modal */}
      <Modal
        title="Configure Preventive Maintenance Schedule"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending}
        okText="Save Schedule"
      >
        <Form form={form} layout="vertical" onFinish={handleCreateSubmit}>
          <Form.Item
            name="serviceName"
            label="Service Title"
            rules={[{ required: true, message: 'Please enter service title' }]}
          >
            <Input placeholder="E.g., 5,000 km Synthetic Oil Service" />
          </Form.Item>

          <Form.Item
            name="vehicleId"
            label="Target Fleet Vehicle"
            rules={[{ required: true, message: 'Select vehicle' }]}
          >
            <Select
              showSearch
              placeholder="Select vehicle"
              optionFilterProp="label"
              options={vehicles.map((v) => ({
                label: `${v.plateNumber} - ${v.make} ${v.model}`,
                value: v.id,
              }))}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="intervalKm" label="Mileage Interval (km)">
                <InputNumber min={500} step={500} style={{ width: '100%' }} placeholder="5000" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="intervalMonths" label="Time Interval (Months)">
                <InputNumber min={1} max={36} style={{ width: '100%' }} placeholder="6" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="lastPerformedKm" label="Last Serviced Odometer (km)">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="lastPerformedDate" label="Last Serviced Date">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="nextDueDate" label="Target Next Due Date">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  )
}

export default MaintenanceSchedulesPage
