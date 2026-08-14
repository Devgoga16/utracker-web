import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

export function RequireAuth() {
  const accessToken = useAuthStore((s) => s.accessToken)
  const location = useLocation()

  if (!accessToken) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  return <Outlet />
}

export function RequireTenant() {
  const activeTenant = useAuthStore((s) => s.activeTenant)

  if (!activeTenant) {
    return <Navigate to="/tenants" replace />
  }

  return <Outlet />
}
