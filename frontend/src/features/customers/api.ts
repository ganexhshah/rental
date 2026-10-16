import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api/client'
import { mockDb } from '@/lib/api/mockDb'
import type {
  Customer,
  CustomerFilterParams,
  CustomerVerificationStatus,
  CustomerDocument,
  CustomerDriver,
  CustomerSummaryStats,
  CustomerDocumentSummaryStats,
  CreateCustomerInput,
  CreateCustomerDocumentInput,
  CreateDriverInput,
} from '@/types/customer'
import type { Booking } from '@/types/booking'

function mapBackendCustomer(c: any): Customer {
  return {
    id: c.id,
    tenantId: c.tenant_id,
    customerType: c.customer_type || 'individual',
    customerCode: c.customer_code,
    fullName: c.full_name,
    firstName: c.first_name,
    middleName: c.middle_name,
    lastName: c.last_name,
    preferredName: c.preferred_name,
    email: c.email,
    phone: c.phone,
    secondaryPhone: c.secondary_phone,
    dateOfBirth: c.date_of_birth,
    gender: c.gender,
    nationality: c.nationality || 'Nepalese',
    originType: c.origin_type || (c.is_international ? 'international' : 'national'),
    isInternational: Boolean(c.is_international || c.origin_type === 'international'),
    profilePhoto: c.profile_photo,
    avatarUrl: c.profile_photo || undefined,
    status: c.status || 'active',
    verificationStatus: c.verification_status || 'pending',
    rentalEligibilityStatus: c.rental_eligibility_status || 'eligible',
    address: c.address || '',
    currentAddress: c.current_address || c.currentAddress || '',
    permanentAddress: c.permanent_address || c.permanentAddress || '',
    country: c.country || 'Nepal',
    province: c.province || 'Bagmati',
    districtCity: c.district_city || 'Kathmandu',
    city: c.district_city || 'Kathmandu',
    postalCode: c.postal_code,
    billingAddress: c.billing_address,
    companyName: c.company_name,
    companyTaxId: c.company_tax_id,
    licenseNumber: c.license_number || '',
    licenseCategory: c.license_category || 'B',
    licenseExpiry: c.license_expiry,
    passportNumber: c.passport_number || c.passportNumber,
    passportExpiry: c.passport_expiry || c.passportExpiry,
    visaType: c.visa_type || c.visaType,
    visaExpiry: c.visa_expiry || c.visaExpiry,
    idpNumber: c.idp_number || c.idpNumber,
    citizenshipNumber: c.citizenship_number || c.citizenshipNumber,
    emergencyContactName: c.emergency_contact_name,
    emergencyContactRelationship: c.emergency_contact_relationship,
    emergencyContactPhone: c.emergency_contact_phone,
    isBlacklisted: Boolean(c.is_blacklisted),
    blacklistStatus: c.is_blacklisted ? 'blacklisted' : 'clean',
    blacklistReason: c.blacklist_reason,
    blacklistedAt: c.blacklisted_at,
    blacklistedBy: c.blacklisted_by,
    totalBookingsCount: c.total_bookings_count || 0,
    totalSpent: Number(c.total_spent) || 0,
    outstandingBalance: Number(c.outstanding_balance) || 0,
    rating: 5.0,
    documents: [],
    drivers: [],
    notes: c.notes || '',
    createdAt: c.created_at || new Date().toISOString(),
    updatedAt: c.updated_at || new Date().toISOString(),
  }
}

function mapBackendCustomerDocument(d: any): CustomerDocument {
  return {
    id: d.id,
    tenantId: d.tenant_id,
    customerId: d.customer_id,
    customerName: d.customer_name,
    customerEmail: d.customer_email,
    driverId: d.driver_id,
    driverName: d.driver_name,
    docType: d.doc_type || 'other',
    name: d.name,
    title: d.name,
    documentNumber: d.document_number,
    issuingAuthority: d.issuing_authority,
    fileUrl: d.file_url,
    fileName: d.file_name,
    fileSize: d.file_size,
    mimeType: d.mime_type,
    issueDate: d.issue_date,
    expiryDate: d.expiry_date,
    status: d.status || 'valid',
    verificationStatus: d.verification_status || 'pending',
    rejectionReason: d.rejection_reason,
    verifiedBy: d.verified_by,
    verifiedAt: d.verified_at,
    version: d.version || 1,
    notes: d.notes,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
  }
}

