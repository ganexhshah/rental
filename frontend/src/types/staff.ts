import type { Permission, UserRole } from './auth'

export interface StaffMember {
  id: string
  tenantId: string
  name: string
  email: string
  phone: string
  role: UserRole
  customRoleTitle?: string
  assignedLocationId?: string
  assignedLocationName?: string
  status: 'active' | 'inactive' | 'suspended'
  avatarUrl?: string
  permissions: Permission[]
  lastLoginAt?: string
  createdAt: string
}

export interface RolePermissionConfig {
  role: UserRole
  title: string
  description: string
  permissions: Permission[]
}

export interface SystemActivityLog {
  id: string
  tenantId: string
  userId: string
  userName: string
  userRole: string
  action: string
  entityType: 'booking' | 'vehicle' | 'customer' | 'payment' | 'contract' | 'maintenance' | 'system'
  entityId: string
  details: string
  ipAddress?: string
  timestamp: string
}
