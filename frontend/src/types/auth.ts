export type UserRole = 'admin' | 'manager' | 'staff' | 'customer'

export type Permission =
  | 'dashboard:view'
  | 'bookings:view'
  | 'bookings:create'
  | 'bookings:edit'
  | 'bookings:cancel'
  | 'vehicles:view'
  | 'vehicles:create'
  | 'vehicles:edit'
  | 'vehicles:delete'
  | 'customers:view'
  | 'customers:create'
  | 'customers:edit'
  | 'customers:verify'
  | 'payments:view'
  | 'payments:create'
  | 'payments:refund'
  | 'contracts:view'
  | 'contracts:create'
  | 'maintenance:view'
  | 'maintenance:manage'
  | 'expenses:view'
  | 'expenses:manage'
  | 'reports:view'
  | 'marketing:manage'
  | 'staff:view'
  | 'staff:manage'
  | 'settings:view'
  | 'settings:edit'

export interface Tenant {
  id: string
  name: string
  slug: string
  currency: string
  currencySymbol: string
  logoUrl?: string
  plan: 'starter' | 'pro' | 'enterprise'
  timezone: string
}

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  avatarUrl?: string
  tenantId: string
  permissions: Permission[]
  phone?: string
  status: 'active' | 'inactive' | 'suspended'
  createdAt: string
}

export interface AuthState {
  user: User | null
  token: string | null
  tenant: Tenant | null
  availableTenants: Tenant[]
  isAuthenticated: boolean
}

export interface LoginCredentials {
  email: string
  password: string
  remember?: boolean
}

export interface LoginResponse {
  user: User
  token: string
  tenant: Tenant
  availableTenants: Tenant[]
}
