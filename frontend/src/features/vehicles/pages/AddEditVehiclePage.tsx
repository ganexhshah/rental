import React, { useState, useEffect } from 'react'
import {
  Card,
  Form,
  Input,
  InputNumber,
  Select,
  Button,
  Space,
  Row,
  Col,
  Switch,
  message,
  Divider,
  Modal,
  Tag,
  Typography,
  Image,
  Flex,
  theme,
  Upload,
  Spin,
  Tooltip,
  Table,
  DatePicker,
  Empty,
  Popconfirm,
} from 'antd'
import {
  CarOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  ArrowLeftOutlined,
  PlusOutlined,
  EnvironmentOutlined,
  PictureOutlined,
  InfoCircleOutlined,
  UploadOutlined,
  DeleteOutlined,
  InboxOutlined,
  ScissorOutlined,
  StarOutlined,
  StarFilled,
  EyeOutlined,
  FileProtectOutlined,
  FileTextOutlined,
  FilePdfOutlined,
  CameraOutlined,
  CloudServerOutlined,
  CloudUploadOutlined,
} from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { PageHeader } from '@/components/navigation/PageHeader'
import { PageContainer } from '@/components/navigation/PageContainer'
import { vehiclesApi } from '../api'
import { uploadToR2, isCloudUrl } from '@/lib/storage/r2'
import { FileUploader } from '@/components/forms/FileUploader'
import { ImageCropperModal, type CroppedResult } from '@/components/forms/ImageCropperModal'
import { MediaLibraryModal } from '@/components/forms/MediaLibraryModal'
import type { Vehicle, VehicleType, TransmissionType, FuelType, VehicleDocType } from '@/types/vehicle'

const { Text, Paragraph } = Typography

export interface DocFileItem {
  uid: string
  name: string
  url: string
  type: string
  size?: number
}

export interface AttachedDocumentItem {
  id?: string
  name: string
  docType: VehicleDocType
  documentNumber?: string
  issuingAuthority?: string
  issueDate?: string
  expiryDate?: string
  fileUrl: string
  fileUrls?: string[]
  fileName?: string
  fileNames?: string[]
  fileSize?: number
  mimeType?: string
  notes?: string
  isExisting?: boolean
}

const DOC_TYPE_META: Record<VehicleDocType, { label: string; color: string }> = {
  bluebook: { label: 'Bluebook (Registration)', color: 'blue' },
  registration: { label: 'Vehicle Registration', color: 'blue' },
  insurance: { label: 'Insurance Policy', color: 'green' },
  fitness: { label: 'Fitness Certificate', color: 'cyan' },
  pollution: { label: 'Pollution / Emission', color: 'orange' },
  permit: { label: 'Route Permit', color: 'purple' },
  road_tax: { label: 'Road Tax Token', color: 'geekblue' },
  ownership_lease: { label: 'Ownership / Lease', color: 'magenta' },
  inspection_certificate: { label: 'Inspection Certificate', color: 'gold' },
  other: { label: 'Official Document', color: 'default' },
}

const DOCUMENT_TYPE_OPTIONS: { label: string; value: VehicleDocType }[] = [
  { label: '📘 Bluebook (Vehicle Registration)', value: 'bluebook' },
  { label: '🛡️ Comprehensive Insurance Policy', value: 'insurance' },
  { label: '🌿 Pollution & Emission Green Token', value: 'pollution' },
  { label: '🧾 Annual Road Tax Token', value: 'road_tax' },
  { label: '🛣️ Route Permit', value: 'permit' },
  { label: '🔧 Fitness Certificate', value: 'fitness' },
  { label: '📑 Ownership / Lease Agreement', value: 'ownership_lease' },
  { label: '🔍 Inspection Certificate', value: 'inspection_certificate' },
  { label: '📁 Other Official Document', value: 'other' },
]

const POPULAR_FEATURES: string[] = [
  '4x4 / AWD',
  'Backup Camera & Sensors',
  'Dashcam / DVR',
  'Apple CarPlay & Android Auto',
  'Touchscreen Infotainment',
  'Sunroof / Moonroof',
  'Heated Seats',
  'Fast USB-C Charger',
  'Roof Luggage Rack',
  'Fog Lights',
  'Keyless Push Start',
  'Cruise Control',
  'ABS & Traction Control',
  'Child Safety Seat',
  'Smartphone Mount',
  'Toolkit & Puncture Kit',
  'Dual Disc Brakes',
  'Side Luggage Panniers',
  'Pillion Backrest',
  'Leather Seats',
  'Alloy Wheels',
]

