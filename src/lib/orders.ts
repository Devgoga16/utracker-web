import type { Order } from '@/types'

/** Mismo cálculo que el servidor: los últimos 6 del token, en mayúsculas. */
export function orderCode(trackingToken: string) {
  return (trackingToken ?? '').slice(-6).toUpperCase()
}

/** Lo que falta cobrar: total menos lo confirmado, más lo devuelto. */
export function owed(order: Pick<Order, 'totalAmount' | 'payments' | 'refunds'>) {
  const paid = order.payments.reduce((s, p) => (p.validated === false ? s : s + p.amount), 0)
  const refunded = (order.refunds ?? []).reduce((s, r) => s + r.amount, 0)
  return Math.max(0, Math.round((order.totalAmount - paid + refunded) * 100) / 100)
}

/** «Torta 3 pisos» o «Torta 3 pisos y 2 más». */
export function itemsSummary(items: { name: string; quantity: number }[]) {
  const [first, ...rest] = items ?? []
  if (!first) return '—'
  const head = `${first.quantity > 1 ? `${first.quantity}× ` : ''}${first.name}`
  return rest.length ? `${head} y ${rest.length} más` : head
}

/** Pedidos creados por día en los últimos `days` días, del más viejo al más nuevo. */
export function createdPerDay(orders: Pick<Order, 'createdAt'>[], days = 14) {
  const counts = new Array(days).fill(0)
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - (days - 1))
  for (const o of orders) {
    const d = new Date(o.createdAt)
    d.setHours(0, 0, 0, 0)
    const i = Math.round((d.getTime() - start.getTime()) / 86_400_000)
    if (i >= 0 && i < days) counts[i] += 1
  }
  return counts
}

export const ORDER_TYPE_LABELS = {
  pickup: 'Recojo',
  delivery_own: 'Delivery propio',
  delivery_third_party: 'Courier',
} as const
