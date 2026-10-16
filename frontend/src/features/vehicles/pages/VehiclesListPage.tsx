import React, { useState, useMemo } from 'react'
import {
  Space,
  Button,
  Select,
  Tag,
  Avatar,
  Modal,
  message,
  Segmented,
  Row,
  Col,
} from 'antd'
import {
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  AppstoreOutlined,
  BarsOutlined,
  CarOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/navigation/PageHeader'
import { PageContainer } from '@/components/navigation/PageContainer'
import { DataTable } from '@/components/data-display/DataTable'
import { DataTableToolbar } from '@/components/data-display/DataTableToolbar'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { CurrencyDisplay } from '@/components/data-display/CurrencyDisplay'
import { VehicleCard } from '@/components/data-display/VehicleCard'
import { VehicleDetailsDrawer } from './VehicleDetailsDrawer'
import { vehiclesApi } from '../api'
import type { Vehicle, VehicleType, VehicleStatus } from '@/types/vehicle'
import type { ColumnOption } from '@/components/data-display/ColumnSettings'
import type { ColumnsType } from 'antd/es/table'
import { formatDate } from '@/lib/formatting/date'

export const VehiclesListPage: React.FC = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)

  // Fetch categories & vehicle types from /vehicles/categories
  const { data: categories = [] } = useQuery({
    queryKey: ['vehicle-categories'],
    queryFn: vehiclesApi.getCategories,
  })

  const { data: vehicleTypes = [] } = useQuery({
    queryKey: ['vehicle-types'],
    queryFn: vehiclesApi.getVehicleTypes,
  })

  // Fetch vehicles with filters
  const { data: vehicles = [], isLoading, error, refetch } = useQuery({
    queryKey: ['vehicles', { search, type: typeFilter, categoryId: categoryFilter, status: statusFilter }],
    queryFn: () =>
      vehiclesApi.getVehicles({
        search,
        type: typeFilter as VehicleType | 'all',
        categoryId: categoryFilter,
        status: statusFilter as VehicleStatus | 'all',
      }),
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: vehiclesApi.deleteVehicle,
    onSuccess: () => {
      message.success('Vehicle successfully removed.')
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      queryClient.invalidateQueries({ queryKey: ['vehicle-categories'] })
    },
    onError: () => {
      message.error('Failed to remove vehicle.')
    },
  })

  const handleDelete = (vehicle: Vehicle) => {
    Modal.confirm({
      title: 'Remove Vehicle?',
      content: `Are you sure you want to remove ${vehicle.make} ${vehicle.model} (${vehicle.plateNumber})? This action cannot be undone.`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => deleteMutation.mutate(vehicle.id),
    })
  }

  // Column settings
  const [columnsState, setColumnsState] = useState<ColumnOption[]>([
    { key: 'vehicle', title: 'Vehicle', visible: true },
    { key: 'plate', title: 'Plate Number', visible: true },
    { key: 'category', title: 'Category', visible: true },
    { key: 'type', title: 'Type', visible: true },
    { key: 'location', title: 'Location', visible: true },
    { key: 'status', title: 'Status', visible: true },
    { key: 'dailyPrice', title: 'Daily Rate', visible: true },
    { key: 'nextService', title: 'Next Service', visible: true },
    { key: 'actions', title: 'Actions', visible: true },
  ])

  // Table columns definition
  const tableColumns = useMemo<ColumnsType<Vehicle>>(() => {
    const cols: ColumnsType<Vehicle> = [
      {
        title: 'Vehicle',
        key: 'vehicle',
        render: (_, record) => (
          <Space
            style={{ cursor: 'pointer' }}
            onClick={() => navigate(`/vehicles/${record.id}`)}
          >
            <Avatar
              shape="square"
              size={48}
              src={record.primaryImage}
              icon={<CarOutlined />}
            />
            <div>
              <div style={{ fontWeight: 600, color: '#1677ff' }}>
                {record.make} {record.model}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>
                {record.year} • {record.specs?.engineCapacity ? `${record.specs.engineCapacity}cc • ` : ''}{record.categoryName || record.specs?.transmission}
              </div>
            </div>
          </Space>
        ),
      },
      {
        title: 'Plate Number',
        dataIndex: 'plateNumber',
        key: 'plate',
        render: (plate, record) => (
          <Tag
            style={{ fontWeight: 600, cursor: 'pointer' }}
            onClick={() => navigate(`/vehicles/${record.id}`)}
          >
            {plate}
          </Tag>
        ),
      },
      {
        title: 'Category',
        dataIndex: 'categoryName',
        key: 'category',
        render: (name, record) => {
          const categoryName = name || categories.find((c) => c.id === record.categoryId)?.name || 'Standard'
          return (
            <Tag
              color="geekblue"
              style={{ cursor: 'pointer' }}
              onClick={() => navigate('/vehicles/categories')}
            >
              {categoryName}
            </Tag>
          )
        },
      },
      {
        title: 'Type',
        dataIndex: 'type',
        key: 'type',
        render: (type) => <Tag color="blue">{type.toUpperCase()}</Tag>,
      },
      {
        title: 'Location',
        dataIndex: 'locationName',
        key: 'location',
        render: (loc) => loc || 'Main Station',
      },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        render: (status) => <StatusBadge status={status} />,
      },
      {
        title: 'Daily Rate',
        dataIndex: ['pricing', 'dailyRate'],
        key: 'dailyPrice',
        sorter: (a, b) => a.pricing.dailyRate - b.pricing.dailyRate,
        render: (rate) => <CurrencyDisplay amount={rate} strong />,
      },
      {
        title: 'Next Service',
        dataIndex: 'nextServiceDueDate',
        key: 'nextService',
        render: (date) => (date ? formatDate(date) : '-'),
      },
      {
        title: 'Actions',
        key: 'actions',
        render: (_, record) => (
          <Space size="small">
            <Button
              type="text"
              icon={<EyeOutlined />}
              title="View Vehicle Details"
              onClick={() => navigate(`/vehicles/${record.id}`)}
            />
            <Button
              type="text"
              icon={<EditOutlined />}
              title="Edit Vehicle"
              onClick={() => navigate(`/vehicles/edit/${record.id}`)}
            />
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              title="Delete Vehicle"
              onClick={() => handleDelete(record)}
            />
          </Space>
        ),
      },
    ]

    return cols.filter((col) => {
      const match = columnsState.find((c) => c.key === col.key)
      return match ? match.visible : true
    })
  }, [columnsState, categories])

  const handleExportCSV = () => {
    const headers = ['ID,Plate,Make,Model,Year,Type,Category,DailyRate,Status,Location\n']
    const rows = vehicles.map(
      (v) =>
        `"${v.id}","${v.plateNumber}","${v.make}","${v.model}","${v.year}","${v.type}","${v.categoryName || ''}","${v.pricing.dailyRate}","${v.status}","${v.locationName || ''}"\n`
    )
    const blob = new Blob([...headers, ...rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `vehicles_export_${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    message.success('Exported vehicles CSV')
  }

  // Dynamic manageable subtitle summarizing vehicles count and types
  const subtitle = useMemo(() => {
    if (vehicles.length === 0) {
      return 'Total 0 vehicles registered. Add vehicles or manage categories below.'
    }
    const counts: Record<string, number> = {}
    vehicles.forEach((v) => {
      const typeLabel =
        v.type === 'car'
          ? 'Cars'
          : v.type === 'bike'
          ? 'Bikes'
          : v.type === 'scooter'
          ? 'Scooters'
          : v.type || 'Vehicles'
      counts[typeLabel] = (counts[typeLabel] || 0) + 1
    })
    const breakdown = Object.entries(counts)
      .map(([label, count]) => `${count} ${label}`)
      .join(', ')
    return `Total ${vehicles.length} ${vehicles.length === 1 ? 'vehicle' : 'vehicles'} managed across ${breakdown}`
  }, [vehicles])

  return (
    <PageContainer>
      <PageHeader
        title="Vehicles"
        extra={
          <Space>
            <Segmented
              options={[
                { value: 'table', icon: <BarsOutlined /> },
                { value: 'grid', icon: <AppstoreOutlined /> },
              ]}
              value={viewMode}
              onChange={(val) => setViewMode(val as 'table' | 'grid')}
            />
            <Button
              icon={<AppstoreOutlined />}
              onClick={() => navigate('/vehicles/categories')}
            >
              Categories
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/vehicles/new')}
            >
              Add Vehicle
            </Button>
          </Space>
        }
      />

      <DataTableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search plate, make, model..."
        onRefresh={() => refetch()}
        onExport={handleExportCSV}
        columns={columnsState}
        onColumnChange={setColumnsState}
        filterContent={
          <Space wrap>
            <Select
              value={typeFilter}
              onChange={setTypeFilter}
              style={{ width: 150 }}
              options={[
                { label: 'All Types', value: 'all' },
                ...vehicleTypes.map((t) => ({
                  label: `${t.icon || ''} ${t.name}`,
                  value: t.key,
                })),
              ]}
            />
            <Select
              value={categoryFilter}
              onChange={setCategoryFilter}
              style={{ width: 180 }}
              placeholder="All Categories"
              options={[
                { label: 'All Categories', value: 'all' },
                ...categories.map((c) => ({
                  label: `${c.name} (${c.type.toUpperCase()})`,
                  value: c.id,
                })),
              ]}
            />
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 140 }}
              options={[
                { label: 'All Statuses', value: 'all' },
                { label: 'Available', value: 'available' },
                { label: 'Rented', value: 'rented' },
                { label: 'Maintenance', value: 'maintenance' },
                { label: 'Reserved', value: 'reserved' },
              ]}
            />
          </Space>
        }
      />

      {viewMode === 'table' ? (
        <DataTable
          columns={tableColumns}
          dataSource={vehicles}
          loading={isLoading}
          error={error ? 'Failed to retrieve vehicles.' : null}
          onRetry={() => refetch()}
        />
      ) : (
        <Row gutter={[16, 16]}>
          {vehicles.map((v) => (
            <Col xs={24} sm={12} md={8} lg={6} key={v.id}>
              <VehicleCard
                vehicle={v}
                onView={(item) => navigate(`/vehicles/${item.id}`)}
                onBook={() => navigate(`/operations/bookings/new?vehicleId=${v.id}`)}
              />
            </Col>
          ))}
        </Row>
      )}

      {/* Details Drawer */}
      <VehicleDetailsDrawer
        vehicle={selectedVehicle}
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        onEdit={(v) => navigate(`/vehicles/edit/${v.id}`)}
      />
    </PageContainer>
  )
}
