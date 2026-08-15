import axios from 'axios'
import type { DaySchedule, Franja, OrderLinkDeliveryType } from '@/types'

// Public endpoints: no auth, no tenant header. Uses bare axios on purpose.
const publicApi = axios.create({ baseURL: '/api/order-links' })

export interface PublicOrderLink {
  tenant: { name?: string; logoUrl?: string; schedule?: DaySchedule[] }
  items: { product: { _id: string; name: string; price: number }; quantity: number; variant?: string }[]
  deliveryType: OrderLinkDeliveryType
  expiresAt: string
}

export async function getPublicOrderLink(token: string) {
  const { data } = await publicApi.get<PublicOrderLink>(`/${token}`)
  return data
}

export async function confirmPublicOrderLink(
  token: string,
  payload: {
    customer: { name: string; phone: string; email?: string; address?: string }
    deliveryType?: 'pickup' | 'delivery_third_party' | 'delivery_own'
    delivery?: { address?: string; reference?: string }
    scheduledFor?: { date: string; franja: Franja }
  },
) {
  const { data } = await publicApi.post<{ order: { _id: string; trackingToken: string } }>(
    `/${token}/confirm`,
    payload,
  )
  return data.order
}
