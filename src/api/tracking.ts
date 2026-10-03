import axios from 'axios'
import { API_BASE_URL } from './client'
import type { OrderType } from '@/types'

// Public endpoint: no auth, no tenant header.
const publicApi = axios.create({ baseURL: `${API_BASE_URL}/track` })

export interface TrackingStep {
  name: string
  color: string
  icon?: string
  vibrant: boolean
  current: boolean
  done: boolean
  at: string | null
}

export interface TrackingView {
  tenant: { name?: string; logoUrl?: string; phone?: string }
  /** Código corto del pedido, para que el cliente lo mencione. */
  code: string
  createdAt: string
  type: OrderType
  isCancelled: boolean
  items: { name: string; quantity: number; unitPrice: number; variant?: string; specs?: string; images: string[] }[]
  totalAmount: number
  payments: {
    advance: number
    balance: number
    totalPaid: number
    remaining: number
    /** Comprobante enviado que el negocio aún no confirma. */
    pending: number
  }
  /** El negocio rechazó un comprobante: hay algo que regularizar. */
  paymentRejected: boolean
  fulfillmentLink?: string
  currentState: { name: string; color: string; icon?: string } | null
  paymentState: { name: string; color: string; icon?: string } | null
  deliveryAddress?: string
  steps: TrackingStep[]
}

export async function trackOrder(token: string) {
  const { data } = await publicApi.get<TrackingView>(`/${token}`)
  return data
}
