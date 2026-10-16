import { apiGet, apiPost } from '@/lib/api/client'
import { mockDb } from '@/lib/api/mockDb'
import type { Coupon, MarketingCampaign, ReferralCode } from '@/types/marketing'

interface ApiCoupon {
  id: string
  tenant_id?: string
  code: string
  description?: string
  discount_type?: string
  discountType?: string
  discount_value?: number | string
  discountValue?: number
  min_rental_amount?: number | string
  minBookingAmount?: number
  usage_limit?: number
  usageLimit?: number
  times_used?: number
  timesUsed?: number
  valid_from?: string
  validFrom?: string
  valid_until?: string
  validUntil?: string
  is_active?: boolean
  isActive?: boolean
  created_at?: string
  createdAt?: string
}

function mapApiCoupon(c: ApiCoupon): Coupon {
  return {
    id: c.id,
    tenantId: c.tenant_id || '78248f8f-e390-4f85-a03f-58e4974fa366',
    code: c.code,
    description: c.description || `Special discount code ${c.code}`,
    discountType: (c.discount_type || c.discountType || 'percentage') as 'percentage' | 'fixed_amount',
    discountValue: typeof c.discount_value === 'string' ? parseFloat(c.discount_value) : (c.discount_value ?? c.discountValue ?? 10),
    minBookingAmount: typeof c.min_rental_amount === 'string' ? parseFloat(c.min_rental_amount) : (c.min_rental_amount ?? c.minBookingAmount ?? 0),
    usageLimit: c.usage_limit ?? c.usageLimit ?? 100,
    timesUsed: c.times_used ?? c.timesUsed ?? 0,
    validFrom: c.valid_from || c.validFrom || new Date().toISOString(),
    validUntil: c.valid_until || c.validUntil || new Date(Date.now() + 86400000 * 30).toISOString(),
    isActive: c.is_active ?? c.isActive ?? true,
    createdAt: c.created_at || c.createdAt || new Date().toISOString(),
  }
}

interface ApiCampaign {
  id: string
  tenant_id?: string
  name?: string
  title?: string
  channel: string
  status: string
  budget?: number | string
  revenue_attributed?: number | string
  starts_at?: string
  startDate?: string
  ends_at?: string
  endDate?: string
  created_at?: string
  createdAt?: string
}

function mapApiCampaign(c: ApiCampaign): MarketingCampaign {
  return {
    id: c.id,
    tenantId: c.tenant_id || '78248f8f-e390-4f85-a03f-58e4974fa366',
    title: c.name || c.title || 'Campaign',
    channel: (c.channel as any) || 'email',
    status: (c.status as any) || 'active',
    targetAudience: 'all',
    startDate: c.starts_at || c.startDate || new Date().toISOString(),
    endDate: c.ends_at || c.endDate || new Date(Date.now() + 86400000 * 14).toISOString(),
    budget: typeof c.budget === 'string' ? parseFloat(c.budget) : (c.budget || 0),
    reachCount: 250,
    conversionCount: 18,
    revenueGenerated: typeof c.revenue_attributed === 'string' ? parseFloat(c.revenue_attributed) : (c.revenue_attributed || 0),
    createdAt: c.created_at || c.createdAt || new Date().toISOString(),
  }
}

export const marketingApi = {
  getCoupons: async (): Promise<Coupon[]> => {
    try {
      const res = await apiGet<ApiCoupon[]>('/marketing/coupons')
      if (Array.isArray(res)) {
        return res.map(mapApiCoupon)
      }
    } catch (err) {
      console.warn('API getCoupons failed, falling back to mockDb:', err)
    }
    return mockDb.get('coupons')
  },

  createCoupon: async (data: Omit<Coupon, 'id' | 'timesUsed' | 'createdAt'>): Promise<Coupon> => {
    try {
      const payload = {
        code: data.code,
        discount_type: data.discountType,
        discount_value: data.discountValue,
        min_rental_amount: data.minBookingAmount || 0,
        usage_limit: data.usageLimit || 100,
        valid_from: data.validFrom,
        valid_until: data.validUntil,
      }
      const res = await apiPost<ApiCoupon>('/marketing/coupons', payload)
      if (res && res.id) {
        const created = mapApiCoupon(res)
        const list = mockDb.get('coupons')
        mockDb.set('coupons', [created, ...list])
        return created
      }
    } catch (err) {
      console.warn('API createCoupon failed, falling back to mockDb:', err)
    }

    const list = mockDb.get('coupons')
    const newCoupon: Coupon = {
      ...data,
      id: `cpn-${Date.now()}`,
      timesUsed: 0,
      createdAt: new Date().toISOString(),
    }
    mockDb.set('coupons', [newCoupon, ...list])
    return newCoupon
  },

  toggleCoupon: async (id: string, isActive: boolean): Promise<Coupon> => {
    const list = mockDb.get('coupons')
    const idx = list.findIndex((c) => c.id === id)
    if (idx === -1) throw new Error('Coupon not found')
    list[idx].isActive = isActive
    mockDb.set('coupons', [...list])
    return list[idx]
  },

  getCampaigns: async (): Promise<MarketingCampaign[]> => {
    try {
      const res = await apiGet<ApiCampaign[]>('/marketing/campaigns')
      if (Array.isArray(res)) {
        return res.map(mapApiCampaign)
      }
    } catch (err) {
      console.warn('API getCampaigns failed, falling back to mockDb:', err)
    }
    return mockDb.get('campaigns')
  },

  createCampaign: async (
    data: Omit<MarketingCampaign, 'id' | 'reachCount' | 'conversionCount' | 'revenueGenerated' | 'createdAt'>
  ): Promise<MarketingCampaign> => {
    try {
      const payload = {
        name: data.title,
        channel: data.channel,
        budget: data.budget,
        starts_at: data.startDate,
        ends_at: data.endDate,
      }
      const res = await apiPost<ApiCampaign>('/marketing/campaigns', payload)
      if (res && res.id) {
        const created = mapApiCampaign(res)
        const list = mockDb.get('campaigns')
        mockDb.set('campaigns', [created, ...list])
        return created
      }
    } catch (err) {
      console.warn('API createCampaign failed, falling back to mockDb:', err)
    }

    const list = mockDb.get('campaigns')
    const newCampaign: MarketingCampaign = {
      ...data,
      id: `cmp-${Date.now()}`,
      reachCount: 0,
      conversionCount: 0,
      revenueGenerated: 0,
      createdAt: new Date().toISOString(),
    }
    mockDb.set('campaigns', [newCampaign, ...list])
    return newCampaign
  },

  getReferrals: async (): Promise<ReferralCode[]> => {
    await new Promise((r) => setTimeout(r, 80))
    return mockDb.get('referrals')
  },
}
