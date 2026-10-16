import type { Permission, UserRole, User } from '@/types/auth'

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    'dashboard:view',
    'bookings:view',
    'bookings:create',
    'bookings:edit',
    'bookings:cancel',
    'vehicles:view',
    'vehicles:create',
    'vehicles:edit',
    'vehicles:delete',
    'customers:view',
    'customers:create',
    'customers:edit',
    'customers:verify',
    'payments:view',
    'payments:create',
    'payments:refund',
    'contracts:view',
    'contracts:create',
    'maintenance:view',
    'maintenance:manage',
    'expenses:view',
    'expenses:manage',
    'reports:view',
    'marketing:manage',
    'staff:view',
    'staff:manage',
    'settings:view',
    'settings:edit',
  ],
  manager: [
    'dashboard:view',
    'bookings:view',
    'bookings:create',
    'bookings:edit',
    'bookings:cancel',
    'vehicles:view',
    'vehicles:create',
    'vehicles:edit',
    'customers:view',
    'customers:create',
    'customers:edit',
    'customers:verify',
    'payments:view',
    'payments:create',
    'payments:refund',
    'contracts:view',
    'contracts:create',
    'maintenance:view',
    'maintenance:manage',
    'expenses:view',
    'expenses:manage',
    'reports:view',
    'marketing:manage',
    'staff:view',
    'settings:view',
  ],
  staff: [
    'dashboard:view',
    'bookings:view',
    'bookings:create',
    'bookings:edit',
    'vehicles:view',
    'customers:view',
    'customers:create',
    'payments:view',
    'payments:create',
    'contracts:view',
    'maintenance:view',
    'expenses:view',
  ],
  customer: [
    'bookings:view',
  ],
}

export function hasPermission(user: User | null, requiredPermission: Permission): boolean {
  if (!user) return false
  if (user.role === 'admin') return true
  if (user.permissions && user.permissions.includes(requiredPermission)) return true
  const rolePerms = ROLE_PERMISSIONS[user.role] || []
  return rolePerms.includes(requiredPermission)
}

export function hasAnyPermission(user: User | null, requiredPermissions: Permission[]): boolean {
  if (!user) return false
  if (user.role === 'admin') return true
  return requiredPermissions.some((perm) => hasPermission(user, perm))
}

export function hasRole(user: User | null, roles: UserRole | UserRole[]): boolean {
  if (!user) return false
  if (Array.isArray(roles)) {
    return roles.includes(user.role)
  }
  return user.role === roles
}
