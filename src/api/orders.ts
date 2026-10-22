import { api } from './client'
import type {
  Franja,
  Order,
  OrderLink,
  OrderType,
  PaymentMethodKind,
  WorkflowKind,
} from '@/types'

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
  /** Lo que dejó pagado al hacer el pedido; puede ser todo. */
  advance?: { amount: number; proofImageUrl?: string; method?: PaymentMethodKind }
  scheduledFor?: { date: string; franja?: Franja }
}

export interface RegisterPaymentInput {
  amount: number
  proofImageUrl?: string
  note?: string
  /** Si hay una caja abierta, el pago entra a su cuadre. */
  method?: PaymentMethodKind
}

export async function listOrders(params?: { campaign?: string }) {
  const { data } = await api.get<{ orders: Order[] }>('/orders', { params })
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

/** `paymentId` es el id del pago; acepta 'advance' / 'balance' para pagos viejos sin id. */
export async function deletePayment(id: string, paymentId: string) {
  const { data } = await api.delete<{ order: Order }>(`/orders/${id}/payments/${paymentId}`)
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

/** El negocio confirma que el adelanto del cliente efectivamente llegó. */
export async function validatePayment(
  orderId: string,
  paymentId: string,
  method?: PaymentMethodKind,
) {
  const { data } = await api.patch<{ order: Order }>(
    `/orders/${orderId}/payments/${paymentId}/validate`,
    { method },
  )
  return data.order
}

/** Pedidos de una semana, por su fecha programada de entrega o recojo. */
export async function calendarOrders(from: string, to: string) {
  const { data } = await api.get<{ scheduled: Order[]; unscheduled: Order[] }>(
    '/orders/calendar',
    { params: { from, to } },
  )
  return data
}

/** Cancela el pedido: vuelve el stock y queda el motivo en el historial. */
export async function cancelOrder(id: string, reason?: string) {
  const { data } = await api.post<{ order: Order }>(`/orders/${id}/cancel`, { reason })
  return data.order
}

/** Registra dinero devuelto al cliente. */
export async function refundOrder(
  id: string,
  payload: { amount: number; method?: PaymentMethodKind; note?: string },
) {
  const { data } = await api.post<{ order: Order }>(`/orders/${id}/refunds`, payload)
  return data.order
}

export interface TodayView {
  date: string
  tomorrow: string
  overdue: Order[]
  today: Order[]
  tomorrowOrders: Order[]
  unscheduled: Order[]
  /** Pedidos con al menos un comprobante del cliente sin revisar. */
  proofs: Order[]
  /** Lo que falta cobrar de lo atrasado y lo de hoy. */
  toCollect: number
}

/** Lo que pide atención hoy. `date` es el día local de quien mira. */
export async function getToday(date: string) {
  const { data } = await api.get<TodayView>('/orders/today', { params: { date } })
  return data
}
