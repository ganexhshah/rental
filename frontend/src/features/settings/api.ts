import { apiGet, apiPatch } from '@/lib/api/client'
import type {
  CompanySettings,
  RentalRulesSettings,
  PricingSettings,
  PaymentGatewaySettings,
  IntegrationSettings,
  BrandingSettings,
  SecuritySettings,
  DocumentTemplateSettings,
} from '@/types/settings'

interface ApiTenant {
  id: string
  name: string
  slug: string
  currency: string
  currency_symbol: string
  timezone: string
  plan: string
  status: string
  logo_url?: string
  logoUrl?: string
  settings?: Record<string, any>
}

// In-memory session cache for offline resiliency
let inMemorySettingsCache: CompanySettings | null = null

export const settingsApi = {
  getSettings: async (): Promise<CompanySettings> => {
    let allSettings: Record<string, any> | null = null
    let currentTenant: ApiTenant | null = null

    try {
      ;[allSettings, currentTenant] = await Promise.all([
        apiGet<Record<string, any>>('/settings').catch(() => null),
        apiGet<ApiTenant>('/tenants/current').catch(() => null),
      ])
    } catch (err) {
      console.warn('API getSettings lookup error:', err)
    }

    const companySec = allSettings?.company || allSettings?.settings?.company || {}
    const rentalRulesSec = allSettings?.rental_rules || allSettings?.settings?.rental_rules || {}
    const pricingSec = allSettings?.pricing || allSettings?.settings?.pricing || {}
    const gatewaysSec = allSettings?.payment_gateways || allSettings?.settings?.payment_gateways || {}
    const integrationsSec = allSettings?.integrations || allSettings?.settings?.integrations || {}
    const brandingSec = allSettings?.branding || allSettings?.settings?.branding || {}
    const securitySec = allSettings?.security || allSettings?.settings?.security || {}
    const docTemplatesSec = allSettings?.document_templates || allSettings?.settings?.document_templates || {}

    const companyName = currentTenant?.name || companySec.name || inMemorySettingsCache?.name || 'Rental Workspace'
    const tenantCurrency = currentTenant?.currency || companySec.currency || inMemorySettingsCache?.currency || 'NPR'
    const tenantSymbol = currentTenant?.currency_symbol || companySec.currency_symbol || inMemorySettingsCache?.pricing?.currencySymbol || 'Rs.'
    const logoUrl =
      currentTenant?.logo_url ||
      currentTenant?.logoUrl ||
      brandingSec.logoUrl ||
      brandingSec.logo_url ||
      companySec.logoUrl ||
      companySec.logo_url ||
      inMemorySettingsCache?.logoUrl ||
      ''

    const result: CompanySettings = {
      id: currentTenant?.id || inMemorySettingsCache?.id || 'tenant-id',
      tenantId: currentTenant?.id || inMemorySettingsCache?.tenantId || 'tenant-id',
      name: companyName,
      registrationNumber: companySec.registrationNumber || companySec.registration_number || inMemorySettingsCache?.registrationNumber || '',
      taxId: companySec.taxId || companySec.tax_id || inMemorySettingsCache?.taxId || '',
      email: companySec.email || inMemorySettingsCache?.email || '',
      phone: companySec.phone || inMemorySettingsCache?.phone || '',
      website: companySec.website || inMemorySettingsCache?.website || '',
      headquartersAddress: companySec.headquartersAddress || companySec.headquarters_address || inMemorySettingsCache?.headquartersAddress || '',
      city: companySec.city || inMemorySettingsCache?.city || '',
      country: companySec.country || inMemorySettingsCache?.country || 'Nepal',
      currency: tenantCurrency,
      logoUrl: logoUrl,
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
        minRentalHours: rentalRulesSec.minRentalHours || rentalRulesSec.min_rental_hours || 24,
        maxRentalDays: rentalRulesSec.maxRentalDays || rentalRulesSec.max_rental_days || 90,
        minDriverAgeCar: rentalRulesSec.minDriverAgeCar || 21,
        minDriverAgeTwoWheeler: rentalRulesSec.minDriverAgeTwoWheeler || 18,
        securityDepositPolicy: rentalRulesSec.securityDepositPolicy || 'refundable_card_hold',
        cancellationFreeHoursBefore: rentalRulesSec.cancellationFreeHoursBefore || 24,
        fuelPolicy: rentalRulesSec.fuelPolicy || 'same_to_same',
        gracePeriodMinutes: rentalRulesSec.gracePeriodMinutes || rentalRulesSec.grace_period_mins || 60,
        allowInstantBooking: rentalRulesSec.allowInstantBooking !== false,
        requireDriverLicenseUpload: rentalRulesSec.requireDriverLicenseUpload !== false,
      },
      pricing: {
        currencyCode: tenantCurrency,
        currencySymbol: tenantSymbol,
        taxPercentage: typeof pricingSec.taxPercentage === 'number' ? pricingSec.taxPercentage : 13,
        taxLabel: pricingSec.taxLabel || 'VAT',
        weekendSurchargePercent: pricingSec.weekendSurchargePercent || 0,
        peakSeasonMultiplier: pricingSec.peakSeasonMultiplier || 1.0,
        securityDepositCars: pricingSec.securityDepositCars || 15000,
        securityDepositBikes: pricingSec.securityDepositBikes || 5000,
        lateReturnFeePerHour: pricingSec.lateReturnFeePerHour || 500,
      },
      paymentGateways: {
        stripeEnabled: gatewaysSec.stripeEnabled === true,
        paypalEnabled: gatewaysSec.paypalEnabled === true,
        cashEnabled: gatewaysSec.cashEnabled !== false,
        bankTransferEnabled: gatewaysSec.bankTransferEnabled !== false,
        bankAccountDetails: gatewaysSec.bankAccountDetails || '',
      },
      integrations: {
        gpsProvider: integrationsSec.gpsProvider || 'none',
        smsProvider: integrationsSec.smsProvider || 'none',
        whatsappEnabled: integrationsSec.whatsappEnabled === true,
      },
      branding: {
        companyName: brandingSec.companyName || companyName,
        primaryColor: brandingSec.primaryColor || '#1677ff',
        secondaryColor: brandingSec.secondaryColor || '#52c41a',
        logoUrl: logoUrl,
        faviconUrl: brandingSec.faviconUrl || '',
        publicSupportEmail: brandingSec.publicSupportEmail || companySec.email || '',
        publicSupportPhone: brandingSec.publicSupportPhone || companySec.phone || '',
        portalDomain: brandingSec.portalDomain || '',
        termsUrl: brandingSec.termsUrl || '',
        privacyPolicyUrl: brandingSec.privacyPolicyUrl || '',
        fontPreset: brandingSec.fontPreset || 'modern',
      },
      security: {
        twoFactorRequired: securitySec.twoFactorRequired === true,
        sessionTimeoutMinutes: securitySec.sessionTimeoutMinutes || 60,
        passwordMinLength: securitySec.passwordMinLength || 8,
        ipAllowlist: securitySec.ipAllowlist || [],
      },
      documentTemplates: {
        agreementPrefix: docTemplatesSec.agreementPrefix || 'BRA-',
        agreementTerms:
          docTemplatesSec.agreementTerms ||
          `1. The renter must hold a valid driving licence for the rented vehicle category and obey all traffic laws.\n2. Only authorized drivers may operate the vehicle.\n3. Report any accident or breakdown promptly.\n4. Extensions require prior approval.\n5. Vehicle condition, fuel level, and odometer must match handover inspection.\n6. Security deposit is refunded upon vehicle return inspection.`,
        depositPolicy:
          docTemplatesSec.depositPolicy ||
          'Refundable security deposit is returned upon inspection minus any fines or extra charges.',
        authorizedRepresentative: docTemplatesSec.authorizedRepresentative || 'Operations Officer',
        invoicePrefix: docTemplatesSec.invoicePrefix || 'INV-',
        invoiceVatRate: typeof docTemplatesSec.invoiceVatRate === 'number' ? docTemplatesSec.invoiceVatRate : 13,
        invoicePaymentTerms: docTemplatesSec.invoicePaymentTerms || 'Payment accepted via Cash, Card, Fonepay, or Bank Transfer.',
        invoiceSignatory: docTemplatesSec.invoiceSignatory || 'Authorized Signatory',
        handoverPrefix: docTemplatesSec.handoverPrefix || 'HO-',
        checklistItems:
          docTemplatesSec.checklistItems ||
          'Bluebook / Registration Document in Glovebox\nInsurance Policy\nSpare Wheel & Tool Kit\nRoad Tax & Pollution Token\nLights & Indicators\nHelmets (Two-Wheeler)\nClean Interior & Exterior',
      },
    }

    inMemorySettingsCache = result
    return result
  },

  updateCompanyInfo: async (data: Partial<CompanySettings>): Promise<CompanySettings> => {
    try {
      const payload: Record<string, any> = {}
      if (data.name) payload.name = data.name
      if (data.currency) payload.currency = data.currency
      if (data.pricing?.currencySymbol) payload.currency_symbol = data.pricing.currencySymbol

      await Promise.all([
        apiPatch<any>('/settings/company', data).catch(() => null),
        Object.keys(payload).length > 0 ? apiPatch<any>('/tenants/current', payload).catch(() => null) : null,
      ])
    } catch (err) {
      console.warn('API updateCompanyInfo failed:', err)
    }

    const current = inMemorySettingsCache || (await settingsApi.getSettings())
    const updated = { ...current, ...data }
    inMemorySettingsCache = updated
    return updated
  },

  updateRentalRules: async (rules: Partial<RentalRulesSettings>): Promise<CompanySettings> => {
    try {
      await apiPatch<any>('/settings/rental_rules', rules)
    } catch (err) {
      console.warn('API updateRentalRules failed:', err)
    }
    const current = inMemorySettingsCache || (await settingsApi.getSettings())
    const updated = {
      ...current,
      rentalRules: { ...current.rentalRules, ...rules },
    }
    inMemorySettingsCache = updated
    return updated
  },

  updatePricing: async (pricing: Partial<PricingSettings>): Promise<CompanySettings> => {
    try {
      await apiPatch<any>('/settings/pricing', pricing)
    } catch (err) {
      console.warn('API updatePricing failed:', err)
    }
    const current = inMemorySettingsCache || (await settingsApi.getSettings())
    const updated = {
      ...current,
      pricing: { ...current.pricing, ...pricing },
    }
    inMemorySettingsCache = updated
    return updated
  },

  updatePaymentGateways: async (gateways: Partial<PaymentGatewaySettings>): Promise<CompanySettings> => {
    try {
      await apiPatch<any>('/settings/payment_gateways', gateways)
    } catch (err) {
      console.warn('API updatePaymentGateways failed:', err)
    }
    const current = inMemorySettingsCache || (await settingsApi.getSettings())
    const updated = {
      ...current,
      paymentGateways: { ...current.paymentGateways, ...gateways },
    }
    inMemorySettingsCache = updated
    return updated
  },

  updateIntegrations: async (integrations: Partial<IntegrationSettings>): Promise<CompanySettings> => {
    try {
      await apiPatch<any>('/settings/integrations', integrations)
    } catch (err) {
      console.warn('API updateIntegrations failed:', err)
    }
    const current = inMemorySettingsCache || (await settingsApi.getSettings())
    const updated = {
      ...current,
      integrations: { ...current.integrations, ...integrations },
    }
    inMemorySettingsCache = updated
    return updated
  },

  updateBranding: async (branding: Partial<BrandingSettings>): Promise<CompanySettings> => {
    try {
      await apiPatch<any>('/settings/branding', branding)
      if (branding.companyName) {
        await apiPatch<any>('/tenants/current', { name: branding.companyName }).catch(() => null)
      }
    } catch (err) {
      console.warn('API updateBranding failed:', err)
    }
    const current = inMemorySettingsCache || (await settingsApi.getSettings())
    const updatedLogo = branding.logoUrl !== undefined ? branding.logoUrl : current.logoUrl
    const updated = {
      ...current,
      name: branding.companyName || current.name,
      branding: { ...current.branding, ...branding, logoUrl: updatedLogo },
      logoUrl: updatedLogo,
    }
    inMemorySettingsCache = updated
    return updated
  },

  updateSecurity: async (security: Partial<SecuritySettings>): Promise<CompanySettings> => {
    try {
      await apiPatch<any>('/settings/security', security)
    } catch (err) {
      console.warn('API updateSecurity failed:', err)
    }
    const current = inMemorySettingsCache || (await settingsApi.getSettings())
    const updated = {
      ...current,
      security: { ...current.security, ...security },
    }
    inMemorySettingsCache = updated
    return updated
  },

  updateDocumentTemplates: async (docSettings: Partial<DocumentTemplateSettings>): Promise<CompanySettings> => {
    try {
      await apiPatch<any>('/settings/document_templates', docSettings)
    } catch (err) {
      console.warn('API updateDocumentTemplates failed:', err)
    }
    const current = inMemorySettingsCache || (await settingsApi.getSettings())
    const updated = {
      ...current,
      documentTemplates: { ...current.documentTemplates, ...docSettings } as any,
    }
    inMemorySettingsCache = updated
    return updated
  },

  getBusinessHours: async (): Promise<any> => {
    try {
      const res = await apiGet<any>('/settings/hours')
      if (res && Object.keys(res).length > 0) return res
    } catch (e) {
      console.warn('API getBusinessHours lookup error:', e)
    }
    return {
      monday: { open: '08:00', close: '20:00', enabled: true },
      tuesday: { open: '08:00', close: '20:00', enabled: true },
      wednesday: { open: '08:00', close: '20:00', enabled: true },
      thursday: { open: '08:00', close: '20:00', enabled: true },
      friday: { open: '08:00', close: '20:00', enabled: true },
      saturday: { open: '09:00', close: '18:00', enabled: true },
      sunday: { open: '09:00', close: '18:00', enabled: true },
      twentyFourSeven: false,
      afterHoursFee: 500,
      allowAfterHours: true,
    }
  },

  updateBusinessHours: async (hours: any): Promise<any> => {
    try {
      await apiPatch<any>('/settings/hours', hours)
    } catch (e) {
      console.warn('API updateBusinessHours failed:', e)
    }
    return hours
  },
}
