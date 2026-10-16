import React, { useState, useMemo } from 'react'
import {
  Card,
  Row,
  Col,
  Space,
  Button,
  Tag,
  Badge,
  Typography,
  Tabs,
  Descriptions,
  Table,
  Image,
  Modal,
  Drawer,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Segmented,
  Empty,
  Spin,
  message,
  Popconfirm,
  Tooltip,
  Divider,
  Switch,
  Flex,
} from 'antd'
import {
  CarOutlined,
  ArrowLeftOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  FileTextOutlined,
  SafetyCertificateOutlined,
  ToolOutlined,
  DollarOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DownloadOutlined,
  FilePdfOutlined,
  AppstoreOutlined,
  BarsOutlined,
  DashboardOutlined,
  UserOutlined,
  SettingOutlined,
  PictureOutlined,
  WarningOutlined,
  StarFilled,
  StarOutlined,
  ThunderboltOutlined,
  UploadOutlined,
} from '@ant-design/icons'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { PageHeader } from '@/components/navigation/PageHeader'
import { PageContainer } from '@/components/navigation/PageContainer'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { CurrencyDisplay } from '@/components/data-display/CurrencyDisplay'
import { FileUploader } from '@/components/forms/FileUploader'
import { MediaLibraryModal } from '@/components/forms/MediaLibraryModal'
import { formatDate } from '@/lib/formatting/date'
import { vehiclesApi } from '../api'
import { bookingsApi } from '@/features/bookings/api'
import { maintenanceApi } from '@/features/maintenance/api'
import type {
  Vehicle,
  VehicleDocument,
  VehicleDocType,
  VehicleStatus,
  DamageRecord,
  VehicleCategory,
  VehicleLocation,
} from '@/types/vehicle'

const { Text, Title } = Typography

const DOC_TYPE_META: Record<string, { label: string; color: string }> = {
  bluebook: { label: 'Bluebook (Registration)', color: 'blue' },
  registration: { label: 'Vehicle Registration', color: 'blue' },
  insurance: { label: 'Insurance Policy', color: 'green' },
  fitness: { label: 'Fitness & Roadworthiness', color: 'cyan' },
  pollution: { label: 'Pollution / Emission Test', color: 'orange' },
  permit: { label: 'Route Permit', color: 'purple' },
  road_tax: { label: 'Road Tax Token', color: 'gold' },
  ownership_lease: { label: 'Ownership / Lease', color: 'magenta' },
  inspection_certificate: { label: 'Inspection Certificate', color: 'geekblue' },
  other: { label: 'Fleet Document', color: 'default' },
}

