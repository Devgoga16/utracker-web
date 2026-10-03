import { api } from './client'
import type { Campaign, Franja, Product, ProductFilter, Tenant } from '@/types'

export interface StoreCatalog {
  tenant: Tenant
  products: Product[]
  campaigns?: Campaign[]
  filters?: ProductFilter[]
}

export async function getStoreCatalog(slug: string) {
  const { data } = await api.get<StoreCatalog>(`/store/${slug}`)
  return data
}

export interface StoreOrderInput {
  customer: { name: string; phone: string; email?: string }
  items: { productId: string; quantity: number; variant?: string }[]
  type: 'pickup' | 'delivery_own'
  address?: string
  reference?: string
  scheduledFor?: { date: string; franja?: Franja }
  notes?: string
  /** URL del comprobante ya subido. El monto lo recalcula el servidor. */
  advanceProofUrl?: string
}

export async function createStoreOrder(slug: string, payload: StoreOrderInput) {
  const { data } = await api.post<{ orderId: string; trackingUrl: string }>(
    `/store/${slug}/order`,
    payload,
  )
  return data
}

/** Sube el comprobante del adelanto antes de confirmar. Público, sin auth. */
export async function uploadStoreProof(slug: string, file: File) {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post<{ url: string }>(`/store/${slug}/proof`, form)
  return data.url
}
