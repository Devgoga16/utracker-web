import { api } from './client'
import type { Subscription } from '@/types'

export const getMySubscription = () =>
  api.get<Subscription | null>('/subscription/me').then((r) => r.data)