export const AddEditVehiclePage: React.FC = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEditing = Boolean(id)
  const queryClient = useQueryClient()
  const { token } = theme.useToken()

  const [form] = Form.useForm()
  const [typeForm] = Form.useForm()
  const [categoryForm] = Form.useForm()
  const [locationForm] = Form.useForm()

  // State for modals
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false)

  // Additional features & installed equipment state
  const [customFeatures, setCustomFeatures] = useState<string[]>([])
  const [newFeatureInput, setNewFeatureInput] = useState<string>('')

  // Toggle a suggested feature
  const handleToggleFeature = (featName: string) => {
    setCustomFeatures((prev) => {
      if (prev.includes(featName)) {
        return prev.filter((f) => f !== featName)
      } else {
        return [...prev, featName]
      }
    })
  }

  // Add a typed custom feature
  const handleAddCustomFeature = () => {
    const trimmed = newFeatureInput.trim()
    if (!trimmed) return
    if (customFeatures.some((f) => f.toLowerCase() === trimmed.toLowerCase())) {
      message.warning(`"${trimmed}" is already added!`)
      return
    }
    setCustomFeatures((prev) => [...prev, trimmed])
    setNewFeatureInput('')
    message.success(`Added feature: ${trimmed}`)
  }

  // Remove a custom feature
  const handleRemoveCustomFeature = (featureToRemove: string) => {
    setCustomFeatures((prev) => prev.filter((f) => f !== featureToRemove))
  }

  // Multiple vehicle images state & cropper state
  const [vehicleImages, setVehicleImages] = useState<string[]>([])
  const [primaryImage, setPrimaryImage] = useState<string>('')
  const [uploading, setUploading] = useState(false)
  const [cropperOpen, setCropperOpen] = useState(false)
  const [cropTarget, setCropTarget] = useState<{ src: string; index?: number } | null>(null)
  const [mediaLibraryOpen, setMediaLibraryOpen] = useState(false)

  // Inline multi-document management state
  const [attachedDocs, setAttachedDocs] = useState<AttachedDocumentItem[]>([])
  const [uploadingDocIndex, setUploadingDocIndex] = useState<number | null>(null)
  const [docCropperOpen, setDocCropperOpen] = useState(false)
  const [docCropTarget, setDocCropTarget] = useState<{ docIndex: number; pageIndex: number; src: string } | null>(null)

  // Get next logical document type recommendation
  const getNextSuggestedDocType = (existingTypes: VehicleDocType[]): VehicleDocType => {
    const priorityList: VehicleDocType[] = [
      'bluebook',
      'insurance',
      'pollution',
      'road_tax',
      'permit',
      'fitness',
      'ownership_lease',
    ]
    const found = priorityList.find((t) => !existingTypes.includes(t))
    return found || 'other'
  }

  // Add another document entry
  const handleAddAnotherDoc = () => {
    const currentTypes = attachedDocs.map((d) => d.docType)
    const nextType = getNextSuggestedDocType(currentTypes)
    const nextLabel = DOC_TYPE_META[nextType]?.label || 'Vehicle Document'

    const newDocItem: AttachedDocumentItem = {
      id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: nextLabel,
      docType: nextType,
      documentNumber: '',
      issueDate: undefined,
      expiryDate: undefined,
      fileUrl: '',
      fileUrls: [],
      fileNames: [],
      isExisting: false,
    }

    setAttachedDocs((prev) => [...prev, newDocItem])
    message.success(`Added ${nextLabel} section!`)
  }

  // Handle field change in an inline document
  const handleDocFieldChange = (
    docIndex: number,
    field: keyof AttachedDocumentItem,
    value: any
  ) => {
    setAttachedDocs((prev) => {
      const updated = [...prev]
      const doc = { ...updated[docIndex] }
      if (field === 'docType') {
        doc.docType = value
        doc.name = DOC_TYPE_META[value as VehicleDocType]?.label || doc.name
      } else {
        (doc as any)[field] = value
      }
      updated[docIndex] = doc
      return updated
    })
  }

  // Upload files for a specific document item
  const handleUploadFilesForDoc = async (docIndex: number, fileList: File[]) => {
    // Deduplicate files by name, size, and lastModified to prevent duplicates
    const files = Array.from(fileList).filter(
      (f, index, self) =>
        index === self.findIndex((t) => t.name === f.name && t.size === f.size && t.lastModified === f.lastModified)
    )
    if (files.length === 0) return

    setUploadingDocIndex(docIndex)
    const hideLoading = message.loading(`Uploading ${files.length} document page${files.length > 1 ? 's' : ''}...`, 0)
    const newUrls: string[] = []
    const newNames: string[] = []

    for (const file of files) {
      try {
        const ext = file.name.split('.').pop() || 'dat'
        const key = `fleet-documents/${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${ext}`
        const res = await uploadToR2(file, key, file.type)

        if (res?.url && isCloudUrl(res.url)) {
          newUrls.push(res.url)
          newNames.push(file.name)
        } else {
          throw new Error('Storage did not return a valid URL')
        }
      } catch (err: any) {
        console.error('Failed to upload document file:', file.name, err)
        message.error(`Failed to upload ${file.name}: ${err?.message || 'Upload error'}`)
      }
    }

    hideLoading()
    setUploadingDocIndex(null)

    if (newUrls.length > 0) {
      setAttachedDocs((prev) => {
        const updated = [...prev]
        const doc = { ...updated[docIndex] }
        const existingUrls = doc.fileUrls || (doc.fileUrl ? [doc.fileUrl] : [])
        const existingNames = doc.fileNames || (doc.fileName ? [doc.fileName] : [])
        const uniqueNewUrls: string[] = []
        const uniqueNewNames: string[] = []
        newUrls.forEach((url, i) => {
          if (!existingUrls.includes(url)) {
            uniqueNewUrls.push(url)
            uniqueNewNames.push(newNames[i] || `Page ${existingUrls.length + uniqueNewUrls.length + 1}`)
          }
        })
        const combinedUrls = [...existingUrls, ...uniqueNewUrls]
        const combinedNames = [...existingNames, ...uniqueNewNames]
        doc.fileUrls = combinedUrls
        doc.fileNames = combinedNames
        doc.fileUrl = combinedUrls[0] || ''
        doc.fileName = combinedNames[0] || ''
        doc.mimeType = files[0]?.type || (files[0]?.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg')
        updated[docIndex] = doc
        return updated
      })
      message.success(`Attached ${newUrls.length} file/page${newUrls.length > 1 ? 's' : ''}!`)
    }
  }

  // Remove a single uploaded page/file from a document
  const handleRemoveDocPage = (docIndex: number, pageIndex: number) => {
    setAttachedDocs((prev) => {
      const updated = [...prev]
      const doc = { ...updated[docIndex] }
      if (doc.fileUrls) {
        const newUrls = doc.fileUrls.filter((_, i) => i !== pageIndex)
        const newNames = doc.fileNames ? doc.fileNames.filter((_, i) => i !== pageIndex) : []
        doc.fileUrls = newUrls
        doc.fileNames = newNames
        doc.fileUrl = newUrls[0] || ''
        doc.fileName = newNames[0] || ''
        updated[docIndex] = doc
      }
      return updated
    })
    message.info('Page removed')
  }

  // Open cropper for a document image
  const handleOpenDocCropper = (docIndex: number, pageIndex: number, src: string) => {
    setDocCropTarget({ docIndex, pageIndex, src })
    setDocCropperOpen(true)
  }

  // Handle completion of document image crop
  const handleDocCropComplete = async (cropped: CroppedResult) => {
    if (!docCropTarget) return
    let finalUrl = ''

    try {
      const hideCropMsg = message.loading('Uploading...', 0)
      const key = `fleet-documents/cropped-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.jpg`
      const res = await uploadToR2(cropped.file, key, 'image/jpeg')
      hideCropMsg()
      if (res?.url && isCloudUrl(res.url)) {
        finalUrl = res.url
      } else {
        throw new Error('Storage did not return a valid URL')
      }
    } catch (e: any) {
      console.error('Upload failed for cropped document scan:', e)
      message.error(`Failed to upload cropped document scan: ${e?.message || 'Error'}`)
      return
    }

    setAttachedDocs((prev) => {
      const updated = [...prev]
      const doc = { ...updated[docCropTarget.docIndex] }
      if (doc && doc.fileUrls) {
        const newUrls = [...doc.fileUrls]
        newUrls[docCropTarget.pageIndex] = finalUrl
        doc.fileUrls = newUrls
        if (docCropTarget.pageIndex === 0) {
          doc.fileUrl = finalUrl
        }
        updated[docCropTarget.docIndex] = doc
      }
      return updated
    })
    setDocCropperOpen(false)
    setDocCropTarget(null)
    message.success('Uploaded successfully!')
  }

  // Remove a document card
  const handleRemoveDoc = async (indexToRemove: number) => {
    const doc = attachedDocs[indexToRemove]
    if (isEditing && doc.id && doc.isExisting) {
      try {
        await vehiclesApi.deleteDocument(doc.id)
      } catch (e) {
        console.warn('Error deleting document:', e)
      }
    }
    setAttachedDocs((prev) => prev.filter((_, idx) => idx !== indexToRemove))
    message.info('Document removed')
  }

  // Watch form values for dynamic logic
  const selectedType = Form.useWatch('type', form)

  // Upload helper for single or multiple files
  const handleMultipleFilesUpload = async (fileList: File[]) => {
    const validFiles = Array.from(fileList)
      .filter((f) => f.type.startsWith('image/'))
      .filter(
        (f, index, self) =>
          index === self.findIndex((t) => t.name === f.name && t.size === f.size && t.lastModified === f.lastModified)
      )
    if (validFiles.length === 0) {
      message.error('Please upload valid image files (PNG, JPG, JPEG, WEBP)')
      return false
    }

    setUploading(true)
    const hideUpload = message.loading(`Uploading ${validFiles.length} photo${validFiles.length > 1 ? 's' : ''}...`, 0)
    const uploadedUrls: string[] = []

    for (const file of validFiles) {
      try {
        const ext = file.name.split('.').pop() || 'jpg'
        const key = `vehicles/${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${ext}`
        const res = await uploadToR2(file, key, file.type)

        if (res?.url && isCloudUrl(res.url)) {
          uploadedUrls.push(res.url)
        } else {
          throw new Error('Storage did not return a valid URL')
        }
      } catch (err: any) {
        console.error('Vehicle image upload failed:', file.name, err)
        message.error(`Failed to upload ${file.name}: ${err?.message || 'Upload error'}`)
      }
    }

    hideUpload()
    setUploading(false)

    if (uploadedUrls.length > 0) {
      setVehicleImages((prev) => {
        const existing = prev || []
        const uniqueNew = uploadedUrls.filter((u) => !existing.includes(u))
        const updated = [...existing, ...uniqueNew]
        form.setFieldValue('images', updated)
        return updated
      })

      // If no primary image set yet, make the first uploaded image primary
      setPrimaryImage((prev) => {
        const primary = prev || uploadedUrls[0]
        form.setFieldValue('primaryImage', primary)
        return primary
      })

      message.success('Uploaded successfully!')
    }

    return false
  }

  // Handle crop completion from ImageCropperModal
  const handleCropComplete = async (cropped: CroppedResult) => {
    let finalUrl = ''

    try {
      const hideCrop = message.loading('Uploading...', 0)
      const key = `vehicles/cropped-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.jpg`
      const res = await uploadToR2(cropped.file, key, 'image/jpeg')
      hideCrop()
      if (res?.url && isCloudUrl(res.url)) {
        finalUrl = res.url
      } else {
        throw new Error('Storage did not return a valid URL')
      }
    } catch (e: any) {
      console.error('Vehicle photo crop upload failed:', e)
      message.error(`Failed to upload cropped photo: ${e?.message || 'Error'}`)
      return
    }

    if (cropTarget && cropTarget.index !== undefined) {
      const targetIdx = cropTarget.index
      const oldUrl = vehicleImages[targetIdx]
      const updated = [...vehicleImages]
      updated[targetIdx] = finalUrl
      setVehicleImages(updated)
      form.setFieldValue('images', updated)

      // If this was the primary image, update primaryImage too
      if (primaryImage === oldUrl) {
        setPrimaryImage(finalUrl)
        form.setFieldValue('primaryImage', finalUrl)
      }
    } else {
      // Cropped standalone or new image
      setPrimaryImage(finalUrl)
      form.setFieldValue('primaryImage', finalUrl)
      setVehicleImages((prev) => {
        const updated = prev.includes(finalUrl) ? prev : [finalUrl, ...prev]
        form.setFieldValue('images', updated)
        return updated
      })
    }

    setCropperOpen(false)
    setCropTarget(null)
    message.success('Uploaded successfully!')
  }

  // Remove photo from gallery
  const handleRemoveImage = (indexToRemove: number) => {
    const removedUrl = vehicleImages[indexToRemove]
    const updated = vehicleImages.filter((_, idx) => idx !== indexToRemove)
    setVehicleImages(updated)
    form.setFieldValue('images', updated)

    if (primaryImage === removedUrl) {
      const nextPrimary = updated.length > 0 ? updated[0] : ''
      setPrimaryImage(nextPrimary)
      form.setFieldValue('primaryImage', nextPrimary)
    }
    message.info('Photo removed from gallery')
  }

  // Open cropper for a specific image
  const handleOpenCropper = (src: string, index?: number) => {
    setCropTarget({ src, index })
    setCropperOpen(true)
  }

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['vehicle-categories'],
    queryFn: vehiclesApi.getCategories,
  })

  const { data: vehicleTypes = [], isLoading: vehicleTypesLoading } = useQuery({
    queryKey: ['vehicle-types'],
    queryFn: vehiclesApi.getVehicleTypes,
  })

  const { data: locations = [], isLoading: locationsLoading } = useQuery({
    queryKey: ['vehicle-locations'],
    queryFn: vehiclesApi.getLocations,
  })

  // If editing, load initial data
  const { data: existingVehicle, isLoading: vehicleLoading } = useQuery({
    queryKey: ['vehicle', id],
    queryFn: () => vehiclesApi.getVehicleById(id!),
    enabled: isEditing,
  })

  useEffect(() => {
    if (existingVehicle) {
      const initialImages =
        existingVehicle.images && existingVehicle.images.length > 0
          ? existingVehicle.images
          : existingVehicle.primaryImage
          ? [existingVehicle.primaryImage]
          : []
      const initialPrimary = existingVehicle.primaryImage || initialImages[0] || ''

      setVehicleImages(initialImages)
      setPrimaryImage(initialPrimary)

      if (existingVehicle.documents && existingVehicle.documents.length > 0) {
        setAttachedDocs(
          existingVehicle.documents.map((d) => ({
            id: d.id,
            name: d.name,
            docType: d.docType,
            documentNumber: d.documentNumber,
            issuingAuthority: d.issuingAuthority,
            issueDate: d.issueDate,
            expiryDate: d.expiryDate,
            fileUrl: d.fileUrl,
            fileUrls: (d as any).fileUrls || (d.fileUrl ? [d.fileUrl] : []),
            fileName: d.fileName,
            fileNames: (d as any).fileNames || (d.fileName ? [d.fileName] : []),
            fileSize: d.fileSize,
            mimeType: d.mimeType,
            notes: d.notes,
            isExisting: true,
          }))
        )
      } else if (id) {
        vehiclesApi.getVehicleDocuments(id).then((docs) => {
          if (docs && docs.length > 0) {
            setAttachedDocs(
              docs.map((d) => ({
                id: d.id,
                name: d.name,
                docType: d.docType,
                documentNumber: d.documentNumber,
                issuingAuthority: d.issuingAuthority,
                issueDate: d.issueDate,
                expiryDate: d.expiryDate,
                fileUrl: d.fileUrl,
                fileUrls: (d as any).fileUrls || (d.fileUrl ? [d.fileUrl] : []),
                fileName: d.fileName,
                fileNames: (d as any).fileNames || (d.fileName ? [d.fileName] : []),
                fileSize: d.fileSize,
                mimeType: d.mimeType,
                notes: d.notes,
                isExisting: true,
              }))
            )
          }
        })
      }

      form.setFieldsValue({
        make: existingVehicle.make,
        model: existingVehicle.model,
        year: existingVehicle.year,
        plateNumber: existingVehicle.plateNumber,
        type: existingVehicle.type,
        categoryId: existingVehicle.categoryId,
        locationId: existingVehicle.locationId,
        vinOrChassisNumber: existingVehicle.specs.vinOrChassisNumber,
        color: existingVehicle.specs.color,
        transmission: existingVehicle.specs.transmission,
        fuelType: existingVehicle.specs.fuelType,
        engineCapacity: existingVehicle.specs.engineCapacity || '',
        seatingCapacity: existingVehicle.specs.seatingCapacity,
        mileageOdometer: existingVehicle.specs.mileageOdometer,
        hasAC: existingVehicle.specs.hasAC,
        hasGPS: existingVehicle.specs.hasGPS,
        hasBluetooth: existingVehicle.specs.hasBluetooth,
        helmetIncluded: existingVehicle.specs.helmetIncluded,
        dailyRate: existingVehicle.pricing.dailyRate,
        weeklyRate: existingVehicle.pricing.weeklyRate,
        monthlyRate: existingVehicle.pricing.monthlyRate,
        depositAmount: existingVehicle.pricing.depositAmount,
        allowedKmPerDay: existingVehicle.pricing.allowedKmPerDay,
        extraKmRate: existingVehicle.pricing.extraKmRate,
        primaryImage: initialPrimary,
        images: initialImages,
        notes: existingVehicle.notes,
      })

      const loadedFeatures = existingVehicle.specs?.features || (existingVehicle as any).features || []
      setCustomFeatures(Array.isArray(loadedFeatures) ? loadedFeatures : [])
    } else if (!isEditing) {
      setVehicleImages([])
      setPrimaryImage('')
      setCustomFeatures([])
      setNewFeatureInput('')
      setAttachedDocs([
        {
          id: `doc-bluebook-${Date.now()}`,
          name: 'Vehicle Bluebook Registration',
          docType: 'bluebook',
          documentNumber: '',
          issueDate: undefined,
          expiryDate: undefined,
          fileUrl: '',
          fileUrls: [],
          fileNames: [],
          isExisting: false,
        },
      ])
      form.resetFields()
      form.setFieldsValue({
        transmission: 'automatic',
        fuelType: 'petrol',
        engineCapacity: undefined,
        hasAC: true,
        hasGPS: false,
        hasBluetooth: false,
        helmetIncluded: false,
        primaryImage: '',
        images: [],
      })
    }
  }, [existingVehicle, isEditing, form, id])

  // Mutation for creating vehicle type directly
  const createTypeMutation = useMutation({
    mutationFn: async (values: any) => {
      const key = values.name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
      return vehiclesApi.saveVehicleType({
        name: values.name.trim(),
        key,
        icon: values.icon || '🚗',
        description: values.description || '',
      })
    },
    onSuccess: (newType) => {
      message.success(`Vehicle type "${newType.name}" created successfully!`)
      queryClient.invalidateQueries({ queryKey: ['vehicle-types'] })
      form.setFieldValue('type', newType.key)
      typeForm.resetFields()
      setIsTypeModalOpen(false)
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.error?.message || 'Failed to create vehicle type')
    },
  })

  // Mutation for creating category directly
  const createCategoryMutation = useMutation({
    mutationFn: async (values: any) => {
      return vehiclesApi.saveCategory({
        name: values.name.trim(),
        type: values.type,
        baseDailyRate: values.baseDailyRate,
        description: values.description || '',
      })
    },
    onSuccess: (newCat) => {
      message.success(`Category "${newCat.name}" created successfully!`)
      queryClient.invalidateQueries({ queryKey: ['vehicle-categories'] })
      form.setFieldValue('categoryId', newCat.id)
      form.setFieldValue('type', newCat.type)
      if (!form.getFieldValue('dailyRate') && newCat.baseDailyRate) {
        form.setFieldValue('dailyRate', newCat.baseDailyRate)
      }
      categoryForm.resetFields()
      setIsCategoryModalOpen(false)
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.error?.message || 'Failed to create category')
    },
  })

  // Mutation for creating location directly
  const createLocationMutation = useMutation({
    mutationFn: async (values: any) => {
      return vehiclesApi.saveLocation({
        name: values.name.trim(),
        code: values.code?.trim() || values.name.slice(0, 3).toUpperCase(),
        address: values.address.trim(),
        city: values.city.trim(),
        contactPhone: values.phone || '+977-1-4700000',
      })
    },
    onSuccess: (newLoc) => {
      message.success(`Location "${newLoc.name}" added successfully!`)
      queryClient.invalidateQueries({ queryKey: ['vehicle-locations'] })
      form.setFieldValue('locationId', newLoc.id)
      locationForm.resetFields()
      setIsLocationModalOpen(false)
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.error?.message || 'Failed to create location')
    },
  })

  // Save vehicle mutation
  const saveMutation = useMutation({
    mutationFn: async (values: any) => {
      const payload: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'> = {
        tenantId: '78248f8f-e390-4f85-a03f-58e4974fa366',
        plateNumber: values.plateNumber.trim(),
        make: values.make.trim(),
        model: values.model.trim(),
        year: Number(values.year),
        type: values.type as VehicleType,
        categoryId: values.categoryId || categories[0]?.id || 'cat-1',
        categoryName: categories.find((c) => c.id === values.categoryId)?.name || 'Standard Fleet',
        locationId: values.locationId || locations[0]?.id || 'loc-1',
        locationName: locations.find((l) => l.id === values.locationId)?.name || 'Kathmandu HQ',
        status: existingVehicle?.status || 'available',
        pricing: {
          dailyRate: Number(values.dailyRate),
          weeklyRate: values.weeklyRate ? Number(values.weeklyRate) : 0,
          monthlyRate: values.monthlyRate ? Number(values.monthlyRate) : 0,
          depositAmount: values.depositAmount !== undefined && values.depositAmount !== null && values.depositAmount !== '' ? Number(values.depositAmount) : 0,
          allowedKmPerDay: values.allowedKmPerDay ? Number(values.allowedKmPerDay) : 200,
          extraKmRate: values.extraKmRate ? Number(values.extraKmRate) : 20,
        },
        specs: {
          transmission: values.transmission as TransmissionType,
          fuelType: values.fuelType as FuelType,
          engineCapacity: values.engineCapacity ? `${values.engineCapacity}` : '',
          seatingCapacity: Number(values.seatingCapacity) || (values.type === 'car' ? 5 : 2),
          mileageOdometer: Number(values.mileageOdometer) || 0,
          year: Number(values.year),
          color: values.color || 'Standard',
          vinOrChassisNumber: values.vinOrChassisNumber || values.plateNumber,
          hasAC: Boolean(values.hasAC),
          hasGPS: Boolean(values.hasGPS),
          hasBluetooth: Boolean(values.hasBluetooth),
          helmetIncluded: Boolean(values.helmetIncluded),
          features: customFeatures,
        },
        primaryImage: primaryImage || (vehicleImages.length > 0 ? vehicleImages[0] : '') || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80',
        images: vehicleImages.length > 0 ? vehicleImages : [primaryImage || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80'],
        notes: values.notes || '',
      }

      let savedVehicle: Vehicle
      if (isEditing && id) {
        savedVehicle = await vehiclesApi.updateVehicle(id, payload)
      } else {
        savedVehicle = await vehiclesApi.createVehicle(payload)
      }

      // Save pending documents for this vehicle
      const pendingDocs = attachedDocs.filter((d) => !d.isExisting)
      for (const doc of pendingDocs) {
        try {
          const allUrls = doc.fileUrls && doc.fileUrls.length > 0 ? doc.fileUrls : doc.fileUrl ? [doc.fileUrl] : []
          // Skip untouched blank document templates
          if (allUrls.length === 0 && !doc.documentNumber && !doc.expiryDate && !doc.issueDate) {
            continue
          }

          // Save document with all multi-page scans attached under fileUrls
          await vehiclesApi.createDocument({
            vehicleId: savedVehicle.id,
            vehiclePlate: savedVehicle.plateNumber,
            vehicleName: `${savedVehicle.make} ${savedVehicle.model}`.trim(),
            docType: doc.docType,
            name: doc.name || DOC_TYPE_META[doc.docType]?.label || 'Vehicle Document',
            documentNumber: doc.documentNumber || '',
            issuingAuthority: doc.issuingAuthority || '',
            fileUrl: allUrls[0] || doc.fileUrl || '',
            fileUrls: allUrls,
            fileName: doc.fileName || doc.fileNames?.[0] || `${doc.docType}.jpg`,
            fileNames: doc.fileNames?.length ? doc.fileNames : [doc.fileName || `${doc.docType}.jpg`],
            fileSize: doc.fileSize || 102400,
            mimeType: doc.mimeType || 'image/jpeg',
            issueDate: doc.issueDate,
            expiryDate: doc.expiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            notes: doc.notes || '',
          })
        } catch (docErr) {
          console.warn('Failed to save document for vehicle:', docErr)
        }
      }

      return savedVehicle
    },
    onSuccess: () => {
      message.success(isEditing ? 'Vehicle updated successfully!' : 'Vehicle created with documents and added to fleet!')
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      queryClient.invalidateQueries({ queryKey: ['vehicle-documents'] })
      navigate('/vehicles/all')
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.error?.message || 'Failed to save vehicle details.')
    },
  })

  const onFinish = (values: any) => {
    saveMutation.mutate(values)
  }

  // Filter categories by selected vehicle type if user picks a type
  const filteredCategories = categories.filter((c) => {
    if (!selectedType) return true
    return c.type === selectedType || !c.type
  })

  return (
    <PageContainer loading={vehicleLoading}>
      <PageHeader
        showBreadcrumbs={false}
        title={isEditing ? `Edit Vehicle: ${existingVehicle?.plateNumber || ''}` : 'Add New Vehicle'}
        showBack
        backUrl="/vehicles/all"
        extra={
          <Space>
            <Button onClick={() => navigate('/vehicles/all')}>Cancel</Button>
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={() => form.submit()}
              loading={saveMutation.isPending}
            >
              {isEditing ? 'Save Changes' : 'Save & Add to Fleet'}
            </Button>
          </Space>
        }
      />

      <Form
        form={form}
        layout="vertical"
        size="large"
        onFinish={onFinish}
        onFinishFailed={({ errorFields }) => {
          if (vehicleImages.length === 0 && !primaryImage) {
            message.error('Please upload at least one vehicle photo to complete registration.')
          } else if (errorFields && errorFields.length > 0) {
            message.error('Please fill in all required fields.')
          }
        }}
        requiredMark="optional"
        initialValues={{
          transmission: 'automatic',
          fuelType: 'petrol',
          hasAC: true,
          hasGPS: false,
          hasBluetooth: false,
          helmetIncluded: false,
        }}
      >
        {/* CARD 1: Vehicle Identity & Classification */}
        <Card
          title={
            <Space>
              <CarOutlined style={{ color: token.colorPrimary }} />
              <span style={{ fontWeight: 600 }}>1. Vehicle Identity & Classification</span>
            </Space>
          }
          style={{ marginBottom: 20, borderRadius: 10, borderColor: token.colorBorderSecondary }}
        >
          <Row gutter={20}>
            {/* Vehicle Type */}
            <Col xs={24} md={8}>
              <Form.Item
                label={<Text strong>Vehicle Type</Text>}
                name="type"
                rules={[{ required: true, message: 'Please select vehicle type' }]}
              >
                <Select
                  size="large"
                  loading={vehicleTypesLoading}
                  placeholder="Select vehicle type"
                  options={
                    vehicleTypes.length > 0
                      ? vehicleTypes.map((t) => ({
                          label: `${t.icon || '🚗'} ${t.name}`,
                          value: t.key,
                        }))
                      : [
                          { label: '🚗 Car / SUV / EV', value: 'car' },
                          { label: '🏍️ Motorcycle / Bike', value: 'bike' },
                          { label: '🛵 Scooter', value: 'scooter' },
                          { label: '🚐 Van / Microbus', value: 'van' },
                        ]
                  }
                  onChange={(val) => {
                    // Update default amenities if changing vehicle type
                    if (val === 'bike' || val === 'scooter') {
                      form.setFieldValue('hasAC', false)
                      form.setFieldValue('helmetIncluded', true)
                    } else if (val === 'car' || val === 'van') {
                      form.setFieldValue('hasAC', true)
                      form.setFieldValue('helmetIncluded', false)
                    }
                  }}
                  dropdownRender={(menu) => (
                    <>
                      {menu}
                      <Divider style={{ margin: '8px 0' }} />
                      <div style={{ padding: '0 8px 4px' }}>
                        <Button
                          type="dashed"
                          block
                          size="large"
                          icon={<PlusOutlined />}
                          onClick={() => setIsTypeModalOpen(true)}
                          style={{ textAlign: 'center' }}
                        >
                          Add Vehicle Type
                        </Button>
                      </div>
                    </>
                  )}
                />
              </Form.Item>
            </Col>

            {/* Category */}
            <Col xs={24} md={16}>
              <Form.Item
                label={<Text strong>Category</Text>}
                name="categoryId"
                rules={[{ required: true, message: 'Please select category' }]}
              >
                <Select
                  size="large"
                  placeholder="Select category"
                  loading={categoriesLoading}
                  options={(filteredCategories.length > 0 ? filteredCategories : categories).map((c) => ({
                    label: (
                      <Flex justify="space-between" align="center">
                        <span>{c.name}</span>
                        <Tag color={c.type === 'car' ? 'blue' : c.type === 'bike' ? 'orange' : 'green'}>
                          {c.type?.toUpperCase()} • Rs. {c.baseDailyRate}/day
                        </Tag>
                      </Flex>
                    ),
                    value: c.id,
                  }))}
                  dropdownRender={(menu) => (
                    <>
                      {menu}
                      <Divider style={{ margin: '8px 0' }} />
                      <div style={{ padding: '0 8px 4px' }}>
                        <Button
                          type="dashed"
                          block
                          size="large"
                          icon={<PlusOutlined />}
                          onClick={() => setIsCategoryModalOpen(true)}
                          style={{ textAlign: 'center' }}
                        >
                          Add Category
                        </Button>
                      </div>
                    </>
                  )}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={20}>
            <Col xs={24} sm={12} md={6}>
              <Form.Item
                label={<Text strong>Make / Manufacturer</Text>}
                name="make"
                rules={[{ required: true, message: 'Make is required (e.g. Mahindra, Toyota, Royal Enfield)' }]}
              >
                <Input size="large" placeholder="e.g. Mahindra, Hyundai, Royal Enfield" />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} md={6}>
              <Form.Item
                label={<Text strong>Model</Text>}
                name="model"
                rules={[{ required: true, message: 'Model is required (e.g. Scorpio 4x4, Classic 350)' }]}
              >
                <Input size="large" placeholder="e.g. Scorpio-N 4x4, Himalayan 450" />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} md={6}>
              <Form.Item
                label={<Text strong>Model Year</Text>}
                name="year"
                rules={[{ required: true, message: 'Year is required' }]}
              >
                <InputNumber size="large" style={{ width: '100%' }} min={1990} max={2030} placeholder="e.g. 2024" />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} md={6}>
              <Form.Item
                label={<Text strong>License Plate Number</Text>}
                name="plateNumber"
                rules={[{ required: true, message: 'License plate is required' }]}
              >
                <Input size="large" placeholder="e.g. BA 2 CHA 4521" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={20}>
            <Col xs={24} sm={12} md={8}>
              <Form.Item label={<Text strong>VIN or Chassis Number</Text>} name="vinOrChassisNumber">
                <Input size="large" placeholder="Vehicle Identification Number" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item label={<Text strong>Exterior Color</Text>} name="color">
                <Input size="large" placeholder="e.g. Pearl White, Olive Green, Metallic Silver" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item
                label={<Text strong>Current Odometer (km)</Text>}
                name="mileageOdometer"
                rules={[{ required: true, message: 'Odometer is required' }]}
              >
                <InputNumber size="large" style={{ width: '100%' }} min={0} suffix="km" placeholder="e.g. 15000" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* CARD 2: Powertrain, Specs & Telematics */}
        <Card
          title={
            <Space>
              <InfoCircleOutlined style={{ color: token.colorPrimary }} />
              <span style={{ fontWeight: 600 }}>2. Specifications, Powertrain & Features</span>
            </Space>
          }
          style={{ marginBottom: 20, borderRadius: 10, borderColor: token.colorBorderSecondary }}
        >
          <Row gutter={20}>
            <Col xs={24} sm={12} md={6}>
              <Form.Item label={<Text strong>Transmission</Text>} name="transmission" rules={[{ required: true }]}>
                <Select
                  size="large"
                  options={[
                    { label: 'Automatic', value: 'automatic' },
                    { label: 'Manual', value: 'manual' },
                  ]}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} md={6}>
              <Form.Item label={<Text strong>Fuel / Powertrain</Text>} name="fuelType" rules={[{ required: true }]}>
                <Select
                  size="large"
                  options={[
                    { label: 'Petrol', value: 'petrol' },
                    { label: 'Diesel', value: 'diesel' },
                    { label: 'Electric (EV)', value: 'electric' },
                    { label: 'Hybrid', value: 'hybrid' },
                  ]}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} md={6}>
              <Form.Item
                label={<Text strong>Engine Capacity (CC)</Text>}
                name="engineCapacity"
              >
                <InputNumber
                  size="large"
                  style={{ width: '100%' }}
                  min={0}
                  step={50}
                  suffix="cc"
                  placeholder={selectedType === 'bike' ? 'e.g. 350' : selectedType === 'scooter' ? 'e.g. 125' : 'e.g. 1500'}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} md={6}>
              <Form.Item label={<Text strong>Seating Capacity</Text>} name="seatingCapacity" rules={[{ required: true, message: 'Please enter seating capacity' }]}>
                <InputNumber size="large" style={{ width: '100%' }} min={1} max={15} suffix="seats" placeholder="e.g. 5" />
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ margin: '16px 0 20px' }}>Installed Amenities & Telematics</Divider>

          {/* Standard Core Toggles */}
          <Row gutter={[20, 16]}>
            <Col xs={12} sm={6}>
              <Card size="small" variant="outlined" style={{ borderRadius: 8, background: token.colorFillAlter }}>
                <Flex justify="space-between" align="center">
                  <Text strong>Air Conditioning</Text>
                  <Form.Item name="hasAC" valuePropName="checked" noStyle>
                    <Switch />
                  </Form.Item>
                </Flex>
              </Card>
            </Col>

            <Col xs={12} sm={6}>
              <Card size="small" variant="outlined" style={{ borderRadius: 8, background: token.colorFillAlter }}>
                <Flex justify="space-between" align="center">
                  <Text strong>GPS Real-time Unit</Text>
                  <Form.Item name="hasGPS" valuePropName="checked" noStyle>
                    <Switch />
                  </Form.Item>
                </Flex>
              </Card>
            </Col>

            <Col xs={12} sm={6}>
              <Card size="small" variant="outlined" style={{ borderRadius: 8, background: token.colorFillAlter }}>
                <Flex justify="space-between" align="center">
                  <Text strong>Bluetooth Audio</Text>
                  <Form.Item name="hasBluetooth" valuePropName="checked" noStyle>
                    <Switch />
                  </Form.Item>
                </Flex>
              </Card>
            </Col>

            <Col xs={12} sm={6}>
              <Card size="small" variant="outlined" style={{ borderRadius: 8, background: token.colorFillAlter }}>
                <Flex justify="space-between" align="center">
                  <Text strong>Helmet Included</Text>
                  <Form.Item name="helmetIncluded" valuePropName="checked" noStyle>
                    <Switch />
                  </Form.Item>
                </Flex>
              </Card>
            </Col>
          </Row>

          {/* Additional Installed Features & Equipment Panel */}
          <div
            style={{
              marginTop: 20,
              padding: 20,
              background: token.colorFillAlter,
              borderRadius: 10,
              border: `1px solid ${token.colorBorderSecondary}`,
            }}
          >
            <Flex justify="space-between" align="center" style={{ marginBottom: 14 }} wrap="wrap" gap={8}>
              <div>
                <Text strong style={{ fontSize: 15, display: 'block' }}>
                  Installed Amenities & Additional Features
                </Text>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Add special equipment, driving aids, accessories, or convenience features installed on this vehicle.
                </Text>
              </div>
              <Tag color={customFeatures.length > 0 ? 'blue' : 'default'} style={{ fontSize: 13, padding: '4px 10px', borderRadius: 12 }}>
                {customFeatures.length} {customFeatures.length === 1 ? 'Feature' : 'Features'} Selected
              </Tag>
            </Flex>

            {/* Currently Active Features Badges */}
            <div style={{ marginBottom: 18 }}>
              {customFeatures.length > 0 ? (
                <Space wrap size={[8, 10]}>
                  {customFeatures.map((feat) => (
                    <Tag
                      key={feat}
                      closable
                      onClose={() => handleRemoveCustomFeature(feat)}
                      color="blue"
                      style={{
                        padding: '6px 14px',
                        fontSize: 13,
                        borderRadius: 6,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        fontWeight: 500,
                      }}
                    >
                      <CheckCircleOutlined /> {feat}
                    </Tag>
                  ))}
                </Space>
              ) : (
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: 6,
                    background: token.colorBgContainer,
                    border: `1px dashed ${token.colorBorder}`,
                    color: token.colorTextTertiary,
                    fontSize: 13,
                    fontStyle: 'italic',
                  }}
                >
                  No extra features selected yet. Click the popular tags below or add your own custom features.
                </div>
              )}
            </div>

            {/* Input to add custom feature */}
            <div style={{ marginBottom: 18 }}>
              <Row gutter={[12, 12]} align="middle">
                <Col xs={24} sm={16} md={14} lg={12}>
                  <Input
                    size="large"
                    placeholder="Type custom feature (e.g. 360° Camera, Leather Seats, Fast Charger...)"
                    value={newFeatureInput}
                    onChange={(e) => setNewFeatureInput(e.target.value)}
                    onPressEnter={(e) => {
                      e.preventDefault()
                      handleAddCustomFeature()
                    }}
                    prefix={<PlusOutlined style={{ color: token.colorTextTertiary }} />}
                    allowClear
                  />
                </Col>
                <Col xs={24} sm={8} md={6} lg={4}>
                  <Button
                    size="large"
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleAddCustomFeature}
                    disabled={!newFeatureInput.trim()}
                    block
                  >
                    Add Feature
                  </Button>
                </Col>
              </Row>
            </div>

            {/* Quick Click Suggestions */}
            <div>
              <Text strong style={{ fontSize: 12, color: token.colorTextSecondary, display: 'block', marginBottom: 10, letterSpacing: '0.5px' }}>
                POPULAR SUGGESTIONS (CLICK TO TOGGLE):
              </Text>
              <Space wrap size={[8, 10]}>
                {POPULAR_FEATURES.map((item) => {
                  const isSelected = customFeatures.includes(item)
                  return (
                    <Tag.CheckableTag
                      key={item}
                      checked={isSelected}
                      onChange={() => handleToggleFeature(item)}
                      style={{
                        padding: '6px 14px',
                        fontSize: 13,
                        borderRadius: 6,
                        border: `1px solid ${isSelected ? token.colorPrimary : token.colorBorder}`,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {isSelected ? `✓ ${item}` : `+ ${item}`}
                    </Tag.CheckableTag>
                  )
                })}
              </Space>
            </div>
          </div>
        </Card>

        {/* CARD 3: Rental Rates & Security Deposit (NPR) */}
        <Card
          title={
            <Space>
              <DollarOutlined style={{ color: token.colorPrimary }} />
              <span style={{ fontWeight: 600 }}>3. Rental Rates & Security Deposit (NPR)</span>
            </Space>
          }
          style={{ marginBottom: 20, borderRadius: 10, borderColor: token.colorBorderSecondary }}
        >
          <Row gutter={20}>
            <Col xs={24} sm={12} md={6}>
              <Form.Item
                label={<Text strong>Daily Rate (Rs.)</Text>}
                name="dailyRate"
                rules={[{ required: true, message: 'Daily rate is required' }]}
              >
                <InputNumber
                  size="large"
                  style={{ width: '100%' }}
                  min={100}
                  step={100}
                  prefix="Rs."
                  placeholder="e.g. 4500"
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} md={6}>
              <Form.Item label={<Text strong>Weekly Rate (Rs.)</Text>} name="weeklyRate">
                <InputNumber
                  size="large"
                  style={{ width: '100%' }}
                  min={500}
                  step={500}
                  prefix="Rs."
                  placeholder="e.g. 28000"
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} md={6}>
              <Form.Item label={<Text strong>Monthly Rate (Rs.)</Text>} name="monthlyRate">
                <InputNumber
                  size="large"
                  style={{ width: '100%' }}
                  min={1000}
                  step={1000}
                  prefix="Rs."
                  placeholder="e.g. 110000"
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} md={6}>
              <Form.Item
                label={<Text strong>Security Deposit (Rs.)</Text>}
                name="depositAmount"
              >
                <InputNumber
                  size="large"
                  style={{ width: '100%' }}
                  min={0}
                  step={1000}
                  prefix="Rs."
                  placeholder="e.g. 15000 (Optional or Cheque)"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={20}>
            <Col xs={24} sm={12}>
              <Form.Item label={<Text strong>Allowed Distance Per Day</Text>} name="allowedKmPerDay">
                <InputNumber
                  size="large"
                  style={{ width: '100%' }}
                  min={50}
                  step={50}
                  suffix="km / day"
                  placeholder="e.g. 200"
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item label={<Text strong>Extra Distance Fee</Text>} name="extraKmRate">
                <InputNumber
                  size="large"
                  style={{ width: '100%' }}
                  min={0}
                  step={1}
                  prefix="Rs."
                  suffix="/ km"
                  placeholder="e.g. 25"
                />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* CARD 4: Location & Media Assets */}
        <Card
          title={
            <Space>
              <EnvironmentOutlined style={{ color: token.colorPrimary }} />
              <span style={{ fontWeight: 600 }}>4. Vehicle Location & Media Gallery</span>
            </Space>
          }
          style={{ marginBottom: 24, borderRadius: 10, borderColor: token.colorBorderSecondary }}
        >
          <Row gutter={20}>
            <Col xs={24} md={12}>
              <Form.Item
                label={<Text strong>Assigned Location</Text>}
                name="locationId"
                rules={[{ required: true, message: 'Please select a location' }]}
              >
                <Select
                  size="large"
                  placeholder="Select location"
                  loading={locationsLoading}
                  options={locations.map((l) => ({
                    label: `${l.name} (${l.city})`,
                    value: l.id,
                  }))}
                  dropdownRender={(menu) => (
                    <>
                      {menu}
                      <Divider style={{ margin: '8px 0' }} />
                      <div style={{ padding: '0 8px 4px' }}>
                        <Button
                          type="dashed"
                          block
                          icon={<PlusOutlined />}
                          onClick={() => setIsLocationModalOpen(true)}
                          style={{ textAlign: 'center' }}
                        >
                          Add New Location
                        </Button>
                      </div>
                    </>
                  )}
                />
              </Form.Item>

              <Form.Item label={<Text strong>Internal Notes & Fleet Guidelines</Text>} name="notes">
                <Input.TextArea
                  rows={4}
                  placeholder="Service history notes, specific vehicle quirks, fuel policy, or special handover instructions..."
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <div style={{ marginBottom: 16 }}>
                <Flex justify="space-between" align="center" style={{ marginBottom: 8 }}>
                  <Space>
                    <PictureOutlined style={{ color: token.colorPrimary, fontSize: 16 }} />
                    <Text strong style={{ fontSize: 15 }}>Vehicle Photo Gallery</Text>
                    <Tag color="blue">{vehicleImages.length} {vehicleImages.length === 1 ? 'Photo' : 'Photos'}</Tag>
                  </Space>
                  {vehicleImages.length > 0 && (
                    <Space>
                      <Button
                        size="small"
                        icon={<PictureOutlined />}
                        onClick={() => setMediaLibraryOpen(true)}
                      >
                        Fleet Gallery
                      </Button>
                      <Upload
                        accept="image/png,image/jpeg,image/webp,image/jpg"
                        multiple
                        showUploadList={false}
                        beforeUpload={(file, fileList) => {
                          // Ant Design calls beforeUpload once per file in fileList.
                          // Only trigger batch upload on the first file of the selection to prevent duplication.
                          if (file === fileList[0] || (file as any).uid === (fileList[0] as any)?.uid) {
                            handleMultipleFilesUpload(fileList as File[])
                          }
                          return false
                        }}
                        disabled={uploading}
                      >
                        <Button size="small" type="primary" ghost icon={<UploadOutlined />} loading={uploading}>
                          Upload New
                        </Button>
                      </Upload>
                    </Space>
                  )}
                </Flex>

                <Form.Item
                  name="primaryImage"
                  hidden
                  style={{ display: 'none', margin: 0, padding: 0, height: 0 }}
                  rules={[
                    {
                      validator: async () => {
                        if (vehicleImages.length === 0 && !primaryImage) {
                          throw new Error('Please upload at least one vehicle photo')
                        }
                      },
                    },
                  ]}
                >
                  <Input type="hidden" value={primaryImage} />
                </Form.Item>

                {vehicleImages.length === 0 ? (
                  <div
                    style={{
                      border: `1px dashed ${token.colorBorder}`,
                      borderRadius: 8,
                      background: token.colorFillAlter,
                      padding: '28px 16px',
                      textAlign: 'center',
                    }}
                  >
                    {uploading ? (
                      <Space direction="vertical" align="center" style={{ padding: '24px 0' }}>
                        <Spin size="large" />
                        <Text type="secondary">Uploading...</Text>
                      </Space>
                    ) : (
                      <div>
                        <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}>
                          <img src="/bg/uplaod.svg" alt="Upload" style={{ width: 48, height: 48, objectFit: 'contain' }} />
                        </div>
                        <p style={{ fontSize: 15, fontWeight: 600, margin: '0 0 16px', color: token.colorText }}>
                          Upload vehicle photos or select from fleet gallery
                        </p>
                        <Space size={12} wrap style={{ justifyContent: 'center' }}>
                          <Button
                            type="primary"
                            icon={<PictureOutlined />}
                            onClick={() => setMediaLibraryOpen(true)}
                          >
                            Browse Fleet Gallery
                          </Button>
                          <Upload
                            accept="image/png,image/jpeg,image/webp,image/jpg"
                            multiple
                            showUploadList={false}
                            beforeUpload={(file, fileList) => {
                              if (file === fileList[0] || (file as any).uid === (fileList[0] as any)?.uid) {
                                handleMultipleFilesUpload(fileList as File[])
                              }
                              return false
                            }}
                            disabled={uploading}
                          >
                            <Button icon={<UploadOutlined />}>
                              Upload From Device
                            </Button>
                          </Upload>
                        </Space>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    {/* Primary Hero Cover Photo Card */}
                    <div
                      style={{
                        border: `1.5px solid ${token.colorPrimary}`,
                        borderRadius: 8,
                        padding: 12,
                        background: token.colorFillAlter,
                        marginBottom: 16,
                      }}
                    >
                      <Flex justify="space-between" align="center" style={{ marginBottom: 10 }}>
                        <Tag color="gold" icon={<StarFilled />} style={{ fontWeight: 600 }}>
                          Primary Fleet Cover Photo
                        </Tag>
                        <Space>
                          <Button
                            size="small"
                            icon={<ScissorOutlined style={{ color: token.colorPrimary }} />}
                            onClick={() => {
                              const pIdx = vehicleImages.indexOf(primaryImage)
                              handleOpenCropper(primaryImage, pIdx >= 0 ? pIdx : 0)
                            }}
                          >
                            Crop Cover Photo
                          </Button>
                        </Space>
                      </Flex>

                      <div
                        style={{
                          textAlign: 'center',
                          background: '#ffffff',
                          borderRadius: 6,
                          padding: 8,
                          border: `1px solid ${token.colorBorderSecondary}`,
                        }}
                      >
                        <Image
                          src={primaryImage || vehicleImages[0]}
                          alt="Primary vehicle"
                          style={{
                            maxHeight: 180,
                            maxWidth: '100%',
                            objectFit: 'contain',
                            borderRadius: 6,
                          }}
                          fallback="https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80"
                        />
                      </div>
                    </div>

                    {/* All Photos Gallery Grid */}
                    <div style={{ marginBottom: 8 }}>
                      <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                        All Gallery Photos (Click Crop to adjust, or star icon to set as primary cover):
                      </Text>
                      <Image.PreviewGroup>
                        <Row gutter={[10, 10]}>
                          {vehicleImages.map((imgUrl, idx) => {
                            const isCurrentPrimary = imgUrl === primaryImage || (idx === 0 && !primaryImage)
                            return (
                              <Col xs={12} sm={8} key={idx}>
                                <div
                                  style={{
                                    border: isCurrentPrimary
                                      ? `2px solid ${token.colorPrimary}`
                                      : `1px solid ${token.colorBorderSecondary}`,
                                    borderRadius: 6,
                                    overflow: 'hidden',
                                    background: '#ffffff',
                                    position: 'relative',
                                  }}
                                >
                                  <div style={{ height: 95, overflow: 'hidden', background: '#f5f5f5' }}>
                                    <Image
                                      src={imgUrl}
                                      alt={`Photo ${idx + 1}`}
                                      style={{ width: '100%', height: 95, objectFit: 'cover' }}
                                    />
                                    {isCurrentPrimary && (
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
                                    <Tag
                                      color="blue"
                                      style={{
                                        position: 'absolute',
                                        top: 4,
                                        right: 4,
                                        margin: 0,
                                        fontSize: 10,
                                        lineHeight: '18px',
                                        padding: '0 4px',
                                      }}
                                    >
                                      #{idx + 1}
                                    </Tag>
                                  </div>

                                  {/* Quick Action Toolbar */}
                                  <Flex
                                    justify="space-around"
                                    align="center"
                                    style={{
                                      padding: '4px 2px',
                                      background: token.colorFillAlter,
                                      borderTop: `1px solid ${token.colorBorderSecondary}`,
                                    }}
                                  >
                                    <Tooltip title="Crop image">
                                      <Button
                                        type="text"
                                        size="small"
                                        icon={<ScissorOutlined style={{ color: token.colorPrimary }} />}
                                        onClick={() => handleOpenCropper(imgUrl, idx)}
                                      />
                                    </Tooltip>
                                    {!isCurrentPrimary ? (
                                      <Tooltip title="Set as primary cover">
                                        <Button
                                          type="text"
                                          size="small"
                                          icon={<StarOutlined />}
                                          onClick={() => {
                                            setPrimaryImage(imgUrl)
                                            form.setFieldValue('primaryImage', imgUrl)
                                            message.success('Set as primary cover photo')
                                          }}
                                        />
                                      </Tooltip>
                                    ) : (
                                      <Tooltip title="Current primary cover">
                                        <StarFilled style={{ color: token.colorPrimary, fontSize: 13 }} />
                                      </Tooltip>
                                    )}
                                    <Tooltip title="Remove photo">
                                      <Button
                                        type="text"
                                        danger
                                        size="small"
                                        icon={<DeleteOutlined />}
                                        onClick={() => handleRemoveImage(idx)}
                                      />
                                    </Tooltip>
                                  </Flex>
                                </div>
                              </Col>
                            )
                          })}
                          <Col xs={12} sm={8}>
                            <div
                              style={{
                                height: 125,
                                border: `1px dashed ${token.colorBorder}`,
                                borderRadius: 6,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6,
                                background: token.colorFillAlter,
                                padding: 8,
                                textAlign: 'center',
                              }}
                            >
                              <Upload
                                accept="image/png,image/jpeg,image/webp,image/jpg"
                                multiple
                                showUploadList={false}
                                beforeUpload={(file, fileList) => {
                                  if (file === fileList[0] || (file as any).uid === (fileList[0] as any)?.uid) {
                                    handleMultipleFilesUpload(fileList as File[])
                                  }
                                  return false
                                }}
                                disabled={uploading}
                              >
                                <Button size="small" type="primary" ghost icon={<UploadOutlined />}>
                                  Upload
                                </Button>
                              </Upload>
                              <Button
                                size="small"
                                type="text"
                                icon={<PictureOutlined />}
                                onClick={() => setMediaLibraryOpen(true)}
                                style={{ fontSize: 11 }}
                              >
                                Gallery
                              </Button>
                            </div>
                          </Col>
                        </Row>
                      </Image.PreviewGroup>
                    </div>
                  </div>
                )}
              </div>
            </Col>
          </Row>
        </Card>

        {/* CARD 5: Fleet Compliance & Official Vehicle Documents */}
        <Card
          title={
            <Flex justify="space-between" align="center" style={{ width: '100%' }}>
              <Space>
                <FileProtectOutlined style={{ color: token.colorPrimary }} />
                <span style={{ fontWeight: 600 }}>5. Vehicle Documents & Fleet Compliance</span>
                <Tag color={attachedDocs.length > 0 ? 'green' : 'default'}>
                  {attachedDocs.length} {attachedDocs.length === 1 ? 'Document' : 'Documents'}
                </Tag>
              </Space>
              <Button
                type="primary"
                size="small"
                icon={<PlusOutlined />}
                onClick={handleAddAnotherDoc}
              >
                Add Document
              </Button>
            </Flex>
          }
          style={{ marginBottom: 20, borderRadius: 10, borderColor: token.colorBorderSecondary }}
        >
          {attachedDocs.length === 0 ? (
            <div
              style={{
                border: `1px dashed ${token.colorBorder}`,
                borderRadius: 8,
                padding: '24px 16px',
                textAlign: 'center',
                background: token.colorFillAlter,
              }}
            >
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <span>
                    No official documents configured yet. Click below to add Bluebook, Insurance, or Permits.
                  </span>
                }
              >
                <Button type="dashed" icon={<PlusOutlined />} onClick={handleAddAnotherDoc}>
                  Add Document (Bluebook, Insurance, etc.)
                </Button>
              </Empty>
            </div>
          ) : (
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              {attachedDocs.map((doc, docIdx) => {
                const docMeta = DOC_TYPE_META[doc.docType] || { label: doc.name, color: 'default' }
                const isExpired = doc.expiryDate && dayjs(doc.expiryDate).isBefore(dayjs(), 'day')
                const isExpiringSoon =
                  doc.expiryDate &&
                  !isExpired &&
                  dayjs(doc.expiryDate).diff(dayjs(), 'day') <= 30
                const docFileUrls = doc.fileUrls && doc.fileUrls.length > 0 ? doc.fileUrls : doc.fileUrl ? [doc.fileUrl] : []

                return (
                  <Card
                    key={doc.id || docIdx}
                    size="small"
                    style={{
                      borderRadius: 8,
                      borderColor: token.colorBorderSecondary,
                      background: token.colorBgContainer,
                    }}
                    title={
                      <Flex justify="space-between" align="center" wrap="wrap" gap={8}>
                        <Space>
                          <FileProtectOutlined style={{ color: token.colorPrimary }} />
                          <Text strong style={{ fontSize: 14 }}>
                            #{docIdx + 1} • {docMeta.label}
                          </Text>
                          <Tag color={docMeta.color} style={{ fontSize: 11 }}>
                            {doc.docType.toUpperCase()}
                          </Tag>
                          {doc.expiryDate && (
                            <Tag color={isExpired ? 'error' : isExpiringSoon ? 'warning' : 'success'}>
                              {isExpired ? 'Expired' : isExpiringSoon ? 'Expiring Soon' : 'Valid'}
                            </Tag>
                          )}
                        </Space>
                        <Popconfirm
                          title="Remove Document"
                          description={`Are you sure you want to remove ${docMeta.label}?`}
                          onConfirm={() => handleRemoveDoc(docIdx)}
                          okText="Remove"
                          cancelText="Cancel"
                          okType="danger"
                        >
                          <Button type="text" danger icon={<DeleteOutlined />} size="small">
                            Remove
                          </Button>
                        </Popconfirm>
                      </Flex>
                    }
                  >
                    <Row gutter={[16, 12]}>
                      {/* Document Classification */}
                      <Col xs={24} sm={12} md={6}>
                        <div style={{ marginBottom: 6 }}>
                          <Text strong style={{ fontSize: 13 }}>
                            Classification <span style={{ color: token.colorError }}>*</span>
                          </Text>
                        </div>
                        <Select
                          size="large"
                          style={{ width: '100%' }}
                          value={doc.docType}
                          onChange={(val) => handleDocFieldChange(docIdx, 'docType', val)}
                          options={DOCUMENT_TYPE_OPTIONS}
                        />
                      </Col>

                      {/* Expiry Date */}
                      <Col xs={24} sm={12} md={6}>
                        <div style={{ marginBottom: 6 }}>
                          <Text strong style={{ fontSize: 13 }}>
                            Expiry Date <span style={{ color: token.colorError }}>*</span>
                          </Text>
                        </div>
                        <DatePicker
                          size="large"
                          style={{ width: '100%' }}
                          format="YYYY-MM-DD"
                          placeholder="YYYY-MM-DD"
                          value={doc.expiryDate ? dayjs(doc.expiryDate) : null}
                          onChange={(d) =>
                            handleDocFieldChange(docIdx, 'expiryDate', d ? d.format('YYYY-MM-DD') : undefined)
                          }
                        />
                      </Col>

                      {/* Issue Date (Optional) */}
                      <Col xs={24} sm={12} md={6}>
                        <div style={{ marginBottom: 6 }}>
                          <Text strong style={{ fontSize: 13 }}>Issue Date</Text>{' '}
                          <Text type="secondary" style={{ fontSize: 11 }}>(Optional)</Text>
                        </div>
                        <DatePicker
                          size="large"
                          style={{ width: '100%' }}
                          format="YYYY-MM-DD"
                          placeholder="YYYY-MM-DD"
                          value={doc.issueDate ? dayjs(doc.issueDate) : null}
                          onChange={(d) =>
                            handleDocFieldChange(docIdx, 'issueDate', d ? d.format('YYYY-MM-DD') : undefined)
                          }
                        />
                      </Col>

                      {/* Document / Policy # (Optional) */}
                      <Col xs={24} sm={12} md={6}>
                        <div style={{ marginBottom: 6 }}>
                          <Text strong style={{ fontSize: 13 }}>Document / Policy #</Text>{' '}
                          <Text type="secondary" style={{ fontSize: 11 }}>(Optional)</Text>
                        </div>
                        <Input
                          size="large"
                          placeholder="e.g. POL-9921 / BB-442"
                          value={doc.documentNumber || ''}
                          onChange={(e) => handleDocFieldChange(docIdx, 'documentNumber', e.target.value)}
                        />
                      </Col>
                    </Row>

                    {/* Document Scans & Photos */}
                    <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px dashed ${token.colorBorderSecondary}` }}>
                      <Flex justify="space-between" align="center" style={{ marginBottom: 12 }}>
                        <Space>
                          <CameraOutlined style={{ color: token.colorPrimary, fontSize: 15 }} />
                          <Text strong style={{ fontSize: 13 }}>
                            Document Scans & Photos
                          </Text>
                          <Tag color={docFileUrls.length > 0 ? 'blue' : 'default'}>
                            {docFileUrls.length} {docFileUrls.length === 1 ? 'Page' : 'Pages'}
                          </Tag>
                        </Space>
                        {docFileUrls.length > 0 && (
                          <Upload
                            accept="image/png,image/jpeg,image/webp,image/jpg,application/pdf,.pdf"
                            multiple
                            showUploadList={false}
                            beforeUpload={(file, fileList) => {
                              // Only trigger batch upload on the first file of the selection to prevent duplication
                              if (file === fileList[0] || (file as any).uid === (fileList[0] as any)?.uid) {
                                handleUploadFilesForDoc(docIdx, fileList as File[])
                              }
                              return false
                            }}
                            disabled={uploadingDocIndex === docIdx}
                          >
                            <Button size="small" type="primary" ghost icon={<UploadOutlined />} loading={uploadingDocIndex === docIdx}>
                              Add More Pages
                            </Button>
                          </Upload>
                        )}
                      </Flex>

                      {docFileUrls.length === 0 ? (
                        <Upload.Dragger
                          accept="image/png,image/jpeg,image/webp,image/jpg,application/pdf,.pdf"
                          multiple
                          showUploadList={false}
                          beforeUpload={(file, fileList) => {
                            if (file === fileList[0] || (file as any).uid === (fileList[0] as any)?.uid) {
                              handleUploadFilesForDoc(docIdx, fileList as File[])
                            }
                            return false
                          }}
                          disabled={uploadingDocIndex === docIdx}
                          style={{
                            padding: '16px 12px',
                            background: token.colorFillAlter,
                            borderRadius: 8,
                            border: `1px dashed ${token.colorBorder}`,
                          }}
                        >
                          {uploadingDocIndex === docIdx ? (
                            <Space direction="vertical" align="center" style={{ padding: '12px 0' }}>
                              <Spin size="default" />
                              <Text type="secondary">Uploading document pages...</Text>
                            </Space>
                          ) : (
                            <>
                              <div style={{ marginBottom: 6, display: 'flex', justifyContent: 'center' }}>
                                <img src="/bg/uplaod.svg" alt="Upload" style={{ width: 36, height: 36, objectFit: 'contain' }} />
                              </div>
                              <p className="ant-upload-text" style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>
                                Click or drag {docMeta.label} photos / PDF here
                              </p>
                            </>
                          )}
                        </Upload.Dragger>
                      ) : (
                        <div
                          style={{
                            border: `1px solid ${token.colorBorderSecondary}`,
                            borderRadius: 8,
                            padding: 10,
                            background: token.colorFillAlter,
                          }}
                        >
                          <Image.PreviewGroup>
                            <Row gutter={[10, 10]}>
                              {docFileUrls.map((url, fIdx) => {
                                const isImg =
                                  url.startsWith('data:image') ||
                                  url.endsWith('.jpg') ||
                                  url.endsWith('.jpeg') ||
                                  url.endsWith('.png') ||
                                  url.endsWith('.webp') ||
                                  !url.toLowerCase().endsWith('.pdf')
                                const pageLabel =
                                  fIdx === 0 ? 'Page 1 (Front)' : fIdx === 1 ? 'Page 2 (Back)' : `Page ${fIdx + 1}`

                                return (
                                  <Col xs={12} sm={8} md={6} lg={4} key={fIdx}>
                                    <div
                                      style={{
                                        border: `1px solid ${token.colorBorderSecondary}`,
                                        borderRadius: 6,
                                        overflow: 'hidden',
                                        background: '#fff',
                                      }}
                                    >
                                      {isImg ? (
                                        <div
                                          style={{
                                            position: 'relative',
                                            height: 80,
                                            background: '#f5f5f5',
                                            textAlign: 'center',
                                          }}
                                        >
                                          <Image
                                            src={url}
                                            alt={pageLabel}
                                            style={{ width: '100%', height: 80, objectFit: 'cover' }}
                                          />
                                          <Tag
                                            color="blue"
                                            style={{
                                              position: 'absolute',
                                              top: 3,
                                              left: 3,
                                              margin: 0,
                                              fontSize: 9,
                                              lineHeight: '16px',
                                              padding: '0 3px',
                                            }}
                                          >
                                            {pageLabel}
                                          </Tag>
                                          <Tag
                                            color="cyan"
                                            style={{
                                              position: 'absolute',
                                              top: 3,
                                              right: 3,
                                              margin: 0,
                                              fontSize: 9,
                                              lineHeight: '16px',
                                              padding: '0 3px',
                                            }}
                                            icon={<CloudServerOutlined />}
                                          >
                                            Cloud
                                          </Tag>
                                        </div>
                                      ) : (
                                        <div
                                          style={{
                                            height: 80,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            background: '#fafafa',
                                            padding: 4,
                                          }}
                                        >
                                          <FilePdfOutlined style={{ fontSize: 26, color: '#ff4d4f' }} />
                                          <Text ellipsis style={{ maxWidth: 80, fontSize: 10, marginTop: 2 }}>
                                            {doc.fileNames?.[fIdx] || `Doc-${fIdx + 1}.pdf`}
                                          </Text>
                                        </div>
                                      )}

                                      <Flex
                                        justify="space-around"
                                        align="center"
                                        style={{
                                          padding: '3px 2px',
                                          background: token.colorFillAlter,
                                          borderTop: `1px solid ${token.colorBorderSecondary}`,
                                        }}
                                      >
                                        {isImg ? (
                                          <Tooltip title="Crop this page">
                                            <Button
                                              type="text"
                                              size="small"
                                              icon={<ScissorOutlined style={{ color: token.colorPrimary, fontSize: 13 }} />}
                                              onClick={() => handleOpenDocCropper(docIdx, fIdx, url)}
                                            />
                                          </Tooltip>
                                        ) : (
                                          <Tooltip title="View PDF">
                                            <Button
                                              type="text"
                                              size="small"
                                              icon={<EyeOutlined style={{ fontSize: 13 }} />}
                                              href={url}
                                              target="_blank"
                                            />
                                          </Tooltip>
                                        )}
                                        <Tooltip title="Remove page">
                                          <Button
                                            type="text"
                                            danger
                                            size="small"
                                            icon={<DeleteOutlined style={{ fontSize: 13 }} />}
                                            onClick={() => handleRemoveDocPage(docIdx, fIdx)}
                                          />
                                        </Tooltip>
                                      </Flex>
                                    </div>
                                  </Col>
                                )
                              })}
                            </Row>
                          </Image.PreviewGroup>
                        </div>
                      )}
                    </div>
                  </Card>
                )
              })}

              <Button
                type="dashed"
                block
                size="large"
                icon={<PlusOutlined />}
                onClick={handleAddAnotherDoc}
                style={{
                  height: 44,
                  borderRadius: 8,
                  fontWeight: 500,
                  borderColor: token.colorPrimary,
                  color: token.colorPrimary,
                }}
              >
                Add Another Document ({DOC_TYPE_META[getNextSuggestedDocType(attachedDocs.map((d) => d.docType))]?.label || 'Official Document'})
              </Button>
            </Space>
          )}
        </Card>

        {/* Bottom Action Footer */}
        <Card
          style={{
            position: 'sticky',
            bottom: 12,
            zIndex: 10,
            borderRadius: 10,
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
            borderColor: token.colorBorderSecondary,
          }}
          bodyStyle={{ padding: '16px 24px' }}
        >
          <Flex justify="space-between" align="center">
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/vehicles/all')}>
              Back to Vehicles
            </Button>
            <Space size="middle">
              <Button onClick={() => form.resetFields()}>Reset Form</Button>
              <Button
                type="primary"
                size="large"
                icon={<CheckCircleOutlined />}
                htmlType="submit"
                loading={saveMutation.isPending}
                style={{ minWidth: 180 }}
              >
                {isEditing ? 'Save Changes' : 'Complete & Add to Fleet'}
              </Button>
            </Space>
          </Flex>
        </Card>
      </Form>

      {/* QUICK ADD VEHICLE TYPE MODAL */}
      <Modal
        title={
          <Space>
            <CarOutlined style={{ color: token.colorPrimary }} />
            <span>Add Vehicle Type</span>
          </Space>
        }
        open={isTypeModalOpen}
        onCancel={() => {
          typeForm.resetFields()
          setIsTypeModalOpen(false)
        }}
        onOk={() => typeForm.submit()}
        confirmLoading={createTypeMutation.isPending}
        okText="Add Vehicle Type"
        cancelText="Cancel"
        destroyOnClose
      >
        <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 16 }}>
          Directly register a new vehicle classification type (e.g. Tour Bus, Tuk-Tuk, Mini Truck, Caravan) into the fleet system.
        </Paragraph>

        <Form
          form={typeForm}
          layout="vertical"
          size="large"
          requiredMark={false}
          initialValues={{
            icon: '🚗',
          }}
          onFinish={(values) => createTypeMutation.mutate(values)}
        >
          <Form.Item
            label={<Text strong>Type Name</Text>}
            name="name"
            rules={[{ required: true, message: 'Please enter vehicle type name' }]}
          >
            <Input size="large" placeholder="e.g. Van, Tour Bus, Tuk-Tuk, Mini Truck" />
          </Form.Item>

          <Form.Item
            label={<Text strong>Icon / Emoji</Text>}
            name="icon"
            rules={[{ required: true, message: 'Please select an icon emoji' }]}
          >
            <Select
              size="large"
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

          <Form.Item label={<Text strong>Description</Text>} name="description">
            <Input.TextArea size="large" rows={2} placeholder="Description of this vehicle type..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* QUICK ADD CATEGORY MODAL */}
      <Modal
        title={
          <Space>
            <PlusOutlined style={{ color: token.colorPrimary }} />
            <span>Add Category</span>
          </Space>
        }
        open={isCategoryModalOpen}
        onCancel={() => {
          categoryForm.resetFields()
          setIsCategoryModalOpen(false)
        }}
        onOk={() => categoryForm.submit()}
        confirmLoading={createCategoryMutation.isPending}
        okText="Add Category"
        cancelText="Cancel"
        destroyOnClose
      >
        <Form
          form={categoryForm}
          layout="vertical"
          size="large"
          requiredMark={false}
          initialValues={{
            type: selectedType || 'car',
          }}
          onFinish={(values) => createCategoryMutation.mutate(values)}
        >
          <Form.Item
            label={<Text strong>Category Name</Text>}
            name="name"
            rules={[{ required: true, message: 'Please enter category name' }]}
          >
            <Input size="large" placeholder="e.g. Off-Road 4x4 SUV, Cruiser, City Compact" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label={<Text strong>Vehicle Type</Text>}
                name="type"
                rules={[{ required: true, message: 'Please select vehicle type' }]}
              >
                <Select
                  size="large"
                  options={
                    vehicleTypes.length > 0
                      ? vehicleTypes.map((t) => ({
                          label: `${t.icon || '🚗'} ${t.name}`,
                          value: t.key,
                        }))
                      : [
                          { label: '🚗 Car / SUV / EV', value: 'car' },
                          { label: '🏍️ Motorcycle / Bike', value: 'bike' },
                          { label: '🛵 City Scooter', value: 'scooter' },
                          { label: '🚐 Van / Microbus', value: 'van' },
                        ]
                  }
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label={
                  <Space>
                    <Text strong>Base Daily Rate (Rs.)</Text>
                    <Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>
                      (Optional)
                    </Text>
                  </Space>
                }
                name="baseDailyRate"
                rules={[{ required: false }]}
              >
                <InputNumber size="large" style={{ width: '100%' }} min={0} step={100} prefix="Rs." placeholder="e.g. 4000 (optional)" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label={<Text strong>Description</Text>} name="description">
            <Input.TextArea size="large" rows={3} placeholder="Brief details about this classification..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* QUICK ADD LOCATION MODAL */}
      <Modal
        title={
          <Space>
            <EnvironmentOutlined style={{ color: token.colorPrimary }} />
            <span>Add Station / Location</span>
          </Space>
        }
        open={isLocationModalOpen}
        onCancel={() => {
          locationForm.resetFields()
          setIsLocationModalOpen(false)
        }}
        onOk={() => locationForm.submit()}
        confirmLoading={createLocationMutation.isPending}
        okText="Add Location"
        cancelText="Cancel"
        destroyOnClose
      >
        <Form
          form={locationForm}
          layout="vertical"
          size="large"
          requiredMark={false}
          initialValues={{
            city: '',
            phone: '',
          }}
          onFinish={(values) => createLocationMutation.mutate(values)}
        >
          <Form.Item
            label={<Text strong>Location Name</Text>}
            name="name"
            rules={[{ required: true, message: 'Location name is required' }]}
          >
            <Input size="large" placeholder="e.g. Pokhara Airport Branch, Lakeside Station" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label={<Text strong>City</Text>}
                name="city"
                rules={[{ required: true, message: 'City is required' }]}
              >
                <Input size="large" placeholder="e.g. Kathmandu, Pokhara, Chitwan" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label={<Text strong>Phone</Text>} name="phone">
                <Input size="large" placeholder="e.g. +977-1-4700000" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label={<Text strong>Street Address</Text>}
            name="address"
            rules={[{ required: true, message: 'Address is required' }]}
          >
            <Input size="large" placeholder="e.g. Airport Road, Ward 4" />
          </Form.Item>
        </Form>
      </Modal>

      {/* REUSABLE IMAGE CROPPER MODAL FOR VEHICLE PHOTOS */}
      <ImageCropperModal
        open={cropperOpen}
        imageSrc={cropTarget?.src || null}
        title="Crop & Adjust Vehicle Photo"
        aspectRatio={16 / 9}
        onClose={() => {
          setCropperOpen(false)
          setCropTarget(null)
        }}
        onCropComplete={handleCropComplete}
      />

      {/* REUSABLE IMAGE CROPPER MODAL FOR DOCUMENT SCANS */}
      <ImageCropperModal
        open={docCropperOpen}
        imageSrc={docCropTarget?.src || null}
        title={`Crop & Adjust Document ${
          docCropTarget !== null
            ? docCropTarget.pageIndex === 0
              ? 'Page 1 (Front)'
              : docCropTarget.pageIndex === 1
              ? 'Page 2 (Back)'
              : `Page ${docCropTarget.pageIndex + 1}`
            : ''
        }`}
        aspectRatio={3 / 4}
        allowAspectChange={true}
        onClose={() => {
          setDocCropperOpen(false)
          setDocCropTarget(null)
        }}
        onCropComplete={handleDocCropComplete}
      />

      {/* REUSABLE FLEET MEDIA LIBRARY MODAL */}
      <MediaLibraryModal
        open={mediaLibraryOpen}
        onClose={() => setMediaLibraryOpen(false)}
        currentSelected={vehicleImages}
        multiple={true}
        onSelect={(selectedUrls) => {
          setVehicleImages((prev) => {
            const existing = prev || []
            const uniqueNew = selectedUrls.filter((u) => !existing.includes(u))
            const updated = [...existing, ...uniqueNew]
            form.setFieldValue('images', updated)
            return updated
          })
          setPrimaryImage((prev) => {
            const primary = prev || selectedUrls[0]
            form.setFieldValue('primaryImage', primary)
            return primary
          })
          message.success(`Added ${selectedUrls.length} photo${selectedUrls.length > 1 ? 's' : ''} to vehicle gallery`)
        }}
      />
    </PageContainer>
  )
}
