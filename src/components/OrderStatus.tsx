import { AlertTriangle, CalendarClock, CheckCircle2, Wallet } from 'lucide-react'
import { Badge, StateBadge } from '@/components/ui'
import { cn } from '@/lib/cn'
import { deliveryStatus, paymentStatus } from '@/lib/orderStatus'
import type { Order } from '@/types'

/**
 * Las tres dimensiones de un pedido, cada una con su nombre escrito.
 *
 * «Pedido: LISTO · Entrega: Atrasado 2 días · Pago: Pago parcial» se lee sin
 * contradicción: son tres hechos distintos. El rótulo va siempre en texto,
 * así el significado no depende solo del color.
 */
export function OrderStatusTrio({
  order,
  today,
  className,
  layout = 'row',
}: {
  order: Order
  today?: string
  className?: string
  /** row: en línea (tablas, filas anchas). grid: una debajo de otra (tarjetas angostas). */
  layout?: 'row' | 'grid'
}) {
  const delivery = deliveryStatus(order, today)
  const payment = paymentStatus(order)

  return (
    <dl
      className={cn(
        layout === 'row' ? 'flex flex-wrap items-center gap-x-3 gap-y-1.5' : 'grid gap-1.5',
        className,
      )}
    >
      <Dimension label="Pedido">
        {order.fulfillmentState ? (
          <StateBadge
            name={order.fulfillmentState.name}
            color={order.fulfillmentState.color}
            icon={order.fulfillmentState.icon}
          />
        ) : (
          <Badge>Sin estado</Badge>
        )}
      </Dimension>
      <Dimension label="Entrega">
        <DeliveryBadge order={order} today={today} status={delivery} />
      </Dimension>
      <Dimension label="Pago">
        <PaymentBadge order={order} status={payment} />
      </Dimension>
    </dl>
  )
}

function Dimension({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      <dt className="text-[11px] text-slate-400">{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

export function DeliveryBadge({
  order,
  today,
  status = deliveryStatus(order, today),
}: {
  order: Order
  today?: string
  status?: ReturnType<typeof deliveryStatus>
}) {
  const Icon = status.key === 'overdue' ? AlertTriangle : status.key === 'done' ? CheckCircle2 : CalendarClock
  return (
    <Badge tone={status.tone}>
      <Icon size={11} aria-hidden />
      {status.label}
    </Badge>
  )
}

export function PaymentBadge({
  order,
  status = paymentStatus(order),
}: {
  order: Order
  status?: ReturnType<typeof paymentStatus>
}) {
  return (
    <Badge tone={status.tone}>
      <Wallet size={11} aria-hidden />
      {status.label}
      {status.detail && <span className="font-normal opacity-80">· {status.detail}</span>}
    </Badge>
  )
}

/**
 * Resumen del pedido para su detalle: las tres dimensiones con su contexto
 * —desde cuándo está en su estado, la fecha acordada explícita, cuánto se
 * cobró de cuánto—, en una franja que se lee de un vistazo.
 */
export function OrderSummaryStrip({ order, today }: { order: Order; today?: string }) {
  const delivery = deliveryStatus(order, today)
  const payment = paymentStatus(order)
  const lastChange = [...order.stateHistory].reverse().find((h) => h.kind === 'fulfillment')
  const kept =
    order.payments.reduce((s, p) => (p.validated === false ? s : s + p.amount), 0) -
    (order.refunds ?? []).reduce((s, r) => s + r.amount, 0)

  const cell = 'flex flex-col gap-1.5 p-4'
  return (
    <div className="grid overflow-hidden rounded-xl border border-slate-200 bg-white sm:grid-cols-3">
      <div className={cell}>
        <span className="text-xs text-slate-500">Pedido</span>
        {order.fulfillmentState && (
          <span>
            <StateBadge name={order.fulfillmentState.name} color={order.fulfillmentState.color} icon={order.fulfillmentState.icon} />
          </span>
        )}
        {lastChange && (
          <span className="text-xs text-slate-500">
            Desde {new Date(lastChange.changedAt).toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' })}
          </span>
        )}
      </div>
      <div className={cn(cell, 'border-t border-slate-200 sm:border-t-0 sm:border-l')}>
        <span className="text-xs text-slate-500">Entrega</span>
        <span>
          <DeliveryBadge order={order} today={today} status={delivery} />
        </span>
        <span className="text-xs text-slate-500">
          {delivery.dateLabel ? `Acordado ${delivery.dateLabel}` : 'Sin fecha acordada'}
          {delivery.relative && delivery.key !== 'done' && delivery.key !== 'cancelled' && ` · ${delivery.relative}`}
          {' · '}
          {order.type === 'pickup' ? 'Recojo en tienda' : order.type === 'delivery_own' ? 'Delivery propio' : 'Courier'}
        </span>
      </div>
      <div className={cn(cell, 'border-t border-slate-200 sm:border-t-0 sm:border-l')}>
        <span className="text-xs text-slate-500">Pago</span>
        <span>
          <PaymentBadge order={order} status={payment} />
        </span>
        <span className="text-xs text-slate-500 tabular-nums">
          Cobrado {Math.max(0, Math.round(kept * 100) / 100).toLocaleString('es-PE', { style: 'currency', currency: 'PEN' })} de{' '}
          {order.totalAmount.toLocaleString('es-PE', { style: 'currency', currency: 'PEN' })}
        </span>
      </div>
    </div>
  )
}
