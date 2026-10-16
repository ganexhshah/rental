export interface BusinessHours {
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
  isOpen: boolean
  openTime: string
  closeTime: string
}

export interface RentalRulesSettings {
  minRentalHours: number
  maxRentalDays: number
  minDriverAgeCar: number
  minDriverAgeTwoWheeler: number
  securityDepositPolicy: 'refundable_card_hold' | 'cash_deposit' | 'waived'
  cancellationFreeHoursBefore: number
  fuelPolicy: 'same_to_same' | 'full_to_full' | 'pay_per_liter'
  gracePeriodMinutes: number
  allowInstantBooking: boolean
  requireDriverLicenseUpload: boolean
}

export interface PricingSettings {
  currencyCode: string
  currencySymbol: string
  taxPercentage: number
  taxLabel: string
  weekendSurchargePercent: number
  peakSeasonMultiplier: number
  securityDepositCars: number
  securityDepositBikes: number
  lateReturnFeePerHour: number
}

export interface PaymentGatewaySettings {
  stripeEnabled: boolean
  stripePublishableKey?: string
  paypalEnabled: boolean
  cashEnabled: boolean
  bankTransferEnabled: boolean
  bankAccountDetails?: string
}

export interface IntegrationSettings {
  gpsProvider: 'none' | 'teltonika' | 'traccar' | 'geotab'
  gpsApiKey?: string
  smsProvider: 'twilio' | 'infobip' | 'sparrow_sms' | 'none'
  smsApiKey?: string
  whatsappEnabled: boolean
  googleMapsApiKey?: string
}

export interface BrandingSettings {
  companyName: string
  primaryColor: string
  secondaryColor: string
  logoUrl?: string
  faviconUrl?: string
  publicSupportEmail: string
  publicSupportPhone: string
  portalDomain?: string
  termsUrl?: string
  privacyPolicyUrl?: string
  fontPreset?: string
}

export interface SecuritySettings {
  twoFactorRequired: boolean
  sessionTimeoutMinutes: number
  passwordMinLength: number
  ipAllowlist: string[]
}

export interface DocumentTemplateSettings {
  agreementPrefix: string
  agreementTerms: string
  depositPolicy: string
  authorizedRepresentative: string
  invoicePrefix: string
  invoiceVatRate: number
  invoicePaymentTerms: string
  invoiceSignatory: string
  handoverPrefix: string
  checklistItems: string
}

export interface CompanySettings {
  id: string
  tenantId: string
  name: string
  registrationNumber: string
  taxId: string
  email: string
  phone: string
  logoUrl?: string
  website?: string
  headquartersAddress: string
  city: string
  country: string
  currency: string
  businessHours: BusinessHours[]
  rentalRules: RentalRulesSettings
  pricing: PricingSettings
  paymentGateways: PaymentGatewaySettings
  integrations: IntegrationSettings
  branding: BrandingSettings
  security: SecuritySettings
  documentTemplates?: DocumentTemplateSettings
}
