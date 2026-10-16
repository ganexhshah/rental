import { apiGet, apiPost, apiPatch } from '@/lib/api/client'
import { mockDb } from '@/lib/api/mockDb'
import type {
  Booking,
  BookingFilterParams,
  BookingStatus,
  BookingStatusHistoryItem,
  EligibilityCheckResult,
  OperationsSummary,
  PricingQuoteRequest,
  PricingQuoteResponse,
  RentalChecklistRecord,
} from '@/types/booking'
import type { Vehicle } from '@/types/vehicle'
import { vehiclesApi } from '@/features/vehicles/api'

export interface AvailabilitySlot {
  vehicle: Vehicle
  isAvailable: boolean
  currentBooking?: Booking
  conflictsCount: number
}

export function mapBackendBooking(b: any): Booking {
  const start = new Date(b.start_date || new Date()).getTime()
  const end = new Date(b.end_date || new Date()).getTime()
  const days = Math.max(1, Math.ceil((end - start) / (1000 * 3600 * 24)))

  return {
    id: b.id,
    bookingCode: b.booking_code || `BK-${b.id?.slice(0, 8)?.toUpperCase() || 'RES'}`,
    tenantId: b.tenant_id || '78248f8f-e390-4f85-a03f-58e4974fa366',
    customerId: b.customer_id,
    customerName: b.customer_name || 'Customer',
    customerEmail: b.customer_email || '',
    customerPhone: b.customer_phone || '',
    customerKycStatus: b.customer_kyc_status || 'verified',
    primaryDriverId: b.primary_driver_id,
    driverName: b.driver_name || b.customer_name,
    driverLicense: b.driver_license,
    vehicleId: b.vehicle_id,
    vehiclePlate: b.vehicle_plate || '',
    vehicleMake: b.vehicle_make,
    vehicleModel: b.vehicle_model ? `${b.vehicle_make || ''} ${b.vehicle_model}`.trim() : 'Vehicle',
    vehicleType: b.vehicle_type || 'car',
    vehicleCategoryId: b.vehicle_category_id,
    categoryName: b.category_name,
    source: b.source || 'admin',
    pickupLocationId: b.pickup_location_id,
    pickupLocationName: b.pickup_location || 'Kathmandu HQ',
    returnLocationId: b.return_location_id,
    returnLocationName: b.return_location || 'Kathmandu HQ',
    startDate: b.start_date,
    endDate: b.end_date,
    actualPickupAt: b.actual_pickup_at,
    actualReturnAt: b.actual_return_at,
    actualReturnDate: b.actual_return_at,
    status: b.status || 'confirmed',
    paymentStatus: b.payment_status || 'unpaid',
    totalDays: days,
    dailyRate: days > 0 ? (Number(b.rental_amount) || 0) / days : Number(b.rental_amount) || 0,
    rentalAmount: Number(b.rental_amount) || 0,
    insuranceAmount: Number(b.insurance_amount) || 0,
    depositAmount: Number(b.deposit_amount) || 0,
    depositStatus: Number(b.deposit_amount) > 0 ? 'held' : 'pending',
    contractSigned: Boolean(b.contract_id || b.contract_signed),
    discountAmount: Number(b.discount_amount) || 0,
    taxAmount: Number(b.tax_amount) || 0,
    extraCharges: Number(b.extra_charges) || 0,
    totalAmount: Number(b.total_amount) || 0,
    paidAmount: Number(b.paid_amount) || 0,
    balanceDue: Number(b.balance_due) || 0,
    pickupOdometer: b.pickup_odometer,
    returnOdometer: b.return_odometer,
    pickupFuel: b.pickup_fuel,
    returnFuel: b.return_fuel,
    pricingSnapshot: b.pricing_snapshot,
    extras: Array.isArray(b.extras) ? b.extras : [],
    cancellationReason: b.cancellation_reason,
    cancelledAt: b.cancelled_at,
    cancelledBy: b.cancelled_by,
    cancellationFee: Number(b.cancellation_fee) || 0,
    completedAt: b.completed_at,
    pickupNotes: b.pickup_notes,
    returnNotes: b.return_notes,
    pickupPhotos: Array.isArray(b.pickup_photos) ? b.pickup_photos : [],
    returnPhotos: Array.isArray(b.return_photos) ? b.return_photos : [],
    rejectionReason: b.rejection_reason,
    reassignedFromVehicleId: b.reassigned_from_vehicle_id,
    reassignReason: b.reassign_reason,
    pickupReturnDetails: {
      odometerOut: b.pickup_odometer,
      odometerIn: b.return_odometer,
      fuelLevelOut: b.pickup_fuel,
      fuelLevelIn: b.return_fuel,
      inspectionNotesOut: b.pickup_notes,
      inspectionNotesIn: b.return_notes,
      damagePhotosOut: Array.isArray(b.pickup_photos) ? b.pickup_photos : [],
      damagePhotosIn: Array.isArray(b.return_photos) ? b.return_photos : [],
      pickedUpAt: b.actual_pickup_at,
      returnedAt: b.actual_return_at,
    },
    activityLogs: [
      {
        id: `act-${b.id || Date.now()}`,
        bookingId: b.id,
        action: `Status: ${b.status || 'confirmed'}`,
        actorName: 'Operations Staff',
        actorRole: 'staff',
        timestamp: b.updated_at || b.created_at || new Date().toISOString(),
        details: `Total: Rs. ${b.total_amount || 0} | Balance: Rs. ${b.balance_due || 0}`,
      },
    ],
    notes: b.notes,
    createdAt: b.created_at || new Date().toISOString(),
    updatedAt: b.updated_at || new Date().toISOString(),
  }
}

