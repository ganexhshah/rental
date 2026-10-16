import React from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { hasPermission, hasRole } from '@/lib/permissions'
import type { Permission, UserRole } from '@/types/auth'

interface PermissionGateProps {
  permission?: Permission
  role?: UserRole | UserRole[]
  children: React.ReactNode
  fallback?: React.ReactNode
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  permission,
  role,
  children,
  fallback = null,
}) => {
  const { user } = useAuthStore()

  if (permission && !hasPermission(user, permission)) {
    return <>{fallback}</>
  }

  if (role && !hasRole(user, role)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
