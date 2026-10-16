import React, { useState } from 'react'
import {
  Table,
  Button,
  Tag,
  Avatar,
  Modal,
  Form,
  Input,
  Select,
  Space,
  Card,
  Row,
  Col,
  Statistic,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  TeamOutlined,
  UserAddOutlined,
  MailOutlined,
  PhoneOutlined,
  SafetyCertificateOutlined,
  EditOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { staffApi } from '../api'
import { vehiclesApi } from '@/features/vehicles/api'
import type { StaffMember } from '@/types/staff'
import type { UserRole } from '@/types/auth'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { DateDisplay } from '@/components/data-display/DateDisplay'

export const StaffListPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [form] = Form.useForm()

  const { data: staff = [], isLoading } = useQuery({
    queryKey: ['staff-list'],
    queryFn: () => staffApi.getStaff(),
  })

  const { data: locations = [] } = useQuery({
    queryKey: ['locations-for-staff'],
    queryFn: () => vehiclesApi.getLocations(),
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => staffApi.createStaff(data),
    onSuccess: () => {
      message.success('Team member invited successfully')
      queryClient.invalidateQueries({ queryKey: ['staff-list'] })
      setIsModalOpen(false)
      form.resetFields()
    },
    onError: () => {
      message.error('Failed to invite member')
    },
  })

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'inactive' }) =>
      staffApi.updateStaff(id, { status }),
    onSuccess: () => {
      message.success('Staff status updated')
      queryClient.invalidateQueries({ queryKey: ['staff-list'] })
    },
  })

  const handleCreateSubmit = (values: any) => {
    const loc = locations.find((l) => l.id === values.assignedLocationId)
    createMutation.mutate({
      tenantId: '78248f8f-e390-4f85-a03f-58e4974fa366',
      name: values.name,
      email: values.email,
      phone: values.phone,
      role: values.role,
      customRoleTitle: values.customRoleTitle,
      assignedLocationId: values.assignedLocationId,
      assignedLocationName: loc?.name,
      status: 'active',
      permissions: ['read', 'write'],
    })
  }

  const columns: ColumnsType<StaffMember> = [
    {
      title: 'Staff Member',
      key: 'name',
      render: (_, record) => (
        <Space orientation="horizontal" size="middle">
          <Avatar style={{ backgroundColor: '#1677ff' }}>
            {record.name.charAt(0)}
          </Avatar>
          <div>
            <div style={{ fontWeight: 600 }}>{record.name}</div>
            <div style={{ fontSize: 12, color: '#8c8c8c' }}>{record.email}</div>
          </div>
        </Space>
      ),
    },
    {
      title: 'System Role',
      dataIndex: 'role',
      key: 'role',
      render: (role: UserRole) => {
        const colorMap: Record<UserRole, string> = {
          admin: 'red',
          manager: 'blue',
          staff: 'green',
          customer: 'purple',
        }
        return <Tag color={colorMap[role]}>{role.toUpperCase()}</Tag>
      },
    },
    {
      title: 'Title & Department',
      dataIndex: 'customRoleTitle',
      key: 'customRoleTitle',
      render: (title: string) => title || 'Fleet Operations',
    },
    {
      title: 'Assigned Hub Station',
      dataIndex: 'assignedLocationName',
      key: 'assignedLocationName',
      render: (loc: string) => loc || 'All Locations (Central HQ)',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (st: string) => (
        <Tag color={st === 'active' ? 'success' : 'default'}>{st.toUpperCase()}</Tag>
      ),
    },
    {
      title: 'Last Active',
      dataIndex: 'lastLoginAt',
      key: 'lastLoginAt',
      render: (d: string) => (d ? <DateDisplay date={d} formatStr="MMM dd, yyyy" /> : 'Recent'),
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'right',
      render: (_, record) => (
        <Space size="small">
          {record.role !== 'admin' && (
            <Button
              size="small"
              type="link"
              danger={record.status === 'active'}
              onClick={() =>
                toggleStatusMutation.mutate({
                  id: record.id,
                  status: record.status === 'active' ? 'inactive' : 'active',
                })
              }
            >
              {record.status === 'active' ? 'Deactivate' : 'Activate'}
            </Button>
          )}
        </Space>
      ),
    },
  ]

  return (
    <PageContainer>
      <PageHeader
        title="Team Directory & Staff Management"
        subtitle="Manage fleet operators, dispatch agents, field mechanics, branch managers, and system administrators."
        extra={
          <Button
            type="primary"
            icon={<UserAddOutlined />}
            onClick={() => setIsModalOpen(true)}
          >
            Invite Staff Member
          </Button>
        }
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <Statistic
              title="Total Team Members"
              value={staff.length}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <Statistic
              title="Active Staff"
              value={staff.filter((s) => s.status === 'active').length}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <Statistic
              title="Branch Hub Coverage"
              value="100%"
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      <Card bordered={false} bodyStyle={{ padding: 0 }}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={staff}
          loading={isLoading}
          pagination={false}
        />
      </Card>

      {/* Invite Staff Modal */}
      <Modal
        title="Invite Team Member"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending}
        okText="Send Invitation"
      >
        <Form form={form} layout="vertical" onFinish={handleCreateSubmit}>
          <Form.Item
            name="name"
            label="Full Name"
            rules={[{ required: true, message: 'Please enter name' }]}
          >
            <Input placeholder="E.g., Bimal Thapa" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="email"
                label="Corporate Email"
                rules={[{ required: true, type: 'email' }]}
              >
                <Input placeholder="staff@himalayanrides.com" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="phone" label="Phone Number" rules={[{ required: true }]}>
                <Input placeholder="+977-9800000000" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="role" label="System Role" rules={[{ required: true }]}>
                <Select
                  options={[
                    { label: 'Admin (Full Access)', value: 'admin' },
                    { label: 'Hub Operations Manager', value: 'manager' },
                    { label: 'Front-Desk Operations Staff', value: 'staff' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="customRoleTitle" label="Job Title">
                <Input placeholder="E.g., Senior Operations Lead" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="assignedLocationId" label="Assigned Hub Station">
            <Select
              allowClear
              placeholder="All Locations (Central Operations)"
              options={locations.map((l) => ({ label: l.name, value: l.id }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  )
}

export default StaffListPage
