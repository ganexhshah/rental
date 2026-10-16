export interface SaaSSubscriptionPlan {
  id: string
  name: string
  tier: 'starter' | 'pro' | 'enterprise'
  priceMonthly: number
  priceYearly: number
  maxVehicles: number
  maxLocations: number
  maxStaff: number
  features: string[]
  isPopular?: boolean
}

export interface CurrentTenantSubscription {
  tenantId: string
  planId: string
  planName: string
  status: 'active' | 'trial' | 'past_due' | 'canceled'
  billingInterval: 'monthly' | 'yearly'
  currentPeriodStart: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
  usage: {
    vehiclesCount: number
    maxVehicles: number
    locationsCount: number
    maxLocations: number
    staffCount: number
    maxStaff: number
    monthlyBookingsCount: number
  }
}

export interface SubscriptionInvoice {
  id: string
  invoiceNumber: string
  tenantId: string
  amount: number
  currency: string
  date: string
  status: 'paid' | 'open' | 'void'
  downloadUrl?: string
}
