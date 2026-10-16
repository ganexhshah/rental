import React, { useState } from 'react'
import {
  Space,
  Button,
  Tag,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Typography,
  message,
  Tabs,
  Badge,
  Tooltip,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  AppstoreOutlined,
  CarOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/navigation/PageHeader'
import { PageContainer } from '@/components/navigation/PageContainer'
import { DataTable } from '@/components/data-display/DataTable'
import { CurrencyDisplay } from '@/components/data-display/CurrencyDisplay'
import { vehiclesApi } from '../api'
import type { VehicleCategory, VehicleTypeDefinition } from '@/types/vehicle'
import type { ColumnsType } from 'antd/es/table'

const { Text } = Typography

export const VehicleCategoriesPage: React.FC = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'categories' | 'types'>('categories')

  // Category Modal State
  const [categoryModalOpen, setCategoryModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<VehicleCategory | null>(null)
  const [categoryForm] = Form.useForm()

  // Vehicle Type Modal State
  const [typeModalOpen, setTypeModalOpen] = useState(false)
  const [editingType, setEditingType] = useState<VehicleTypeDefinition | null>(null)
  const [typeForm] = Form.useForm()

  // Queries
  const { data: categories = [], isLoading: categoriesLoading, error: categoriesError, refetch: refetchCategories } = useQuery({
    queryKey: ['vehicle-categories'],
    queryFn: vehiclesApi.getCategories,
  })

  const { data: vehicleTypes = [], isLoading: typesLoading, error: typesError, refetch: refetchTypes } = useQuery({
    queryKey: ['vehicle-types'],
    queryFn: vehiclesApi.getVehicleTypes,
  })

  // Category Mutations
  const saveCategoryMutation = useMutation({
    mutationFn: vehiclesApi.saveCategory,
    onSuccess: () => {
      message.success('Category saved successfully.')
      queryClient.invalidateQueries({ queryKey: ['vehicle-categories'] })
      queryClient.invalidateQueries({ queryKey: ['vehicle-types'] })
      setCategoryModalOpen(false)
      categoryForm.resetFields()
    },
    onError: () => message.error('Failed to save category.'),
  })

  const deleteCategoryMutation = useMutation({
    mutationFn: vehiclesApi.deleteCategory,
    onSuccess: () => {
      message.success('Category removed.')
      queryClient.invalidateQueries({ queryKey: ['vehicle-categories'] })
      queryClient.invalidateQueries({ queryKey: ['vehicle-types'] })
    },
    onError: () => message.error('Failed to remove category.'),
  })

  // Vehicle Type Mutations
  const saveTypeMutation = useMutation({
    mutationFn: vehiclesApi.saveVehicleType,
    onSuccess: () => {
      message.success('Vehicle type saved successfully.')
      queryClient.invalidateQueries({ queryKey: ['vehicle-types'] })
      queryClient.invalidateQueries({ queryKey: ['vehicle-categories'] })
      setTypeModalOpen(false)
      typeForm.resetFields()
    },
    onError: () => message.error('Failed to save vehicle type.'),
  })

  const deleteTypeMutation = useMutation({
    mutationFn: vehiclesApi.deleteVehicleType,
    onSuccess: () => {
      message.success('Vehicle type removed.')
      queryClient.invalidateQueries({ queryKey: ['vehicle-types'] })
      queryClient.invalidateQueries({ queryKey: ['vehicle-categories'] })
    },
    onError: () => message.error('Failed to remove vehicle type.'),
  })

  // Handlers for Category
  const handleOpenCategoryModal = (category?: VehicleCategory) => {
    if (category) {
      setEditingCategory(category)
      categoryForm.setFieldsValue({
        name: category.name,
        type: category.type,
        baseDailyRate:
          category.baseDailyRate !== undefined && category.baseDailyRate !== null && category.baseDailyRate > 0
            ? category.baseDailyRate
            : undefined,
        description: category.description,
      })
    } else {
      setEditingCategory(null)
      categoryForm.resetFields()
      categoryForm.setFieldsValue({
        type: vehicleTypes[0]?.key || 'car',
      })
    }
    setCategoryModalOpen(true)
  }

  const handleDeleteCategory = (category: VehicleCategory) => {
    Modal.confirm({
      title: 'Delete Category',
      content: `Are you sure you want to delete ${category.name}?`,
      okText: 'Delete',
      okType: 'danger',
      onOk: () => deleteCategoryMutation.mutate(category.id),
    })
  }

  // Handlers for Vehicle Type
  const handleOpenTypeModal = (typeDef?: VehicleTypeDefinition) => {
    if (typeDef) {
      setEditingType(typeDef)
      typeForm.setFieldsValue({
        name: typeDef.name,
        key: typeDef.key,
        icon: typeDef.icon || '🚗',
        description: typeDef.description,
      })
    } else {
      setEditingType(null)
      typeForm.resetFields()
      typeForm.setFieldsValue({
        icon: '🚗',
      })
    }
    setTypeModalOpen(true)
  }

  const handleDeleteType = (typeDef: VehicleTypeDefinition) => {
    Modal.confirm({
      title: 'Delete Vehicle Type',
      content: `Are you sure you want to delete "${typeDef.name}"? Categories or vehicles assigned to this type may need to be updated.`,
      okText: 'Delete',
      okType: 'danger',
      onOk: () => deleteTypeMutation.mutate(typeDef.id),
    })
  }

  // Category Columns
  const categoryColumns: ColumnsType<VehicleCategory> = [
    {
      title: 'Category Name',
      dataIndex: 'name',
      key: 'name',
      render: (name, record) => (
        <div>
          <strong style={{ fontSize: 14 }}>{name}</strong>
          {record.description && (
            <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>
              {record.description}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Vehicle Type',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => {
        const matched = vehicleTypes.find((t) => (t.key || '').toLowerCase() === (type || '').toLowerCase())
        const label = matched?.name || type?.toUpperCase()
        return (
          <Tag color="blue" style={{ fontSize: 12, padding: '2px 8px' }}>
            {label}
          </Tag>
        )
      },
    },
    {
      title: 'Base Daily Rate',
      dataIndex: 'baseDailyRate',
      key: 'rate',
      render: (rate) =>
        rate !== undefined && rate !== null && Number(rate) > 0 ? (
          <CurrencyDisplay amount={rate} strong />
        ) : (
          <Text type="secondary" style={{ fontStyle: 'italic', fontSize: 13 }}>
            Vehicle Specific
          </Text>
        ),
    },
    {
      title: 'Assigned Vehicles',
      dataIndex: 'count',
      key: 'count',
      render: (c) => (
        <Badge
          count={c || 0}
          showZero
          style={{ backgroundColor: (c || 0) > 0 ? '#10b981' : '#d1d5db', color: '#fff' }}
        />
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleOpenCategoryModal(record)}
          />
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteCategory(record)}
          />
        </Space>
      ),
    },
  ]

  // Vehicle Type Columns (Simplified & fully manageable)
  const typeColumns: ColumnsType<VehicleTypeDefinition> = [
    {
      title: 'Icon',
      dataIndex: 'icon',
      key: 'icon',
      width: 80,
      render: (icon) => <span style={{ fontSize: 22 }}>{icon || '🚗'}</span>,
    },
    {
      title: 'Type Name',
      dataIndex: 'name',
      key: 'name',
      render: (name, record) => (
        <div>
          <strong style={{ fontSize: 14 }}>{name}</strong>
          {record.description && (
            <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>
              {record.description}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Linked Categories',
      dataIndex: 'categoriesCount',
      key: 'categoriesCount',
      render: (count) => (
        <Badge
          count={count || 0}
          showZero
          style={{ backgroundColor: '#3b82f6', color: '#fff' }}
        />
      ),
    },
    {
      title: 'Active Vehicles',
      dataIndex: 'vehiclesCount',
      key: 'vehiclesCount',
      render: (count) => (
        <Badge
          count={count || 0}
          showZero
          style={{ backgroundColor: (count || 0) > 0 ? '#10b981' : '#d1d5db', color: '#fff' }}
        />
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleOpenTypeModal(record)}
          />
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteType(record)}
          />
        </Space>
      ),
    },
  ]

  return (
    <PageContainer>
      <PageHeader
        title="Categories & Types"
        extra={
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/vehicles/all')}>
              Back
            </Button>
            {activeTab === 'categories' ? (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => handleOpenCategoryModal()}
              >
                Add Category
              </Button>
            ) : (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => handleOpenTypeModal()}
              >
                Add Type
              </Button>
            )}
          </Space>
        }
      />

      <Tabs
        activeKey={activeTab}
        onChange={(k) => setActiveTab(k as 'categories' | 'types')}
        items={[
          {
            key: 'categories',
            label: (
              <span>
                <AppstoreOutlined style={{ marginRight: 6 }} />
                Categories ({categories.length})
              </span>
            ),
            children: (
              <DataTable
                columns={categoryColumns}
                dataSource={categories}
                loading={categoriesLoading}
                error={categoriesError ? 'Failed to load categories' : null}
                onRetry={() => refetchCategories()}
              />
            ),
          },
          {
            key: 'types',
            label: (
              <span>
                <CarOutlined style={{ marginRight: 6 }} />
                Vehicle Types ({vehicleTypes.length})
              </span>
            ),
            children: (
              <DataTable
                columns={typeColumns}
                dataSource={vehicleTypes}
                loading={typesLoading}
                error={typesError ? 'Failed to load vehicle types' : null}
                onRetry={() => refetchTypes()}
              />
            ),
          },
        ]}
      />

      {/* MODAL 1: Add/Edit Category */}
      <Modal
        open={categoryModalOpen}
        title={editingCategory ? 'Edit Category' : 'Add Vehicle Category'}
        onCancel={() => setCategoryModalOpen(false)}
        onOk={() => categoryForm.submit()}
        confirmLoading={saveCategoryMutation.isPending}
      >
        <Form
          form={categoryForm}
          layout="vertical"
          onFinish={(values) =>
            saveCategoryMutation.mutate({ ...values, id: editingCategory?.id })
          }
        >
          <Form.Item
            label="Category Name"
            name="name"
            rules={[{ required: true, message: 'Please enter category name' }]}
          >
            <Input placeholder="e.g. Electric SUV, City Compact, Adventure Tourer" />
          </Form.Item>

          <Form.Item
            label="Vehicle Type"
            name="type"
            rules={[{ required: true, message: 'Please select vehicle type' }]}
            extra={
              <div style={{ marginTop: 4 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Need a new vehicle type?{' '}
                </Text>
                <Button
                  type="link"
                  size="small"
                  style={{ padding: 0 }}
                  onClick={() => {
                    setCategoryModalOpen(false)
                    setActiveTab('types')
                    handleOpenTypeModal()
                  }}
                >
                  Manage / Create Vehicle Types
                </Button>
              </div>
            }
          >
            <Select
              placeholder="Select vehicle type"
              options={vehicleTypes.map((t) => ({
                label: `${t.icon || '🚗'} ${t.name} (${t.key})`,
                value: t.key,
              }))}
            />
          </Form.Item>

          <Form.Item
            label={
              <Space>
                <span>Base Daily Rate (Rs.)</span>
                <Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>
                  (Optional)
                </Text>
              </Space>
            }
            name="baseDailyRate"
            rules={[{ required: false }]}
            extra="Leave blank if rates are set individually per vehicle."
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              step={100}
              prefix="Rs."
              placeholder="e.g. 4500 (optional)"
            />
          </Form.Item>

          <Form.Item label="Description" name="description">
            <Input.TextArea rows={2} placeholder="Optional category details or notes" />
          </Form.Item>
        </Form>
      </Modal>

      {/* MODAL 2: Add/Edit Vehicle Type */}
      <Modal
        open={typeModalOpen}
        title={editingType ? 'Edit Vehicle Type' : 'Add New Vehicle Type'}
        onCancel={() => setTypeModalOpen(false)}
        onOk={() => typeForm.submit()}
        confirmLoading={saveTypeMutation.isPending}
      >
        <Form
          form={typeForm}
          layout="vertical"
          onFinish={(values) => {
            const key =
              editingType?.key ||
              (values.name || '')
                .toLowerCase()
                .trim()
                .replace(/[^a-z0-9]/g, '-')
                .replace(/-+/g, '-')
            saveTypeMutation.mutate({ ...values, key, id: editingType?.id })
          }}
        >
          <Form.Item
            label="Type Name"
            name="name"
            rules={[{ required: true, message: 'Please enter vehicle type name' }]}
          >
            <Input placeholder="e.g. Van, Tour Bus, Electric Scooter, Auto Rickshaw" />
          </Form.Item>

          <Form.Item
            label="Icon / Emoji"
            name="icon"
            rules={[{ required: true, message: 'Please select or enter an emoji' }]}
          >
            <Select
              placeholder="Select an icon emoji"
              options={[
                { label: '🚗 Car / Sedan', value: '🚗' },
                { label: '🚙 SUV / 4x4', value: '🚙' },
                { label: '🏍️ Motorcycle / Bike', value: '🏍️' },
                { label: '🛵 Scooter', value: '🛵' },
                { label: '🚐 Van / Microbus', value: '🚐' },
                { label: '🚌 Bus / Coach', value: '🚌' },
                { label: '🛺 Auto Rickshaw / Tuk-Tuk', value: '🛺' },
                { label: '🚲 Bicycle', value: '🚲' },
                { label: '⚡ Electric Vehicle (EV)', value: '⚡' },
                { label: '🚚 Mini Truck / Pickup', value: '🚚' },
                { label: '🏎️ Sports / Exotic', value: '🏎️' },
                { label: '🚜 Quad / ATV', value: '🚜' },
              ]}
            />
          </Form.Item>

          <Form.Item label="Description" name="description">
            <Input.TextArea
              rows={2}
              placeholder="Description of this vehicle classification"
            />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  )
}
