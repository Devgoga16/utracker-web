import { useAuthStore } from '@/stores/authStore'
import type { MembershipRole } from '@/types'

/**
 * Qué puede hacer la persona en el negocio activo, por su rol.
 *
 * Como `useSubscription`, solo esconde: quien bloquea es la API. Sirve para
 * no mostrarle a nadie un botón que le va a responder «sin permiso».
 *
 * Sin rol (soporte entrando a un negocio) se trata como dueño, que es el
 * alcance con el que entra.
 */
export function useRole() {
  const role = useAuthStore((s) => s.activeTenant?.role) as MembershipRole | undefined

  const is = (...roles: MembershipRole[]) => !role || roles.includes(role)

  return {
    role,
    is,
    /** Dueño o administrador: catálogo, ajustes, equipo, finanzas, eliminar. */
    isManager: is('owner', 'admin'),
    /** Quien atiende: toma pedidos, cobra, cancela. El repartidor no. */
    isTeam: is('owner', 'admin', 'staff'),
  }
}
