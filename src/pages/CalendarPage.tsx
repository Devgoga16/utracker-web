import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {

  ChevronLeft,
  ChevronRight,
  Clock,
  BadgeCheck,
  Inbox,
  Store,
  Truck,
} from 'lucide-react'
import { calendarOrders } from '@/api/orders'
import { getWorkflow } from '@/api/tenants'
import { Card, Chip, ChipBar, PageHeader, Spinner, StateBadge } from '@/components/ui'
import { cn, formatCurrency } from '@/lib/cn'
import type { Franja, Order, OrderType } from '@/types'

const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

const FRANJA_LABELS: Record<Franja, string> = {
  morning: 'Mañana',
  afternoon: 'Tarde',
  evening: 'Noche',
}

const DELIVERY_LABELS: Record<OrderType, string> = {
  pickup: 'Recojo',
  delivery_own: 'Delivery',
  delivery_third_party: 'Courier',
}

/** Orden en que se listan dentro del día: mañana antes que noche. */
const FRANJA_ORDER: Record<string, number> = { morning: 0, afternoon: 1, evening: 2 }

/** "2026-10-08" sin pasar por Date, para no arrastrar corrimientos de zona. */
function toIso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`
}

/** El lunes de la semana a la que pertenece una fecha. */
function mondayOf(date: Date) {
  const d = new Date(date)
  // getDay(): 0 es domingo, así que el domingo retrocede 6 días, no 0.
  const offset = d.getDay() === 0 ? -6 : 1 - d.getDay()
  d.setDate(d.getDate() + offset)
  d.setHours(0, 0, 0, 0)
  return d
}

export function CalendarPage() {
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()))
  const [deliveryFilter, setDeliveryFilter] = useState<OrderType | null>(null)
  const [stateFilter, setStateFilter] = useState<string | null>(null)
  /** Lo que exige accion tuya: un comprobante que el cliente subio y nadie reviso. */
  const [onlyPendingProof, setOnlyPendingProof] = useState(false)

  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart)
        d.setDate(d.getDate() + i)
        return d
      }),
    [weekStart],
  )

  const from = toIso(days[0])
  const to = toIso(days[6])
  const todayIso = toIso(new Date())

  const { data, isLoading } = useQuery({
    queryKey: ['calendar', from, to],
    queryFn: () => calendarOrders(from, to),
  })
  const { data: workflow } = useQuery({ queryKey: ['workflow'], queryFn: getWorkflow })

  /**
   * Los filtros se aplican en el cliente: la semana ya esta cargada y es un
   * conjunto acotado, asi que ir al servidor por cada chip solo agregaria
   * espera sin ganar nada.
   */
  const matches = useCallback(
    (o: Order) =>
      (!deliveryFilter || o.type === deliveryFilter) &&
      (!stateFilter || o.fulfillmentState?._id === stateFilter) &&
      (!onlyPendingProof || o.payments?.some((p) => p.validated === false)),
    [deliveryFilter, stateFilter, onlyPendingProof],
  )

  const scheduled = useMemo(
    () => (data?.scheduled ?? []).filter(matches),
    [data?.scheduled, matches],
  )
  const unscheduled = useMemo(
    () => (data?.unscheduled ?? []).filter(matches),
    [data?.unscheduled, matches],
  )

  const activeFilters =
    (deliveryFilter ? 1 : 0) + (stateFilter ? 1 : 0) + (onlyPendingProof ? 1 : 0)

  /** Pedidos agrupados por día, ya ordenados por franja. */
  const byDay = useMemo(() => {
    const map = new Map<string, Order[]>()
    for (const o of scheduled) {
      const key = o.scheduledFor?.date?.slice(0, 10)
      if (!key) continue
      const list = map.get(key)
      if (list) list.push(o)
      else map.set(key, [o])
    }
    for (const list of map.values()) {
      list.sort(
        (a, b) =>
          (FRANJA_ORDER[a.scheduledFor?.franja ?? ''] ?? 9) -
          (FRANJA_ORDER[b.scheduledFor?.franja ?? ''] ?? 9),
      )
    }
    return map
  }, [scheduled])

  const weekTotal = scheduled.reduce((s, o) => s + o.totalAmount, 0)
  const monthLabel = days[0].toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })

  function shift(weeks: number) {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + weeks * 7)
    setWeekStart(d)
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Calendario"
        description="Tus pedidos por fecha de entrega o recojo."
        actions={
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Semana anterior"
              onClick={() => shift(-1)}
              className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100"
            >
              <ChevronLeft size={17} />
            </button>
            <button
              type="button"
              onClick={() => setWeekStart(mondayOf(new Date()))}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
            >
              Hoy
            </button>
            <button
              type="button"
              aria-label="Semana siguiente"
              onClick={() => shift(1)}
              className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100"
            >
              <ChevronRight size={17} />
            </button>
          </div>
        }
      />

      {/* Resumen de la semana */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 ring-1 ring-slate-200">
        <p className="text-sm font-semibold text-slate-800 capitalize">{monthLabel}</p>
        <p className="text-sm text-slate-500">
          {scheduled.length} pedido{scheduled.length === 1 ? '' : 's'}
          {weekTotal > 0 && (
            <>
              {' · '}
              <span className="font-semibold text-slate-800">{formatCurrency(weekTotal)}</span>
            </>
          )}
        </p>
      </div>

      {/* Filtros: tipo de entrega, estado y lo que exige accion tuya. */}
      <div className="space-y-2">
        <ChipBar>
          <Chip active={!deliveryFilter} onClick={() => setDeliveryFilter(null)}>
            Toda entrega
          </Chip>
          {(Object.keys(DELIVERY_LABELS) as OrderType[]).map((t) => {
            const count = (data?.scheduled ?? []).filter((o) => o.type === t).length
            return (
              <Chip
                key={t}
                active={deliveryFilter === t}
                count={count}
                onClick={() => setDeliveryFilter(deliveryFilter === t ? null : t)}
              >
                {t === 'pickup' ? <Store size={13} /> : <Truck size={13} />}
                {DELIVERY_LABELS[t]}
              </Chip>
            )
          })}

          <span aria-hidden className="mx-1 h-5 w-px shrink-0 self-center bg-slate-200" />

          <Chip
            active={onlyPendingProof}
            count={
              (data?.scheduled ?? []).filter((o) =>
                o.payments?.some((p) => p.validated === false),
              ).length
            }
            onClick={() => setOnlyPendingProof((v) => !v)}
          >
            <BadgeCheck size={13} />
            Pago por validar
          </Chip>
        </ChipBar>

        {workflow && (
          <ChipBar>
            <Chip active={!stateFilter} onClick={() => setStateFilter(null)}>
              Todo estado
            </Chip>
            {workflow.fulfillment.map((st) => {
              const count = (data?.scheduled ?? []).filter(
                (o) => o.fulfillmentState?._id === st._id,
              ).length
              if (count === 0 && stateFilter !== st._id) return null
              return (
                <Chip
                  key={st._id}
                  active={stateFilter === st._id}
                  count={count}
                  onClick={() => setStateFilter(stateFilter === st._id ? null : st._id)}
                >
                  {st.name}
                </Chip>
              )
            })}
          </ChipBar>
        )}

        {activeFilters > 0 && (
          <button
            type="button"
            onClick={() => {
              setDeliveryFilter(null)
              setStateFilter(null)
              setOnlyPendingProof(false)
            }}
            className="text-xs font-semibold text-brand-600 hover:underline"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {isLoading ? (
        <Spinner />
      ) : (
        <>
          {/* 7 columnas en escritorio; apilado en celular, donde no entran. */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7 lg:gap-2">
            {days.map((day, i) => {
              const iso = toIso(day)
              const orders = byDay.get(iso) ?? []
              const isToday = iso === todayIso
              const dayTotal = orders.reduce((s, o) => s + o.totalAmount, 0)

              return (
                <div
                  key={iso}
                  className={cn(
                    'flex flex-col overflow-hidden rounded-xl ring-1',
                    isToday ? 'bg-brand-50/60 ring-brand-300' : 'bg-white ring-slate-200',
                  )}
                >
                  <div
                    className={cn(
                      'flex items-baseline justify-between gap-1 border-b px-3 py-2',
                      isToday ? 'border-brand-200' : 'border-slate-100',
                    )}
                  >
                    <div className="flex items-baseline gap-1.5">
                      <span
                        className={cn(
                          'text-xs font-semibold',
                          isToday ? 'text-brand-700' : 'text-slate-500',
                        )}
                      >
                        {DAY_NAMES[i]}
                      </span>
                      <span
                        className={cn(
                          'text-lg font-bold tabular-nums',
                          isToday ? 'text-brand-700' : 'text-slate-900',
                        )}
                      >
                        {day.getDate()}
                      </span>
                    </div>
                    {orders.length > 0 && (
                      <span className="rounded-full bg-slate-900/5 px-1.5 text-[11px] font-bold text-slate-600">
                        {orders.length}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 space-y-1.5 p-2">
                    {orders.length === 0 ? (
                      <p className="py-3 text-center text-[11px] text-slate-300">—</p>
                    ) : (
                      orders.map((o) => <DayOrder key={o._id} order={o} />)
                    )}
                  </div>

                  {dayTotal > 0 && (
                    <div className="border-t border-slate-100 px-3 py-1.5 text-right">
                      <span className="text-[11px] font-semibold tabular-nums text-slate-500">
                        {formatCurrency(dayTotal)}
                      </span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Sin fecha: hay que atenderlos igual, pero no caen en ningún día. */}
          {unscheduled.length > 0 && (
            <Card>
              <div className="mb-3 flex items-center gap-2">
                <Inbox size={16} className="text-amber-500" />
                <h2 className="text-sm font-semibold text-slate-900">Sin fecha programada</h2>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                  {unscheduled.length}
                </span>
              </div>
              <p className="mb-3 text-xs text-slate-500">
                Pedidos abiertos que no tienen día asignado. Suelen venir de pedidos creados a
                mano.
              </p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {unscheduled.map((o) => (
                  <DayOrder key={o._id} order={o} showDate />
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

/** Tarjeta compacta: en una columna de calendario el espacio es escaso. */
function DayOrder({ order, showDate }: { order: Order; showDate?: boolean }) {
  const isPickup = order.type === 'pickup'
  const Icon = isPickup ? Store : Truck

  return (
    <Link
      to={`/orders/${order._id}`}
      className="block rounded-lg bg-white p-2 ring-1 ring-slate-200 transition-all hover:-translate-y-px hover:shadow-sm hover:ring-brand-300"
    >
      <div className="flex items-center gap-1 text-[10px] font-medium text-slate-400">
        <Icon size={10} className="shrink-0" />
        {order.scheduledFor?.franja && (
          <>
            <Clock size={9} className="shrink-0" />
            {FRANJA_LABELS[order.scheduledFor.franja]}
          </>
        )}
        {showDate && order.scheduledFor?.date && <span>{order.scheduledFor.date.slice(5)}</span>}
      </div>

      <p className="mt-0.5 truncate text-xs font-semibold text-slate-900">
        {order.customer?.name ?? 'Sin cliente'}
      </p>

      <p className="truncate text-[11px] text-slate-500">
        {order.items?.[0]?.name ?? '—'}
        {(order.items?.length ?? 0) > 1 && (
          <span className="text-slate-400"> +{order.items.length - 1}</span>
        )}
      </p>

      <div className="mt-1.5 flex items-center justify-between gap-1">
        {order.fulfillmentState && (
          <StateBadge
            name={order.fulfillmentState.name}
            color={order.fulfillmentState.color}
            icon={order.fulfillmentState.icon}
          />
        )}
        <span className="shrink-0 text-[11px] font-bold tabular-nums text-slate-700">
          {formatCurrency(order.totalAmount)}
        </span>
      </div>
    </Link>
  )
}