function mapBackendDriver(drv: any): CustomerDriver {
  return {
    id: drv.id,
    tenantId: drv.tenant_id,
    customerId: drv.customer_id,
    customerName: drv.customer_name,
    fullName: drv.full_name,
    phone: drv.phone,
    email: drv.email,
    dateOfBirth: drv.date_of_birth,
    relationship: drv.relationship || 'authorized_driver',
    licenseNumber: drv.license_number,
    licenseCategory: drv.license_category || 'B',
    licenseIssueDate: drv.license_issue_date,
    licenseExpiryDate: drv.license_expiry_date,
    verificationStatus: drv.verification_status || 'pending',
    notes: drv.notes,
    createdAt: drv.created_at,
    updatedAt: drv.updated_at,
  }
}

export const customersApi = {
  getCustomers: async (params?: CustomerFilterParams): Promise<Customer[]> => {
    try {
      const q = new URLSearchParams()
      if (params?.search) q.append('search', params.search)
      if (params?.verificationStatus && params.verificationStatus !== 'all') {
        q.append('verification_status', params.verificationStatus)
      }
      if (params?.customerType && params.customerType !== 'all') {
        q.append('customer_type', params.customerType)
      }
      if (params?.status && params.status !== 'all') {
        q.append('status', params.status)
      }
      if (params?.isBlacklisted !== undefined) {
        q.append('is_blacklisted', String(params.isBlacklisted))
      } else if (params?.blacklistStatus && params.blacklistStatus !== 'all') {
        q.append('is_blacklisted', String(params.blacklistStatus === 'blacklisted'))
      }

      const queryStr = q.toString() ? `?${q.toString()}` : ''
      const res = await apiGet<any>(`/customers${queryStr}`)
      const rawList = Array.isArray(res) ? res : res?.data || []
      if (Array.isArray(rawList)) {
        return rawList.map(mapBackendCustomer)
      }
    } catch (e) {
      console.warn('Live backend customers error, falling back:', e)
    }

    let list = [...mockDb.get('customers')]
    if (params?.search) {
      const s = params.search.toLowerCase()
      list = list.filter(
        (c) =>
          c.fullName?.toLowerCase().includes(s) ||
          c.email?.toLowerCase().includes(s) ||
          c.phone?.toLowerCase().includes(s)
      )
    }
    if (params?.verificationStatus && params.verificationStatus !== 'all') {
      list = list.filter((c) => c.verificationStatus === params.verificationStatus)
    }
    if (params?.blacklistStatus && params.blacklistStatus !== 'all') {
      list = list.filter((c) => c.blacklistStatus === params.blacklistStatus)
    }
    return list
  },

  getCustomerSummary: async (): Promise<CustomerSummaryStats> => {
    try {
      const res = await apiGet<any>('/customers/summary')
      if (res) {
        return {
          totalCustomers: res.total_customers || 0,
          activeCustomers: res.active_customers || 0,
          pendingVerification: res.pending_verification || 0,
          blacklistedCustomers: res.blacklisted_customers || 0,
        }
      }
    } catch (e) {
      console.warn('Live backend getCustomerSummary error:', e)
    }
    return {
      totalCustomers: 0,
      activeCustomers: 0,
      pendingVerification: 0,
      blacklistedCustomers: 0,
    }
  },

  getCustomerById: async (id: string): Promise<Customer | null> => {
    try {
      const c = await apiGet<any>(`/customers/${id}`)
      if (c && c.id) {
        const customer = mapBackendCustomer(c)
        try {
          const [docs, drivers] = await Promise.all([
            apiGet<any[]>(`/customers/${id}/documents`).catch(() => []),
            apiGet<any[]>(`/customers/${id}/drivers`).catch(() => []),
          ])
          if (Array.isArray(docs)) {
            customer.documents = docs.map(mapBackendCustomerDocument)
          }
          if (Array.isArray(drivers)) {
            customer.drivers = drivers.map(mapBackendDriver)
          }
        } catch (_) {}
        return customer
      }
    } catch (e) {
      console.warn('Live backend getCustomerById error:', e)
    }
    const list = mockDb.get('customers')
    return list.find((c) => c.id === id) || null
  },

  createCustomer: async (input: CreateCustomerInput): Promise<Customer> => {
    const payload = {
      customer_type: input.customerType || 'individual',
      customer_code: input.customerCode || '',
      full_name: input.fullName,
      first_name: input.firstName || '',
      middle_name: input.middleName || '',
      last_name: input.lastName || '',
      preferred_name: input.preferredName || '',
      email: input.email,
      phone: input.phone,
      secondary_phone: input.secondaryPhone || '',
      date_of_birth: input.dateOfBirth ? new Date(input.dateOfBirth).toISOString() : null,
      gender: input.gender || '',
      nationality: input.nationality || (input.originType === 'international' ? 'International' : 'Nepalese'),
      origin_type: input.originType || (input.isInternational ? 'international' : 'national'),
      is_international: Boolean(input.isInternational || input.originType === 'international'),
      address: input.address || input.permanentAddress || input.currentAddress || '',
      current_address: input.currentAddress || '',
      permanent_address: input.permanentAddress || '',
      country: input.country || (input.originType === 'international' ? 'Foreign' : 'Nepal'),
      province: input.province || 'Bagmati',
      district_city: input.districtCity || 'Kathmandu',
      postal_code: input.postalCode || '',
      billing_address: input.billingAddress || '',
      company_name: input.companyName || '',
      company_tax_id: input.companyTaxId || '',
      license_number: input.licenseNumber || '',
      license_category: input.licenseCategory || 'B',
      license_expiry: input.licenseExpiry ? new Date(input.licenseExpiry).toISOString() : null,
      passport_number: input.passportNumber || '',
      passport_expiry: input.passportExpiry ? new Date(input.passportExpiry).toISOString() : null,
      visa_type: input.visaType || '',
      visa_expiry: input.visaExpiry ? new Date(input.visaExpiry).toISOString() : null,
      idp_number: input.idpNumber || '',
      citizenship_number: input.citizenshipNumber || '',
      emergency_contact_name: input.emergencyContactName || '',
      emergency_contact_relationship: input.emergencyContactRelationship || '',
      emergency_contact_phone: input.emergencyContactPhone || '',
      notes: input.notes || '',
    }
    try {
      const created = await apiPost<any>('/customers', payload)
      if (created) {
        return mapBackendCustomer(created)
      }
    } catch (err) {
      console.warn('Live backend createCustomer error, using local mockDb fallback:', err)
    }

    const fallbackCust: Customer = {
      id: `cust-local-${Date.now()}`,
      tenantId: 'tenant-default',
      customerType: (input.customerType as any) || 'individual',
      fullName: input.fullName || `${input.firstName || ''} ${input.lastName || ''}`.trim() || 'New Customer',
      firstName: input.firstName || input.fullName?.split(' ')[0] || '',
      lastName: input.lastName || input.fullName?.split(' ').slice(1).join(' ') || '',
      email: input.email || '',
      phone: input.phone || '',
      secondaryPhone: input.secondaryPhone,
      dateOfBirth: input.dateOfBirth,
      gender: input.gender,
      nationality: input.nationality || (input.originType === 'international' ? 'Foreign National' : 'Nepali'),
      originType: input.originType || (input.isInternational ? 'international' : 'national'),
      isInternational: Boolean(input.isInternational || input.originType === 'international'),
      profilePhoto: undefined,
      avatarUrl: undefined,
      status: 'active',
      verificationStatus: input.verificationStatus || 'verified',
      rentalEligibilityStatus: 'eligible',
      address: input.address || input.permanentAddress || input.currentAddress || 'Kathmandu, Nepal',
      currentAddress: input.currentAddress || '',
      permanentAddress: input.permanentAddress || '',
      country: input.country || (input.originType === 'international' ? 'Foreign' : 'Nepal'),
      province: input.province || 'Bagmati',
      districtCity: input.districtCity || 'Kathmandu',
      city: input.districtCity || 'Kathmandu',
      postalCode: input.postalCode,
      billingAddress: input.billingAddress,
      companyName: input.companyName,
      companyTaxId: input.companyTaxId,
      licenseNumber: input.licenseNumber || '',
      licenseCategory: input.licenseCategory || 'B',
      licenseExpiry: input.licenseExpiry,
      passportNumber: input.passportNumber,
      passportExpiry: input.passportExpiry,
      visaType: input.visaType,
      visaExpiry: input.visaExpiry,
      idpNumber: input.idpNumber,
      citizenshipNumber: input.citizenshipNumber,
      emergencyContactName: input.emergencyContactName,
      emergencyContactRelationship: input.emergencyContactRelationship,
      emergencyContactPhone: input.emergencyContactPhone,
      isBlacklisted: false,
      blacklistStatus: 'clean',
      totalBookingsCount: 0,
      totalSpent: 0,
      outstandingBalance: 0,
      rating: 5.0,
      documents: input.kycDocuments || [],
      drivers: [],
      notes: input.notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    const currentList = mockDb.get('customers') || []
    mockDb.set('customers', [fallbackCust, ...currentList])
    return fallbackCust
  },

  updateCustomer: async (id: string, partial: Partial<Customer>): Promise<Customer> => {
    const payload: any = {}
    if (partial.customerType) payload.customer_type = partial.customerType
    if (partial.customerCode !== undefined) payload.customer_code = partial.customerCode
    if (partial.fullName) payload.full_name = partial.fullName
    if (partial.firstName !== undefined) payload.first_name = partial.firstName
    if (partial.middleName !== undefined) payload.middle_name = partial.middleName
    if (partial.lastName !== undefined) payload.last_name = partial.lastName
    if (partial.preferredName !== undefined) payload.preferred_name = partial.preferredName
    if (partial.email) payload.email = partial.email
    if (partial.phone) payload.phone = partial.phone
    if (partial.secondaryPhone !== undefined) payload.secondary_phone = partial.secondaryPhone
    if (partial.dateOfBirth) payload.date_of_birth = new Date(partial.dateOfBirth).toISOString()
    if (partial.gender !== undefined) payload.gender = partial.gender
    if (partial.nationality !== undefined) payload.nationality = partial.nationality
    if (partial.profilePhoto !== undefined) payload.profile_photo = partial.profilePhoto
    if (partial.address !== undefined) payload.address = partial.address
    if (partial.country !== undefined) payload.country = partial.country
    if (partial.province !== undefined) payload.province = partial.province
    if (partial.districtCity !== undefined) payload.district_city = partial.districtCity
    if (partial.postalCode !== undefined) payload.postal_code = partial.postalCode
    if (partial.billingAddress !== undefined) payload.billing_address = partial.billingAddress
    if (partial.companyName !== undefined) payload.company_name = partial.companyName
    if (partial.companyTaxId !== undefined) payload.company_tax_id = partial.companyTaxId
    if (partial.licenseNumber !== undefined) payload.license_number = partial.licenseNumber
    if (partial.licenseCategory !== undefined) payload.license_category = partial.licenseCategory
    if (partial.licenseExpiry) payload.license_expiry = new Date(partial.licenseExpiry).toISOString()
    if (partial.emergencyContactName !== undefined) payload.emergency_contact_name = partial.emergencyContactName
    if (partial.emergencyContactRelationship !== undefined) payload.emergency_contact_relationship = partial.emergencyContactRelationship
    if (partial.emergencyContactPhone !== undefined) payload.emergency_contact_phone = partial.emergencyContactPhone
    if (partial.status) payload.status = partial.status
    if (partial.verificationStatus) payload.verification_status = partial.verificationStatus
    if (partial.rentalEligibilityStatus) payload.rental_eligibility_status = partial.rentalEligibilityStatus
    if (partial.notes !== undefined) payload.notes = partial.notes

    try {
      const updated = await apiPatch<any>(`/customers/${id}`, payload)
      if (updated) {
        return mapBackendCustomer(updated)
      }
    } catch (err) {
      console.warn('Live backend updateCustomer error, updating local mockDb fallback:', err)
    }

    const currentList = mockDb.get('customers') || []
    let updatedCust: Customer | null = null
    const updatedList = currentList.map((c: Customer) => {
      if (c.id === id) {
        updatedCust = { ...c, ...partial, updatedAt: new Date().toISOString() }
        return updatedCust
      }
      return c
    })
    mockDb.set('customers', updatedList)
    return updatedCust || ({ id, ...partial } as Customer)
  },

  deleteCustomer: async (id: string): Promise<boolean> => {
    try {
      await apiDelete(`/customers/${id}`)
      return true
    } catch (err) {
      console.warn('Live backend deleteCustomer error, updating local mockDb:', err)
    }
    const currentList = mockDb.get('customers') || []
    mockDb.set('customers', currentList.filter((c: Customer) => c.id !== id))
    return true
  },

  verifyCustomer: async (
    id: string,
    status: CustomerVerificationStatus,
    reason?: string
  ): Promise<Customer> => {
    const payload = {
      status,
      notes: reason || '',
    }
    try {
      const verified = await apiPost<any>(`/customers/${id}/verify`, payload)
      if (verified) {
        return mapBackendCustomer(verified)
      }
    } catch (err) {
      console.warn('Live backend verifyCustomer error, updating local mockDb fallback:', err)
    }

    return customersApi.updateCustomer(id, { verificationStatus: status })
  },

  toggleBlacklist: async (
    id: string,
    isBlacklisted: boolean,
    reason?: string
  ): Promise<Customer> => {
    try {
      if (isBlacklisted) {
        const res = await apiPost<any>(`/customers/${id}/blacklist`, {
          reason: reason || 'Flagged by fleet manager',
        })
        if (res) return mapBackendCustomer(res)
      } else {
        const res = await apiPost<any>(`/customers/${id}/unblacklist`, {})
        if (res) return mapBackendCustomer(res)
      }
    } catch (err) {
      console.warn('Live backend toggleBlacklist error, updating local mockDb fallback:', err)
    }

    return customersApi.updateCustomer(id, {
      isBlacklisted,
      blacklistStatus: isBlacklisted ? 'blacklisted' : 'clean',
      blacklistReason: isBlacklisted ? reason || 'Flagged' : undefined,
    })
  },

  // --- Customer Documents ---

  getAllCustomerDocuments: async (params?: {
    customerId?: string
    driverId?: string
    docType?: string
    status?: string
    verificationStatus?: string
    search?: string
  }): Promise<CustomerDocument[]> => {
    let serverList: CustomerDocument[] = []
    try {
      const q = new URLSearchParams()
      if (params?.customerId) q.append('customer_id', params.customerId)
      if (params?.driverId) q.append('driver_id', params.driverId)
      if (params?.docType && params.docType !== 'all') q.append('doc_type', params.docType)
      if (params?.status && params.status !== 'all') q.append('status', params.status)
      if (params?.verificationStatus && params.verificationStatus !== 'all') q.append('verification_status', params.verificationStatus)
      if (params?.search) q.append('search', params.search)

      const queryStr = q.toString() ? `?${q.toString()}` : ''
      const res = await apiGet<any[]>(`/customer-documents${queryStr}`)
      if (Array.isArray(res)) {
        serverList = res.map(mapBackendCustomerDocument)
      }
    } catch (e) {
      console.warn('Live backend getAllCustomerDocuments error, using local mock fallback:', e)
    }

    // Collect all documents from local mockDb customers
    const localDocs: CustomerDocument[] = []
    const customers = mockDb.get('customers') || []
    customers.forEach((c: Customer) => {
      if (Array.isArray(c.documents)) {
        c.documents.forEach((d) => {
          localDocs.push({
            ...d,
            customerId: d.customerId || c.id,
            customerName: d.customerName || c.fullName,
            customerEmail: d.customerEmail || c.email,
          })
        })
      }
    })

    // Merge server docs and local docs by ID
    const mergedMap = new Map<string, CustomerDocument>()
    localDocs.forEach((d) => mergedMap.set(d.id, d))
    serverList.forEach((d) => mergedMap.set(d.id, d))
    let result = Array.from(mergedMap.values())

    if (params?.customerId) {
      result = result.filter((d) => d.customerId === params.customerId)
    }
    if (params?.docType && params.docType !== 'all') {
      result = result.filter((d) => d.docType === params.docType)
    }
    if (params?.verificationStatus && params.verificationStatus !== 'all') {
      result = result.filter((d) => d.verificationStatus === params.verificationStatus)
    }
    if (params?.search) {
      const s = params.search.toLowerCase()
      result = result.filter(
        (d) =>
          d.name?.toLowerCase().includes(s) ||
          d.documentNumber?.toLowerCase().includes(s) ||
          d.customerName?.toLowerCase().includes(s) ||
          d.customerEmail?.toLowerCase().includes(s)
      )
    }

    return result
  },

  getCustomerDocuments: async (customerId: string): Promise<CustomerDocument[]> => {
    return customersApi.getAllCustomerDocuments({ customerId })
  },

  getCustomerDocumentSummary: async (): Promise<CustomerDocumentSummaryStats> => {
    try {
      const res = await apiGet<any>('/customer-documents/summary')
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
      console.warn('Live backend getCustomerDocumentSummary error:', e)
    }
    const all = await customersApi.getAllCustomerDocuments()
    return {
      totalDocuments: all.length,
      validDocuments: all.filter((d) => d.verificationStatus === 'verified').length,
      expiringSoon: 0,
      expiredDocuments: 0,
      pendingVerification: all.filter((d) => d.verificationStatus === 'pending').length,
    }
  },

  createCustomerDocument: async (input: CreateCustomerDocumentInput): Promise<CustomerDocument> => {
    const payload = {
      customer_id: input.customerId,
      driver_id: input.driverId || null,
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
    try {
      const res = await apiPost<any>('/customer-documents', payload)
      if (res) {
        return mapBackendCustomerDocument(res)
      }
    } catch (err) {
      console.warn('Live backend createCustomerDocument error, saving to local customer:', err)
    }

    const newDoc: CustomerDocument = {
      id: `doc-${Date.now()}`,
      tenantId: 'tenant-default',
      customerId: input.customerId,
      docType: input.docType as any,
      name: input.name,
      documentNumber: input.documentNumber,
      issuingAuthority: input.issuingAuthority,
      fileUrl: input.fileUrl,
      fileName: input.fileName,
      fileSize: input.fileSize,
      mimeType: input.mimeType,
      issueDate: input.issueDate,
      expiryDate: input.expiryDate,
      status: 'valid',
      verificationStatus: 'pending',
      version: 1,
      notes: input.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const customers = mockDb.get('customers') || []
    const updated = customers.map((c: Customer) => {
      if (c.id === input.customerId) {
        const existingDocs = c.documents || []
        return { ...c, documents: [newDoc, ...existingDocs] }
      }
      return c
    })
    mockDb.set('customers', updated)
    return newDoc
  },

  verifyCustomerDocument: async (
    id: string,
    verificationStatus: 'verified' | 'rejected' | 'pending',
    rejectionReason?: string,
    auditorNotes?: string
  ): Promise<CustomerDocument> => {
    try {
      const res = await apiPost<any>(`/customer-documents/${id}/verify`, {
        verification_status: verificationStatus,
        rejection_reason: rejectionReason || '',
        auditor_notes: auditorNotes || '',
      })
      if (res) {
        return mapBackendCustomerDocument(res)
      }
    } catch (err) {
      console.warn('Live backend verifyCustomerDocument error, updating local document:', err)
    }

    let updatedDoc: CustomerDocument | null = null
    const customers = mockDb.get('customers') || []
    const updated = customers.map((c: Customer) => {
      if (Array.isArray(c.documents)) {
        const docs = c.documents.map((d) => {
          if (d.id === id) {
            updatedDoc = {
              ...d,
              verificationStatus,
              rejectionReason,
              status: verificationStatus === 'verified' ? 'valid' : d.status,
              verifiedAt: new Date().toISOString(),
            }
            return updatedDoc
          }
          return d
        })
        return { ...c, documents: docs }
      }
      return c
    })
    mockDb.set('customers', updated)
    return (
      updatedDoc || {
        id,
        tenantId: 'tenant-default',
        customerId: '',
        docType: 'other',
        name: 'Document',
        fileUrl: '',
        verificationStatus,
        status: 'valid',
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    )
  },

  deleteCustomerDocument: async (id: string): Promise<boolean> => {
    try {
      await apiDelete(`/customer-documents/${id}`)
    } catch (err) {
      console.warn('Live backend deleteCustomerDocument error:', err)
    }
    const customers = mockDb.get('customers') || []
    const updated = customers.map((c: Customer) => {
      if (Array.isArray(c.documents)) {
        return { ...c, documents: c.documents.filter((d) => d.id !== id) }
      }
      return c
    })
    mockDb.set('customers', updated)
    return true
  },

  getAllCustomerDrivers: async (): Promise<CustomerDriver[]> => {
    let serverDrivers: CustomerDriver[] = []
    try {
      const res = await apiGet<any[]>('/customers/drivers')
      if (Array.isArray(res)) {
        serverDrivers = res.map(mapBackendDriver)
      }
    } catch (_) {}

    const localDrivers: CustomerDriver[] = []
    const customers = mockDb.get('customers') || []
    customers.forEach((c: Customer) => {
      if (Array.isArray(c.drivers)) {
        c.drivers.forEach((drv) => {
          localDrivers.push({
            ...drv,
            customerId: drv.customerId || c.id,
            customerName: drv.customerName || c.fullName,
          })
        })
      }
    })

    const merged = new Map<string, CustomerDriver>()
    localDrivers.forEach((d) => merged.set(d.id, d))
    serverDrivers.forEach((d) => merged.set(d.id, d))
    return Array.from(merged.values())
  },

  getCustomerDrivers: async (customerId: string): Promise<CustomerDriver[]> => {
    try {
      const res = await apiGet<any[]>(`/customers/${customerId}/drivers`)
      if (Array.isArray(res)) {
        return res.map(mapBackendDriver)
      }
    } catch (e) {
      console.warn('Live backend getCustomerDrivers error:', e)
    }
    const customers = mockDb.get('customers') || []
    const found = customers.find((c: Customer) => c.id === customerId)
    return found?.drivers || []
  },

  createCustomerDriver: async (input: CreateDriverInput): Promise<CustomerDriver> => {
    const payload = {
      customer_id: input.customerId,
      full_name: input.fullName,
      phone: input.phone,
      email: input.email || '',
      date_of_birth: input.dateOfBirth ? new Date(input.dateOfBirth).toISOString() : null,
      relationship: input.relationship || 'authorized_driver',
      license_number: input.licenseNumber,
      license_category: input.licenseCategory || 'B',
      license_issue_date: input.licenseIssueDate ? new Date(input.licenseIssueDate).toISOString() : null,
      license_expiry_date: input.licenseExpiryDate ? new Date(input.licenseExpiryDate).toISOString() : null,
      notes: input.notes || '',
    }
    try {
      const res = await apiPost<any>(`/customers/${input.customerId}/drivers`, payload)
      if (res) {
        return mapBackendDriver(res)
      }
    } catch (err) {
      console.warn('Live backend createCustomerDriver error, saving locally:', err)
    }

    const newDriver: CustomerDriver = {
      id: `drv-${Date.now()}`,
      tenantId: 'tenant-default',
      customerId: input.customerId,
      fullName: input.fullName,
      phone: input.phone,
      email: input.email,
      dateOfBirth: input.dateOfBirth,
      relationship: input.relationship || 'authorized_driver',
      licenseNumber: input.licenseNumber,
      licenseCategory: input.licenseCategory || 'B',
      licenseIssueDate: input.licenseIssueDate,
      licenseExpiryDate: input.licenseExpiryDate,
      verificationStatus: 'verified',
      notes: input.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const customers = mockDb.get('customers') || []
    const updated = customers.map((c: Customer) => {
      if (c.id === input.customerId) {
        const drivers = c.drivers || []
        return { ...c, drivers: [newDriver, ...drivers] }
      }
      return c
    })
    mockDb.set('customers', updated)
    return newDriver
  },

  deleteCustomerDriver: async (customerId: string, driverId: string): Promise<boolean> => {
    try {
      await apiDelete(`/customers/${customerId}/drivers/${driverId}`)
    } catch (err) {
      console.warn('Live backend deleteCustomerDriver error:', err)
    }
    const customers = mockDb.get('customers') || []
    const updated = customers.map((c: Customer) => {
      if (c.id === customerId && Array.isArray(c.drivers)) {
        return { ...c, drivers: c.drivers.filter((d) => d.id !== driverId) }
      }
      return c
    })
    mockDb.set('customers', updated)
    return true
  },

  // --- History & Bookings ---

  getCustomerRentals: async (customerId: string): Promise<Booking[]> => {
    try {
      const res = await apiGet<any[]>(`/bookings?customer_id=${customerId}`)
      if (Array.isArray(res)) return res
    } catch (_) {}
    const bookings = mockDb.get('bookings') || []
    return bookings.filter((b: Booking) => b.customerId === customerId)
  },

  getCustomerBookings: async (customerId: string): Promise<Booking[]> => {
    try {
      const res = await apiGet<any[]>(`/bookings?customer_id=${customerId}`)
      if (Array.isArray(res)) return res
    } catch (_) {}
    const bookings = mockDb.get('bookings') || []
    return bookings.filter((b: Booking) => b.customerId === customerId)
  },
}