export const bookingsApi = {
  getBookings: async (params?: BookingFilterParams): Promise<Booking[]> => {
    try {
      const query = new URLSearchParams()
      if (params?.search) query.set('search', params.search)
      if (params?.status && params.status !== 'all') query.set('status', params.status)
      if (params?.paymentStatus && params.paymentStatus !== 'all') query.set('payment_status', params.paymentStatus)
      if (params?.customerId) query.set('customer_id', params.customerId)
      if (params?.vehicleId) query.set('vehicle_id', params.vehicleId)

      const url = `/bookings${query.toString() ? `?${query.toString()}` : ''}`
      const res = await apiGet<any>(url)
      const list = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : null
      if (Array.isArray(list)) {
        return list.map(mapBackendBooking)
      }
    } catch (e) {
      console.warn('Backend getBookings error, using mockDb fallback:', e)
    }

    let list = [...mockDb.get('bookings')]
    if (params?.search) {
      const q = params.search.toLowerCase()
      list = list.filter(
        (b) =>
          b.bookingCode?.toLowerCase().includes(q) ||
          b.customerName?.toLowerCase().includes(q) ||
          b.vehiclePlate?.toLowerCase().includes(q) ||
          b.vehicleModel?.toLowerCase().includes(q)
      )
    }
    if (params?.status && params.status !== 'all') {
      list = list.filter((b) => b.status === params.status)
    }
    if (params?.paymentStatus && params.paymentStatus !== 'all') {
      list = list.filter((b) => b.paymentStatus === params.paymentStatus)
    }
    if (params?.customerId) {
      list = list.filter((b) => b.customerId === params.customerId)
    }
    if (params?.vehicleId) {
      list = list.filter((b) => b.vehicleId === params.vehicleId)
    }
    return list
  },

  getBooking: async (id: string): Promise<Booking> => {
    try {
      const data = await apiGet<any>(`/bookings/${id}`)
      if (data && data.id) return mapBackendBooking(data)
    } catch (e) {
      console.warn('Backend getBooking error, using mockDb:', e)
    }
    const list = mockDb.get('bookings')
    const item = list.find((b) => b.id === id)
    if (!item) throw new Error('Booking not found')
    return item
  },

  getOperationsSummary: async (): Promise<OperationsSummary> => {
    try {
      const res = await apiGet<OperationsSummary>('/bookings/operations-summary')
      if (res && typeof res.active_rentals_count === 'number') return res
    } catch (e) {
      console.warn('Backend getOperationsSummary error, calculating from mockDb:', e)
    }

    const bookings = mockDb.get('bookings')
    const vehicles = mockDb.get('vehicles')
    const active = bookings.filter((b) => b.status === 'active').length
    const pickups = bookings.filter((b) => ['confirmed', 'pickup_scheduled'].includes(b.status)).length
    const returns = bookings.filter((b) => b.status === 'active').length
    const pending = bookings.filter((b) => b.status === 'pending_confirmation').length
    const overdue = bookings.filter((b) => b.status === 'overdue').length
    const deposits = bookings.reduce((sum, b) => sum + (b.depositAmount || 0), 0)

    return {
      active_rentals_count: active,
      pickups_today_count: pickups,
      returns_today_count: returns,
      pending_confirmation_count: pending,
      overdue_returns_count: overdue,
      total_deposits_held: deposits,
      total_fleet_count: vehicles.length,
      rented_fleet_count: active,
      available_fleet_count: vehicles.filter((v) => v.status === 'available').length,
      currency: 'NPR',
      currency_symbol: 'Rs.',
    }
  },

  getPricingQuote: async (req: PricingQuoteRequest): Promise<PricingQuoteResponse> => {
    try {
      const res = await apiPost<PricingQuoteResponse>('/bookings/quote', req)
      if (res && res.total_amount !== undefined) return res
    } catch (e) {
      console.warn('Backend quote calculation fallback:', e)
    }

    // High fidelity offline quote computation
    const start = new Date(req.start_date).getTime()
    const end = new Date(req.end_date).getTime()
    const diffMs = Math.max(1000 * 3600, end - start)
    const days = Math.max(1, Math.ceil(diffMs / (1000 * 3600 * 24)))

    const vehicles = mockDb.get('vehicles')
    const vehicle = vehicles.find((v) => v.id === req.vehicle_id)
    const dailyRate = vehicle?.pricing?.dailyRate || 3500
    const rentalAmount = dailyRate * days
    const insuranceAmount = req.insurance ? Math.max(500 * days, Math.round(rentalAmount * 0.1)) : 0

    let extraCharges = 0
    if (req.extra_items && Array.isArray(req.extra_items)) {
      req.extra_items.forEach((item) => {
        extraCharges += (item.price || 0) * (item.quantity || 1)
      })
    }
    extraCharges += (req.delivery_fee || 0) + (req.collection_fee || 0) + (req.one_way_fee || 0)

    let discountAmount = 0
    if (req.coupon_code) {
      const code = req.coupon_code.trim().toUpperCase()
      if (code === 'WELCOME10') {
        discountAmount = Math.round(rentalAmount * 0.1)
      } else if (code === 'HIMALAYA500') {
        discountAmount = 500
      } else if (code === 'FESTIVE15') {
        discountAmount = Math.round(rentalAmount * 0.15)
      }
    }

    const subtotal = Math.max(0, rentalAmount + insuranceAmount + extraCharges - discountAmount)
    const taxAmount = Math.round(subtotal * 0.13) // 13% VAT Nepal
    const depositAmount = vehicle?.pricing?.depositAmount || 15000
    const totalAmount = subtotal + taxAmount

    return {
      rental_days: days,
      base_rental_rate: dailyRate,
      rental_amount: rentalAmount,
      insurance_amount: insuranceAmount,
      discount_amount: discountAmount,
      extra_charges: extraCharges,
      tax_amount: taxAmount,
      deposit_amount: depositAmount,
      total_amount: totalAmount,
      currency: 'NPR',
      currency_symbol: 'Rs.',
    }
  },

  createBooking: async (req: any): Promise<Booking> => {
    try {
      const res = await apiPost<any>('/bookings', req)
      if (res && res.id) return mapBackendBooking(res)
    } catch (e: any) {
      console.warn('Live backend createBooking error:', e)
      const errMsg = e?.response?.data?.error?.message || e?.message
      if (e?.response?.status === 409 || (errMsg && errMsg.toLowerCase().includes('already booked'))) {
        throw new Error(errMsg || 'Vehicle is already booked or unavailable for the selected dates.')
      }
    }

    const vehicles = mockDb.get('vehicles')
    const bookings = mockDb.get('bookings')
    const customers = mockDb.get('customers')
    const locations = mockDb.get('locations')

    const vehicle = vehicles.find((v) => v.id === req.vehicle_id)
    const customer = customers.find((c) => c.id === req.customer_id)
    const pLoc = locations.find((l) => l.id === req.pickup_location_id)
    const rLoc = locations.find((l) => l.id === req.return_location_id)

    const startReq = new Date(req.start_date).getTime()
    const endReq = new Date(req.end_date).getTime()

    // Conflict check in mockDb
    const conflictBooking = bookings.find((b) => {
      if (b.vehicleId !== req.vehicle_id) return false
      if (['cancelled', 'completed', 'no_show', 'rejected'].includes(b.status)) return false
      const bStart = new Date(b.startDate).getTime()
      const bEnd = new Date(b.endDate).getTime()
      return startReq < bEnd && endReq > bStart
    })

    if (conflictBooking) {
      const vName = vehicle ? `${vehicle.make} ${vehicle.model} (${vehicle.plateNumber})` : 'Selected vehicle'
      throw new Error(
        `${vName} is already booked for these dates (${conflictBooking.bookingCode}: ${new Date(conflictBooking.startDate).toLocaleDateString()} to ${new Date(conflictBooking.endDate).toLocaleDateString()}). Please select another vehicle or choose different dates.`
      )
    }

    const days = Math.max(1, Math.ceil((endReq - startReq) / (1000 * 3600 * 24)))

    const dailyRate = vehicle?.pricing?.dailyRate || 3500
    const rentalAmount = dailyRate * days
    const insuranceAmount = req.insurance ? Math.max(500 * days, Math.round(rentalAmount * 0.1)) : 0
    let extraCharges = (req.delivery_fee || 0) + (req.collection_fee || 0) + (req.one_way_fee || 0)
    if (req.extra_items && Array.isArray(req.extra_items)) {
      req.extra_items.forEach((item: any) => {
        extraCharges += (item.price || 0) * (item.quantity || 1)
      })
    }
    const discountAmount = req.coupon_code ? 500 : 0
    const subtotal = Math.max(0, rentalAmount + insuranceAmount + extraCharges - discountAmount)
    const taxAmount = Math.round(subtotal * 0.13)
    const depositAmount = vehicle?.pricing?.depositAmount || 15000
    const totalAmount = subtotal + taxAmount

    const newBooking: Booking = {
      id: `bk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      bookingCode: `BK-NP-${Math.floor(100000 + Math.random() * 900000)}`,
      tenantId: '78248f8f-e390-4f85-a03f-58e4974fa366',
      customerId: req.customer_id,
      customerName: customer?.fullName || 'Registered Renter',
      customerEmail: customer?.email || '',
      customerPhone: customer?.phone || '+977-9800000000',
      customerKycStatus: customer?.verificationStatus || 'verified',
      primaryDriverId: req.primary_driver_id,
      driverName: customer?.fullName,
      vehicleId: req.vehicle_id,
      vehiclePlate: vehicle?.plateNumber || 'BA-2-PA-1234',
      vehicleMake: vehicle?.make || 'Toyota',
      vehicleModel: vehicle ? `${vehicle.make} ${vehicle.model}` : 'Toyota Hilux 4x4',
      vehicleType: vehicle?.type || 'car',
      vehicleCategoryId: vehicle?.categoryId,
      categoryName: vehicle?.categoryName || 'Standard Fleet',
      source: 'admin',
      pickupLocationId: req.pickup_location_id,
      pickupLocationName: pLoc?.name || 'Kathmandu HQ',
      returnLocationId: req.return_location_id,
      returnLocationName: rLoc?.name || 'Kathmandu HQ',
      startDate: req.start_date,
      endDate: req.end_date,
      status: req.initial_status || 'confirmed',
      paymentStatus: req.paid_amount >= totalAmount ? 'paid' : req.paid_amount > 0 ? 'partially_paid' : 'unpaid',
      totalDays: days,
      dailyRate,
      rentalAmount,
      insuranceAmount,
      depositAmount,
      depositStatus: depositAmount > 0 ? 'held' : 'pending',
      contractSigned: false,
      discountAmount,
      taxAmount,
      extraCharges,
      totalAmount,
      paidAmount: Number(req.paid_amount) || 0,
      balanceDue: Math.max(0, totalAmount - (Number(req.paid_amount) || 0)),
      extras: req.extra_items || [],
      notes: req.notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pickupReturnDetails: {},
      activityLogs: [
        {
          id: `act-${Date.now()}`,
          bookingId: `bk-${Date.now()}`,
          action: 'Reservation Created',
          actorName: 'Operations Staff',
          actorRole: 'staff',
          timestamp: new Date().toISOString(),
          details: `Booking created for ${customer?.fullName || 'Customer'}. Total: Rs. ${totalAmount.toLocaleString()}`,
        },
      ],
    }

    const list = mockDb.get('bookings')
    mockDb.set('bookings', [newBooking, ...list])

    // If booking is active or confirmed, update vehicle status and rental booking id
    if (vehicle && req.initial_status === 'active') {
      vehicle.status = 'rented'
      vehicle.currentRentalBookingId = newBooking.bookingCode
      vehicle.currentRenterName = customer?.fullName
      mockDb.set('vehicles', [...vehicles])
    }

    return newBooking
  },


  updateBooking: async (id: string, data: any): Promise<Booking> => {
    try {
      const res = await apiPatch<any>(`/bookings/${id}`, data)
      if (res && res.id) return mapBackendBooking(res)
    } catch (e) {
      console.warn('Backend updateBooking failed, updating mockDb:', e)
    }
    const bookings = mockDb.get('bookings')
    const b = bookings.find((item) => item.id === id)
    if (b) {
      Object.assign(b, data, { updatedAt: new Date().toISOString() })
      mockDb.set('bookings', [...bookings])
      return b
    }
    throw new Error('Booking not found')
  },

  confirmBooking: async (id: string): Promise<Booking> => {
    try {
      const res = await apiPost<any>(`/bookings/${id}/confirm`, {})
      if (res && res.id) return mapBackendBooking(res)
    } catch (e) {
      console.warn('Backend confirmBooking failed, updating mockDb:', e)
    }
    const bookings = mockDb.get('bookings')
    const b = bookings.find((item) => item.id === id)
    if (b) {
      b.status = 'confirmed'
      b.updatedAt = new Date().toISOString()
      mockDb.set('bookings', [...bookings])
      return b
    }
    throw new Error('Booking not found')
  },

  changeStatus: async (id: string, status: BookingStatus, reason?: string): Promise<Booking> => {
    try {
      const res = await apiPost<any>(`/bookings/${id}/status`, { status, reason })
      if (res && res.id) return mapBackendBooking(res)
    } catch (e) {
      console.warn('Backend changeStatus failed, updating mockDb:', e)
    }
    const bookings = mockDb.get('bookings')
    const b = bookings.find((item) => item.id === id)
    if (b) {
      b.status = status
      b.updatedAt = new Date().toISOString()
      b.activityLogs = [
        {
          id: `act-${Date.now()}`,
          bookingId: b.id,
          action: `Status changed to ${status}`,
          actorName: 'Operations Staff',
          actorRole: 'staff',
          timestamp: new Date().toISOString(),
          details: reason || `Status updated to ${status}`,
        },
        ...(b.activityLogs || []),
      ]
      mockDb.set('bookings', [...bookings])
      return b
    }
    throw new Error('Booking not found')
  },

  cancelBooking: async (id: string, reason: string, fee?: number): Promise<void> => {
    try {
      await apiPost(`/bookings/${id}/cancel`, { reason, fee: fee || 0 })
      return
    } catch (e) {
      console.warn('Backend cancelBooking failed, updating mockDb:', e)
    }
    const bookings = mockDb.get('bookings')
    const b = bookings.find((item) => item.id === id)
    if (b) {
      b.status = 'cancelled'
      b.cancellationReason = reason
      b.cancellationFee = fee || 0
      b.cancelledAt = new Date().toISOString()
      mockDb.set('bookings', [...bookings])
      return
    }
    throw new Error('Booking not found')
  },

  noShowBooking: async (id: string, reason?: string, fee?: number): Promise<void> => {
    try {
      await apiPost(`/bookings/${id}/no-show`, { reason, fee: fee || 0 })
      return
    } catch (e) {
      console.warn('Backend noShowBooking failed, updating mockDb:', e)
    }
    const bookings = mockDb.get('bookings')
    const b = bookings.find((item) => item.id === id)
    if (b) {
      b.status = 'no_show'
      b.cancellationReason = reason || 'Customer no-show'
      b.cancellationFee = fee || 0
      mockDb.set('bookings', [...bookings])
      return
    }
    throw new Error('Booking not found')
  },

  assignVehicle: async (id: string, newVehicleId: string, reason: string): Promise<Booking> => {
    try {
      const res = await apiPost<any>(`/bookings/${id}/assign-vehicle`, {
        new_vehicle_id: newVehicleId,
        reason,
      })
      if (res && res.id) return mapBackendBooking(res)
    } catch (e) {
      console.warn('Backend assignVehicle failed, updating mockDb:', e)
    }
    const bookings = mockDb.get('bookings')
    const vehicles = mockDb.get('vehicles')
    const b = bookings.find((item) => item.id === id)
    const newV = vehicles.find((v) => v.id === newVehicleId)
    if (b && newV) {
      b.reassignedFromVehicleId = b.vehicleId
      b.reassignReason = reason
      b.vehicleId = newV.id
      b.vehiclePlate = newV.plateNumber
      b.vehicleModel = `${newV.make} ${newV.model}`
      b.updatedAt = new Date().toISOString()
      mockDb.set('bookings', [...bookings])
      return b
    }
    throw new Error('Booking or replacement vehicle not found')
  },

  verifyEligibility: async (id: string): Promise<EligibilityCheckResult> => {
    try {
      const res = await apiPost<EligibilityCheckResult>(`/bookings/${id}/verify-eligibility`, {})
      if (res) return res
    } catch (e) {
      console.warn('Backend verifyEligibility failed, returning mock result:', e)
    }
    return {
      is_eligible: true,
      customer_kyc_status: 'verified',
      is_blacklisted: false,
      driver_license_valid: true,
      warnings: [],
      errors: [],
    }
  },

  getChecklists: async (id: string): Promise<RentalChecklistRecord[]> => {
    const res = await apiGet<any>(`/bookings/${id}/checklists`)
    return Array.isArray(res) ? res : []
  },

  getStatusHistory: async (id: string): Promise<BookingStatusHistoryItem[]> => {
    const res = await apiGet<any>(`/bookings/${id}/history`)
    return Array.isArray(res) ? res : []
  },

  pickupBooking: async (id: string, data: any): Promise<RentalChecklistRecord> => {
    try {
      const res = await apiPost<RentalChecklistRecord>(`/bookings/${id}/pickup`, data)
      if (res && res.id) return res
    } catch (e) {
      console.warn('Backend pickupBooking failed, updating mockDb:', e)
    }

    const bookings = mockDb.get('bookings')
    const vehicles = mockDb.get('vehicles')
    const b = bookings.find((item) => item.id === id)
    if (b) {
      b.status = 'active'
      b.actualPickupAt = new Date().toISOString()
      b.pickupOdometer = data.odometer
      b.pickupFuel = data.fuel_level
      b.pickupNotes = data.notes
      b.pickupPhotos = data.photos || []
      b.updatedAt = new Date().toISOString()
      mockDb.set('bookings', [...bookings])

      const v = vehicles.find((vItem) => vItem.id === b.vehicleId)
      if (v) {
        v.status = 'rented'
        v.currentRentalBookingId = b.bookingCode
        v.currentRenterName = b.customerName
        if (v.specs) {
          v.specs.mileageOdometer = data.odometer
        }
        mockDb.set('vehicles', [...vehicles])
      }
    }

    return {
      id: `chk-${Date.now()}`,
      booking_id: id,
      checklist_type: 'pickup',
      odometer: data.odometer,
      fuel_level: data.fuel_level,
      exterior_condition: data.exterior_condition || 'Clean',
      interior_condition: data.interior_condition || 'Clean',
      photos: data.photos || [],
      customer_signature: data.customer_signature || 'Verified',
      created_at: new Date().toISOString(),
    }
  },

  returnBooking: async (id: string, data: any): Promise<RentalChecklistRecord> => {
    try {
      const res = await apiPost<RentalChecklistRecord>(`/bookings/${id}/return`, data)
      if (res && res.id) return res
    } catch (e) {
      console.warn('Backend returnBooking failed, updating mockDb:', e)
    }

    const bookings = mockDb.get('bookings')
    const vehicles = mockDb.get('vehicles')
    const b = bookings.find((item) => item.id === id)
    if (b) {
      b.status = 'completed'
      b.actualReturnAt = new Date().toISOString()
      b.returnOdometer = data.odometer
      b.returnFuel = data.fuel_level
      b.returnNotes = data.notes
      b.returnPhotos = data.photos || []
      const extraDamages = Number(data.additional_damages) || 0
      const fuelCost = Number(data.fuel_charge) || 0
      b.extraCharges = (b.extraCharges || 0) + extraDamages + fuelCost
      b.totalAmount = (b.totalAmount || 0) + extraDamages + fuelCost
      b.paymentStatus = 'paid'
      b.balanceDue = 0
      b.updatedAt = new Date().toISOString()
      mockDb.set('bookings', [...bookings])

      const v = vehicles.find((vItem) => vItem.id === b.vehicleId)
      if (v) {
        v.status = extraDamages > 0 ? 'maintenance' : 'available'
        v.currentRentalBookingId = undefined
        v.currentRenterName = undefined
        if (v.specs) {
          v.specs.mileageOdometer = data.odometer
        }
        mockDb.set('vehicles', [...vehicles])
      }
    }

    return {
      id: `chk-${Date.now()}`,
      booking_id: id,
      checklist_type: 'return',
      odometer: data.odometer,
      fuel_level: data.fuel_level,
      exterior_condition: data.exterior_condition || 'Clean',
      interior_condition: data.interior_condition || 'Clean',
      photos: data.photos || [],
      customer_signature: data.customer_signature || 'Verified',
      created_at: new Date().toISOString(),
    }
  },

  extendBooking: async (id: string, newEndDate: string): Promise<Booking> => {
    try {
      const res = await apiPost<any>(`/bookings/${id}/extend`, { new_end_date: newEndDate })
      if (res && res.id) return mapBackendBooking(res)
    } catch (e) {
      console.warn('Backend extendBooking failed, updating mockDb:', e)
    }
    const bookings = mockDb.get('bookings')
    const b = bookings.find((item) => item.id === id)
    if (b) {
      b.endDate = newEndDate
      b.updatedAt = new Date().toISOString()
      mockDb.set('bookings', [...bookings])
      return b
    }
    throw new Error('Booking not found')
  },

  rescheduleBooking: async (id: string, newStartDate: string, newEndDate: string): Promise<Booking> => {
    try {
      const res = await apiPatch<any>(`/bookings/${id}/schedule`, {
        new_start_date: newStartDate,
        new_end_date: newEndDate,
      })
      if (res && res.id) return mapBackendBooking(res)
    } catch (e) {
      console.warn('Backend rescheduleBooking failed, updating mockDb:', e)
    }
    const bookings = mockDb.get('bookings')
    const b = bookings.find((item) => item.id === id)
    if (b) {
      b.startDate = newStartDate
      b.endDate = newEndDate
      b.updatedAt = new Date().toISOString()
      mockDb.set('bookings', [...bookings])
      return b
    }
    throw new Error('Booking not found')
  },

  getCalendarEvents: async (start?: string, end?: string): Promise<any[]> => {
    const query = new URLSearchParams()
    if (start) query.set('start', start)
    if (end) query.set('end', end)
    const url = `/calendar${query.toString() ? `?${query.toString()}` : ''}`
    const res = await apiGet<any[]>(url)
    return Array.isArray(res) ? res : []
  },

  getActiveRentals: async (): Promise<Booking[]> => {
    const res = await apiGet<any[]>('/rentals/active')
    const list = Array.isArray(res) ? res : []
    return list.map(mapBackendBooking)
  },

  checkAvailability: async (startDate?: string, endDate?: string): Promise<any[]> => {
    const query = new URLSearchParams()
    if (startDate) query.set('start_date', startDate)
    if (endDate) query.set('end_date', endDate)
    const url = `/availability${query.toString() ? `?${query.toString()}` : ''}`
    const res = await apiGet<any[]>(url)
    return Array.isArray(res) ? res : []
  },

  getAvailabilityGrid: async (
    dateRange?: [string, string],
    locationId?: string,
    type?: string
  ): Promise<AvailabilitySlot[]> => {
    const [vehicles, bookings] = await Promise.all([
      vehiclesApi.getVehicles(),
      bookingsApi.getBookings(),
    ])

    let filtered = vehicles
    if (locationId && locationId !== 'all') {
      filtered = filtered.filter((v) => v.locationId === locationId)
    }
    if (type && type !== 'all') {
      filtered = filtered.filter((v) => v.type === type)
    }

    return filtered.map((vehicle) => {
      let isAvailable = vehicle.status === 'available'
      let currentBooking: Booking | undefined

      if (dateRange && dateRange[0] && dateRange[1]) {
        const startReq = new Date(dateRange[0]).getTime()
        const endReq = new Date(dateRange[1]).getTime()

        const conflict = bookings.find((b) => {
          if (b.vehicleId !== vehicle.id) return false
          if (['cancelled', 'completed', 'no_show', 'rejected'].includes(b.status)) return false
          const bStart = new Date(b.startDate).getTime()
          const bEnd = new Date(b.endDate).getTime()
          return startReq < bEnd && endReq > bStart
        })

        if (conflict) {
          isAvailable = false
          currentBooking = conflict
        }
      } else {
        if (vehicle.status !== 'available') {
          isAvailable = false
          currentBooking = bookings.find((b) => b.vehicleId === vehicle.id && b.status === 'active')
        }
      }

      return {
        vehicle,
        isAvailable,
        currentBooking,
        conflictsCount: isAvailable ? 0 : 1,
      }
    })
  },

  processPickup: async (id: string, details: any) => {
    return bookingsApi.pickupBooking(id, {
      odometer: details.odometerOut ?? 0,
      fuel_level: typeof details.fuelLevelOut === 'number' ? `${details.fuelLevelOut}%` : (details.fuelLevelOut || '100%'),
      exterior_condition: 'Clean',
      interior_condition: 'Clean',
      notes: details.inspectionNotesOut || '',
      customer_signature: 'Verified',
    })
  },

  processReturn: async (id: string, details: any) => {
    return bookingsApi.returnBooking(id, {
      odometer: details.odometerIn ?? 0,
      fuel_level: typeof details.fuelLevelIn === 'number' ? `${details.fuelLevelIn}%` : (details.fuelLevelIn || '100%'),
      exterior_condition: 'Clean',
      interior_condition: 'Clean',
      notes: details.inspectionNotesIn || '',
      customer_signature: 'Verified',
    })
  },
}
