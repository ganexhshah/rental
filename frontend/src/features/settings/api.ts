import { apiGet, apiPatch } from '@/lib/api/client'
import { mockDb } from '@/lib/api/mockDb'
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
  settings?: Record<string, any>
}

export const settingsApi = {
  getSettings: async (): Promise<CompanySettings> => {
    const current = mockDb.get('companySettings')
    try {
      const [allSettings, currentTenant] = await Promise.all([
        apiGet<Record<string, any>>('/settings').catch(() => null),
        apiGet<ApiTenant>('/tenants/current').catch(() => null),
      ])

      if (allSettings || currentTenant) {
        const companySec = allSettings?.company || {}
        const rentalRulesSec = allSettings?.rental_rules || {}
        const pricingSec = allSettings?.pricing || {}
        const gatewaysSec = allSettings?.payment_gateways || {}
        const integrationsSec = allSettings?.integrations || {}
        const brandingSec = allSettings?.branding || {}
        const securitySec = allSettings?.security || {}
        const docTemplatesSec = allSettings?.document_templates || {}

        const merged: CompanySettings = {
          ...current,
          id: currentTenant?.id || current.id,
          tenantId: currentTenant?.id || current.tenantId,
          name: currentTenant?.name || companySec.name || current.name,
          registrationNumber: companySec.registrationNumber || current.registrationNumber,
          taxId: companySec.taxId || current.taxId,
          email: companySec.email || current.email,
          phone: companySec.phone || current.phone,
          website: companySec.website || current.website,
          headquartersAddress: companySec.headquartersAddress || current.headquartersAddress,
          city: companySec.city || current.city,
          country: companySec.country || current.country,
          currency: currentTenant?.currency || companySec.currency || current.currency,
          rentalRules: { ...current.rentalRules, ...rentalRulesSec },
          pricing: {
            ...current.pricing,
            ...pricingSec,
            currencyCode: currentTenant?.currency || current.pricing?.currencyCode || 'NPR',
            currencySymbol: currentTenant?.currency_symbol || current.pricing?.currencySymbol || 'Rs.',
          },
          paymentGateways: { ...current.paymentGateways, ...gatewaysSec },
          integrations: { ...current.integrations, ...integrationsSec },
          branding: { ...current.branding, ...brandingSec },
          security: { ...current.security, ...securitySec },
          documentTemplates: { ...current.documentTemplates, ...docTemplatesSec },
        }
        mockDb.set('companySettings', merged)
        return merged
      }
    } catch (err) {
      console.warn('API getSettings failed, falling back to mockDb:', err)
    }

    return current
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
      console.warn('API updateCompanyInfo failed, persisting to mockDb:', err)
    }

    const current = mockDb.get('companySettings')
    const updated = { ...current, ...data }
    mockDb.set('companySettings', updated)
    return updated
  },

  updateRentalRules: async (rules: Partial<RentalRulesSettings>): Promise<CompanySettings> => {
    try {
      await apiPatch<any>('/settings/rental_rules', rules)
    } catch (err) {
      console.warn('API updateRentalRules failed, persisting to mockDb:', err)
    }
    const current = mockDb.get('companySettings')
    const updated = {
      ...current,
      rentalRules: { ...current.rentalRules, ...rules },
    }
    mockDb.set('companySettings', updated)
    return updated
  },

  updatePricing: async (pricing: Partial<PricingSettings>): Promise<CompanySettings> => {
    try {
      await apiPatch<any>('/settings/pricing', pricing)
    } catch (err) {
      console.warn('API updatePricing failed, persisting to mockDb:', err)
    }
    const current = mockDb.get('companySettings')
    const updated = {
      ...current,
      pricing: { ...current.pricing, ...pricing },
    }
    mockDb.set('companySettings', updated)
    return updated
  },

  updatePaymentGateways: async (gateways: Partial<PaymentGatewaySettings>): Promise<CompanySettings> => {
    try {
      await apiPatch<any>('/settings/payment_gateways', gateways)
    } catch (err) {
      console.warn('API updatePaymentGateways failed, persisting to mockDb:', err)
    }
    const current = mockDb.get('companySettings')
    const updated = {
      ...current,
      paymentGateways: { ...current.paymentGateways, ...gateways },
    }
    mockDb.set('companySettings', updated)
    return updated
  },

  updateIntegrations: async (integrations: Partial<IntegrationSettings>): Promise<CompanySettings> => {
    try {
      await apiPatch<any>('/settings/integrations', integrations)
    } catch (err) {
      console.warn('API updateIntegrations failed, persisting to mockDb:', err)
    }
    const current = mockDb.get('companySettings')
    const updated = {
      ...current,
      integrations: { ...current.integrations, ...integrations },
    }
    mockDb.set('companySettings', updated)
    return updated
  },

  updateBranding: async (branding: Partial<BrandingSettings>): Promise<CompanySettings> => {
    try {
      await apiPatch<any>('/settings/branding', branding)
    } catch (err) {
      console.warn('API updateBranding failed, persisting to mockDb:', err)
    }
    const current = mockDb.get('companySettings')
    const updated = {
      ...current,
      branding: { ...current.branding, ...branding },
    }
    mockDb.set('companySettings', updated)
    return updated
  },

  updateSecurity: async (security: Partial<SecuritySettings>): Promise<CompanySettings> => {
    try {
      await apiPatch<any>('/settings/security', security)
    } catch (err) {
      console.warn('API updateSecurity failed, persisting to mockDb:', err)
    }
    const current = mockDb.get('companySettings')
    const updated = {
      ...current,
      security: { ...current.security, ...security },
    }
    mockDb.set('companySettings', updated)
    return updated
  },

  updateDocumentTemplates: async (docSettings: Partial<DocumentTemplateSettings>): Promise<CompanySettings> => {
    try {
      await apiPatch<any>('/settings/document_templates', docSettings)
    } catch (err) {
      console.warn('API updateDocumentTemplates failed, persisting to mockDb:', err)
    }
    const current = mockDb.get('companySettings')
    const updated = {
      ...current,
      documentTemplates: { ...current.documentTemplates, ...docSettings } as any,
    }
    mockDb.set('companySettings', updated)
    return updated
  },

  getBusinessHours: async (): Promise<any> => {
    try {
      const res = await apiGet<any>('/settings/hours')
      if (res && Object.keys(res).length > 0) return res
    } catch (e) {
      console.warn('API getBusinessHours fallback:', e)
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
      console.warn('API updateBusinessHours fallback:', e)
    }
    return hours
  },
}
