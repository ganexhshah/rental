import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Result, Button } from 'antd'
import { useAuthStore } from '@/store/useAuthStore'
import { hasPermission, hasRole } from '@/lib/permissions'
import type { Permission, UserRole } from '@/types/auth'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredPermission?: Permission
  requiredRole?: UserRole | UserRole[]
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermission,
  requiredRole,
}) => {
  const { isAuthenticated, user } = useAuthStore()
  const location = useLocation()

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (requiredPermission && !hasPermission(user, requiredPermission)) {
    return (
      <div style={{ padding: '64px 24px', textAlign: 'center' }}>
        <Result
          status="403"
          title="Access Restricted"
          subTitle="Your current role does not have authorization to view this module."
          extra={
            <Button type="primary" onClick={() => window.history.back()}>
              Go Back
            </Button>
          }
        />
      </div>
    )
  }

  if (requiredRole && !hasRole(user, requiredRole)) {
    return (
      <div style={{ padding: '64px 24px', textAlign: 'center' }}>
        <Result
          status="403"
          title="Role Restriction"
          subTitle="This action requires higher administrator privileges."
          extra={
            <Button type="primary" onClick={() => window.history.back()}>
              Go Back
            </Button>
          }
        />
      </div>
    )
  }

  return <>{children}</>
}
