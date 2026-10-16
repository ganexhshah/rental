import React, { useState } from 'react'
import {
  Table,
  Button,
  Tag,
  Modal,
  Form,
  Input,
  Rate,
  Space,
  Card,
  Row,
  Col,
  Statistic,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  ShopOutlined,
  PlusOutlined,
  PhoneOutlined,
  MailOutlined,
  EnvironmentOutlined,
  StarOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { maintenanceApi } from '../api'
import type { MaintenanceVendor } from '@/types/maintenance'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'

export const MaintenanceVendorsPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [form] = Form.useForm()

  const { data: vendors = [], isLoading } = useQuery({
    queryKey: ['maintenance-vendors'],
    queryFn: () => maintenanceApi.getVendors(),
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => maintenanceApi.createVendor(data),
    onSuccess: () => {
      message.success('Vendor profile added successfully')
      queryClient.invalidateQueries({ queryKey: ['maintenance-vendors'] })
      setIsModalOpen(false)
      form.resetFields()
    },
    onError: () => {
      message.error('Failed to add vendor')
    },
  })

  const handleCreateSubmit = (values: any) => {
    createMutation.mutate({
      name: values.name,
      serviceType: values.serviceType,
      contactPerson: values.contactPerson,
      phone: values.phone,
      email: values.email,
      address: values.address,
      rating: values.rating || 5,
    })
  }

  const columns: ColumnsType<MaintenanceVendor> = [
    {
      title: 'Vendor / Workshop Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record) => (
        <div>
          <div style={{ fontWeight: 600 }}>{name}</div>
          <div style={{ fontSize: 12, color: '#8c8c8c' }}>
            <EnvironmentOutlined /> {record.address}
          </div>
        </div>
      ),
    },
    {
      title: 'Specialty / Services',
      dataIndex: 'serviceType',
      key: 'serviceType',
      render: (type: string) => <Tag color="blue">{type}</Tag>,
    },
    {
      title: 'Contact Person',
      dataIndex: 'contactPerson',
      key: 'contactPerson',
      render: (person: string) => <span style={{ fontWeight: 500 }}>{person}</span>,
    },
    {
      title: 'Phone & Email',
      key: 'contact',
      render: (_, record) => (
        <div style={{ fontSize: 12 }}>
          <div><PhoneOutlined /> {record.phone}</div>
          <div><MailOutlined /> {record.email}</div>
        </div>
      ),
    },
    {
      title: 'Service Rating',
      dataIndex: 'rating',
      key: 'rating',
      render: (r: number) => <Rate disabled defaultValue={r} style={{ fontSize: 13 }} />,
    },
  ]

  return (
    <PageContainer>
      <PageHeader
        title="Maintenance Vendors & Repair Shops"
        subtitle="Manage approved external repair shops, tire specialists, EV service centers, and certified inspection vendors."
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsModalOpen(true)}
          >
            Add Vendor
          </Button>
        }
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <Statistic
              title="Contracted Service Providers"
              value={vendors.length}
              prefix={<ShopOutlined />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <Statistic
              title="Average Vendor Rating"
              value={4.8}
              precision={1}
              prefix={<StarOutlined />}
              valueStyle={{ color: '#faad14' }}
              suffix="/ 5.0"
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <Statistic
              title="Priority Network Availability"
              value={100}
              suffix="%"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      <Card bordered={false} bodyStyle={{ padding: 0 }}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={vendors}
          loading={isLoading}
          pagination={false}
        />
      </Card>

      {/* Add Vendor Modal */}
      <Modal
        title="Add Approved Service Vendor"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending}
        okText="Save Vendor"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateSubmit}
          initialValues={{ rating: 5 }}
        >
          <Form.Item
            name="name"
            label="Vendor / Workshop Name"
            rules={[{ required: true, message: 'Please enter vendor name' }]}
          >
            <Input placeholder="E.g., Bay Area Precision Motors" />
          </Form.Item>

          <Form.Item
            name="serviceType"
            label="Service Specialties"
            rules={[{ required: true, message: 'Please specify services' }]}
          >
            <Input placeholder="E.g., Full Mechanical, Engine Diagnostics, Tires" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="contactPerson"
                label="Contact Representative"
                rules={[{ required: true }]}
              >
                <Input placeholder="E.g., Ramesh Adhikari" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="phone"
                label="Direct Phone"
                rules={[{ required: true }]}
              >
                <Input placeholder="+977-9800000000" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="email"
                label="Email"
                rules={[{ required: true, type: 'email' }]}
              >
                <Input placeholder="workshop@himalayanauto.com" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="rating" label="Initial Quality Rating">
                <Rate />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="address"
            label="Facility Address"
            rules={[{ required: true }]}
          >
            <Input placeholder="125 Industrial Way, Suite B, San Francisco, CA" />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  )
}

export default MaintenanceVendorsPage
