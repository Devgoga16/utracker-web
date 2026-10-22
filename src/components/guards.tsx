import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { CHANGE_PASSWORD_PATH } from '@/lib/paths'

export function RequireAuth() {
  const accessToken = useAuthStore((s) => s.accessToken)
  const mustChangePassword = useAuthStore((s) => Boolean(s.user?.mustChangePassword))
  const location = useLocation()

  if (!accessToken) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  // Entró con una contraseña temporal de soporte: nada más hasta elegir la suya.
  if (mustChangePassword && location.pathname !== CHANGE_PASSWORD_PATH) {
    return <Navigate to={CHANGE_PASSWORD_PATH} replace />
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

export function RequireSuperAdmin() {
  const user = useAuthStore((s) => s.user)

  if (!user?.isSuperAdmin) {
    return <Navigate to="/tenants" replace />
  }

  return <Outlet />
}
