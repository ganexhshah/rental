export type CustomerType = 'individual' | 'business' | 'organization'

export type CustomerVerificationStatus = 'verified' | 'pending' | 'rejected' | 'needs_correction'

export type CustomerStatus = 'active' | 'pending_verification' | 'suspended' | 'blacklisted' | 'archived'

export type CustomerBlacklistStatus = 'clean' | 'blacklisted' | 'flagged'

export type CustomerDocType =
  | 'citizenship'
  | 'passport'
  | 'driving_licence'
  | 'license_front'
  | 'license_back'
  | 'national_id'
  | 'visa_residency'
  | 'address_proof'
  | 'business_registration'
  | 'tax_pan_vat'
  | 'signed_form'
  | 'other'

export interface CustomerDocument {
  id: string
  tenantId?: string
  customerId: string
  customerName?: string
  customerEmail?: string
  driverId?: string
  driverName?: string
  docType: CustomerDocType
  name: string
  title?: string // compatibility with older components
  documentNumber?: string
  issuingAuthority?: string
  fileUrl: string
  fileName?: string
  fileSize?: number
  mimeType?: string
  issueDate?: string
  expiryDate?: string
  status: 'valid' | 'expiring_soon' | 'expired'
  verificationStatus: 'pending' | 'verified' | 'rejected'
  rejectionReason?: string
  verifiedBy?: string
  verifiedAt?: string
  version?: number
  notes?: string
  createdAt?: string
  updatedAt?: string
}

export interface CustomerDriver {
  id: string
  tenantId?: string
  customerId: string
  customerName?: string
  fullName: string
  phone: string
  email?: string
  dateOfBirth?: string
  relationship: string
  licenseNumber: string
  licenseCategory: string
  licenseIssueDate?: string
  licenseExpiryDate?: string
  verificationStatus: string
  notes?: string
  createdAt?: string
  updatedAt?: string
}

export interface Customer {
  id: string
  tenantId: string
  customerType: CustomerType
  customerCode?: string
  fullName: string
  firstName?: string
  middleName?: string
  lastName?: string
  preferredName?: string
  email: string
  phone: string
  secondaryPhone?: string
  dateOfBirth?: string
  gender?: string
  nationality: string
  profilePhoto?: string
  avatarUrl?: string // compatibility
  status: CustomerStatus
  verificationStatus: CustomerVerificationStatus
  rentalEligibilityStatus: 'eligible' | 'restricted' | 'ineligible'
  address: string
  currentAddress?: string // Hotel, homestay, or local stay address in Nepal / destination
  permanentAddress?: string // Permanent or home country address
  country: string
  province: string
  districtCity: string
  city?: string // compatibility
  postalCode?: string
  billingAddress?: string
  companyName?: string
  companyTaxId?: string
  licenseNumber: string
  licenseCategory: string
  licenseExpiry?: string
  citizenshipNumber?: string
  nationalIdNumber?: string
  passportNumber?: string
  passportExpiry?: string
  visaType?: string
  visaExpiry?: string
  idpNumber?: string // International Driving Permit
  originType?: 'national' | 'international'
  isInternational?: boolean
  paperKycCollected?: boolean
  paperKycNotes?: string
  emergencyContactName?: string
  emergencyContactRelationship?: string
  emergencyContactPhone?: string
  isBlacklisted: boolean
  blacklistStatus: CustomerBlacklistStatus // compatibility
  blacklistReason?: string
  blacklistedAt?: string
  blacklistedBy?: string
  totalBookingsCount: number
  totalSpent: number
  outstandingBalance: number
  rating: number
  documents?: CustomerDocument[]
  drivers?: CustomerDriver[]
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface CustomerSummaryStats {
  totalCustomers: number
  activeCustomers: number
  pendingVerification: number
  blacklistedCustomers: number
}

export interface CustomerDocumentSummaryStats {
  totalDocuments: number
  validDocuments: number
  expiringSoon: number
  expiredDocuments: number
  pendingVerification: number
}

export interface CustomerFilterParams {
  search?: string
  customerType?: CustomerType | 'all'
  verificationStatus?: CustomerVerificationStatus | 'all'
  status?: CustomerStatus | 'all'
  isBlacklisted?: boolean
  blacklistStatus?: CustomerBlacklistStatus | 'all'
  country?: string
}

export interface CreateCustomerInput {
  customerType?: CustomerType
  customerCode?: string
  fullName: string
  firstName?: string
  middleName?: string
  lastName?: string
  preferredName?: string
  email: string
  phone: string
  secondaryPhone?: string
  dateOfBirth?: string
  gender?: string
  nationality?: string
  address?: string
  currentAddress?: string
  permanentAddress?: string
  country?: string
  province?: string
  districtCity?: string
  postalCode?: string
  billingAddress?: string
  companyName?: string
  companyTaxId?: string
  licenseNumber?: string
  licenseCategory?: string
  licenseExpiry?: string
  citizenshipNumber?: string
  nationalIdNumber?: string
  passportNumber?: string
  passportExpiry?: string
  visaType?: string
  visaExpiry?: string
  idpNumber?: string
  originType?: 'national' | 'international'
  isInternational?: boolean
  paperKycCollected?: boolean
  paperKycNotes?: string
  emergencyContactName?: string
  emergencyContactRelationship?: string
  emergencyContactPhone?: string
  profilePhoto?: string
  avatarUrl?: string
  kycDocuments?: CustomerDocument[]
  verificationStatus?: CustomerVerificationStatus
  isBlacklisted?: boolean
  totalRentalsCount?: number
  totalSpentAmount?: number
  notes?: string
}

export interface CreateCustomerDocumentInput {
  customerId: string
  driverId?: string
  docType: CustomerDocType
  name: string
  documentNumber?: string
  issuingAuthority?: string
  fileUrl: string
  fileName?: string
  fileSize?: number
  mimeType?: string
  issueDate?: string
  expiryDate?: string
  notes?: string
}

export interface CreateDriverInput {
  customerId: string
  fullName: string
  phone: string
  email?: string
  dateOfBirth?: string
  relationship?: string
  licenseNumber: string
  licenseCategory?: string
  licenseIssueDate?: string
  licenseExpiryDate?: string
  notes?: string
}
