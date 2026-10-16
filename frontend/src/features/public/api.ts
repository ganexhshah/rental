import { apiGet, apiPost } from '@/lib/api/client'

export interface PublicAddon {
  id: string
  name: string
  description: string
  price_per_day: number
}

export interface PublicLocation {
  id: string
  name: string
  city: string
  address: string
  phone: string
}

export interface PublicTenantConfig {
  tenant_id: string
  name: string
  slug: string
  currency: string
  currency_symbol: string
  timezone: string
  company: {
    name: string
    tagline: string
    phone: string
    email: string
    address: string
    city: string
    pan: string
    heroTitle?: string
    heroSubtitle?: string
  }
  locations: PublicLocation[]
  addons: PublicAddon[]
}

export interface PublicVehicle {
  id: string
  make: string
  model: string
  year: number
  category: string
  vehicle_type: 'bike' | 'scooter' | 'car' | string
  license_plate: string
  daily_rate: number
  weekly_rate: number
  image_url: string
  fuel_type: string
  transmission: string
  seating_capacity: number
  engine_cc?: string
  status: string
  features?: string[]
}

export interface CreatePublicBookingPayload {
  vehicle_id: string
  start_date: string
  end_date: string
  pickup_location_id?: string
  return_location_id?: string
  pickup_location?: string
  return_location?: string
  insurance: boolean
  customer: {
    first_name: string
    last_name: string
    email: string
    phone: string
    license_number: string
  }
  coupon_code?: string
  notes?: string
}

export interface PublicBookingResponse {
  booking: {
    id: string
    booking_number: string
    status: string
    customer_name: string
    customer_email: string
    customer_phone?: string
    start_date: string
    end_date: string
    total_days?: number
    insurance?: boolean
  }
  confirmation_message: string
  currency: string
  currency_symbol: string
}

export const publicApi = {
  async getTenantConfig(slugOrId: string): Promise<PublicTenantConfig> {
    const res: any = await apiGet<any>(`/public/${encodeURIComponent(slugOrId)}/config`)
    return res?.data ?? res
  },

  async getPublicVehicles(slugOrId: string, category?: string): Promise<PublicVehicle[]> {
    const query = category && category !== 'all' ? `?category=${encodeURIComponent(category)}` : ''
    const res: any = await apiGet<any>(`/public/${encodeURIComponent(slugOrId)}/vehicles${query}`)
    const payload = res?.data ?? res
    return payload?.vehicles ?? (Array.isArray(payload) ? payload : [])
  },

  async checkAvailability(
    slugOrId: string,
    params: { startDate: string; endDate: string; vehicleId?: string }
  ): Promise<{ is_available?: boolean; available_vehicles?: any[] }> {
    const q = new URLSearchParams()
    q.set('start_date', params.startDate)
    q.set('end_date', params.endDate)
    if (params.vehicleId) q.set('vehicle_id', params.vehicleId)

    const res: any = await apiGet<any>(`/public/${encodeURIComponent(slugOrId)}/availability?${q.toString()}`)
    return res?.data ?? res
  },

  async createBooking(slugOrId: string, payload: CreatePublicBookingPayload): Promise<PublicBookingResponse> {
    const res: any = await apiPost<any>(`/public/${encodeURIComponent(slugOrId)}/bookings`, payload)
    return res?.data ?? res
  },
}

