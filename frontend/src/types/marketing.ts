export interface Coupon {
  id: string
  tenantId: string
  code: string
  description: string
  discountType: 'percentage' | 'fixed_amount'
  discountValue: number
  minRentalDays?: number
  minBookingAmount?: number
  maxDiscountAmount?: number
  usageLimit?: number
  timesUsed: number
  validFrom: string
  validUntil: string
  vehicleTypes?: ('car' | 'bike' | 'scooter')[]
  isActive: boolean
  createdAt: string
}

export interface MarketingCampaign {
  id: string
  tenantId: string
  title: string
  channel: 'email' | 'sms' | 'social' | 'banner'
  status: 'draft' | 'active' | 'scheduled' | 'ended'
  targetAudience: 'all' | 'new_customers' | 'vip' | 'inactive'
  startDate: string
  endDate: string
  couponId?: string
  couponCode?: string
  budget: number
  reachCount: number
  conversionCount: number
  revenueGenerated: number
  createdAt: string
}

export interface ReferralCode {
  id: string
  tenantId: string
  code: string
  referrerCustomerId: string
  referrerName: string
  referrerRewardAmount: number
  referredDiscountPercent: number
  usesCount: number
  totalRewardsEarned: number
  status: 'active' | 'inactive'
  createdAt: string
}
