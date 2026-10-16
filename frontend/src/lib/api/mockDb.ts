import type { Vehicle, VehicleCategory, VehicleLocation, VehicleTypeDefinition } from '@/types/vehicle'
import type { Customer } from '@/types/customer'
import type { Booking } from '@/types/booking'
import type { PaymentTransaction, DepositRecord, Invoice, RefundRequest } from '@/types/payment'
import type { Contract, ContractTemplate } from '@/types/contract'
import type { MaintenanceTask, MaintenanceVendor, MaintenanceSchedule } from '@/types/maintenance'
import type { Expense } from '@/types/expense'
import type { Coupon, MarketingCampaign, ReferralCode } from '@/types/marketing'
import type { StaffMember, SystemActivityLog } from '@/types/staff'
import type { SaaSSubscriptionPlan, CurrentTenantSubscription } from '@/types/subscription'
import type { CompanySettings } from '@/types/settings'

const DB_STORAGE_KEY = 'rental_saas_nepal_db_v1'

export interface MockDatabaseSchema {
  vehicles: Vehicle[]
  categories: VehicleCategory[]
  vehicleTypes: VehicleTypeDefinition[]
  locations: VehicleLocation[]
  customers: Customer[]
  bookings: Booking[]
  payments: PaymentTransaction[]
  deposits: DepositRecord[]
  invoices: Invoice[]
  refunds: RefundRequest[]
  contracts: Contract[]
  contractTemplates: ContractTemplate[]
  maintenanceTasks: MaintenanceTask[]
  maintenanceVendors: MaintenanceVendor[]
  maintenanceSchedules: MaintenanceSchedule[]
  expenses: Expense[]
  coupons: Coupon[]
  campaigns: MarketingCampaign[]
  referrals: ReferralCode[]
  staff: StaffMember[]
  activityLogs: SystemActivityLog[]
  subscriptionPlans: SaaSSubscriptionPlan[]
  subscription: CurrentTenantSubscription
  companySettings: CompanySettings
}

