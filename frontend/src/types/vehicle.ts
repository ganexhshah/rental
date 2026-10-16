export type VehicleType = 'car' | 'bike' | 'scooter' | string

export type VehicleStatus = 'available' | 'rented' | 'maintenance' | 'reserved' | 'retired'

export type TransmissionType = 'automatic' | 'manual'

export type FuelType = 'petrol' | 'diesel' | 'electric' | 'hybrid'

export type VehicleDocType =
  | 'bluebook'
  | 'insurance'
  | 'fitness'
  | 'pollution'
  | 'permit'
  | 'road_tax'
  | 'ownership_lease'
  | 'inspection_certificate'
  | 'registration'
  | 'other'

export interface VehicleDocument {
  id: string
  tenantId?: string
  vehicleId: string
  vehiclePlate?: string
  vehicleName?: string
  name: string
  docType: VehicleDocType
  type?: string
  documentNumber?: string
  issuingAuthority?: string
  fileUrl: string
  fileUrls?: string[]
  fileName?: string
  fileNames?: string[]
  fileSize?: number
  mimeType?: string
  issueDate?: string
  expiryDate: string
  status: 'valid' | 'expiring_soon' | 'expired'
  verificationStatus?: 'pending' | 'verified' | 'rejected'
  verifiedBy?: string
  verifiedAt?: string
  version?: number
  notes?: string
  createdAt?: string
  updatedAt?: string
}

export interface DocumentSummaryStats {
  totalDocuments: number
  validDocuments: number
  expiringSoon: number
  expiredDocuments: number
  pendingVerification: number
}

export interface CreateVehicleDocumentInput {
  vehicleId: string
  vehiclePlate?: string
  vehicleName?: string
  docType: VehicleDocType
  name: string
  documentNumber?: string
  issuingAuthority?: string
  fileUrl: string
  fileUrls?: string[]
  fileName?: string
  fileNames?: string[]
  fileSize?: number
  mimeType?: string
  issueDate?: string
  expiryDate?: string
  notes?: string
}

export interface DamageRecord {
  id: string
  vehicleId: string
  bookingId?: string
  date: string
  description: string
  severity: 'minor' | 'moderate' | 'severe'
  photos: string[]
  estimatedCost: number
  status: 'reported' | 'under_repair' | 'repaired' | 'waived'
}

export interface VehiclePricing {
  dailyRate: number
  weeklyRate?: number
  monthlyRate?: number
  hourlyRate?: number
  depositAmount: number
  extraKmRate?: number
  allowedKmPerDay?: number
}

export interface VehicleSpecs {
  seatingCapacity: number
  transmission: TransmissionType
  fuelType: FuelType
  engineCapacity?: string
  mileageOdometer: number
  color?: string
  vinOrChassisNumber?: string
  year?: number
  hasAC?: boolean
  hasGPS?: boolean
  hasBluetooth?: boolean
  helmetIncluded?: boolean
  features?: string[]
}

export interface VehicleTypeDefinition {
  id: string
  key: string
  name: string
  icon?: string
  description?: string
  isSystem?: boolean
  categoriesCount?: number
  vehiclesCount?: number
  createdAt?: string
}

export interface VehicleCategory {
  id: string
  name: string
  type: VehicleType
  description?: string
  iconName?: string
  baseDailyRate?: number
  count?: number
}

export interface VehicleLocation {
  id: string
  name: string
  code: string
  address: string
  city: string
  contactPhone: string
  activeVehiclesCount?: number
}

export interface Vehicle {
  id: string
  tenantId: string
  plateNumber: string
  make: string
  model: string
  year: number
  type: VehicleType
  categoryId: string
  categoryName?: string
  locationId: string
  locationName?: string
  status: VehicleStatus
  pricing: VehiclePricing
  specs: VehicleSpecs
  images: string[]
  primaryImage: string
  currentRentalBookingId?: string
  currentRenterName?: string
  nextServiceDueDate?: string
  nextServiceOdometer?: number
  documents?: VehicleDocument[]
  damages?: DamageRecord[]
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface VehicleFilterParams {
  type?: VehicleType | 'all'
  status?: VehicleStatus | 'all'
  categoryId?: string
  locationId?: string
  search?: string
  minPrice?: number
  maxPrice?: number
  fuelType?: FuelType
  transmission?: TransmissionType
}
