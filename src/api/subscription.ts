import { api } from './client'
import type { MyEntitlements } from '@/types'

/**
 * La suscripción del negocio y sus permisos ya resueltos.
 *
 * El servidor manda `features` con las excepciones aplicadas; el front no
 * vuelve a resolver nada sobre el plan.
 */
export const getMySubscription = () =>
  api.get<MyEntitlements>('/subscription/me').then((r) => r.data)
