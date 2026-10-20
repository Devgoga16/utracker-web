import { useQuery } from '@tanstack/react-query'
import { getMySubscription } from '@/api/subscription'
import { useAuthStore } from '@/stores/authStore'
import type { FeatureKey } from '@/types'

/**
 * Qué puede hacer el negocio activo.
 *
 * Lee los permisos que el servidor ya resolvió —plan más excepciones— en vez
 * de interpretar el plan por su cuenta. Y solo esconde: el bloqueo real lo
 * hace la API, así que una pantalla visible no es una pantalla permitida.
 */
export function useSubscription() {
  const activeTenant = useAuthStore((s) => s.activeTenant)

  const { data, isLoading } = useQuery({
    queryKey: ['subscription-me', activeTenant?._id],
    queryFn: getMySubscription,
    enabled: !!activeTenant,
    staleTime: 5 * 60 * 1000,
  })

  const features = data?.features

  return {
    subscription: data?.subscription ?? null,
    plan: data?.plan ?? null,
    isLoading,
    status: data?.status,
    isSuspended: data?.status === 'suspended',
    isExpired: data?.status === 'expired',
    /** Vencida o suspendida: puede mirar, no registrar. */
    isReadOnly: data?.readOnly ?? false,
    expiresAt: data?.expiresAt ?? null,
    overridden: data?.overridden ?? [],

    /**
     * Mientras no haya respuesta se asume que sí.
     *
     * Esconder el menú entero durante la carga hace parpadear la aplicación en
     * cada entrada, y lo que está detrás igual lo defiende la API.
     */
    can: (key: FeatureKey) => {
      if (!features) return true
      return Boolean(features[key])
    },

    /** El tope de un límite. 0 = ilimitado. */
    limitOf: (key: FeatureKey): number => {
      const value = features?.[key]
      return typeof value === 'number' ? value : 0
    },
  }
}
