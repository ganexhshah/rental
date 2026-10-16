import { apiGet, apiPost, apiClient } from '@/lib/api/client'
import { mockDb } from '@/lib/api/mockDb'
import { uploadToR2 } from '@/lib/storage/r2'

export interface PrimaryBranchPayload {
  name: string
  code: string
  city: string
  address: string
  contact_phone: string
}

export interface RentalRulesPayload {
  default_deposit: number
  min_rental_hours: number
  allowed_km_per_day: number
  extra_km_rate: number
  fuel_policy: string
  grace_period_mins: number
}

export interface CompleteOnboardingPayload {
  company_name: string
  registration_number: string
  tax_id: string
  email: string
  phone: string
  headquarters_address: string
  city: string
  country: string
  currency: string
  currency_symbol: string
  timezone: string
  logo_url: string
  primary_branch?: PrimaryBranchPayload
  rental_rules?: RentalRulesPayload
  starter_option: 'sample' | 'blank'
}

export interface OnboardingStatus {
  completed: boolean
  completed_at?: string
  tenant_id: string
  company_name: string
  currency: string
  currency_symbol: string
  timezone: string
  logo_url?: string
  has_branches: boolean
  has_vehicles: boolean
  primary_branch?: PrimaryBranchPayload
}

export interface LogoUploadResponse {
  url: string
  filename: string
  size: number
  content_type: string
}

export const onboardingApi = {
  getStatus: async (): Promise<OnboardingStatus | null> => {
    try {
      return await apiGet<OnboardingStatus>('/onboarding/status')
    } catch (err) {
      console.warn('Backend onboarding getStatus fallback:', err)
      return null
    }
  },

  completeOnboarding: async (data: CompleteOnboardingPayload): Promise<{ message: string; completed: boolean }> => {
    try {
      const res = await apiPost<{ message: string; completed: boolean }>('/onboarding/complete', data)
      // Also update local mockDb
      const current = mockDb.get('companySettings')
      mockDb.set('companySettings', {
        ...current,
        name: data.company_name,
        registrationNumber: data.registration_number,
        taxId: data.tax_id,
        email: data.email,
        phone: data.phone,
        headquartersAddress: data.headquarters_address,
        city: data.city,
        country: data.country,
        currency: data.currency,
        branding: {
          ...current.branding,
          companyName: data.company_name,
          logoUrl: data.logo_url || current.branding?.logoUrl,
        },
      })
      return res
    } catch (err) {
      console.warn('Backend onboarding complete fallback to local mockDb:', err)
      // Fallback
      const current = mockDb.get('companySettings')
      mockDb.set('companySettings', {
        ...current,
        name: data.company_name,
        registrationNumber: data.registration_number,
        taxId: data.tax_id,
        email: data.email,
        phone: data.phone,
        headquartersAddress: data.headquarters_address,
        city: data.city,
        country: data.country,
        currency: data.currency,
        branding: {
          ...current.branding,
          companyName: data.company_name,
          logoUrl: data.logo_url || current.branding?.logoUrl,
        },
      })
      return { message: 'Onboarding completed locally', completed: true }
    }
  },

  uploadLogo: async (file: File): Promise<LogoUploadResponse> => {
    // 1. First attempt direct upload to Cloudflare R2
    try {
      const ext = file.name.split('.').pop() || 'png'
      const key = `logos/${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${ext}`
      const cloudRes = await uploadToR2(file, key, file.type)
      if (cloudRes?.url) {
        // Sync cloud url with backend tenant branding
        await apiPost<any>('/onboarding/upload-logo', {
          cloud_url: cloudRes.url,
          filename: file.name,
        }).catch(() => null)

        return {
          url: cloudRes.url,
          filename: file.name,
          size: file.size,
          content_type: file.type,
        }
      }
    } catch (r2Err) {
      console.warn('Direct R2 client upload error, attempting backend upload:', r2Err)
    }

    // 2. Server upload fallback (backend will also save to Cloudflare R2)
    const formData = new FormData()
    formData.append('logo', file)

    try {
      const response = await apiClient.post<{ success: boolean; data: LogoUploadResponse }>('/onboarding/upload-logo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      if (response.data && response.data.data) {
        return response.data.data
      }
      return (response.data as unknown) as LogoUploadResponse
    } catch (err: any) {
      console.warn('Multipart upload failed, attempting Base64 fallback:', err)
      // Convert file to base64 and upload via JSON
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const jsonRes = await apiPost<LogoUploadResponse>('/onboarding/upload-logo', {
        data_uri: base64Data,
        filename: file.name,
      })
      return jsonRes
    }
  },

  uploadLogoBase64: async (dataUri: string, filename = 'logo.png'): Promise<LogoUploadResponse> => {
    return apiPost<LogoUploadResponse>('/onboarding/upload-logo', {
      data_uri: dataUri,
      filename,
    })
  },
}
