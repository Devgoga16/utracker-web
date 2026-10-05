import { api } from './client'
import type { Franja, PaymentMethod } from '@/types'

/* ─────────── Checkout hospedado (lo abre el comprador) ─────────── */

export interface CheckoutSessionView {
  store: {
    name: string
    slug: string
    logoUrl?: string
    brandColor?: string
    phone?: string
    deliveryTypes: ('pickup' | 'delivery_own')[]
    deliveryFranjas: Franja[]
    paymentMethods: PaymentMethod[]
  }
  items: {
    name: string
    variant?: string
    quantity: number
    unitPrice: number
    imageUrl?: string
  }[]
  totalAmount: number
  advanceDue: number
  maxPrepDays: number
  returnUrl?: string
  expiresAt: string
}

export async function getCheckoutSession(token: string) {
  const { data } = await api.get<CheckoutSessionView>(`/storefront/checkout/${token}`)
  return data
}

export interface ConfirmCheckoutInput {
  customer: { name: string; phone: string; email?: string }
  type: 'pickup' | 'delivery_own'
  address?: string
  reference?: string
  scheduledFor?: { date: string; franja?: Franja }
  notes?: string
  advanceProofUrl?: string
}

export async function confirmCheckoutSession(token: string, payload: ConfirmCheckoutInput) {
  const { data } = await api.post<{
    orderId: string
    trackingUrl: string
    returnUrl?: string
  }>(`/storefront/checkout/${token}/confirm`, payload)
  return data
}

export async function uploadCheckoutProof(token: string, file: File) {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post<{ url: string }>(`/storefront/checkout/${token}/proof`, form)
  return data.url
}

/* ─────────── Llaves de integración (panel del dueño) ─────────── */

export interface StoreApiKey {
  _id: string
  name: string
  key: string
  allowedOrigins: string[]
  revokedAt?: string
  lastUsedAt?: string
  createdAt: string
}

export async function listStoreKeys() {
  const { data } = await api.get<{ keys: StoreApiKey[] }>('/store-keys')
  return data.keys
}

export async function createStoreKey(payload: { name: string; allowedOrigins?: string[] }) {
  const { data } = await api.post<{ key: StoreApiKey }>('/store-keys', payload)
  return data.key
}

export async function updateStoreKey(
  id: string,
  payload: { name?: string; allowedOrigins?: string[] },
) {
  const { data } = await api.patch<{ key: StoreApiKey }>(`/store-keys/${id}`, payload)
  return data.key
}

export async function revokeStoreKey(id: string) {
  const { data } = await api.post<{ key: StoreApiKey }>(`/store-keys/${id}/revoke`)
  return data.key
}

export async function deleteStoreKey(id: string) {
  await api.delete(`/store-keys/${id}`)
}
