import { useQuery } from '@tanstack/react-query'
import { getMySubscription } from '@/api/subscription'
import { useAuthStore } from '@/stores/authStore'
import type { PlanFeatures } from '@/types'

export function useSubscription() {
  const activeTenant = useAuthStore((s) => s.activeTenant)

  const { data: subscription, isLoading } = useQuery({
    queryKey: ['subscription-me', activeTenant?._id],
    queryFn: getMySubscription,
    enabled: !!activeTenant,
    staleTime: 5 * 60 * 1000,
  })

  const features = subscription?.plan?.features

  return {
    subscription,
    isLoading,
    isSuspended: subscription?.status === 'suspended',
    can: (key: keyof PlanFeatures) => {
      if (!features) return true // sin suscripción = sin restricción (backward compat)
      return !!features[key]
    },
  }
}