const defaultInitialData: MockDatabaseSchema = {
  vehicles: [],
  vehicleTypes: [
    { id: 'vtype-car', key: 'car', name: 'Car / SUV / EV', icon: '🚗', description: 'Four-wheel passenger automobiles, SUVs, hatchbacks, and sedans', isSystem: true },
    { id: 'vtype-bike', key: 'bike', name: 'Motorcycle / Bike', icon: '🏍️', description: 'Two-wheel motorbikes, cruisers, and adventure tourers', isSystem: true },
    { id: 'vtype-scooter', key: 'scooter', name: 'Scooter', icon: '🛵', description: 'Two-wheel automatic city commuter scooters', isSystem: true },
    { id: 'vtype-van', key: 'van', name: 'Van / Microbus', icon: '🚐', description: 'Multi-passenger transport vans and tourist microbuses', isSystem: false },
  ],
  categories: [
    { id: 'cat-1', name: 'SUV / 4x4', type: 'car', baseDailyRate: 4500, description: 'Rugged terrain Himalayan SUVs', count: 0 },
    { id: 'cat-2', name: 'Sedan', type: 'car', baseDailyRate: 3500, description: 'City & highway touring sedans', count: 0 },
    { id: 'cat-3', name: 'Adventure Motorcycle', type: 'bike', baseDailyRate: 2500, description: 'Royal Enfield and dual-sport adventure bikes', count: 0 },
    { id: 'cat-4', name: 'Scooter', type: 'scooter', baseDailyRate: 1200, description: 'Economical city commuter scooters', count: 0 },
  ],
  locations: [
    { id: 'loc-1', name: 'Kathmandu HQ (Thamel)', code: 'KTM-HQ', address: 'Thamel Marg, Kathmandu', city: 'Kathmandu', contactPhone: '+977-1-4700000', activeVehiclesCount: 0 },
    { id: 'loc-2', name: 'Tribhuvan International Airport (KTM)', code: 'KTM-AIR', address: 'Ring Road, Kathmandu', city: 'Kathmandu', contactPhone: '+977-1-4700001', activeVehiclesCount: 0 },
    { id: 'loc-3', name: 'Pokhara Lakeside Branch', code: 'PKR-LAK', address: 'Lakeside-6, Pokhara', city: 'Pokhara', contactPhone: '+977-61-460000', activeVehiclesCount: 0 },
  ],
  customers: [],
  bookings: [],
  payments: [],
  deposits: [],
  invoices: [],
  refunds: [],
  contracts: [],
  contractTemplates: [
    {
      id: 'tpl-1',
      tenantId: '78248f8f-e390-4f85-a03f-58e4974fa366',
      title: 'Standard Nepali Vehicle Rental Agreement',
      vehicleType: 'all',
      version: '1.0',
      content: 'Standard terms for vehicle self-drive rentals in Nepal.',
      variables: ['{{customer_name}}', '{{vehicle_plate}}', '{{total_amount}}'],
      isDefault: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  maintenanceTasks: [],
  maintenanceVendors: [
    {
      id: 'ven-1',
      name: 'Himalayan Auto Works',
      serviceType: 'Automotive Workshop',
      contactPerson: 'Bikash Shrestha',
      phone: '+977-9801234567',
      email: 'service@himalayanauto.com.np',
      address: 'Kathmandu, Nepal',
      rating: 4.8,
    },
  ],
  maintenanceSchedules: [],
  expenses: [],
  coupons: [],
  campaigns: [],
  referrals: [],
  staff: [],
  activityLogs: [],
  subscriptionPlans: [
    {
      id: 'plan-starter',
      name: 'Starter Fleet',
      tier: 'starter',
      priceMonthly: 4999,
      priceYearly: 49990,
      maxVehicles: 15,
      maxLocations: 1,
      maxStaff: 3,
      features: ['Up to 15 vehicles', 'Basic booking engine', 'Email notifications', 'Contract generation'],
    },
    {
      id: 'plan-pro',
      name: 'Growth Pro',
      tier: 'pro',
      priceMonthly: 11999,
      priceYearly: 119990,
      maxVehicles: 50,
      maxLocations: 3,
      maxStaff: 10,
      features: ['Up to 50 vehicles', 'Custom domain & portal', 'Maintenance & damage tracking', 'SMS alerts', 'Advanced analytics'],
      isPopular: true,
    },
    {
      id: 'plan-enterprise',
      name: 'Enterprise Fleet',
      tier: 'enterprise',
      priceMonthly: 24999,
      priceYearly: 249990,
      maxVehicles: 9999,
      maxLocations: 20,
      maxStaff: 50,
      features: ['Unlimited fleet', 'API access & webhooks', 'Multi-branch management', 'Dedicated support', 'Custom templates'],
    },
  ],
  subscription: {
    tenantId: '78248f8f-e390-4f85-a03f-58e4974fa366',
    planId: 'plan-enterprise',
    planName: 'Enterprise Fleet',
    status: 'active',
    billingInterval: 'monthly',
    currentPeriodStart: '2026-01-01T00:00:00Z',
    currentPeriodEnd: '2027-12-31T23:59:59Z',
    cancelAtPeriodEnd: false,
    usage: {
      vehiclesCount: 0,
      maxVehicles: 9999,
      locationsCount: 3,
      maxLocations: 20,
      staffCount: 1,
      maxStaff: 50,
      monthlyBookingsCount: 0,
    },
  },
  companySettings: {
    id: 'comp-1',
    tenantId: '78248f8f-e390-4f85-a03f-58e4974fa366',
    name: 'Himalayan Rides Nepal',
    registrationNumber: 'REG-2026-KTM',
    taxId: 'PAN: 601234567',
    email: 'support@himalayanrides.com',
    phone: '+977-1-4700000',
    headquartersAddress: 'Thamel Marg, Kathmandu 44600',
    city: 'Kathmandu',
    country: 'Nepal',
    currency: 'NPR',
    businessHours: [
      { day: 'monday', isOpen: true, openTime: '08:00', closeTime: '20:00' },
      { day: 'tuesday', isOpen: true, openTime: '08:00', closeTime: '20:00' },
      { day: 'wednesday', isOpen: true, openTime: '08:00', closeTime: '20:00' },
      { day: 'thursday', isOpen: true, openTime: '08:00', closeTime: '20:00' },
      { day: 'friday', isOpen: true, openTime: '08:00', closeTime: '20:00' },
      { day: 'saturday', isOpen: true, openTime: '09:00', closeTime: '18:00' },
      { day: 'sunday', isOpen: true, openTime: '09:00', closeTime: '18:00' },
    ],
    rentalRules: {
      minRentalHours: 24,
      maxRentalDays: 90,
      minDriverAgeCar: 21,
      minDriverAgeTwoWheeler: 18,
      securityDepositPolicy: 'refundable_card_hold',
      cancellationFreeHoursBefore: 24,
      fuelPolicy: 'same_to_same',
      gracePeriodMinutes: 60,
      allowInstantBooking: true,
      requireDriverLicenseUpload: true,
    },
    pricing: {
      currencyCode: 'NPR',
      currencySymbol: 'Rs.',
      taxPercentage: 13,
      taxLabel: 'VAT',
      weekendSurchargePercent: 0,
      peakSeasonMultiplier: 1.0,
      securityDepositCars: 15000,
      securityDepositBikes: 5000,
      lateReturnFeePerHour: 500,
    },
    paymentGateways: {
      stripeEnabled: false,
      paypalEnabled: false,
      cashEnabled: true,
      bankTransferEnabled: true,
      bankAccountDetails: 'Nabil Bank Ltd - Himalayan Rides Nepal',
    },
    integrations: {
      gpsProvider: 'none',
      smsProvider: 'sparrow_sms',
      whatsappEnabled: true,
    },
    branding: {
      companyName: 'Himalayan Rides Nepal',
      primaryColor: '#1677ff',
      secondaryColor: '#52c41a',
      publicSupportEmail: 'support@himalayanrides.com',
      publicSupportPhone: '+977-1-4700000',
    },
    security: {
      twoFactorRequired: false,
      sessionTimeoutMinutes: 120,
      passwordMinLength: 8,
      ipAllowlist: [],
    },
  },
}

class LocalStorageDB {
  private getStorageKey(): string {
    try {
      const tenantId = localStorage.getItem('rental_auth_tenant')
      if (tenantId) {
        return `rental_saas_db_${tenantId}`
      }
    } catch {
      // ignore
    }
    return DB_STORAGE_KEY
  }

  private load(): MockDatabaseSchema {
    try {
      const key = this.getStorageKey()
      const stored = localStorage.getItem(key)
      if (stored) {
        const parsed = JSON.parse(stored)
        return {
          ...defaultInitialData,
          ...parsed,
          vehicleTypes: Array.isArray(parsed.vehicleTypes) ? parsed.vehicleTypes : defaultInitialData.vehicleTypes,
        }
      }
    } catch {
      // ignore
    }
    return JSON.parse(JSON.stringify(defaultInitialData))
  }

  public get<K extends keyof MockDatabaseSchema>(key: K): MockDatabaseSchema[K] {
    const data = this.load()
    return data[key]
  }

  public set<K extends keyof MockDatabaseSchema>(key: K, value: MockDatabaseSchema[K]): void {
    const data = this.load()
    data[key] = value
    try {
      localStorage.setItem(this.getStorageKey(), JSON.stringify(data))
    } catch {
      // ignore
    }
  }

  public clear(): void {
    try {
      localStorage.removeItem(this.getStorageKey())
    } catch {
      // ignore
    }
  }
}

export const mockDb = new LocalStorageDB()

