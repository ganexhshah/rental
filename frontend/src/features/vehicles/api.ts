import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api/client'
import { mockDb } from '@/lib/api/mockDb'
import type {
  Vehicle,
  VehicleCategory,
  VehicleTypeDefinition,
  VehicleLocation,
  VehicleFilterParams,
  VehicleDocument,
  DocumentSummaryStats,
  CreateVehicleDocumentInput,
} from '@/types/vehicle'

function mapBackendDocument(d: any): VehicleDocument {
  return {
    id: d.id,
    tenantId: d.tenant_id,
    vehicleId: d.vehicle_id,
    vehiclePlate: d.vehicle_plate,
    vehicleName: d.vehicle_name,
    name: d.name,
    docType: d.doc_type || 'other',
    type: d.doc_type || 'other',
    documentNumber: d.document_number,
    issuingAuthority: d.issuing_authority,
    fileUrl: d.file_url,
    fileUrls: d.file_urls || (d.file_url ? [d.file_url] : []),
    fileName: d.file_name,
    fileNames: d.file_names || (d.file_name ? [d.file_name] : []),
    fileSize: d.file_size,
    mimeType: d.mime_type,
    issueDate: d.issue_date,
    expiryDate: d.expiry_date,
    status: d.status || 'valid',
    verificationStatus: d.verification_status || 'pending',
    verifiedBy: d.verified_by,
    verifiedAt: d.verified_at,
    version: d.version || 1,
    notes: d.notes,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
  }
}

function mapBackendVehicle(v: any): Vehicle {
  return {
    id: v.id,
    tenantId: v.tenant_id,
    plateNumber: v.plate_number,
    make: v.make,
    model: v.model,
    year: v.year,
    type: v.vehicle_type || 'car',
    categoryId: v.category_id,
    categoryName: v.category_name,
    locationId: v.location_id,
    locationName: v.location_name,
    status: v.status || 'available',
    pricing: {
      dailyRate: Number(v.daily_rate) || 0,
      weeklyRate: Number(v.weekly_rate) || 0,
      monthlyRate: Number(v.monthly_rate) || 0,
      depositAmount: Number(v.deposit_amount) || 0,
      allowedKmPerDay: v.allowed_km_per_day || 200,
      extraKmRate: Number(v.extra_km_rate) || 20,
    },
    specs: {
      seatingCapacity: v.seating_capacity || 5,
      transmission: v.transmission || 'automatic',
      fuelType: v.fuel_type || 'petrol',
      mileageOdometer: v.odometer || 0,
      year: v.year || 2024,
      color: v.specs?.color || 'Standard',
      vinOrChassisNumber: v.plate_number,
      hasAC: v.specs?.hasAC,
      hasGPS: v.specs?.hasGPS,
      hasBluetooth: v.specs?.hasBluetooth,
      helmetIncluded: v.specs?.helmetIncluded,
      features: v.specs?.features || v.features || [],
    },
    images: Array.isArray(v.images) && v.images.length > 0
      ? v.images
      : v.primary_image
      ? [v.primary_image]
      : ['https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80'],
    primaryImage: v.primary_image || (Array.isArray(v.images) && v.images[0]) || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80',
    documents: Array.isArray(v.documents) ? v.documents.map(mapBackendDocument) : [],
    damages: Array.isArray(v.damages) ? v.damages : [],
    notes: v.notes,
    createdAt: v.created_at || new Date().toISOString(),
    updatedAt: v.updated_at || new Date().toISOString(),
  }
}

function mapBackendCategory(c: any): VehicleCategory {
  return {
    id: c.id,
    name: c.name,
    type: c.vehicle_type || 'car',
    description: c.description || '',
    baseDailyRate: c.base_daily_rate ? Number(c.base_daily_rate) : undefined,
  }
}

function mapBackendLocation(l: any): VehicleLocation {
  return {
    id: l.id,
    name: l.name,
    code: l.code,
    address: l.address || '',
    city: l.city || 'Kathmandu',
    contactPhone: l.phone || '',
  }
}