export const VehicleViewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Tabs & Views
  const [activeTab, setActiveTab] = useState('overview')
  const [docViewMode, setDocViewMode] = useState<'cards' | 'table'>('cards')

  // Modals & Drawers States
  const [isEditVehicleDrawerOpen, setIsEditVehicleDrawerOpen] = useState(false)
  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false)
  const [isAddDocModalOpen, setIsAddDocModalOpen] = useState(false)
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false)
  const [isAddMaintenanceModalOpen, setIsAddMaintenanceModalOpen] = useState(false)
  const [isAddDamageModalOpen, setIsAddDamageModalOpen] = useState(false)
  const [isEditPricingModalOpen, setIsEditPricingModalOpen] = useState(false)
  const [isUpdateOdometerModalOpen, setIsUpdateOdometerModalOpen] = useState(false)

  const [selectedStatus, setSelectedStatus] = useState<VehicleStatus>('available')
  const [newOdometerValue, setNewOdometerValue] = useState<number>(0)

  // Forms
  const [docForm] = Form.useForm()
  const [editVehicleForm] = Form.useForm()
  const [maintenanceForm] = Form.useForm()
  const [damageForm] = Form.useForm()
  const [pricingForm] = Form.useForm()

  const [newDocFiles, setNewDocFiles] = useState<any[]>([])
  const [newDamageFiles, setNewDamageFiles] = useState<any[]>([])

  // 1. Fetch Vehicle Details
  const {
    data: vehicle,
    isLoading: vehicleLoading,
    error: vehicleError,
  } = useQuery({
    queryKey: ['vehicle', id],
    queryFn: () => (id ? vehiclesApi.getVehicleById(id) : null),
    enabled: Boolean(id),
  })

  // 2. Fetch Vehicle Documents
  const {
    data: serverDocs = [],
    isLoading: docsLoading,
  } = useQuery({
    queryKey: ['vehicle-documents', id],
    queryFn: () => (id ? vehiclesApi.getVehicleDocuments(id) : []),
    enabled: Boolean(id),
  })

  // 3. Fetch Bookings History
  const { data: allBookings = [] } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => bookingsApi.getBookings(),
  })

  // 4. Fetch Maintenance Records
  const { data: allMaintenance = [] } = useQuery({
    queryKey: ['maintenance-tasks'],
    queryFn: () => maintenanceApi.getTasks(),
  })

  // 5. Fetch Categories & Locations for Quick Edit
  const { data: categories = [] } = useQuery<VehicleCategory[]>({
    queryKey: ['vehicle-categories'],
    queryFn: () => vehiclesApi.getCategories(),
  })

  const { data: locations = [] } = useQuery<VehicleLocation[]>({
    queryKey: ['vehicle-locations'],
    queryFn: () => vehiclesApi.getLocations(),
  })

  // Merge & Deduplicate documents
  const mergedDocs: VehicleDocument[] = useMemo(() => {
    if (!vehicle) return []
    const map = new Map<string, VehicleDocument>()
    const all = [...(vehicle.documents || []), ...serverDocs]
    all.forEach((d) => {
      if (d && d.id) {
        map.set(d.id, d)
      }
    })
    return Array.from(map.values())
  }, [vehicle?.documents, serverDocs])

  // Filter bookings related to this vehicle
  const vehicleBookings = useMemo(() => {
    if (!id && !vehicle?.plateNumber) return []
    return allBookings.filter(
      (b) =>
        b.vehicleId === id ||
        (vehicle?.plateNumber && b.vehiclePlate?.toLowerCase() === vehicle.plateNumber.toLowerCase())
    )
  }, [allBookings, id, vehicle?.plateNumber])

  // Filter maintenance related to this vehicle
  const vehicleMaintenance = useMemo(() => {
    if (!id && !vehicle?.plateNumber) return []
    return allMaintenance.filter(
      (m) =>
        m.vehicleId === id ||
        (vehicle?.plateNumber && m.vehiclePlate?.toLowerCase() === vehicle.plateNumber.toLowerCase())
    )
  }, [allMaintenance, id, vehicle?.plateNumber])

  // All unique vehicle photos
  const allPhotos = useMemo(() => {
    if (!vehicle) return []
    const list = [vehicle.primaryImage, ...(vehicle.images || [])].filter(
      (img) => img && typeof img === 'string' && img.trim().length > 0
    ) as string[]
    return Array.from(new Set(list))
  }, [vehicle?.primaryImage, vehicle?.images])

  // Damages
  const vehicleDamages = useMemo<DamageRecord[]>(() => {
    if (!vehicle) return []
    return vehicle.damages || []
  }, [vehicle])

  // Document counts
  const validDocs = mergedDocs.filter((d) => d.status === 'valid').length
  const expiringDocs = mergedDocs.filter((d) => d.status === 'expiring_soon').length
  const expiredDocs = mergedDocs.filter((d) => d.status === 'expired').length

  // Quick edit vehicle initialization
  const handleOpenEditVehicle = () => {
    if (!vehicle) return
    editVehicleForm.setFieldsValue({
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      plateNumber: vehicle.plateNumber,
      type: vehicle.type,
      categoryId: vehicle.categoryId,
      locationId: vehicle.locationId,
      status: vehicle.status,
      // Pricing
      dailyRate: vehicle.pricing?.dailyRate,
      weeklyRate: vehicle.pricing?.weeklyRate,
      monthlyRate: vehicle.pricing?.monthlyRate,
      depositAmount: vehicle.pricing?.depositAmount,
      allowedKmPerDay: vehicle.pricing?.allowedKmPerDay || 200,
      extraKmRate: vehicle.pricing?.extraKmRate || 20,
      // Specs
      mileageOdometer: vehicle.specs?.mileageOdometer || 0,
      transmission: vehicle.specs?.transmission || 'manual',
      fuelType: vehicle.specs?.fuelType || 'petrol',
      seatingCapacity: vehicle.specs?.seatingCapacity || 5,
      engineCapacity: vehicle.specs?.engineCapacity,
      color: vehicle.specs?.color || 'Standard',
      vinOrChassisNumber: vehicle.specs?.vinOrChassisNumber,
      hasAC: vehicle.specs?.hasAC ?? true,
      hasGPS: vehicle.specs?.hasGPS ?? false,
      hasBluetooth: vehicle.specs?.hasBluetooth ?? true,
      helmetIncluded: vehicle.specs?.helmetIncluded ?? false,
      notes: vehicle.notes,
    })
    setIsEditVehicleDrawerOpen(true)
  }

  // Quick update vehicle mutation
  const updateVehicleMutation = useMutation({
    mutationFn: (values: any) => {
      const payload: Partial<Vehicle> = {
        make: values.make,
        model: values.model,
        year: Number(values.year),
        plateNumber: values.plateNumber,
        type: values.type,
        categoryId: values.categoryId,
        locationId: values.locationId,
        status: values.status,
        pricing: {
          dailyRate: Number(values.dailyRate) || 0,
          weeklyRate: Number(values.weeklyRate) || 0,
          monthlyRate: Number(values.monthlyRate) || 0,
          depositAmount: Number(values.depositAmount) || 0,
          allowedKmPerDay: Number(values.allowedKmPerDay) || 200,
          extraKmRate: Number(values.extraKmRate) || 20,
        },
        specs: {
          ...vehicle?.specs,
          mileageOdometer: Number(values.mileageOdometer) || 0,
          transmission: values.transmission,
          fuelType: values.fuelType,
          seatingCapacity: Number(values.seatingCapacity) || 5,
          engineCapacity: values.engineCapacity,
          color: values.color,
          vinOrChassisNumber: values.vinOrChassisNumber,
          hasAC: Boolean(values.hasAC),
          hasGPS: Boolean(values.hasGPS),
          hasBluetooth: Boolean(values.hasBluetooth),
          helmetIncluded: Boolean(values.helmetIncluded),
        },
        notes: values.notes,
      }
      return vehiclesApi.updateVehicle(id!, payload)
    },
    onSuccess: () => {
      message.success('Vehicle details updated successfully')
      queryClient.invalidateQueries({ queryKey: ['vehicle', id] })
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      setIsEditVehicleDrawerOpen(false)
    },
    onError: () => {
      message.error('Failed to update vehicle')
    },
  })

  // Status Change Mutation
  const statusMutation = useMutation({
    mutationFn: (newStatus: VehicleStatus) =>
      vehiclesApi.updateVehicle(id!, { status: newStatus }),
    onSuccess: (updated) => {
      message.success(`Vehicle status updated to ${updated.status}`)
      queryClient.invalidateQueries({ queryKey: ['vehicle', id] })
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      setIsStatusModalOpen(false)
    },
    onError: () => {
      message.error('Failed to update vehicle status')
    },
  })

  // Delete Vehicle Mutation
  const deleteMutation = useMutation({
    mutationFn: () => vehiclesApi.deleteVehicle(id!),
    onSuccess: () => {
      message.success('Vehicle successfully removed from fleet')
      navigate('/vehicles/all')
    },
    onError: () => {
      message.error('Failed to remove vehicle')
    },
  })

  // Add Document Mutation
  const addDocMutation = useMutation({
    mutationFn: async (values: any) => {
      const fileUrls = newDocFiles.map((f) => f.url || f.response?.url).filter(Boolean)
      const primaryUrl = fileUrls[0] || ''
      return vehiclesApi.createDocument({
        vehicleId: id!,
        vehiclePlate: vehicle?.plateNumber,
        vehicleName: `${vehicle?.make || ''} ${vehicle?.model || ''}`.trim(),
        name: values.name,
        docType: values.docType,
        documentNumber: values.documentNumber,
        issuingAuthority: values.issuingAuthority,
        issueDate: values.issueDate ? values.issueDate.format('YYYY-MM-DD') : undefined,
        expiryDate: values.expiryDate ? values.expiryDate.format('YYYY-MM-DD') : undefined,
        notes: values.notes,
        fileUrl: primaryUrl,
        fileUrls: fileUrls,
      })
    },
    onSuccess: () => {
      message.success('Official fleet document attached successfully')
      queryClient.invalidateQueries({ queryKey: ['vehicle', id] })
      queryClient.invalidateQueries({ queryKey: ['vehicle-documents', id] })
      setIsAddDocModalOpen(false)
      docForm.resetFields()
      setNewDocFiles([])
    },
    onError: () => {
      message.error('Failed to attach document')
    },
  })

  // Add Maintenance Record Mutation
  const addMaintenanceMutation = useMutation({
    mutationFn: async (values: any) => {
      return maintenanceApi.createTask({
        tenantId: vehicle?.tenantId || '78248f8f-e390-4f85-a03f-58e4974fa366',
        vehicleId: id!,
        vehiclePlate: vehicle?.plateNumber || '',
        vehicleModel: `${vehicle?.make || ''} ${vehicle?.model || ''}`.trim() || 'Vehicle',
        title: values.title,
        serviceType: values.serviceType,
        priority: values.priority || 'medium',
        status: 'scheduled',
        odometerReading: Number(values.odometerReading) || vehicle?.specs?.mileageOdometer || 0,
        estimatedCost: Number(values.estimatedCost) || 0,
        scheduledDate: values.scheduledDate ? values.scheduledDate.format('YYYY-MM-DD') : new Date().toISOString(),
        vendorName: values.vendorName || '',
        description: values.description || '',
      })
    },
    onSuccess: () => {
      message.success('Maintenance work order logged successfully')
      queryClient.invalidateQueries({ queryKey: ['maintenance-tasks'] })
      queryClient.invalidateQueries({ queryKey: ['vehicle', id] })
      setIsAddMaintenanceModalOpen(false)
      maintenanceForm.resetFields()
    },
    onError: () => {
      message.error('Failed to log maintenance work order')
    },
  })

  // Add Damage Incident Mutation
  const addDamageMutation = useMutation({
    mutationFn: async (values: any) => {
      const photos = newDamageFiles.map((f) => f.url || f.response?.url).filter(Boolean)
      const newDamage: DamageRecord = {
        id: `dmg-${Date.now()}`,
        vehicleId: id!,
        date: values.date ? values.date.format('YYYY-MM-DD') : new Date().toISOString().split('T')[0],
        description: `${values.area ? `[${values.area}] ` : ''}${values.description}`,
        severity: values.severity || 'minor',
        photos: photos,
        estimatedCost: Number(values.estimatedCost) || 0,
        status: values.status || 'reported',
      }
      const currentDamages = vehicle?.damages || []
      const updatedDamages = [newDamage, ...currentDamages]
      return vehiclesApi.updateVehicle(id!, { damages: updatedDamages })
    },
    onSuccess: () => {
      message.success('Damage incident logged successfully')
      queryClient.invalidateQueries({ queryKey: ['vehicle', id] })
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      setIsAddDamageModalOpen(false)
      damageForm.resetFields()
      setNewDamageFiles([])
    },
    onError: () => {
      message.error('Failed to log damage incident')
    },
  })

  // Quick Pricing Update Mutation
  const updatePricingMutation = useMutation({
    mutationFn: async (values: any) => {
      const updatedPricing = {
        dailyRate: Number(values.dailyRate) || 0,
        weeklyRate: Number(values.weeklyRate) || 0,
        monthlyRate: Number(values.monthlyRate) || 0,
        depositAmount: Number(values.depositAmount) || 0,
        allowedKmPerDay: Number(values.allowedKmPerDay) || 200,
        extraKmRate: Number(values.extraKmRate) || 20,
      }
      return vehiclesApi.updateVehicle(id!, { pricing: updatedPricing })
    },
    onSuccess: () => {
      message.success('Rates and pricing updated successfully')
      queryClient.invalidateQueries({ queryKey: ['vehicle', id] })
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      setIsEditPricingModalOpen(false)
    },
    onError: () => {
      message.error('Failed to update pricing')
    },
  })

  // Quick Odometer Update Mutation
  const updateOdometerMutation = useMutation({
    mutationFn: async (newKm: number) => {
      const updatedSpecs = {
        ...vehicle?.specs,
        mileageOdometer: newKm,
      }
      return vehiclesApi.updateVehicle(id!, { specs: updatedSpecs, odometer: newKm } as any)
    },
    onSuccess: () => {
      message.success('Odometer reading updated successfully')
      queryClient.invalidateQueries({ queryKey: ['vehicle', id] })
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      setIsUpdateOdometerModalOpen(false)
    },
    onError: () => {
      message.error('Failed to update odometer')
    },
  })

  // Update photos from MediaLibraryModal
  const handleSelectMediaPhotos = async (selectedUrls: string[]) => {
    if (!vehicle || selectedUrls.length === 0) return
    const existing = vehicle.images || []
    const combined = Array.from(new Set([...selectedUrls, ...existing]))
    const newPrimary = vehicle.primaryImage || combined[0] || selectedUrls[0]

    try {
      await vehiclesApi.updateVehicle(id!, {
        images: combined,
        primaryImage: newPrimary,
      })
      message.success(`Attached ${selectedUrls.length} photo${selectedUrls.length > 1 ? 's' : ''} to vehicle gallery`)
      queryClient.invalidateQueries({ queryKey: ['vehicle', id] })
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      setIsMediaLibraryOpen(false)
    } catch {
      message.error('Failed to update vehicle photos')
    }
  }

  // Set primary photo
  const handleSetPrimaryPhoto = async (photoUrl: string) => {
    try {
      await vehiclesApi.updateVehicle(id!, { primaryImage: photoUrl })
      message.success('Set as primary cover photo')
      queryClient.invalidateQueries({ queryKey: ['vehicle', id] })
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
    } catch {
      message.error('Failed to set primary cover photo')
    }
  }

  // Remove photo from gallery
  const handleRemovePhoto = async (photoUrl: string) => {
    if (!vehicle) return
    const remaining = (vehicle.images || []).filter((u) => u !== photoUrl)
    const nextPrimary = vehicle.primaryImage === photoUrl ? (remaining[0] || '') : vehicle.primaryImage

    try {
      await vehiclesApi.updateVehicle(id!, {
        images: remaining,
        primaryImage: nextPrimary,
      })
      message.info('Photo removed from vehicle gallery')
      queryClient.invalidateQueries({ queryKey: ['vehicle', id] })
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
    } catch {
      message.error('Failed to remove photo')
    }
  }

  const isImageFile = (url?: string) => {
    if (!url) return false
    return !url.toLowerCase().endsWith('.pdf')
  }

  if (vehicleLoading) {
    return (
      <PageContainer>
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
          <Spin size="large" tip="Loading vehicle details..." />
        </div>
      </PageContainer>
    )
  }

  if (vehicleError || !vehicle) {
    return (
      <PageContainer>
        <div style={{ padding: '60px 0', textAlign: 'center' }}>
          <Empty
            description="Vehicle not found or may have been deleted"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button
              type="primary"
              size="large"
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/vehicles/all')}
            >
              Back to All Vehicles
            </Button>
          </Empty>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      {/* 1. Header with Vehicle Title, Tags & Direct Action Buttons */}
      <PageHeader
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 24, fontWeight: 700 }}>
              {vehicle.make} {vehicle.model}
            </span>
            <Tag
              color="black"
              style={{ fontSize: 14, padding: '3px 10px', fontWeight: 700, borderRadius: 6 }}
            >
              {vehicle.plateNumber}
            </Tag>
            <Tag color="blue" style={{ fontSize: 13, padding: '2px 8px', borderRadius: 4 }}>
              {vehicle.year}
            </Tag>
            <StatusBadge status={vehicle.status} />
          </div>
        }
        subtitle={`${vehicle.type.toUpperCase()} • ${vehicle.categoryName || 'Standard'} • Location: ${
          vehicle.locationName || 'Main Station'
        }`}
        extra={
          <Space wrap size="middle">
            <Button size="large" icon={<ArrowLeftOutlined />} onClick={() => navigate('/vehicles/all')}>
              Back
            </Button>

            <Button
              size="large"
              icon={<EditOutlined />}
              onClick={handleOpenEditVehicle}
            >
              Edit Vehicle
            </Button>

            <Button
              size="large"
              icon={<PictureOutlined />}
              onClick={() => setIsMediaLibraryOpen(true)}
            >
              + Photos
            </Button>

            <Button
              size="large"
              icon={<FileTextOutlined />}
              onClick={() => setIsAddDocModalOpen(true)}
            >
              + Attach Document
            </Button>

            <Button
              size="large"
              icon={<ToolOutlined />}
              onClick={() => {
                maintenanceForm.setFieldsValue({
                  title: 'Scheduled Vehicle Maintenance',
                  serviceType: 'regular_service',
                  priority: 'medium',
                  odometerReading: vehicle.specs?.mileageOdometer || 0,
                  scheduledDate: dayjs(),
                })
                setIsAddMaintenanceModalOpen(true)
              }}
            >
              + Log Service
            </Button>

            <Button
              type="primary"
              size="large"
              icon={<CarOutlined />}
              style={{ fontWeight: 600 }}
              onClick={() => navigate(`/operations/bookings/new?vehicleId=${vehicle.id}`)}
            >
              Book This Vehicle
            </Button>
          </Space>
        }
      />

      {/* 2. Top Metric Overview Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {/* Daily Rental Rate */}
        <Col xs={24} sm={12} md={6}>
          <Card
            bordered={false}
            style={{
              borderRadius: 12,
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
            }}
            styles={{ body: { padding: '16px 20px' } }}
            extra={
              <Button
                size="small"
                type="link"
                style={{ padding: 0 }}
                onClick={() => {
                  pricingForm.setFieldsValue({
                    dailyRate: vehicle.pricing?.dailyRate,
                    weeklyRate: vehicle.pricing?.weeklyRate,
                    monthlyRate: vehicle.pricing?.monthlyRate,
                    depositAmount: vehicle.pricing?.depositAmount,
                    allowedKmPerDay: vehicle.pricing?.allowedKmPerDay || 200,
                    extraKmRate: vehicle.pricing?.extraKmRate || 20,
                  })
                  setIsEditPricingModalOpen(true)
                }}
              >
                Edit
              </Button>
            }
          >
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>
              Daily Rental Rate
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#1677ff' }}>
              <CurrencyDisplay amount={vehicle.pricing.dailyRate} />
              <span style={{ fontSize: 13, fontWeight: 400, color: '#64748b' }}> / day</span>
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
              Deposit: <CurrencyDisplay amount={vehicle.pricing.depositAmount} strong />
            </div>
          </Card>
        </Col>

        {/* Current Odometer */}
        <Col xs={24} sm={12} md={6}>
          <Card
            bordered={false}
            style={{
              borderRadius: 12,
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
            }}
            styles={{ body: { padding: '16px 20px' } }}
            extra={
              <Button
                size="small"
                type="link"
                style={{ padding: 0 }}
                onClick={() => {
                  setNewOdometerValue(vehicle.specs?.mileageOdometer || 0)
                  setIsUpdateOdometerModalOpen(true)
                }}
              >
                Update
              </Button>
            }
          >
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>
              Current Odometer
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#0f172a' }}>
              {vehicle.specs.mileageOdometer ? vehicle.specs.mileageOdometer.toLocaleString() : 0}{' '}
              <span style={{ fontSize: 14, fontWeight: 400, color: '#64748b' }}>km</span>
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
              Allowed: {vehicle.pricing.allowedKmPerDay || 200} km / day
            </div>
          </Card>
        </Col>

        {/* Powertrain & Specs */}
        <Col xs={24} sm={12} md={6}>
          <Card
            bordered={false}
            style={{
              borderRadius: 12,
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
            }}
            styles={{ body: { padding: '16px 20px' } }}
          >
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>
              Powertrain & Specs
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', textTransform: 'capitalize' }}>
              {vehicle.specs.transmission} • {vehicle.specs.fuelType}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
              {vehicle.specs.engineCapacity ? `${vehicle.specs.engineCapacity}cc Engine` : `${vehicle.specs.seatingCapacity || 5} Seats`}
            </div>
          </Card>
        </Col>

        {/* Compliance Documents */}
        <Col xs={24} sm={12} md={6}>
          <Card
            bordered={false}
            style={{
              borderRadius: 12,
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
            }}
            styles={{ body: { padding: '16px 20px' } }}
            extra={
              <Button
                size="small"
                type="link"
                style={{ padding: 0 }}
                onClick={() => setIsAddDocModalOpen(true)}
              >
                + Add
              </Button>
            }
          >
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>
              Compliance Documents
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 22, fontWeight: 700, color: expiredDocs > 0 ? '#ef4444' : '#10b981' }}>
                {validDocs}/{mergedDocs.length}
              </span>
              <Tag color={expiredDocs > 0 ? 'error' : expiringDocs > 0 ? 'warning' : 'success'}>
                {expiredDocs > 0 ? 'Expired' : expiringDocs > 0 ? 'Expiring Soon' : 'Compliant'}
              </Tag>
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
              {mergedDocs.length} Verified Files Attached
            </div>
          </Card>
        </Col>
      </Row>

      {/* 3. Main Workspace & Sidebar Grid */}
      <Row gutter={[20, 20]}>
        {/* Left / Main Workspace */}
        <Col xs={24} lg={16} xl={17}>
          <Card
            style={{
              borderRadius: 12,
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
            styles={{ body: { padding: '20px 24px' } }}
          >
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              size="large"
              items={[
                // 1. Overview & Photos Tab
                {
                  key: 'overview',
                  label: (
                    <span>
                      <DashboardOutlined style={{ marginRight: 6 }} />
                      Overview & Photos
                    </span>
                  ),
                  children: (
                    <div>
                      {/* Photo Gallery with Direct Media Selection */}
                      <div style={{ marginBottom: 20 }}>
                        <Flex justify="space-between" align="center" style={{ marginBottom: 12 }}>
                          <Space>
                            <PictureOutlined style={{ color: '#1677ff', fontSize: 16 }} />
                            <strong style={{ fontSize: 15 }}>Vehicle Photos ({allPhotos.length})</strong>
                          </Space>
                          <Space>
                            <Button
                              type="primary"
                              ghost
                              size="small"
                              icon={<PictureOutlined />}
                              onClick={() => setIsMediaLibraryOpen(true)}
                            >
                              Add Photos from Fleet Gallery
                            </Button>
                          </Space>
                        </Flex>

                        {allPhotos.length > 0 ? (
                          <Image.PreviewGroup>
                            <div style={{ position: 'relative', marginBottom: 12 }}>
                              <Image
                                src={allPhotos[0]}
                                alt={`${vehicle.make} ${vehicle.model}`}
                                style={{
                                  width: '100%',
                                  maxHeight: 360,
                                  objectFit: 'cover',
                                  borderRadius: 10,
                                  border: '1px solid #e2e8f0',
                                }}
                              />
                              <Tag
                                color="gold"
                                icon={<StarFilled />}
                                style={{
                                  position: 'absolute',
                                  top: 12,
                                  left: 12,
                                  padding: '4px 10px',
                                  fontSize: 12,
                                  fontWeight: 600,
                                  borderRadius: 6,
                                }}
                              >
                                Primary Fleet Cover Photo
                              </Tag>
                            </div>

                            {allPhotos.length > 1 && (
                              <div>
                                <div
                                  style={{
                                    fontWeight: 600,
                                    fontSize: 13,
                                    marginBottom: 10,
                                    color: '#475569',
                                  }}
                                >
                                  Vehicle Gallery ({allPhotos.length} Images)
                                </div>
                                <Row gutter={[10, 10]}>
                                  {allPhotos.map((img, idx) => {
                                    const isPrimary = img === vehicle.primaryImage || (idx === 0 && !vehicle.primaryImage)
                                    return (
                                      <Col xs={12} sm={8} md={6} key={`${img}-${idx}`}>
                                        <div
                                          style={{
                                            border: isPrimary ? '2px solid #1677ff' : '1px solid #cbd5e1',
                                            borderRadius: 8,
                                            overflow: 'hidden',
                                            backgroundColor: '#ffffff',
                                            position: 'relative',
                                          }}
                                        >
                                          <Image
                                            src={img}
                                            alt={`Photo ${idx + 1}`}
                                            style={{
                                              width: '100%',
                                              height: 95,
                                              objectFit: 'cover',
                                            }}
                                          />
                                          {isPrimary && (
                                            <Tag
                                              color="gold"
                                              style={{
                                                position: 'absolute',
                                                top: 4,
                                                left: 4,
                                                margin: 0,
                                                fontSize: 10,
                                                lineHeight: '18px',
                                                padding: '0 4px',
                                              }}
                                            >
                                              ★ Cover
                                            </Tag>
                                          )}
                                          <Flex
                                            justify="space-between"
                                            align="center"
                                            style={{
                                              padding: '3px 6px',
                                              backgroundColor: '#f8fafc',
                                              borderTop: '1px solid #e2e8f0',
                                            }}
                                          >
                                            {!isPrimary ? (
                                              <Tooltip title="Set as primary cover">
                                                <Button
                                                  type="text"
                                                  size="small"
                                                  icon={<StarOutlined />}
                                                  onClick={() => handleSetPrimaryPhoto(img)}
                                                />
                                              </Tooltip>
                                            ) : (
                                              <StarFilled style={{ color: '#faad14', fontSize: 13, marginLeft: 4 }} />
                                            )}
                                            <Tooltip title="Remove from vehicle">
                                              <Button
                                                type="text"
                                                danger
                                                size="small"
                                                icon={<DeleteOutlined />}
                                                onClick={() => handleRemovePhoto(img)}
                                              />
                                            </Tooltip>
                                          </Flex>
                                        </div>
                                      </Col>
                                    )
                                  })}
                                </Row>
                              </div>
                            )}
                          </Image.PreviewGroup>
                        ) : (
                          <div
                            style={{
                              padding: '40px 16px',
                              backgroundColor: '#f8fafc',
                              borderRadius: 10,
                              border: '1px dashed #cbd5e1',
                              textAlign: 'center',
                            }}
                          >
                            <CarOutlined style={{ fontSize: 44, color: '#94a3b8', marginBottom: 8 }} />
                            <div style={{ fontSize: 15, fontWeight: 600, color: '#334155', marginBottom: 12 }}>
                              No vehicle photos uploaded yet
                            </div>
                            <Button
                              type="primary"
                              icon={<PictureOutlined />}
                              onClick={() => setIsMediaLibraryOpen(true)}
                            >
                              Browse Fleet Media Library
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Primary Specs Description Table */}
                      <Flex justify="space-between" align="center" style={{ marginBottom: 12 }}>
                        <Title level={5} style={{ margin: 0 }}>
                          Vehicle Information
                        </Title>
                        <Button size="small" icon={<EditOutlined />} onClick={handleOpenEditVehicle}>
                          Edit Info
                        </Button>
                      </Flex>
                      <Descriptions bordered column={{ xs: 1, sm: 2 }} size="middle">
                        <Descriptions.Item label="Registration Plate">
                          <strong style={{ fontSize: 14 }}>{vehicle.plateNumber}</strong>
                        </Descriptions.Item>
                        <Descriptions.Item label="Vehicle Type">
                          <Tag color="blue">{vehicle.type.toUpperCase()}</Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="Make & Model">
                          {vehicle.make} {vehicle.model}
                        </Descriptions.Item>
                        <Descriptions.Item label="Manufacturing Year">{vehicle.year}</Descriptions.Item>
                        <Descriptions.Item label="Category">
                          {vehicle.categoryName || 'Standard'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Parking Location">
                          {vehicle.locationName || 'Main Station'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Color">
                          {vehicle.specs.color || 'Standard'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Seating Capacity">
                          {vehicle.specs.seatingCapacity || 5} Persons
                        </Descriptions.Item>
                        <Descriptions.Item label="VIN / Chassis">
                          {vehicle.specs.vinOrChassisNumber || '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Transmission">
                          {vehicle.specs.transmission}
                        </Descriptions.Item>
                      </Descriptions>

                      {/* Features / Equipment Badges */}
                      <div style={{ marginTop: 20 }}>
                        <Title level={5} style={{ marginBottom: 10 }}>
                          Equipment & Features
                        </Title>
                        <Space wrap size={[8, 8]}>
                          <Tag color={vehicle.specs.hasAC ? 'green' : 'default'} style={{ padding: '4px 10px', fontSize: 13 }}>
                            {vehicle.specs.hasAC ? '✓ Air Conditioning' : '✕ No A/C'}
                          </Tag>
                          <Tag color={vehicle.specs.hasGPS ? 'green' : 'default'} style={{ padding: '4px 10px', fontSize: 13 }}>
                            {vehicle.specs.hasGPS ? '✓ GPS Telematics Tracker' : '✕ No GPS'}
                          </Tag>
                          <Tag color={vehicle.specs.hasBluetooth ? 'green' : 'default'} style={{ padding: '4px 10px', fontSize: 13 }}>
                            {vehicle.specs.hasBluetooth ? '✓ Bluetooth / Audio' : '✕ No Bluetooth'}
                          </Tag>
                          {vehicle.specs.helmetIncluded && (
                            <Tag color="green" style={{ padding: '4px 10px', fontSize: 13 }}>
                              ✓ Helmet Included
                            </Tag>
                          )}
                          {Array.isArray(vehicle.specs?.features) &&
                            vehicle.specs.features.map((feat) => (
                              <Tag key={feat} color="blue" style={{ padding: '4px 10px', fontSize: 13 }}>
                                ✓ {feat}
                              </Tag>
                            ))}
                        </Space>
                      </div>

                      {vehicle.notes && (
                        <div style={{ marginTop: 20 }}>
                          <Title level={5} style={{ marginBottom: 8 }}>
                            Internal Fleet Notes
                          </Title>
                          <div
                            style={{
                              padding: '12px 16px',
                              backgroundColor: '#f8fafc',
                              borderRadius: 8,
                              color: '#334155',
                              fontSize: 13,
                              border: '1px solid #e2e8f0',
                            }}
                          >
                            {vehicle.notes}
                          </div>
                        </div>
                      )}
                    </div>
                  ),
                },

                // 2. Compliance Documents Tab
                {
                  key: 'documents',
                  label: (
                    <span>
                      <FileTextOutlined style={{ marginRight: 6 }} />
                      Compliance Documents ({mergedDocs.length})
                    </span>
                  ),
                  children: docsLoading ? (
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
                      <Spin tip="Loading verified fleet documents..." />
                    </div>
                  ) : mergedDocs.length === 0 ? (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="No official documents (Bluebook, Insurance, Route Permit) attached yet"
                      style={{ padding: '30px 0' }}
                    >
                      <Button
                        type="primary"
                        size="large"
                        icon={<PlusOutlined />}
                        onClick={() => setIsAddDocModalOpen(true)}
                      >
                        Attach Official Documents
                      </Button>
                    </Empty>
                  ) : (
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 16,
                          flexWrap: 'wrap',
                          gap: 12,
                        }}
                      >
                        <Text type="secondary" style={{ fontSize: 13 }}>
                          Showing {mergedDocs.length} official document{mergedDocs.length > 1 ? 's' : ''} for{' '}
                          <strong>{vehicle.plateNumber}</strong>
                        </Text>
                        <Space wrap>
                          <Segmented
                            size="middle"
                            options={[
                              { value: 'cards', icon: <AppstoreOutlined />, label: 'Visual Cards' },
                              { value: 'table', icon: <BarsOutlined />, label: 'Table' },
                            ]}
                            value={docViewMode}
                            onChange={(val) => setDocViewMode(val as 'cards' | 'table')}
                          />
                          <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => setIsAddDocModalOpen(true)}
                          >
                            Add Document
                          </Button>
                        </Space>
                      </div>

                      {docViewMode === 'cards' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                          {mergedDocs.map((doc, docIdx) => {
                            const meta = DOC_TYPE_META[doc.docType || doc.type] || {
                              label: doc.name || 'Document',
                              color: 'blue',
                            }
                            const pageUrls =
                              doc.fileUrls && doc.fileUrls.length > 0
                                ? doc.fileUrls
                                : doc.fileUrl
                                ? [doc.fileUrl]
                                : []

                            return (
                              <Card
                                key={doc.id || docIdx}
                                size="small"
                                style={{
                                  borderRadius: 10,
                                  border: '1px solid #e2e8f0',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                                }}
                                styles={{ body: { padding: '16px' } }}
                              >
                                <div
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'flex-start',
                                    marginBottom: 12,
                                    flexWrap: 'wrap',
                                    gap: 8,
                                  }}
                                >
                                  <div>
                                    <Space size={8} wrap align="center">
                                      <Tag color={meta.color} style={{ fontSize: 12, padding: '2px 8px' }}>
                                        {meta.label}
                                      </Tag>
                                      <strong style={{ fontSize: 15, color: '#1e293b' }}>{doc.name}</strong>
                                    </Space>
                                    {doc.documentNumber && (
                                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                                        Document / Policy No: <strong>{doc.documentNumber}</strong>
                                        {doc.issuingAuthority && ` • Authority: ${doc.issuingAuthority}`}
                                      </div>
                                    )}
                                  </div>

                                  <Space size={6}>
                                    <Tag
                                      color={
                                        doc.status === 'valid'
                                          ? 'success'
                                          : doc.status === 'expiring_soon'
                                          ? 'warning'
                                          : 'error'
                                      }
                                    >
                                      {(doc.status || 'valid').replace('_', ' ').toUpperCase()}
                                    </Tag>
                                    {doc.verificationStatus && (
                                      <Tag
                                        color={
                                          doc.verificationStatus === 'verified'
                                            ? 'green'
                                            : doc.verificationStatus === 'rejected'
                                            ? 'red'
                                            : 'orange'
                                        }
                                      >
                                        {doc.verificationStatus.toUpperCase()}
                                      </Tag>
                                    )}
                                  </Space>
                                </div>

                                <Row
                                  gutter={[16, 8]}
                                  style={{
                                    marginBottom: 14,
                                    backgroundColor: '#f8fafc',
                                    padding: '10px 12px',
                                    borderRadius: 6,
                                  }}
                                >
                                  <Col xs={12} sm={12}>
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                      Issue Date:
                                    </Text>
                                    <div style={{ fontSize: 13, fontWeight: 500 }}>
                                      {doc.issueDate ? formatDate(doc.issueDate) : 'Not specified'}
                                    </div>
                                  </Col>
                                  <Col xs={12} sm={12}>
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                      Expiry Date:
                                    </Text>
                                    <div
                                      style={{
                                        fontSize: 13,
                                        fontWeight: 500,
                                        color: doc.expiryDate ? '#0f172a' : '#64748b',
                                      }}
                                    >
                                      {doc.expiryDate ? formatDate(doc.expiryDate) : 'Perpetual / No Expiry'}
                                    </div>
                                  </Col>
                                </Row>

                                {/* Scanned Document Photos / Pages */}
                                <div>
                                  <div
                                    style={{
                                      fontSize: 12,
                                      fontWeight: 600,
                                      color: '#475569',
                                      marginBottom: 8,
                                    }}
                                  >
                                    Attached Document Scans ({pageUrls.length} Page{pageUrls.length > 1 ? 's' : ''}):
                                  </div>

                                  {pageUrls.length > 0 ? (
                                    <Image.PreviewGroup>
                                      <Row gutter={[10, 10]}>
                                        {pageUrls.map((url, pageIdx) => {
                                          const isImg = isImageFile(url)
                                          const pageLabel =
                                            pageIdx === 0
                                              ? 'Page 1 (Front)'
                                              : pageIdx === 1
                                              ? 'Page 2 (Back)'
                                              : `Page ${pageIdx + 1}`

                                          if (!isImg) {
                                            return (
                                              <Col xs={12} sm={8} md={6} key={`${url}-${pageIdx}`}>
                                                <div
                                                  style={{
                                                    border: '1px solid #cbd5e1',
                                                    borderRadius: 8,
                                                    padding: 12,
                                                    textAlign: 'center',
                                                    backgroundColor: '#ffffff',
                                                    height: 110,
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                  }}
                                                >
                                                  <FilePdfOutlined
                                                    style={{ fontSize: 28, color: '#ef4444', marginBottom: 4 }}
                                                  />
                                                  <div style={{ fontSize: 11, fontWeight: 600, color: '#334155' }}>
                                                    {pageLabel} (PDF)
                                                  </div>
                                                  <Button
                                                    size="small"
                                                    type="link"
                                                    icon={<DownloadOutlined />}
                                                    onClick={() => window.open(url, '_blank')}
                                                    style={{ padding: 0, height: 'auto', marginTop: 2 }}
                                                  >
                                                    Open PDF
                                                  </Button>
                                                </div>
                                              </Col>
                                            )
                                          }

                                          return (
                                            <Col xs={12} sm={8} md={6} key={`${url}-${pageIdx}`}>
                                              <div style={{ position: 'relative' }}>
                                                <Image
                                                  src={url}
                                                  alt={`${doc.name} - ${pageLabel}`}
                                                  style={{
                                                    width: '100%',
                                                    height: 110,
                                                    objectFit: 'cover',
                                                    borderRadius: 8,
                                                    border: '1px solid #cbd5e1',
                                                  }}
                                                />
                                                <Tag
                                                  color="blue"
                                                  style={{
                                                    position: 'absolute',
                                                    bottom: 6,
                                                    left: 6,
                                                    margin: 0,
                                                    fontSize: 10,
                                                    fontWeight: 600,
                                                    borderRadius: 4,
                                                    pointerEvents: 'none',
                                                  }}
                                                >
                                                  {pageLabel}
                                                </Tag>
                                              </div>
                                            </Col>
                                          )
                                        })}
                                      </Row>
                                    </Image.PreviewGroup>
                                  ) : (
                                    <div
                                      style={{
                                        padding: '10px',
                                        backgroundColor: '#f8fafc',
                                        borderRadius: 6,
                                        textAlign: 'center',
                                        color: '#94a3b8',
                                        fontSize: 12,
                                      }}
                                    >
                                      No scanned photo or file attached
                                    </div>
                                  )}
                                </div>
                              </Card>
                            )
                          })}
                        </div>
                      ) : (
                        <Table
                          dataSource={mergedDocs}
                          rowKey="id"
                          pagination={false}
                          size="middle"
                          scroll={{ x: 600 }}
                          columns={[
                            {
                              title: 'Document Title',
                              dataIndex: 'name',
                              key: 'name',
                              render: (t, r) => (
                                <div>
                                  <strong>{t}</strong>
                                  {r.documentNumber && (
                                    <div style={{ fontSize: 11, color: '#64748b' }}>
                                      No: {r.documentNumber}
                                    </div>
                                  )}
                                </div>
                              ),
                            },
                            {
                              title: 'Type',
                              key: 'type',
                              render: (_, r) => {
                                const m = DOC_TYPE_META[r.docType || r.type] || {
                                  label: r.docType || 'DOCUMENT',
                                  color: 'blue',
                                }
                                return <Tag color={m.color}>{m.label}</Tag>
                              },
                            },
                            {
                              title: 'Expiry',
                              dataIndex: 'expiryDate',
                              key: 'exp',
                              render: (d) => (d ? formatDate(d) : 'Perpetual'),
                            },
                            {
                              title: 'Status',
                              dataIndex: 'status',
                              key: 'st',
                              render: (s) => (
                                <Badge
                                  status={
                                    s === 'valid' ? 'success' : s === 'expiring_soon' ? 'warning' : 'error'
                                  }
                                  text={s?.replace('_', ' ').toUpperCase()}
                                />
                              ),
                            },
                            {
                              title: 'Audit',
                              dataIndex: 'verificationStatus',
                              key: 'vst',
                              render: (v) => (
                                <Tag color={v === 'verified' ? 'success' : v === 'rejected' ? 'error' : 'warning'}>
                                  {(v || 'PENDING').toUpperCase()}
                                </Tag>
                              ),
                            },
                          ]}
                        />
                      )}
                    </div>
                  ),
                },

                // 3. Technical Specs Tab
                {
                  key: 'specs',
                  label: (
                    <span>
                      <ToolOutlined style={{ marginRight: 6 }} />
                      Technical Specs
                    </span>
                  ),
                  children: (
                    <div>
                      <Flex justify="space-between" align="center" style={{ marginBottom: 12 }}>
                        <Title level={5} style={{ margin: 0 }}>
                          Powertrain, Engine & Specifications
                        </Title>
                        <Button size="small" icon={<EditOutlined />} onClick={handleOpenEditVehicle}>
                          Edit Specs
                        </Button>
                      </Flex>
                      <Descriptions bordered column={{ xs: 1, sm: 2 }} size="middle">
                        <Descriptions.Item label="Transmission">{vehicle.specs.transmission}</Descriptions.Item>
                        <Descriptions.Item label="Fuel / Powertrain">{vehicle.specs.fuelType}</Descriptions.Item>
                        <Descriptions.Item label="Engine Capacity">
                          {vehicle.specs.engineCapacity
                            ? `${vehicle.specs.engineCapacity} CC`
                            : 'Standard Engine'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Seating Capacity">
                          {vehicle.specs.seatingCapacity} Passengers
                        </Descriptions.Item>
                        <Descriptions.Item label="Current Odometer">
                          <strong>{vehicle.specs.mileageOdometer?.toLocaleString() || 0} km</strong>
                        </Descriptions.Item>
                        <Descriptions.Item label="Exterior Color">{vehicle.specs.color || 'Standard'}</Descriptions.Item>
                        <Descriptions.Item label="Chassis / VIN">
                          {vehicle.specs.vinOrChassisNumber || '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Air Conditioning">
                          {vehicle.specs.hasAC ? 'Installed & Functional' : 'No'}
                        </Descriptions.Item>
                        <Descriptions.Item label="GPS Telematics">
                          {vehicle.specs.hasGPS ? 'Live Tracking Enabled' : 'None'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Bluetooth System">
                          {vehicle.specs.hasBluetooth ? 'Yes' : 'No'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Helmet Included">
                          {vehicle.specs.helmetIncluded ? 'Yes' : 'N/A'}
                        </Descriptions.Item>
                        {Array.isArray(vehicle.specs?.features) && vehicle.specs.features.length > 0 && (
                          <Descriptions.Item label="Additional Amenities & Equipment" span={2}>
                            <Space wrap size={[4, 6]}>
                              {vehicle.specs.features.map((feat) => (
                                <Tag key={feat} color="blue">
                                  ✓ {feat}
                                </Tag>
                              ))}
                            </Space>
                          </Descriptions.Item>
                        )}
                      </Descriptions>
                    </div>
                  ),
                },

                // 4. Rates & Pricing Tab
                {
                  key: 'pricing',
                  label: (
                    <span>
                      <DollarOutlined style={{ marginRight: 6 }} />
                      Rates & Pricing
                    </span>
                  ),
                  children: (
                    <div>
                      <Flex justify="space-between" align="center" style={{ marginBottom: 12 }}>
                        <Title level={5} style={{ margin: 0 }}>
                          Rental Pricing Structure
                        </Title>
                        <Button
                          type="primary"
                          size="small"
                          icon={<EditOutlined />}
                          onClick={() => {
                            pricingForm.setFieldsValue({
                              dailyRate: vehicle.pricing?.dailyRate,
                              weeklyRate: vehicle.pricing?.weeklyRate,
                              monthlyRate: vehicle.pricing?.monthlyRate,
                              depositAmount: vehicle.pricing?.depositAmount,
                              allowedKmPerDay: vehicle.pricing?.allowedKmPerDay || 200,
                              extraKmRate: vehicle.pricing?.extraKmRate || 20,
                            })
                            setIsEditPricingModalOpen(true)
                          }}
                        >
                          Edit Rates & Pricing
                        </Button>
                      </Flex>
                      <Row gutter={[16, 16]}>
                        <Col xs={24} sm={12}>
                          <Card size="small" title="Rental Rates" style={{ borderRadius: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                              <span>Standard Daily Rate:</span>
                              <strong>
                                <CurrencyDisplay amount={vehicle.pricing.dailyRate} />
                              </strong>
                            </div>
                            {vehicle.pricing.weeklyRate ? (
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                                <span>Weekly Rate:</span>
                                <strong>
                                  <CurrencyDisplay amount={vehicle.pricing.weeklyRate} />
                                </strong>
                              </div>
                            ) : null}
                            {vehicle.pricing.monthlyRate ? (
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                                <span>Monthly Rate:</span>
                                <strong>
                                  <CurrencyDisplay amount={vehicle.pricing.monthlyRate} />
                                </strong>
                              </div>
                            ) : null}
                          </Card>
                        </Col>

                        <Col xs={24} sm={12}>
                          <Card size="small" title="Deposit & Mileage Rules" style={{ borderRadius: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                              <span>Security Deposit:</span>
                              <strong>
                                <CurrencyDisplay amount={vehicle.pricing.depositAmount} />
                              </strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                              <span>Included KM / Day:</span>
                              <strong>{vehicle.pricing.allowedKmPerDay || 200} km</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                              <span>Extra KM Rate:</span>
                              <strong>
                                <CurrencyDisplay amount={vehicle.pricing.extraKmRate || 20} /> / km
                              </strong>
                            </div>
                          </Card>
                        </Col>
                      </Row>
                    </div>
                  ),
                },

                // 5. Maintenance & Service Tab
                {
                  key: 'maintenance',
                  label: (
                    <span>
                      <ToolOutlined style={{ marginRight: 6 }} />
                      Maintenance ({vehicleMaintenance.length})
                    </span>
                  ),
                  children: (
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 16,
                          flexWrap: 'wrap',
                          gap: 10,
                        }}
                      >
                        <Text type="secondary">
                          Service history and maintenance work orders for this asset
                        </Text>
                        <Button
                          type="primary"
                          icon={<PlusOutlined />}
                          onClick={() => {
                            maintenanceForm.setFieldsValue({
                              title: `${vehicle.make} ${vehicle.model} Periodic Service`,
                              serviceType: 'regular_service',
                              priority: 'medium',
                              odometerReading: vehicle.specs?.mileageOdometer || 0,
                              scheduledDate: dayjs(),
                            })
                            setIsAddMaintenanceModalOpen(true)
                          }}
                        >
                          Log Service / Work Order
                        </Button>
                      </div>

                      {vehicleMaintenance.length === 0 ? (
                        <Empty
                          description="No maintenance records found for this vehicle"
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                        >
                          <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => {
                              maintenanceForm.setFieldsValue({
                                title: `${vehicle.make} ${vehicle.model} Periodic Service`,
                                serviceType: 'regular_service',
                                priority: 'medium',
                                odometerReading: vehicle.specs?.mileageOdometer || 0,
                                scheduledDate: dayjs(),
                              })
                              setIsAddMaintenanceModalOpen(true)
                            }}
                          >
                            Log First Maintenance
                          </Button>
                        </Empty>
                      ) : (
                        <Table
                          dataSource={vehicleMaintenance}
                          rowKey="id"
                          pagination={{ pageSize: 5 }}
                          size="middle"
                          scroll={{ x: 600 }}
                          columns={[
                            {
                              title: 'Work Order #',
                              dataIndex: 'workOrderNumber',
                              key: 'workOrderNumber',
                              render: (t) => <strong>{t}</strong>,
                            },
                            {
                              title: 'Service Title',
                              dataIndex: 'title',
                              key: 'title',
                            },
                            {
                              title: 'Type',
                              dataIndex: 'serviceType',
                              key: 'serviceType',
                              render: (t) => <Tag color="blue">{t?.toUpperCase()}</Tag>,
                            },
                            {
                              title: 'Status',
                              dataIndex: 'status',
                              key: 'status',
                              render: (s) => (
                                <Badge
                                  status={s === 'completed' ? 'success' : 'processing'}
                                  text={s?.toUpperCase()}
                                />
                              ),
                            },
                            {
                              title: 'Cost',
                              dataIndex: 'actualCost',
                              key: 'actualCost',
                              render: (c, r) => <CurrencyDisplay amount={c || r.estimatedCost || 0} />,
                            },
                            {
                              title: 'Date',
                              dataIndex: 'scheduledDate',
                              key: 'scheduledDate',
                              render: (d) => (d ? formatDate(d) : '-'),
                            },
                          ]}
                        />
                      )}
                    </div>
                  ),
                },

                // 6. Damages & Incidents Tab (NEW)
                {
                  key: 'damages',
                  label: (
                    <span>
                      <WarningOutlined style={{ marginRight: 6 }} />
                      Damages & Incidents ({vehicleDamages.length})
                    </span>
                  ),
                  children: (
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 16,
                          flexWrap: 'wrap',
                          gap: 10,
                        }}
                      >
                        <Text type="secondary">
                          Body condition, scratch logs, and damage incident reports
                        </Text>
                        <Button
                          type="primary"
                          icon={<PlusOutlined />}
                          onClick={() => {
                            damageForm.setFieldsValue({
                              date: dayjs(),
                              severity: 'minor',
                              status: 'reported',
                              area: 'Front Bumper',
                            })
                            setIsAddDamageModalOpen(true)
                          }}
                        >
                          Log Damage Incident
                        </Button>
                      </div>

                      {vehicleDamages.length === 0 ? (
                        <Empty
                          description="No damage or incident records logged for this vehicle"
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                        >
                          <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => {
                              damageForm.setFieldsValue({
                                date: dayjs(),
                                severity: 'minor',
                                status: 'reported',
                                area: 'Front Bumper',
                              })
                              setIsAddDamageModalOpen(true)
                            }}
                          >
                            Log Damage Incident
                          </Button>
                        </Empty>
                      ) : (
                        <Table
                          dataSource={vehicleDamages}
                          rowKey="id"
                          pagination={{ pageSize: 5 }}
                          size="middle"
                          scroll={{ x: 600 }}
                          columns={[
                            {
                              title: 'Date',
                              dataIndex: 'date',
                              key: 'date',
                              render: (d) => (d ? formatDate(d) : '-'),
                            },
                            {
                              title: 'Description',
                              dataIndex: 'description',
                              key: 'description',
                              render: (t) => <strong>{t}</strong>,
                            },
                            {
                              title: 'Severity',
                              dataIndex: 'severity',
                              key: 'severity',
                              render: (s) => (
                                <Tag color={s === 'minor' ? 'blue' : s === 'moderate' ? 'orange' : 'red'}>
                                  {s?.toUpperCase()}
                                </Tag>
                              ),
                            },
                            {
                              title: 'Repair Status',
                              dataIndex: 'status',
                              key: 'status',
                              render: (st) => (
                                <Tag color={st === 'repaired' ? 'green' : st === 'under_repair' ? 'processing' : 'warning'}>
                                  {st?.replace('_', ' ').toUpperCase()}
                                </Tag>
                              ),
                            },
                            {
                              title: 'Estimated Cost',
                              dataIndex: 'estimatedCost',
                              key: 'estimatedCost',
                              render: (c) => <CurrencyDisplay amount={c || 0} />,
                            },
                            {
                              title: 'Photos',
                              dataIndex: 'photos',
                              key: 'photos',
                              render: (photos: string[]) => (
                                Array.isArray(photos) && photos.length > 0 ? (
                                  <Image.PreviewGroup>
                                    <Space size={4}>
                                      {photos.map((p, i) => (
                                        <Image
                                          key={i}
                                          src={p}
                                          width={36}
                                          height={36}
                                          style={{ borderRadius: 4, objectFit: 'cover' }}
                                        />
                                      ))}
                                    </Space>
                                  </Image.PreviewGroup>
                                ) : (
                                  <Text type="secondary">No Photos</Text>
                                )
                              ),
                            },
                          ]}
                        />
                      )}
                    </div>
                  ),
                },

                // 7. Rental History Tab
                {
                  key: 'bookings',
                  label: (
                    <span>
                      <CalendarOutlined style={{ marginRight: 6 }} />
                      Rental History ({vehicleBookings.length})
                    </span>
                  ),
                  children: (
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 16,
                          flexWrap: 'wrap',
                          gap: 10,
                        }}
                      >
                        <Text type="secondary">
                          All past, active, and upcoming rentals for {vehicle.plateNumber}
                        </Text>
                        <Button
                          type="primary"
                          icon={<PlusOutlined />}
                          onClick={() => navigate(`/operations/bookings/new?vehicleId=${vehicle.id}`)}
                        >
                          Create Booking
                        </Button>
                      </div>

                      {vehicleBookings.length === 0 ? (
                        <Empty
                          description="No past or active bookings for this vehicle"
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                        >
                          <Button
                            type="primary"
                            icon={<CarOutlined />}
                            onClick={() => navigate(`/operations/bookings/new?vehicleId=${vehicle.id}`)}
                          >
                            Create First Booking
                          </Button>
                        </Empty>
                      ) : (
                        <Table
                          dataSource={vehicleBookings}
                          rowKey="id"
                          pagination={{ pageSize: 5 }}
                          size="middle"
                          scroll={{ x: 600 }}
                          columns={[
                            {
                              title: 'Booking Code',
                              dataIndex: 'bookingCode',
                              key: 'bookingCode',
                              render: (code) => <strong>{code}</strong>,
                            },
                            {
                              title: 'Customer',
                              dataIndex: 'customerName',
                              key: 'customerName',
                            },
                            {
                              title: 'Rental Dates',
                              key: 'dates',
                              render: (_, r) => (
                                <span>
                                  {formatDate(r.startDate)} → {formatDate(r.endDate)} ({r.totalDays}d)
                                </span>
                              ),
                            },
                            {
                              title: 'Status',
                              dataIndex: 'status',
                              key: 'status',
                              render: (s) => <Tag color="blue">{s?.toUpperCase()}</Tag>,
                            },
                            {
                              title: 'Total Amount',
                              dataIndex: 'totalAmount',
                              key: 'totalAmount',
                              render: (amt) => <CurrencyDisplay amount={amt || 0} />,
                            },
                          ]}
                        />
                      )}
                    </div>
                  ),
                },
              ]}
            />
          </Card>
        </Col>

        {/* Right Sidebar */}
        <Col xs={24} lg={8} xl={7}>
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            {/* Status & Quick Control Card */}
            <Card
              title="Asset Status"
              style={{ borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}
              extra={
                <Button size="small" type="link" onClick={() => setIsStatusModalOpen(true)}>
                  Change
                </Button>
              }
            >
              <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <StatusBadge status={vehicle.status} />
              </div>

              {vehicle.status === 'available' ? (
                <div style={{ color: '#10b981', fontSize: 13, marginBottom: 16 }}>
                  ✓ Ready for immediate hire and customer assignment
                </div>
              ) : vehicle.status === 'rented' ? (
                <div style={{ color: '#1677ff', fontSize: 13, marginBottom: 16 }}>
                  🚗 Asset currently on active rental contract
                </div>
              ) : (
                <div style={{ color: '#f59e0b', fontSize: 13, marginBottom: 16 }}>
                  ⚠️ Asset undergoing service or unavailable
                </div>
              )}

              <Button
                type="primary"
                block
                size="large"
                icon={<CarOutlined />}
                onClick={() => navigate(`/operations/bookings/new?vehicleId=${vehicle.id}`)}
              >
                Create Rental Booking
              </Button>
            </Card>

            {/* Station / Location Card */}
            <Card
              title="Station Location"
              style={{ borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}
              extra={
                <Button size="small" type="link" onClick={handleOpenEditVehicle}>
                  Edit
                </Button>
              }
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <EnvironmentOutlined style={{ fontSize: 20, color: '#1677ff', marginTop: 2 }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>
                    {vehicle.locationName || 'Main Headquarters Station'}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                    Kathmandu, Nepal
                  </div>
                </div>
              </div>
            </Card>

            {/* Quick Actions Shortcuts */}
            <Card title="Quick Actions" style={{ borderRadius: 12, border: '1px solid #e2e8f0' }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Button block icon={<PictureOutlined />} onClick={() => setIsMediaLibraryOpen(true)}>
                  Fleet Media Library
                </Button>
                <Button block icon={<FileTextOutlined />} onClick={() => setIsAddDocModalOpen(true)}>
                  Attach Official Document
                </Button>
                <Button
                  block
                  icon={<ToolOutlined />}
                  onClick={() => {
                    maintenanceForm.setFieldsValue({
                      title: `${vehicle.make} ${vehicle.model} Service`,
                      serviceType: 'regular_service',
                      priority: 'medium',
                      odometerReading: vehicle.specs?.mileageOdometer || 0,
                      scheduledDate: dayjs(),
                    })
                    setIsAddMaintenanceModalOpen(true)
                  }}
                >
                  Log Maintenance
                </Button>
                <Button
                  block
                  icon={<WarningOutlined />}
                  onClick={() => {
                    damageForm.setFieldsValue({
                      date: dayjs(),
                      severity: 'minor',
                      status: 'reported',
                      area: 'Front Bumper',
                    })
                    setIsAddDamageModalOpen(true)
                  }}
                >
                  Report Damage Incident
                </Button>
              </Space>
            </Card>

            {/* Danger Zone Card */}
            <Card
              title={<span style={{ color: '#ef4444' }}>Decommission Asset</span>}
              style={{ borderRadius: 12, border: '1px solid #fee2e2' }}
            >
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
                Permanently remove this vehicle from fleet operations.
              </div>
              <Popconfirm
                title="Remove Vehicle from Fleet?"
                description="Are you sure you want to remove this vehicle? This action cannot be undone."
                okText="Yes, Delete"
                okType="danger"
                cancelText="Cancel"
                onConfirm={() => deleteMutation.mutate()}
              >
                <Button danger block size="large" icon={<DeleteOutlined />}>
                  Remove Vehicle
                </Button>
              </Popconfirm>
            </Card>
          </Space>
        </Col>
      </Row>

      {/* 1. FLEET MEDIA LIBRARY MODAL (IN-PLACE PHOTO MANAGEMENT) */}
      <MediaLibraryModal
        open={isMediaLibraryOpen}
        onClose={() => setIsMediaLibraryOpen(false)}
        multiple={true}
        onSelect={handleSelectMediaPhotos}
        currentSelected={allPhotos}
      />

      {/* 3. QUICK EDIT VEHICLE DRAWER (IN-PLACE EDITING) */}
      <Drawer
        title={<Space><EditOutlined /><span>Edit Vehicle Details ({vehicle.plateNumber})</span></Space>}
        open={isEditVehicleDrawerOpen}
        onClose={() => setIsEditVehicleDrawerOpen(false)}
        width={720}
        extra={
          <Space>
            <Button onClick={() => setIsEditVehicleDrawerOpen(false)}>Cancel</Button>
            <Button
              type="primary"
              loading={updateVehicleMutation.isPending}
              onClick={() => editVehicleForm.submit()}
            >
              Save Changes
            </Button>
          </Space>
        }
      >
        <Form
          form={editVehicleForm}
          layout="vertical"
          onFinish={(values) => updateVehicleMutation.mutate(values)}
        >
          <Title level={5} style={{ marginTop: 0 }}>Basic Identification</Title>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="make" label="Make / Brand" rules={[{ required: true }]}>
                <Input size="large" placeholder="e.g. Toyota, Hyundai, Royal Enfield" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="model" label="Model" rules={[{ required: true }]}>
                <Input size="large" placeholder="e.g. Scorpio, Creta, Himalayan" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Form.Item name="year" label="Year" rules={[{ required: true }]}>
                <InputNumber size="large" style={{ width: '100%' }} min={1990} max={2030} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="plateNumber" label="Registration Plate" rules={[{ required: true }]}>
                <Input size="large" placeholder="e.g. BA 2 CHA 1234" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="type" label="Vehicle Type" rules={[{ required: true }]}>
                <Select size="large">
                  <Select.Option value="car">Car / SUV</Select.Option>
                  <Select.Option value="bike">Motorcycle</Select.Option>
                  <Select.Option value="scooter">Scooter</Select.Option>
                  <Select.Option value="van">Van / Bus</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="categoryId" label="Category">
                <Select size="large" placeholder="Select category" allowClear>
                  {categories.map((c) => (
                    <Select.Option key={c.id} value={c.id}>
                      {c.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="locationId" label="Station Location">
                <Select size="large" placeholder="Select location" allowClear>
                  {locations.map((l) => (
                    <Select.Option key={l.id} value={l.id}>
                      {l.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ margin: '16px 0' }} />
          <Title level={5}>Rental Pricing & Rules</Title>

          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Form.Item name="dailyRate" label="Daily Rate (Rs.)" rules={[{ required: true }]}>
                <InputNumber size="large" style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="weeklyRate" label="Weekly Rate (Rs.)">
                <InputNumber size="large" style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="monthlyRate" label="Monthly Rate (Rs.)">
                <InputNumber size="large" style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Form.Item name="depositAmount" label="Security Deposit (Rs.)">
                <InputNumber size="large" style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="allowedKmPerDay" label="Included KM / Day">
                <InputNumber size="large" style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="extraKmRate" label="Extra KM Rate (Rs./km)">
                <InputNumber size="large" style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ margin: '16px 0' }} />
          <Title level={5}>Technical Specifications</Title>

          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Form.Item name="mileageOdometer" label="Odometer (km)">
                <InputNumber size="large" style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="transmission" label="Transmission">
                <Select size="large">
                  <Select.Option value="automatic">Automatic</Select.Option>
                  <Select.Option value="manual">Manual</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="fuelType" label="Fuel Type">
                <Select size="large">
                  <Select.Option value="petrol">Petrol</Select.Option>
                  <Select.Option value="diesel">Diesel</Select.Option>
                  <Select.Option value="electric">Electric (EV)</Select.Option>
                  <Select.Option value="hybrid">Hybrid</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Form.Item name="seatingCapacity" label="Seats">
                <InputNumber size="large" style={{ width: '100%' }} min={1} max={50} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="engineCapacity" label="Engine (CC)">
                <Input size="large" placeholder="e.g. 1500, 350" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="color" label="Color">
                <Input size="large" placeholder="e.g. White, Black" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={6}>
              <Form.Item name="hasAC" label="Air Conditioning" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col xs={24} sm={6}>
              <Form.Item name="hasGPS" label="GPS Telematics" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col xs={24} sm={6}>
              <Form.Item name="hasBluetooth" label="Bluetooth Audio" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col xs={24} sm={6}>
              <Form.Item name="helmetIncluded" label="Helmet Included" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="notes" label="Internal Notes">
            <Input.TextArea rows={3} placeholder="Internal remarks, fleet guidelines, or special instructions..." />
          </Form.Item>
        </Form>
      </Drawer>

      {/* 4. MODAL: LOG MAINTENANCE / WORK ORDER */}
      <Modal
        title={<Space><ToolOutlined /><span>Log Maintenance Work Order ({vehicle.plateNumber})</span></Space>}
        open={isAddMaintenanceModalOpen}
        onCancel={() => setIsAddMaintenanceModalOpen(false)}
        onOk={() => maintenanceForm.submit()}
        confirmLoading={addMaintenanceMutation.isPending}
        okText="Log Work Order"
        width={600}
      >
        <Form
          form={maintenanceForm}
          layout="vertical"
          onFinish={(values) => addMaintenanceMutation.mutate(values)}
          initialValues={{
            serviceType: 'regular_service',
            priority: 'medium',
            scheduledDate: dayjs(),
          }}
        >
          <Form.Item
            name="title"
            label="Service Title"
            rules={[{ required: true, message: 'Please enter a service title' }]}
          >
            <Input size="large" placeholder="e.g. Periodic 10,000 km Service & Oil Filter" />
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="serviceType" label="Service Category" rules={[{ required: true }]}>
                <Select size="large">
                  <Select.Option value="regular_service">Regular Service</Select.Option>
                  <Select.Option value="oil_change">Engine Oil & Filter</Select.Option>
                  <Select.Option value="brake_inspection">Brake & Pads Inspection</Select.Option>
                  <Select.Option value="tire_change">Tire Rotation & Replacement</Select.Option>
                  <Select.Option value="engine_repair">Engine & Transmission</Select.Option>
                  <Select.Option value="body_damage">Body & Paint Repair</Select.Option>
                  <Select.Option value="electrical">Battery & Electrical</Select.Option>
                  <Select.Option value="other">General Maintenance</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="priority" label="Priority">
                <Select size="large">
                  <Select.Option value="low">Low</Select.Option>
                  <Select.Option value="medium">Medium</Select.Option>
                  <Select.Option value="high">High</Select.Option>
                  <Select.Option value="urgent">Urgent</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="scheduledDate" label="Scheduled Date">
                <DatePicker size="large" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="estimatedCost" label="Estimated Cost (Rs.)">
                <InputNumber size="large" style={{ width: '100%' }} min={0} placeholder="0" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="vendorName" label="Workshop / Service Center">
                <Input size="large" placeholder="e.g. Authorized Service Center" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="odometerReading" label="Odometer Reading (km)">
                <InputNumber size="large" style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="Work Scope & Inspection Notes">
            <Input.TextArea rows={3} placeholder="Details of issues observed, parts to replace, or technician instructions..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* 5. MODAL: LOG DAMAGE INCIDENT */}
      <Modal
        title={<Space><WarningOutlined style={{ color: '#fa8c16' }} /><span>Report Vehicle Damage Incident</span></Space>}
        open={isAddDamageModalOpen}
        onCancel={() => setIsAddDamageModalOpen(false)}
        onOk={() => damageForm.submit()}
        confirmLoading={addDamageMutation.isPending}
        okText="Record Damage"
        width={600}
      >
        <Form
          form={damageForm}
          layout="vertical"
          onFinish={(values) => addDamageMutation.mutate(values)}
          initialValues={{
            severity: 'minor',
            status: 'reported',
            area: 'Front Bumper',
            date: dayjs(),
          }}
        >
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="date" label="Incident Date" rules={[{ required: true }]}>
                <DatePicker size="large" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="area" label="Damage Area / Component" rules={[{ required: true }]}>
                <Select size="large">
                  <Select.Option value="Front Bumper">Front Bumper</Select.Option>
                  <Select.Option value="Rear Bumper">Rear Bumper</Select.Option>
                  <Select.Option value="Left Door / Fender">Left Door / Fender</Select.Option>
                  <Select.Option value="Right Door / Fender">Right Door / Fender</Select.Option>
                  <Select.Option value="Hood / Bonnet">Hood / Bonnet</Select.Option>
                  <Select.Option value="Roof">Roof</Select.Option>
                  <Select.Option value="Windshield / Glass">Windshield / Glass</Select.Option>
                  <Select.Option value="Wheels & Tires">Wheels & Tires</Select.Option>
                  <Select.Option value="Interior Cabin">Interior Cabin</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="Damage Description"
            rules={[{ required: true, message: 'Please describe the damage' }]}
          >
            <Input.TextArea rows={2} placeholder="Describe scratches, dents, cracked glass, or body impact..." />
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Form.Item name="severity" label="Severity">
                <Select size="large">
                  <Select.Option value="minor">Minor (Scratch)</Select.Option>
                  <Select.Option value="moderate">Moderate (Dent)</Select.Option>
                  <Select.Option value="severe">Major (Collision)</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="status" label="Repair Status">
                <Select size="large">
                  <Select.Option value="reported">Reported</Select.Option>
                  <Select.Option value="under_repair">Under Repair</Select.Option>
                  <Select.Option value="repaired">Repaired</Select.Option>
                  <Select.Option value="waived">Waived</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="estimatedCost" label="Estimated Cost (Rs.)">
                <InputNumber size="large" style={{ width: '100%' }} min={0} placeholder="0" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Damage Inspection Photos">
            <FileUploader
              fileList={newDamageFiles}
              onChange={setNewDamageFiles}
              folder="damage-photos"
              title="Upload Damage Photos"
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 6. MODAL: QUICK EDIT RATES & PRICING */}
      <Modal
        title={<Space><DollarOutlined /><span>Edit Rates & Pricing ({vehicle.plateNumber})</span></Space>}
        open={isEditPricingModalOpen}
        onCancel={() => setIsEditPricingModalOpen(false)}
        onOk={() => pricingForm.submit()}
        confirmLoading={updatePricingMutation.isPending}
        okText="Update Rates"
        width={560}
      >
        <Form
          form={pricingForm}
          layout="vertical"
          onFinish={(values) => updatePricingMutation.mutate(values)}
        >
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="dailyRate" label="Daily Rental Rate (Rs.)" rules={[{ required: true }]}>
                <InputNumber size="large" style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="depositAmount" label="Security Deposit (Rs.)">
                <InputNumber size="large" style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="weeklyRate" label="Weekly Rate (Rs.)">
                <InputNumber size="large" style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="monthlyRate" label="Monthly Rate (Rs.)">
                <InputNumber size="large" style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="allowedKmPerDay" label="Included KM / Day">
                <InputNumber size="large" style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="extraKmRate" label="Extra KM Rate (Rs./km)">
                <InputNumber size="large" style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* 7. MODAL: UPDATE ODOMETER READING */}
      <Modal
        title={<Space><DashboardOutlined /><span>Update Vehicle Odometer</span></Space>}
        open={isUpdateOdometerModalOpen}
        onCancel={() => setIsUpdateOdometerModalOpen(false)}
        onOk={() => updateOdometerMutation.mutate(newOdometerValue)}
        confirmLoading={updateOdometerMutation.isPending}
        okText="Update Odometer"
      >
        <div style={{ padding: '16px 0' }}>
          <p style={{ marginBottom: 12 }}>
            Current logged mileage: <strong>{vehicle.specs?.mileageOdometer?.toLocaleString() || 0} km</strong>
          </p>
          <Form.Item label="New Odometer Reading (km)" required>
            <InputNumber
              size="large"
              style={{ width: '100%' }}
              min={0}
              value={newOdometerValue}
              onChange={(val) => setNewOdometerValue(Number(val) || 0)}
              addonAfter="km"
            />
          </Form.Item>
        </div>
      </Modal>

      {/* 8. MODAL: CHANGE STATUS */}
      <Modal
        title="Change Vehicle Status"
        open={isStatusModalOpen}
        onCancel={() => setIsStatusModalOpen(false)}
        onOk={() => statusMutation.mutate(selectedStatus)}
        confirmLoading={statusMutation.isPending}
        okText="Update Status"
      >
        <div style={{ padding: '16px 0' }}>
          <p style={{ marginBottom: 12 }}>Select current operational state for {vehicle.plateNumber}:</p>
          <Select
            size="large"
            value={selectedStatus}
            onChange={setSelectedStatus}
            style={{ width: '100%' }}
            options={[
              { value: 'available', label: 'Available (Ready for Rent)' },
              { value: 'rented', label: 'Rented (On Active Contract)' },
              { value: 'maintenance', label: 'Maintenance / In Workshop' },
              { value: 'reserved', label: 'Reserved' },
            ]}
          />
        </div>
      </Modal>

      {/* 9. MODAL: ATTACH OFFICIAL DOCUMENT */}
      <Modal
        title="Attach Official Fleet Document"
        open={isAddDocModalOpen}
        onCancel={() => setIsAddDocModalOpen(false)}
        onOk={() => docForm.submit()}
        confirmLoading={addDocMutation.isPending}
        okText="Upload & Attach"
        width={600}
      >
        <Form
          form={docForm}
          layout="vertical"
          onFinish={(values) => addDocMutation.mutate(values)}
          initialValues={{ docType: 'bluebook' }}
        >
          <Form.Item
            name="name"
            label={<strong style={{ fontSize: 13 }}>Document Title</strong>}
            rules={[{ required: true, message: 'Please enter document title' }]}
          >
            <Input size="large" placeholder="e.g. Vehicle Bluebook / Registration 2026" />
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="docType" label={<strong style={{ fontSize: 13 }}>Document Category</strong>} rules={[{ required: true }]}>
                <Select
                  size="large"
                  options={[
                    { value: 'bluebook', label: 'Bluebook (Registration)' },
                    { value: 'insurance', label: 'Insurance Policy' },
                    { value: 'fitness', label: 'Fitness & Roadworthiness' },
                    { value: 'pollution', label: 'Pollution / Emission Test' },
                    { value: 'permit', label: 'Route Permit' },
                    { value: 'road_tax', label: 'Road Tax Token' },
                    { value: 'ownership_lease', label: 'Ownership / Lease' },
                    { value: 'other', label: 'Other Fleet Document' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="documentNumber" label={<strong style={{ fontSize: 13 }}>Document / Policy Number</strong>}>
                <Input size="large" placeholder="e.g. BB-892341" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="issueDate" label={<strong style={{ fontSize: 13 }}>Issue Date</strong>}>
                <DatePicker size="large" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="expiryDate" label={<strong style={{ fontSize: 13 }}>Expiry Date</strong>}>
                <DatePicker size="large" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="issuingAuthority" label={<strong style={{ fontSize: 13 }}>Issuing Authority / Agency</strong>}>
            <Input size="large" placeholder="e.g. Department of Transport Management (DOTM)" />
          </Form.Item>

          <Form.Item label={<strong style={{ fontSize: 13 }}>Upload Scanned Copies (Front & Back)</strong>}>
            <FileUploader
              fileList={newDocFiles}
              onChange={setNewDocFiles}
              folder="vehicle-documents"
              title="Upload Scanned Document"
            />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  )
}
