export type BookingStatus =
  | 'draft'
  | 'quote'
  | 'pending_verification'
  | 'pending_payment'
  | 'pending_confirmation'
  | 'pending'
  | 'confirmed'
  | 'pickup_scheduled'
  | 'pickup_in_progress'
  | 'active'
  | 'return_in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show'
  | 'expired'
  | 'rejected'
  | 'overdue'

export type BookingPaymentStatus =
  | 'unpaid'
  | 'partially_paid'
  | 'paid'
  | 'refunded'

export interface BookingExtra {
  name: string
  price: number
  quantity?: number
}

export interface PricingQuoteRequest {
  vehicle_id: string
  start_date: string
  end_date: string
  coupon_code?: string
  insurance?: boolean
  extra_items?: BookingExtra[]
  delivery_fee?: number
  collection_fee?: number
  one_way_fee?: number
}

export interface PricingQuoteResponse {
  rental_days: number
  base_rental_rate: number
  rental_amount: number
  insurance_amount: number
  discount_amount: number
  extra_charges: number
  tax_amount: number
  deposit_amount: number
  total_amount: number
  currency: string
  currency_symbol: string
}

export interface PricingSnapshot {
  rental_days: number
  base_rental_rate: number
  rental_amount: number
  insurance_amount: number
  discount_amount: number
  coupon_code?: string
  delivery_fee?: number
  collection_fee?: number
  one_way_fee?: number
  extra_km_fee?: number
  fuel_charge?: number
  damage_charge?: number
  extra_charges: number
  extras?: BookingExtra[]
  taxable_base: number
  tax_rate: number
  tax_amount: number
  deposit_amount: number
  total_amount: number
  currency: string
  currency_symbol: string
  calculated_at: string
}

export interface OperationsSummary {
  active_rentals_count: number
  pickups_today_count: number
  returns_today_count: number
  pending_confirmation_count: number
  overdue_returns_count: number
  total_deposits_held: number
  total_fleet_count: number
  rented_fleet_count: number
  available_fleet_count: number
  currency: string
  currency_symbol: string
}

export interface EligibilityCheckResult {
  is_eligible: boolean
  customer_kyc_status: string
  is_blacklisted: boolean
  blacklist_reason?: string
  driver_license_valid: boolean
  driver_license_number?: string
  driver_license_expiry?: string
  warnings: string[]
  errors: string[]
}

export interface BookingStatusHistoryItem {
  id: string
  tenant_id: string
  booking_id: string
  from_status: string
  to_status: string
  changed_by: string
  reason?: string
  created_at: string
}

export interface RentalChecklistRecord {
  id: string
  booking_id: string
  checklist_type: 'pickup' | 'return'
  odometer: number
  fuel_level: string
  exterior_condition?: string
  interior_condition?: string
  photos: string[]
  inspector_id?: string
  customer_signature?: string
  created_at: string
}

export interface PickupReturnDetails {
  odometerOut?: number
  odometerIn?: number
  fuelLevelOut?: string
  fuelLevelIn?: string
  inspectedByOut?: string
  inspectedByIn?: string
  inspectionNotesOut?: string
  inspectionNotesIn?: string
  damagePhotosOut?: string[]
  damagePhotosIn?: string[]
  customerSignatureUrl?: string
  pickedUpAt?: string
  returnedAt?: string
}

export interface BookingActivity {
  id: string
  bookingId: string
  action: string
  actorName: string
  actorRole: string
  timestamp: string
  details?: string
}

export interface Booking {
  id: string
  bookingCode: string
  tenantId: string
  customerId: string
  customerName: string
  customerEmail: string
  customerPhone: string
  customerKycStatus?: string
  primaryDriverId?: string
  driverName?: string
  driverLicense?: string
  vehicleId: string
  vehiclePlate: string
  vehicleModel: string
  vehicleMake?: string
  vehicleType: string
  vehicleCategoryId?: string
  categoryName?: string
  source: string
  pickupLocationId: string
  pickupLocationName: string
  returnLocationId: string
  returnLocationName: string
  startDate: string
  endDate: string
  actualPickupAt?: string
  actualReturnAt?: string
  actualReturnDate?: string
  status: BookingStatus
  paymentStatus: BookingPaymentStatus
  dailyRate: number
  totalDays: number
  rentalAmount: number
  insuranceAmount: number
  extraCharges: number
  taxAmount: number
  discountAmount: number
  totalAmount: number
  depositAmount: number
  depositStatus: 'pending' | 'held' | 'partially_refunded' | 'released' | 'partially_deducted' | 'refunded' | 'forfeited'
  paidAmount: number
  balanceDue: number
  pickupOdometer?: number
  returnOdometer?: number
  pickupFuel?: string
  returnFuel?: string
  pricingSnapshot?: PricingSnapshot
  extras?: BookingExtra[]
  cancellationReason?: string
  cancelledAt?: string
  cancelledBy?: string
  cancellationFee?: number
  completedAt?: string
  pickupNotes?: string
  returnNotes?: string
  pickupPhotos?: string[]
  returnPhotos?: string[]
  rejectionReason?: string
  reassignedFromVehicleId?: string
  reassignReason?: string
  pickupReturnDetails: PickupReturnDetails
  contractSigned: boolean
  contractId?: string
  couponCode?: string
  notes?: string
  activityLogs: BookingActivity[]
  createdAt: string
  updatedAt: string
}

export interface BookingFilterParams {
  search?: string
  status?: BookingStatus | 'all'
  paymentStatus?: BookingPaymentStatus | 'all'
  vehicleType?: string
  startDate?: string
  endDate?: string
  customerId?: string
  vehicleId?: string
  locationId?: string
}