export const vehiclesApi = {
  getVehicles: async (params?: VehicleFilterParams): Promise<Vehicle[]> => {
    try {
      const backendList = await apiGet<any[]>('/vehicles')
      if (Array.isArray(backendList)) {
        let list = backendList.map(mapBackendVehicle)
        if (params?.search) {
          const q = params.search.toLowerCase()
          list = list.filter(
            (v) =>
              v.plateNumber?.toLowerCase().includes(q) ||
              v.make?.toLowerCase().includes(q) ||
              v.model?.toLowerCase().includes(q)
          )
        }
        if (params?.type && params.type !== 'all') {
          list = list.filter((v) => v.type === params.type)
        }
        if (params?.categoryId && params.categoryId !== 'all') {
          list = list.filter((v) => v.categoryId === params.categoryId)
        }
        if (params?.status && params.status !== 'all') {
          list = list.filter((v) => v.status === params.status)
        }
        return list
      }
    } catch (e) {
      console.warn('Live backend vehicles error, using fallback:', e)
    }

    let list = [...mockDb.get('vehicles')]
    if (params?.search) {
      const q = params.search.toLowerCase()
      list = list.filter(
        (v) =>
          v.plateNumber?.toLowerCase().includes(q) ||
          v.make?.toLowerCase().includes(q) ||
          v.model?.toLowerCase().includes(q)
      )
    }
    if (params?.type && params.type !== 'all') {
      list = list.filter((v) => v.type === params.type)
    }
    if (params?.categoryId && params.categoryId !== 'all') {
      list = list.filter((v) => v.categoryId === params.categoryId)
    }
    if (params?.status && params.status !== 'all') {
      list = list.filter((v) => v.status === params.status)
    }
    return list
  },

  getVehicleById: async (id: string): Promise<Vehicle | null> => {
    try {
      const v = await apiGet<any>(`/vehicles/${id}`)
      if (v && v.id) {
        const vehicle = mapBackendVehicle(v)
        try {
          const docs = await apiGet<any[]>(`/vehicles/${id}/documents`)
          if (Array.isArray(docs)) {
            vehicle.documents = docs.map(mapBackendDocument)
          }
        } catch (_) {}
        return vehicle
      }
    } catch (e) {
      console.warn('Live backend getVehicleById error:', e)
    }
    const list = mockDb.get('vehicles')
    const found = list.find((v) => v.id === id)
    if (found && found.documents) {
      found.documents = found.documents.map((d) => ({
        ...d,
        vehiclePlate: d.vehiclePlate || found.plateNumber,
        vehicleName: d.vehicleName || `${found.make} ${found.model}`.trim(),
      }))
    }
    return found || null
  },

  createVehicle: async (data: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>): Promise<Vehicle> => {
    try {
      const payload = {
        category_id: data.categoryId,
        location_id: data.locationId,
        make: data.make,
        model: data.model,
        year: data.year,
        plate_number: data.plateNumber,
        vehicle_type: data.type,
        daily_rate: data.pricing?.dailyRate || 0,
        weekly_rate: data.pricing?.weeklyRate || 0,
        monthly_rate: data.pricing?.monthlyRate || 0,
        deposit_amount: data.pricing?.depositAmount || 0,
        allowed_km_per_day: data.pricing?.allowedKmPerDay || 0,
        extra_km_rate: data.pricing?.extraKmRate || 0,
        fuel_type: data.specs?.fuelType || 'petrol',
        transmission: data.specs?.transmission || 'automatic',
        seating_capacity: data.specs?.seatingCapacity || 5,
        odometer: data.specs?.mileageOdometer || 0,
        primary_image: data.primaryImage,
        specs: data.specs || {},
        notes: data.notes || '',
      }
      const created = await apiPost<any>('/vehicles', payload)
      if (created && created.id) {
        return mapBackendVehicle(created)
      }
    } catch (e) {
      console.warn('Live backend createVehicle error, saving to mockDb:', e)
    }

    const list = mockDb.get('vehicles')
    const newVehicle: Vehicle = {
      ...data,
      id: `veh-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    mockDb.set('vehicles', [newVehicle, ...list])
    return newVehicle
  },

  updateVehicle: async (id: string, partial: Partial<Vehicle>): Promise<Vehicle> => {
    try {
      const payload: any = {}
      if (partial.make) payload.make = partial.make
      if (partial.model) payload.model = partial.model
      if (partial.year) payload.year = partial.year
      if (partial.status) payload.status = partial.status
      if (partial.type) payload.vehicle_type = partial.type
      if (partial.categoryId) payload.category_id = partial.categoryId
      if (partial.locationId) payload.location_id = partial.locationId
      if (partial.pricing?.dailyRate !== undefined) payload.daily_rate = partial.pricing.dailyRate
      if (partial.pricing?.weeklyRate !== undefined) payload.weekly_rate = partial.pricing.weeklyRate
      if (partial.pricing?.monthlyRate !== undefined) payload.monthly_rate = partial.pricing.monthlyRate
      if (partial.pricing?.depositAmount !== undefined) payload.deposit_amount = partial.pricing.depositAmount
      if (partial.pricing?.allowedKmPerDay !== undefined) payload.allowed_km_per_day = partial.pricing.allowedKmPerDay
      if (partial.pricing?.extraKmRate !== undefined) payload.extra_km_rate = partial.pricing.extraKmRate
      if (partial.primaryImage) payload.primary_image = partial.primaryImage
      if (partial.specs) payload.specs = partial.specs
      if (partial.notes !== undefined) payload.notes = partial.notes
      const updated = await apiPatch<any>(`/vehicles/${id}`, payload)
      if (updated && updated.id) return mapBackendVehicle(updated)
    } catch (e) {
      console.warn('Live backend updateVehicle error:', e)
    }

    const list = mockDb.get('vehicles')
    const index = list.findIndex((v) => v.id === id)
    if (index === -1) throw new Error('Vehicle not found')
    const updated = {
      ...list[index],
      ...partial,
      updatedAt: new Date().toISOString(),
    }
    list[index] = updated
    mockDb.set('vehicles', [...list])
    return updated
  },

  deleteVehicle: async (id: string): Promise<boolean> => {
    try {
      await apiDelete(`/vehicles/${id}`)
    } catch (e) {
      console.warn('Live backend deleteVehicle error:', e)
    }
    const list = mockDb.get('vehicles')
    mockDb.set('vehicles', list.filter((v) => v.id !== id))
    return true
  },

  getCategories: async (): Promise<VehicleCategory[]> => {
    let list: VehicleCategory[] = []
    try {
      const cats = await apiGet<any[]>('/vehicles/categories')
      if (Array.isArray(cats) && cats.length > 0) {
        list = cats.map(mapBackendCategory)
      }
    } catch (e) {
      console.warn('Live backend getCategories error:', e)
    }
    if (list.length === 0) {
      list = [...mockDb.get('categories')]
    }
    const vehicles = mockDb.get('vehicles') || []
    return list.map((cat) => ({
      ...cat,
      count: vehicles.filter(
        (v) => v.categoryId === cat.id || (v.categoryName && cat.name && v.categoryName.toLowerCase() === cat.name.toLowerCase())
      ).length,
    }))
  },

  saveCategory: async (category: Omit<VehicleCategory, 'id'> & { id?: string }): Promise<VehicleCategory> => {
    try {
      const payload = {
        name: category.name,
        slug: (category.name || '').toLowerCase().replace(/\s+/g, '-'),
        vehicle_type: category.type,
        base_daily_rate: category.baseDailyRate !== undefined && category.baseDailyRate !== null ? Number(category.baseDailyRate) : 0,
        description: category.description,
      }
      const saved = await apiPost<any>('/vehicles/categories', payload)
      if (saved && saved.id) return mapBackendCategory(saved)
    } catch (e) {
      console.warn('Live backend saveCategory error:', e)
    }

    const list = mockDb.get('categories')
    if (category.id) {
      const idx = list.findIndex((c) => c.id === category.id)
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...category }
        mockDb.set('categories', [...list])
        return list[idx]
      }
    }
    const created: VehicleCategory = {
      ...category,
      id: `cat-${Date.now()}`,
    }
    mockDb.set('categories', [...list, created])
    return created
  },

  deleteCategory: async (id: string): Promise<boolean> => {
    const list = mockDb.get('categories')
    mockDb.set('categories', list.filter((c) => c.id !== id))
    return true
  },

  getVehicleTypes: async (): Promise<VehicleTypeDefinition[]> => {
    let types = mockDb.get('vehicleTypes')
    if (!Array.isArray(types)) {
      types = [
        { id: 'vtype-car', key: 'car', name: 'Car / SUV / EV', icon: '🚗', description: 'Four-wheel passenger automobiles, SUVs, hatchbacks, and sedans' },
        { id: 'vtype-bike', key: 'bike', name: 'Motorcycle / Bike', icon: '🏍️', description: 'Two-wheel motorbikes, cruisers, and adventure tourers' },
        { id: 'vtype-scooter', key: 'scooter', name: 'Scooter', icon: '🛵', description: 'Two-wheel automatic city commuter scooters' },
        { id: 'vtype-van', key: 'van', name: 'Van / Microbus', icon: '🚐', description: 'Multi-passenger transport vans and tourist microbuses' },
      ]
      mockDb.set('vehicleTypes', types)
    }

    const categories = mockDb.get('categories') || []
    const vehicles = mockDb.get('vehicles') || []

    return types.map((t) => ({
      ...t,
      categoriesCount: categories.filter((c) => c.type?.toLowerCase() === t.key?.toLowerCase()).length,
      vehiclesCount: vehicles.filter((v) => v.type?.toLowerCase() === t.key?.toLowerCase()).length,
    }))
  },

  saveVehicleType: async (typeDef: Omit<VehicleTypeDefinition, 'id'> & { id?: string }): Promise<VehicleTypeDefinition> => {
    let list = mockDb.get('vehicleTypes')
    if (!Array.isArray(list)) {
      list = []
    }
    const key = (typeDef.key || (typeDef.name ? typeDef.name.toLowerCase().replace(/[^a-z0-9]/g, '-') : 'type')).toLowerCase()

    if (typeDef.id) {
      const idx = list.findIndex((t) => t.id === typeDef.id || t.key === typeDef.id)
      if (idx !== -1) {
        list[idx] = {
          ...list[idx],
          ...typeDef,
          key,
        }
        mockDb.set('vehicleTypes', [...list])
        return list[idx]
      }
    }

    const created: VehicleTypeDefinition = {
      ...typeDef,
      id: `vtype-${Date.now()}`,
      key,
      createdAt: new Date().toISOString(),
    }
    mockDb.set('vehicleTypes', [...list, created])
    return created
  },

  deleteVehicleType: async (id: string): Promise<boolean> => {
    let list = mockDb.get('vehicleTypes')
    if (!Array.isArray(list)) {
      list = [
        { id: 'vtype-car', key: 'car', name: 'Car / SUV / EV', icon: '🚗', description: 'Four-wheel passenger automobiles, SUVs, hatchbacks, and sedans' },
        { id: 'vtype-bike', key: 'bike', name: 'Motorcycle / Bike', icon: '🏍️', description: 'Two-wheel motorbikes, cruisers, and adventure tourers' },
        { id: 'vtype-scooter', key: 'scooter', name: 'Scooter', icon: '🛵', description: 'Two-wheel automatic city commuter scooters' },
        { id: 'vtype-van', key: 'van', name: 'Van / Microbus', icon: '🚐', description: 'Multi-passenger transport vans and tourist microbuses' },
      ]
    }
    const filtered = list.filter((t) => t.id !== id && t.key !== id)
    mockDb.set('vehicleTypes', filtered)
    return true
  },

  getLocations: async (): Promise<VehicleLocation[]> => {
    try {
      const locs = await apiGet<any[]>('/vehicles/locations')
      if (Array.isArray(locs)) {
        return locs.map(mapBackendLocation)
      }
    } catch (e) {
      console.warn('Backend getLocations error:', e)
    }
    return []
  },

  deleteLocation: async (id: string): Promise<boolean> => {
    try {
      await apiDelete(`/vehicles/locations/${id}`)
    } catch (e) {
      console.warn('Live backend deleteLocation error, updating mockDb:', e)
    }
    const list = mockDb.get('locations')
    mockDb.set('locations', list.filter((l) => l.id !== id))
    return true
  },

  saveLocation: async (location: Omit<VehicleLocation, 'id'> & { id?: string }): Promise<VehicleLocation> => {
    try {
      const payload = {
        name: location.name,
        code: location.code,
        address: location.address,
        city: location.city,
        phone: location.contactPhone,
      }
      const saved = await apiPost<any>('/vehicles/locations', payload)
      if (saved && saved.id) return mapBackendLocation(saved)
    } catch (e) {
      console.warn('Live backend saveLocation error:', e)
    }

    const list = mockDb.get('locations')
    if (location.id) {
      const idx = list.findIndex((l) => l.id === location.id)
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...location }
        mockDb.set('locations', [...list])
        return list[idx]
      }
    }
    const created: VehicleLocation = {
      ...location,
      id: `loc-${Date.now()}`,
    }
    mockDb.set('locations', [...list, created])
    return created
  },

  getAllDocuments: async (params?: {
    vehicleId?: string
    docType?: string
    status?: string
    verificationStatus?: string
    search?: string
  }): Promise<VehicleDocument[]> => {
    try {
      const q = new URLSearchParams()
      if (params?.vehicleId) q.append('vehicle_id', params.vehicleId)
      if (params?.docType) q.append('doc_type', params.docType)
      if (params?.status) q.append('status', params.status)
      if (params?.verificationStatus) q.append('verification_status', params.verificationStatus)
      if (params?.search) q.append('search', params.search)
      const queryStr = q.toString() ? `?${q.toString()}` : ''

      const res = await apiGet<any[]>(`/vehicle-documents${queryStr}`)
      if (Array.isArray(res)) {
        return res.map(mapBackendDocument)
      }
    } catch (e) {
      console.warn('Live backend getAllDocuments error, fallback:', e)
    }

    const list = mockDb.get('vehicles')
    let hasHealed = false
    let allDocs: VehicleDocument[] = []
    list.forEach((v) => {
      if (v.documents && v.documents.length > 0) {
        v.documents.forEach((d) => {
          if (!d.vehiclePlate && v.plateNumber) {
            d.vehiclePlate = v.plateNumber
            hasHealed = true
          }
          if (!d.vehicleName && (v.make || v.model)) {
            d.vehicleName = `${v.make || ''} ${v.model || ''}`.trim()
            hasHealed = true
          }
          allDocs.push({
            ...d,
            vehiclePlate: d.vehiclePlate || v.plateNumber,
            vehicleName: d.vehicleName || `${v.make || ''} ${v.model || ''}`.trim(),
          })
        })
      }
    })

    if (hasHealed) {
      mockDb.set('vehicles', [...list])
    }

    if (params?.vehicleId && params.vehicleId !== 'all') {
      allDocs = allDocs.filter((d) => d.vehicleId === params.vehicleId)
    }
    if (params?.docType && params.docType !== 'all') {
      allDocs = allDocs.filter((d) => d.docType === params.docType || d.type === params.docType)
    }
    if (params?.status && params.status !== 'all') {
      allDocs = allDocs.filter((d) => d.status === params.status)
    }
    if (params?.verificationStatus && params.verificationStatus !== 'all') {
      allDocs = allDocs.filter((d) => d.verificationStatus === params.verificationStatus)
    }
    if (params?.search) {
      const s = params.search.toLowerCase()
      allDocs = allDocs.filter(
        (d) =>
          d.name?.toLowerCase().includes(s) ||
          d.documentNumber?.toLowerCase().includes(s) ||
          d.vehiclePlate?.toLowerCase().includes(s) ||
          d.vehicleName?.toLowerCase().includes(s)
      )
    }

    return allDocs
  },

  getDocumentSummary: async (): Promise<DocumentSummaryStats> => {
    try {
      const res = await apiGet<any>('/vehicle-documents/summary')
      if (res) {
        return {
          totalDocuments: res.total_documents || 0,
          validDocuments: res.valid_documents || 0,
          expiringSoon: res.expiring_soon || 0,
          expiredDocuments: res.expired_documents || 0,
          pendingVerification: res.pending_verification || 0,
        }
      }
    } catch (e) {
      console.warn('Live backend getDocumentSummary error:', e)
    }
    const list = mockDb.get('vehicles')
    let total = 0
    let valid = 0
    let expiring = 0
    let expired = 0
    let pending = 0
    list.forEach((v) => {
      if (v.documents) {
        v.documents.forEach((d) => {
          total++
          if (d.status === 'valid') valid++
          else if (d.status === 'expiring_soon') expiring++
          else if (d.status === 'expired') expired++
          if (d.verificationStatus === 'pending') pending++
        })
      }
    })
    return {
      totalDocuments: total,
      validDocuments: valid,
      expiringSoon: expiring,
      expiredDocuments: expired,
      pendingVerification: pending,
    }
  },

  createDocument: async (input: CreateVehicleDocumentInput): Promise<VehicleDocument> => {
    try {
      const payload = {
        vehicle_id: input.vehicleId,
        doc_type: input.docType,
        name: input.name,
        document_number: input.documentNumber || '',
        issuing_authority: input.issuingAuthority || '',
        file_url: input.fileUrl,
        file_name: input.fileName || '',
        file_size: input.fileSize || 0,
        mime_type: input.mimeType || 'application/pdf',
        issue_date: input.issueDate ? new Date(input.issueDate).toISOString() : null,
        expiry_date: input.expiryDate ? new Date(input.expiryDate).toISOString() : null,
        notes: input.notes || '',
      }
      const res = await apiPost<any>('/vehicle-documents', payload)
      if (res && res.id) {
        const doc = mapBackendDocument(res)
        if (!doc.vehiclePlate && input.vehiclePlate) {
          doc.vehiclePlate = input.vehiclePlate
        }
        if (!doc.vehicleName && input.vehicleName) {
          doc.vehicleName = input.vehicleName
        }
        return doc
      }
    } catch (e) {
      console.warn('Live backend createDocument error, fallback to mockDb:', e)
    }

    const list = mockDb.get('vehicles')
    const vIndex = list.findIndex((v) => v.id === input.vehicleId)
    const matchedVehicle = vIndex !== -1 ? list[vIndex] : null
    const plateNumber = input.vehiclePlate || matchedVehicle?.plateNumber || ''
    const vehicleName = input.vehicleName || (matchedVehicle ? `${matchedVehicle.make} ${matchedVehicle.model}`.trim() : '')

    const newDoc: VehicleDocument = {
      id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      vehicleId: input.vehicleId,
      vehiclePlate: plateNumber,
      vehicleName: vehicleName,
      name: input.name,
      docType: input.docType,
      type: input.docType,
      documentNumber: input.documentNumber,
      issuingAuthority: input.issuingAuthority,
      fileUrl: input.fileUrl,
      fileUrls: input.fileUrls || (input.fileUrl ? [input.fileUrl] : []),
      fileName: input.fileName || 'document.pdf',
      fileNames: input.fileNames || (input.fileName ? [input.fileName] : ['document.pdf']),
      fileSize: input.fileSize || 102400,
      mimeType: input.mimeType || 'application/pdf',
      issueDate: input.issueDate,
      expiryDate: input.expiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'valid',
      verificationStatus: 'verified',
      version: 1,
      notes: input.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    if (vIndex !== -1) {
      const v = list[vIndex]
      const docs = v.documents || []
      v.documents = [...docs, newDoc]
      mockDb.set('vehicles', [...list])
    }
    return newDoc
  },

  verifyDocument: async (
    id: string,
    verificationStatus: 'verified' | 'rejected' | 'pending',
    auditorNotes?: string
  ): Promise<VehicleDocument> => {
    try {
      const res = await apiPost<any>(`/vehicle-documents/${id}/verify`, {
        verification_status: verificationStatus,
        auditor_notes: auditorNotes || '',
      })
      if (res && res.id) return mapBackendDocument(res)
    } catch (e) {
      console.warn('Live backend verifyDocument error, fallback to mockDb:', e)
    }
    const list = mockDb.get('vehicles')
    for (const v of list) {
      if (v.documents) {
        const d = v.documents.find((doc) => doc.id === id)
        if (d) {
          d.verificationStatus = verificationStatus
          if (auditorNotes) d.notes = auditorNotes
          mockDb.set('vehicles', [...list])
          return d
        }
      }
    }
    throw new Error('Document not found')
  },

  deleteDocument: async (id: string): Promise<boolean> => {
    try {
      await apiDelete(`/vehicle-documents/${id}`)
    } catch (e) {
      console.warn('Live backend deleteDocument error, updating mockDb:', e)
    }
    const list = mockDb.get('vehicles')
    let found = false
    list.forEach((v) => {
      if (v.documents && v.documents.some((d) => d.id === id)) {
        v.documents = v.documents.filter((d) => d.id !== id)
        found = true
      }
    })
    if (found) {
      mockDb.set('vehicles', [...list])
    }
    return true
  },

  getVehicleDocuments: async (vehicleId: string): Promise<VehicleDocument[]> => {
    try {
      const res = await apiGet<any[]>(`/vehicles/${vehicleId}/documents`)
      if (Array.isArray(res)) {
        return res.map(mapBackendDocument)
      }
    } catch (e) {
      console.warn('Live backend getVehicleDocuments error:', e)
    }
    const list = mockDb.get('vehicles')
    const v = list.find((item) => item.id === vehicleId)
    const docs = v?.documents || []
    return docs.map((d) => ({
      ...d,
      vehiclePlate: d.vehiclePlate || v?.plateNumber,
      vehicleName: d.vehicleName || (v ? `${v.make} ${v.model}`.trim() : undefined),
    }))
  },
}

