import { api } from './client'
import type { Franja, Order, OrderLink, OrderType, PaymentKind, WorkflowKind } from '@/types'

export interface CreateOrderItemInput {
  /** Omit for an ad-hoc line; then name and unitPrice are required. */
  productId?: string
  name?: string
  unitPrice?: number
  quantity: number
  variant?: string
  specs?: string
}

export interface CreateOrderInput {
  customer: { name: string; phone: string; email?: string; address?: string }
  items: CreateOrderItemInput[]
  type: OrderType
  delivery?: { address?: string; reference?: string; courierName?: string; driver?: string }
  notes?: string
  advance?: { amount: number; proofImageUrl?: string }
  scheduledFor?: { date: string; franja: Franja }
}

export interface RegisterPaymentInput {
  kind: PaymentKind
  amount: number
  proofImageUrl?: string
  note?: string
}

export async function listOrders() {
  const { data } = await api.get<{ orders: Order[] }>('/orders')
  return data.orders
}

export async function getOrder(id: string) {
  const { data } = await api.get<{ order: Order }>(`/orders/${id}`)
  return data.order
}

export async function createOrder(payload: CreateOrderInput) {
  const { data } = await api.post<{ order: Order }>('/orders', payload)
  return data.order
}

export async function updateOrderState(id: string, payload: { kind: WorkflowKind; stateId: string; link?: string }) {
  const { data } = await api.patch<{ order: Order }>(`/orders/${id}/state`, payload)
  return data.order
}

export async function deleteOrder(id: string) {
  await api.delete(`/orders/${id}`)
}

export async function registerPayment(id: string, payload: RegisterPaymentInput) {
  const { data } = await api.post<{ order: Order }>(`/orders/${id}/payments`, payload)
  return data.order
}

export async function deletePayment(id: string, kind: PaymentKind) {
  const { data } = await api.delete<{ order: Order }>(`/orders/${id}/payments/${kind}`)
  return data.order
}

export async function addDeliveryAttempt(
  id: string,
  payload: { succeeded: boolean; reason?: string; note?: string },
) {
  const { data } = await api.post<{ order: Order }>(`/orders/${id}/delivery-attempts`, payload)
  return data.order
}

export async function createOrderLink(payload: {
  items: { productId: string; quantity: number; variant?: string }[]
  deliveryType?: string
}) {
  const { data } = await api.post<{ link: OrderLink; expiresAt: string; ttlHours: number }>(
    '/orders/links',
    payload,
  )
  return data
}
