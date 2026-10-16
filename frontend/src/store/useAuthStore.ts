import { create } from 'zustand'
import type { Tenant, User } from '@/types/auth'
import { apiGet } from '@/lib/api/client'

export const DEFAULT_TENANT: Tenant = {
  id: '78248f8f-e390-4f85-a03f-58e4974fa366',
  name: 'Rider zone',
  slug: 'himalayan-rides',
  currency: 'NPR',
  currencySymbol: 'Rs.',
  plan: 'enterprise',
  timezone: 'Asia/Kathmandu',
}

interface AuthStoreState {
  user: User | null
  token: string | null
  tenant: Tenant
  availableTenants: Tenant[]
  isAuthenticated: boolean
  login: (user: User, token: string, tenant?: Tenant) => void
  logout: () => void
  switchTenant: (tenantId: string) => void
  updateUserProfile: (partial: Partial<User>) => void
  updateTenant: (partial: Partial<Tenant>) => void
  fetchCurrentUser: () => Promise<void>
}

const AUTH_USER_KEY = 'rental_auth_user'
const AUTH_TOKEN_KEY = 'rental_auth_token'
const AUTH_TENANT_KEY = 'rental_auth_tenant'
const AUTH_TENANT_DATA_KEY = 'rental_auth_tenant_data'

function getInitialAuthState(): {
  user: User | null
  token: string | null
  tenant: Tenant
  isAuthenticated: boolean
} {
  try {
    const savedToken = localStorage.getItem(AUTH_TOKEN_KEY)
    const savedUserStr = localStorage.getItem(AUTH_USER_KEY)
    const savedTenantStr = localStorage.getItem(AUTH_TENANT_DATA_KEY)

    // Clear stale demo data from previous mock iterations
    if (
      !savedToken ||
      savedToken === 'mock-jwt-token-apex' ||
      !savedUserStr ||
      savedUserStr.includes('apexmobility.io') ||
      savedUserStr.includes('Alexander Wright')
    ) {
      localStorage.removeItem(AUTH_USER_KEY)
      localStorage.removeItem(AUTH_TOKEN_KEY)
      localStorage.removeItem(AUTH_TENANT_KEY)
      localStorage.removeItem(AUTH_TENANT_DATA_KEY)
      return {
        user: null,
        token: null,
        tenant: DEFAULT_TENANT,
        isAuthenticated: false,
      }
    }

    const savedUser = JSON.parse(savedUserStr)
    const savedTenant = savedTenantStr ? JSON.parse(savedTenantStr) : DEFAULT_TENANT

    return {
      user: savedUser,
      token: savedToken,
      tenant: savedTenant,
      isAuthenticated: true,
    }
  } catch {
    return {
      user: null,
      token: null,
      tenant: DEFAULT_TENANT,
      isAuthenticated: false,
    }
  }
}

export const useAuthStore = create<AuthStoreState>((set, get) => {
  const initial = getInitialAuthState()

  return {
    user: initial.user,
    token: initial.token,
    tenant: initial.tenant,
    availableTenants: [DEFAULT_TENANT],
    isAuthenticated: initial.isAuthenticated,

    login: (user, token, tenant) => {
      const activeTenant = tenant || DEFAULT_TENANT
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user))
      localStorage.setItem(AUTH_TOKEN_KEY, token)
      localStorage.setItem(AUTH_TENANT_KEY, activeTenant.id)
      localStorage.setItem(AUTH_TENANT_DATA_KEY, JSON.stringify(activeTenant))
      set({
        user,
        token,
        tenant: activeTenant,
        isAuthenticated: true,
      })
    },

    logout: () => {
      localStorage.removeItem(AUTH_USER_KEY)
      localStorage.removeItem(AUTH_TOKEN_KEY)
      localStorage.removeItem(AUTH_TENANT_KEY)
      localStorage.removeItem(AUTH_TENANT_DATA_KEY)
      set({
        user: null,
        token: null,
        tenant: DEFAULT_TENANT,
        isAuthenticated: false,
      })
    },

    switchTenant: (tenantId) => {
      const found = get().availableTenants.find((t) => t.id === tenantId)
      if (found) {
        localStorage.setItem(AUTH_TENANT_KEY, tenantId)
        set((state) => ({
          tenant: found,
          user: state.user ? { ...state.user, tenantId } : null,
        }))
      }
    },

    updateUserProfile: (partial) => {
      const current = get().user
      if (!current) return
      const updated = { ...current, ...partial }
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(updated))
      set({ user: updated })
    },

    updateTenant: (partial) => {
      const current = get().tenant
      const updated = { ...current, ...partial }
      localStorage.setItem(AUTH_TENANT_DATA_KEY, JSON.stringify(updated))
      set({ tenant: updated })
    },

    fetchCurrentUser: async () => {
      try {
        const res = await apiGet<{ user: any; tenant: any }>('/auth/me')
        if (res?.user) {
          const liveUser: User = {
            id: res.user.id,
            name: res.user.full_name || res.user.name || res.user.email.split('@')[0],
            email: res.user.email,
            phone: res.user.phone,
            role: res.user.role || 'admin',
            tenantId: res.tenant?.id || res.user.tenant_id,
            avatarUrl: res.user.avatar_url,
            permissions: res.user.permissions || [],
            status: res.user.status || 'active',
            createdAt: res.user.created_at,
          }
          const liveTenant: Tenant = {
            id: res.tenant?.id || get().tenant.id,
            name: res.tenant?.name || get().tenant.name,
            slug: res.tenant?.slug || get().tenant.slug,
            currency: res.tenant?.currency || 'NPR',
            currencySymbol: res.tenant?.currency_symbol || 'Rs.',
            plan: res.tenant?.plan || 'enterprise',
            timezone: res.tenant?.timezone || 'Asia/Kathmandu',
            logoUrl: res.tenant?.logo_url || res.tenant?.logoUrl || get().tenant.logoUrl,
          }
          localStorage.setItem(AUTH_USER_KEY, JSON.stringify(liveUser))
          localStorage.setItem(AUTH_TENANT_KEY, liveTenant.id)
          localStorage.setItem(AUTH_TENANT_DATA_KEY, JSON.stringify(liveTenant))
          set({
            user: liveUser,
            tenant: liveTenant,
            availableTenants: [liveTenant],
            isAuthenticated: true,
          })
        }
      } catch (err) {
        // Backend offline or token expired
      }
    },
  }
})
