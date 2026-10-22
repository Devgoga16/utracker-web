import { formatCurrency } from '@/lib/cn'
import { FRANJA_LABELS, daysBetween, localToday, relativeDay, shortDay } from '@/lib/dates'
import type { MembershipRole, Order, WorkflowState } from '@/types'

/**
 * Las tres dimensiones de un pedido, separadas.
 *
 * Un pedido puede estar «Listo», atrasado y con saldo pendiente a la vez, y
 * las tres cosas son ciertas. Antes se mostraba solo el estado del workflow y
 * un «Falta S/ X», y quien leía «LISTO» junto a una fecha pasada no sabía si
 * era un error. Aquí cada una tiene su nombre:
 *
 *   Pedido   el estado del workflow (preparación): lo define el negocio.
 *   Entrega  se deduce de la fecha acordada y de si el pedido ya terminó.
 *   Pago     se deduce de lo cobrado, confirmado y devuelto.
 *
 * Nada de esto cambia datos ni reglas: es cómo se lee lo que ya existe.
 */

export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info'

export interface DeliveryStatus {
  key: 'cancelled' | 'done' | 'overdue' | 'today' | 'tomorrow' | 'scheduled' | 'unscheduled'
  label: string
  tone: Tone
  /** La fecha acordada, explícita: «lun 18 oct · Turno tarde». */
  dateLabel?: string
  /** «hace 2 días», «hoy», «en 3 días». */
  relative?: string
  /** Días de atraso, solo si está atrasado. */
  daysLate?: number
}

export function deliveryStatus(order: Order, today = localToday()): DeliveryStatus {
  const fs = order.fulfillmentState
  const pickup = order.type === 'pickup'
  const date = order.scheduledFor?.date
  const franja = order.scheduledFor?.franja
  const dateLabel = date ? `${shortDay(date)}${franja ? ` · ${FRANJA_LABELS[franja]}` : ''}` : undefined
  const relative = date ? relativeDay(date, today) : undefined

  if (fs?.isCancellation) return { key: 'cancelled', label: 'Cancelado', tone: 'neutral', dateLabel }
  if (fs?.isFinal) return { key: 'done', label: pickup ? 'Recogido' : 'Entregado', tone: 'success', dateLabel }
  if (!date) return { key: 'unscheduled', label: 'Sin fecha', tone: 'neutral' }

  const diff = daysBetween(today, date)
  if (diff < 0) {
    const days = -diff
    return {
      key: 'overdue',
      label: `Atrasado ${days} ${days === 1 ? 'día' : 'días'}`,
      tone: 'danger',
      dateLabel,
      relative,
      daysLate: days,
    }
  }
  if (diff === 0) return { key: 'today', label: pickup ? 'Recojo hoy' : 'Entrega hoy', tone: 'info', dateLabel, relative }
  if (diff === 1) return { key: 'tomorrow', label: pickup ? 'Recojo mañana' : 'Entrega mañana', tone: 'neutral', dateLabel, relative }
  return { key: 'scheduled', label: 'Programado', tone: 'neutral', dateLabel, relative }
}

export interface PaymentStatus {
  label: string
  tone: Tone
  /** Lo que falta cobrar, si falta algo. */
  owed: number
  /** «Saldo S/ 95.00», «S/ 50.00 por validar». */
  detail?: string
}

export function paymentStatus(order: Order): PaymentStatus {
  const confirmed = order.payments.reduce((s, p) => (p.validated === false ? s : s + p.amount), 0)
  const inReview = order.payments.reduce((s, p) => (p.validated === false ? s + p.amount : s), 0)
  const refunded = (order.refunds ?? []).reduce((s, r) => s + r.amount, 0)
  const kept = Math.round((confirmed - refunded) * 100) / 100
  const owed = Math.max(0, Math.round((order.totalAmount - kept) * 100) / 100)
  const cancelled = Boolean(order.fulfillmentState?.isCancellation)

  const review = inReview > 0 ? `${formatCurrency(inReview)} por validar` : undefined

  if (cancelled) {
    if (refunded > 0 && kept <= 0) return { label: 'Reembolsado', tone: 'neutral', owed: 0 }
    if (kept > 0) return { label: 'Por devolver', tone: 'warning', owed: 0, detail: formatCurrency(kept) }
    return { label: 'Sin cobros', tone: 'neutral', owed: 0 }
  }
  if (owed <= 0) return { label: 'Pagado', tone: 'success', owed: 0 }
  if (kept > 0) return { label: 'Pago parcial', tone: 'warning', owed, detail: review ?? `Saldo ${formatCurrency(owed)}` }
  return { label: 'Sin pagar', tone: inReview > 0 ? 'warning' : 'neutral', owed, detail: review ?? `Saldo ${formatCurrency(owed)}` }
}

/**
 * El siguiente estado del recorrido: el que sigue por posición, que aplique a
 * su tipo de entrega, no sea de cancelación y que el rol pueda usar. Null si
 * el pedido ya terminó o si no hay nada que este rol pueda hacer.
 */
export function nextState(
  order: Order,
  states: WorkflowState[] | undefined,
  role?: MembershipRole,
): WorkflowState | null {
  if (!states || !order.fulfillmentState) return null
  const current = states.find((s) => s._id === order.fulfillmentState._id)
  if (!current || current.isFinal || current.isCancellation) return null
  const next = [...states]
    .sort((a, b) => a.position - b.position)
    .find(
      (s) =>
        s.position > current.position &&
        !s.isCancellation &&
        (!s.appliesTo?.length || s.appliesTo.includes(order.type)),
    )
  if (!next) return null
  if (role && !next.allowedRoles.includes(role)) return null
  return next
}
