import React, { useState } from 'react'
import { Space, Button, Modal, Form, Input, App, Tag, Popconfirm, Tooltip, Flex } from 'antd'
import { PlusOutlined, EditOutlined, EnvironmentOutlined, DeleteOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/navigation/PageHeader'
import { PageContainer } from '@/components/navigation/PageContainer'
import { DataTable } from '@/components/data-display/DataTable'
import { vehiclesApi } from '../api'
import type { VehicleLocation } from '@/types/vehicle'
import type { ColumnsType } from 'antd/es/table'

export const VehicleLocationsPage: React.FC = () => {
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingLoc, setEditingLoc] = useState<VehicleLocation | null>(null)
  const [form] = Form.useForm()

  const { data: locations = [], isLoading, refetch } = useQuery({
    queryKey: ['vehicle-locations'],
    queryFn: vehiclesApi.getLocations,
  })

  const saveMutation = useMutation({
    mutationFn: vehiclesApi.saveLocation,
    onSuccess: () => {
      message.success('Location saved successfully.')
      queryClient.invalidateQueries({ queryKey: ['vehicle-locations'] })
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      setModalOpen(false)
      form.resetFields()
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.error?.message || err?.message || 'Failed to save location.')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: vehiclesApi.deleteLocation,
    onSuccess: () => {
      message.success('Station location deleted successfully.')
      queryClient.invalidateQueries({ queryKey: ['vehicle-locations'] })
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      if (modalOpen) {
        setModalOpen(false)
      }
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.error?.message || err?.message || 'Failed to delete location.')
    },
  })

  const handleOpen = (loc?: VehicleLocation) => {
    if (loc) {
      setEditingLoc(loc)
      form.setFieldsValue(loc)
    } else {
      setEditingLoc(null)
      form.resetFields()
    }
    setModalOpen(true)
  }

  const columns: ColumnsType<VehicleLocation> = [
    {
      title: 'Location Name',
      dataIndex: 'name',
      key: 'name',
      render: (t) => (
        <Space>
          <EnvironmentOutlined style={{ color: '#1677ff' }} />
          <strong>{t}</strong>
        </Space>
      ),
    },
    {
      title: 'Station Code',
      dataIndex: 'code',
      key: 'code',
      render: (c) => <Tag color="geekblue">{c}</Tag>,
    },
    {
      title: 'City',
      dataIndex: 'city',
      key: 'city',
    },
    {
      title: 'Address',
      dataIndex: 'address',
      key: 'address',
    },
    {
      title: 'Contact Phone',
      dataIndex: 'contactPhone',
      key: 'phone',
    },
    {
      title: 'Vehicles Assigned',
      dataIndex: 'activeVehiclesCount',
      key: 'count',
      render: (c) => {
        const count = Number(c || 0)
        return (
          <Tag color={count > 0 ? 'blue' : 'default'}>
            {count} {count === 1 ? 'Vehicle' : 'Vehicles'}
          </Tag>
        )
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record) => {
        const vehicleCount = Number(record.activeVehiclesCount || 0)
        return (
          <Space size="small">
            <Tooltip title="Edit Location Details">
              <Button
                type="text"
                icon={<EditOutlined style={{ color: '#1677ff' }} />}
                onClick={() => handleOpen(record)}
              />
            </Tooltip>

            <Popconfirm
              title="Delete Station Location"
              description={
                <div style={{ maxWidth: 280 }}>
                  <div>Are you sure you want to delete <strong>{record.name}</strong>?</div>
                  {vehicleCount > 0 && (
                    <div style={{ color: '#faad14', marginTop: 6, fontSize: 12 }}>
                      ⚠️ <strong>{vehicleCount}</strong> vehicle(s) currently stationed here. Deleting this station may affect fleet assignment.
                    </div>
                  )}
                </div>
              }
              onConfirm={() => deleteMutation.mutate(record.id)}
              okText="Delete"
              cancelText="Cancel"
              okType="danger"
              disabled={deleteMutation.isPending}
            >
              <Tooltip title="Delete Location">
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  loading={deleteMutation.isPending && deleteMutation.variables === record.id}
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        )
      },
    },
  ]

  return (
    <PageContainer>
      <PageHeader
        title="Locations"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => handleOpen()}
          >
            Add Location
          </Button>
        }
      />

      <DataTable
        columns={columns}
        dataSource={locations}
        loading={isLoading}
        onRetry={() => refetch()}
      />

      <Modal
        open={modalOpen}
        title={editingLoc ? 'Edit Location' : 'Add New Location'}
        onCancel={() => setModalOpen(false)}
        footer={
          <Flex justify={editingLoc ? 'space-between' : 'flex-end'} align="center">
            {editingLoc && (
              <Popconfirm
                title="Delete Station Location"
                description={`Are you sure you want to delete "${editingLoc.name}"?`}
                onConfirm={() => deleteMutation.mutate(editingLoc.id)}
                okText="Delete"
                cancelText="Cancel"
                okType="danger"
                disabled={deleteMutation.isPending}
              >
                <Button
                  danger
                  type="text"
                  icon={<DeleteOutlined />}
                  loading={deleteMutation.isPending}
                >
                  Delete Location
                </Button>
              </Popconfirm>
            )}
            <Space>
              <Button onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button
                type="primary"
                onClick={() => form.submit()}
                loading={saveMutation.isPending}
              >
                {editingLoc ? 'Save Changes' : 'Create Location'}
              </Button>
            </Space>
          </Flex>
        }
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) =>
            saveMutation.mutate({ ...values, id: editingLoc?.id })
          }
        >
          <Form.Item label="Station Name" name="name" rules={[{ required: true, message: 'Please enter station name' }]}>
            <Input placeholder="e.g. Airport Terminal 2" />
          </Form.Item>
          <Form.Item label="Code" name="code" rules={[{ required: true, message: 'Please enter station code' }]}>
            <Input placeholder="e.g. SFO-T2" />
          </Form.Item>
          <Form.Item label="City" name="city" rules={[{ required: true, message: 'Please enter city' }]}>
            <Input placeholder="e.g. San Francisco" />
          </Form.Item>
          <Form.Item label="Physical Address" name="address" rules={[{ required: true, message: 'Please enter address' }]}>
            <Input placeholder="Street address..." />
          </Form.Item>
          <Form.Item label="Contact Phone" name="contactPhone" rules={[{ required: true, message: 'Please enter phone number' }]}>
            <Input placeholder="+977-..." />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  )
}
