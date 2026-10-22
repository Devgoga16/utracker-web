import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRightLeft, ChevronDown, ClipboardList, Plus, Search, X, Zap, CircleX } from 'lucide-react'
import { cancelOrder, listOrders, updateOrderState } from '@/api/orders'
import { listCampaigns } from '@/api/campaigns'
import { getWorkflow } from '@/api/tenants'
import {
  Alert,
  Button,
  EmptyState,
  PageHeader,
  Select,
  Spinner,
  StatStrip,
  StateBadge,
  Tabs,
} from '@/components/ui'
import { cn, formatCurrency } from '@/lib/cn'
import { ORDER_TYPE_LABELS, createdPerDay, itemsSummary, orderCode, owed } from '@/lib/orders'
import { deliveryStatus } from '@/lib/orderStatus'
import { DeliveryBadge, OrderStatusTrio, PaymentBadge } from '@/components/OrderStatus'
import { useRole } from '@/hooks/useRole'
import type { OrderType, WorkflowState } from '@/types'

type Sort = 'recent' | 'due' | 'amount'

function shortDate(value: string) {
  return new Date(value).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })
}


/**
 * Pedidos, 2.0: indicadores arriba, pestañas por estado, una tabla que se lee
 * de corrido y acciones en bloque. Se marcan varios pedidos y una barra
 * flotante permite moverlos de estado o cancelarlos juntos: con 20 pedidos
 * listos, pasarlos a «Entregado» es un toque y no veinte.
 */
export function OrdersPage() {
  const { isTeam } = useRole()
  const qc = useQueryClient()
  const [searchParams] = useSearchParams()
  const campaignId = searchParams.get('campaign') ?? undefined

  const [tab, setTab] = useState('all')
  // El buscador global manda aquí lo que se escribió.
  const [search, setSearch] = useState(() => searchParams.get('q') ?? '')
  const [type, setType] = useState<OrderType | ''>('')
  const [sort, setSort] = useState<Sort>('recent')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkErrors, setBulkErrors] = useState(0)

  // Si ya estabas aquí y buscas desde «/», la búsqueda nueva reemplaza a la anterior.
  const qParam = searchParams.get('q')
  useEffect(() => {
    if (qParam !== null) setSearch(qParam)
  }, [qParam])

  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders', { campaign: campaignId }],
    queryFn: () => listOrders({ campaign: campaignId }),
  })
  const { data: workflow } = useQuery({ queryKey: ['workflow'], queryFn: getWorkflow })
  const { data: campaigns } = useQuery({
    queryKey: ['campaigns'],
    queryFn: listCampaigns,
    enabled: !!campaignId,
  })
  const activeCampaign = campaignId ? campaigns?.find((c) => c._id === campaignId) : undefined

  const states = useMemo(
    () => [...(workflow?.fulfillment ?? [])].sort((a, b) => a.position - b.position),
    [workflow],
  )
  const closedIds = useMemo(
    () => new Set(states.filter((s) => s.isFinal || s.isCancellation).map((s) => s._id)),
    [states],
  )

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = (orders ?? []).filter(
      (o) =>
        (tab === 'all' || (tab === 'open' ? !closedIds.has(o.fulfillmentState?._id) : o.fulfillmentState?._id === tab)) &&
        (!type || o.type === type) &&
        (!q ||
          orderCode(o.trackingToken).toLowerCase().includes(q) ||
          o.customer?.name?.toLowerCase().includes(q) ||
          o.customer?.phone?.includes(q) ||
          o.items?.some((i) => i.name.toLowerCase().includes(q))),
    )
    return list.sort((a, b) =>
      sort === 'amount'
        ? b.totalAmount - a.totalAmount
        : sort === 'due'
          ? (a.scheduledFor?.date ?? '9999').localeCompare(b.scheduledFor?.date ?? '9999')
          : b.createdAt.localeCompare(a.createdAt),
    )
  }, [orders, tab, type, search, sort, closedIds])

  /* ── Indicadores ── */
  const all = orders ?? []
  const open = all.filter((o) => !closedIds.has(o.fulfillmentState?._id))
  const perDay = createdPerDay(all, 14)
  const thisWeek = perDay.slice(7).reduce((a, b) => a + b, 0)
  const lastWeek = perDay.slice(0, 7).reduce((a, b) => a + b, 0)
  const weekDelta = lastWeek ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : null
  const toCollect = open.reduce((s, o) => s + owed(o), 0)
  // El día local, no el UTC: de noche en Lima, UTC ya es mañana.
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const late = open.filter((o) => deliveryStatus(o, today).key === 'overdue').length

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const allVisibleSelected = visible.length > 0 && visible.every((o) => selected.has(o._id))

  return (
    <div className="space-y-5">
      <PageHeader
        title={activeCampaign ? `Pedidos · ${activeCampaign.name}` : 'Pedidos'}
        count={orders?.length}
        actions={
          <>
            {campaignId && (
              <Link to="/orders">
                <Button variant="secondary">Ver todos</Button>
              </Link>
            )}
            {isTeam && (
              <Link to="/orders/new">
                <Button>
                  <Plus size={15} />
                  Nuevo pedido
                </Button>
              </Link>
            )}
          </>
        }
      />

      {activeCampaign && (
        <div className="flex items-center gap-3 rounded-lg border border-brand-200 bg-brand-50 px-4 py-2.5 text-[13px]">
          <Zap size={15} className="shrink-0 text-brand-500" />
          <span className="min-w-0 flex-1 truncate text-brand-800">
            Solo los pedidos de la campaña <strong>{activeCampaign.name}</strong>
          </span>
          <Link to="/orders" className="shrink-0 font-medium text-brand-700 hover:underline">
            Quitar filtro
          </Link>
        </div>
      )}

      {orders && (
        <StatStrip
          stats={[
            { label: 'Abiertos', value: String(open.length), hint: `${all.length - open.length} terminados o cancelados` },
            {
              label: 'Entraron esta semana',
              value: String(thisWeek),
              hint: weekDelta === null ? 'Sin datos de la semana pasada' : `${weekDelta >= 0 ? '↗' : '↘'} ${Math.abs(weekDelta)} % vs. la anterior`,
              tone: weekDelta === null ? 'default' : weekDelta >= 0 ? 'good' : 'bad',
              spark: perDay,
            },
            { label: 'Atrasados', value: String(late), hint: late ? 'Con fecha pasada' : 'Todo a tiempo', tone: late ? 'bad' : 'good' },
            { label: 'Por cobrar', value: formatCurrency(toCollect), hint: 'De los pedidos abiertos' },
          ]}
        />
      )}

      {workflow && (
        <Tabs
          value={tab}
          onChange={(key) => {
            setTab(key)
            setSelected(new Set())
          }}
          items={[
            { key: 'all', label: 'Todos', count: all.length },
            { key: 'open', label: 'Abiertos', count: open.length },
            ...states.map((s) => ({
              key: s._id,
              label: s.name,
              count: all.filter((o) => o.fulfillmentState?._id === s._id).length,
            })),
          ]}
        />
      )}

      {bulkErrors > 0 && (
        <Alert>
          {bulkErrors} {bulkErrors === 1 ? 'pedido no se pudo cambiar' : 'pedidos no se pudieron cambiar'}:
          puede que tu rol no tenga permiso para ese estado, o que ya estuvieran cancelados.
        </Alert>
      )}

      {/* ── Barra de herramientas ── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search size={15} className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Código, cliente o producto"
            aria-label="Buscar pedidos"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pr-3 pl-8 text-base outline-none placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:ring-3 focus:ring-brand-500/15 sm:py-1.5 sm:text-[13px]"
          />
        </div>
        <Select
          value={type}
          onChange={(e) => setType(e.target.value as OrderType | '')}
          aria-label="Tipo de entrega"
          className="w-auto"
        >
          <option value="">Toda entrega</option>
          {(Object.keys(ORDER_TYPE_LABELS) as OrderType[]).map((t) => (
            <option key={t} value={t}>
              {ORDER_TYPE_LABELS[t]}
            </option>
          ))}
        </Select>
        <Select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Ordenar" className="w-auto">
          <option value="recent">Más recientes</option>
          <option value="due">Por fecha de entrega</option>
          <option value="amount">Mayor monto</option>
        </Select>
        <span className="ml-auto text-xs text-slate-400 tabular-nums">
          {visible.length} {visible.length === 1 ? 'pedido' : 'pedidos'}
        </span>
      </div>

      {isLoading ? (
        <Spinner />
      ) : !visible.length ? (
        <EmptyState
          icon={ClipboardList}
          title={orders?.length ? 'Nada coincide con este filtro' : 'Todavía no hay pedidos'}
          description={
            orders?.length
              ? 'Prueba con otra pestaña o borra la búsqueda.'
              : 'Crea el primero o comparte el link de tu tienda.'
          }
          action={
            !orders?.length &&
            isTeam && (
              <Link to="/orders/new">
                <Button>
                  <Plus size={15} />
                  Nuevo pedido
                </Button>
              </Link>
            )
          }
        />
      ) : (
        <>
          {/* Celular: una tarjeta por pedido, tocable entera. */}
          <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 lg:hidden">
            {visible.map((order) => {
              return (
                <li key={order._id}>
                  <Link to={`/orders/${order._id}`} className="block bg-white p-3.5 active:bg-slate-50">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-medium text-slate-900">{order.customer?.name ?? 'Sin cliente'}</p>
                        <p className="truncate text-xs text-slate-500">{itemsSummary(order.items)}</p>
                      </div>
                      <p className="shrink-0 text-[14px] font-medium tabular-nums">{formatCurrency(order.totalAmount)}</p>
                    </div>
                    <OrderStatusTrio order={order} today={today} className="mt-2" />
                    <p className="mt-1.5 flex justify-between gap-2 text-xs text-slate-400">
                      <span>{deliveryStatus(order, today).dateLabel ?? 'Sin fecha acordada'}</span>
                      <span className="font-mono">{orderCode(order.trackingToken)}</span>
                    </p>
                  </Link>
                </li>
              )
            })}
          </ul>

          {/* Escritorio: la tabla. */}
          <div className="hidden overflow-hidden rounded-xl border border-slate-200 lg:block">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-slate-200 text-left text-[11px] font-medium tracking-[0.06em] text-slate-400 uppercase">
                  {isTeam && (
                    <th className="w-10 py-2.5 pl-4">
                      <input
                        type="checkbox"
                        aria-label="Seleccionar todos"
                        checked={allVisibleSelected}
                        onChange={() =>
                          setSelected(allVisibleSelected ? new Set() : new Set(visible.map((o) => o._id)))
                        }
                        className="size-4 cursor-pointer accent-brand-500"
                      />
                    </th>
                  )}
                  <th className="px-3 py-2.5 font-medium">Cliente</th>
                  <th className="px-3 py-2.5 font-medium">Pedido</th>
                  <th className="px-3 py-2.5 font-medium">Pedido</th>
                  <th className="px-3 py-2.5 font-medium">Entrega</th>
                  <th className="px-3 py-2.5 font-medium">Pago</th>
                  <th className="px-3 py-2.5 text-right font-medium">Total</th>
                  <th className="px-3 py-2.5 font-medium">Código</th>
                  <th className="py-2.5 pr-4 pl-3 font-medium">Creado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((order) => {
                  const isSel = selected.has(order._id)
                  return (
                    <tr key={order._id} className={cn('group transition-colors', isSel ? 'bg-brand-50/50' : 'hover:bg-slate-50')}>
                      {isTeam && (
                        <td className="py-3 pl-4">
                          <input
                            type="checkbox"
                            aria-label={`Seleccionar pedido de ${order.customer?.name ?? 'cliente'}`}
                            checked={isSel}
                            onChange={() => toggle(order._id)}
                            className="size-4 cursor-pointer accent-brand-500"
                          />
                        </td>
                      )}
                      <td className="px-3 py-3">
                        <Link to={`/orders/${order._id}`} className="font-medium text-slate-900 hover:text-brand-600">
                          {order.customer?.name ?? 'Sin cliente'}
                        </Link>
                        <p className="text-xs text-slate-400">{order.customer?.phone}</p>
                      </td>
                      <td className="max-w-60 truncate px-3 py-3 text-slate-600">{itemsSummary(order.items)}</td>
                      <td className="px-3 py-3">
                        {order.fulfillmentState && (
                          <StateBadge name={order.fulfillmentState.name} color={order.fulfillmentState.color} icon={order.fulfillmentState.icon} />
                        )}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <DeliveryBadge order={order} today={today} />
                        <p className="mt-1 text-xs text-slate-500">
                          {deliveryStatus(order, today).dateLabel ?? 'Sin fecha'} · {ORDER_TYPE_LABELS[order.type]}
                        </p>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <PaymentBadge order={order} />
                      </td>
                      <td className="px-3 py-3 text-right font-medium whitespace-nowrap text-slate-900 tabular-nums">
                        {formatCurrency(order.totalAmount)}
                      </td>
                      <td className="px-3 py-3 font-mono text-xs text-slate-400">{orderCode(order.trackingToken)}</td>
                      <td className="py-3 pr-4 pl-3 whitespace-nowrap text-slate-500">{shortDate(order.createdAt)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {selected.size > 0 && (
        <BulkBar
          ids={[...selected]}
          states={states}
          onClear={() => setSelected(new Set())}
          onStart={() => setBulkErrors(0)}
          onDone={(errors) => {
            setBulkErrors(errors)
            setSelected(new Set())
            qc.invalidateQueries({ queryKey: ['orders'] })
            qc.invalidateQueries({ queryKey: ['today'] })
            qc.invalidateQueries({ queryKey: ['inventory'] })
          }}
        />
      )}
    </div>
  )
}

/**
 * La barra flotante de acciones en bloque. Va uno por uno contra la API —la
 * misma que usa el detalle—, así cada pedido respeta sus reglas (stock,
 * permisos del rol) y si uno falla los demás igual se mueven.
 */
function BulkBar({
  ids,
  states,
  onClear,
  onStart,
  onDone,
}: {
  ids: string[]
  states: WorkflowState[]
  onClear: () => void
  onStart: () => void
  onDone: (errors: number) => void
}) {
  const [menu, setMenu] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)

  async function run(label: string, action: (id: string) => Promise<unknown>) {
    setMenu(false)
    setBusy(label)
    onStart()
    let errors = 0
    for (const id of ids) {
      try {
        await action(id)
      } catch {
        errors += 1
      }
    }
    setBusy(null)
    onDone(errors)
  }

  const movable = states.filter((s) => !s.isCancellation)

  return (
    <div className="pb-safe fixed inset-x-0 bottom-20 z-40 flex justify-center px-3 md:bottom-6 md:pl-64">
      <div className="relative flex flex-wrap items-center gap-1 rounded-xl bg-navy p-1.5 text-[13px] text-white shadow-[0_16px_40px_-12px_rgb(27_34_54/0.6)] transition-[opacity,transform] duration-200 ease-snappy starting:translate-y-3 starting:opacity-0">
        <span className="px-2.5 text-white/70 tabular-nums">
          {busy ? `${busy}…` : `Seleccionados: ${ids.length}`}
        </span>
        <span className="h-5 w-px bg-white/15" />
        <button
          type="button"
          disabled={Boolean(busy)}
          onClick={() => setMenu((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 hover:bg-white/10 disabled:opacity-50"
        >
          <ArrowRightLeft size={14} />
          Mover a
          <ChevronDown size={13} />
        </button>
        <button
          type="button"
          disabled={Boolean(busy)}
          onClick={() => run('Cancelando', (id) => cancelOrder(id))}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 hover:bg-white/10 disabled:opacity-50"
        >
          <CircleX size={14} />
          Cancelar
        </button>
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 font-medium text-navy hover:bg-slate-100"
        >
          <X size={14} />
          Descartar
        </button>

        {menu && (
          <div className="absolute bottom-full left-1/2 mb-2 w-56 -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-1 text-slate-700 shadow-[0_12px_32px_-8px_rgb(24_24_27/0.3)]">
            {movable.map((s) => (
              <button
                key={s._id}
                type="button"
                onClick={() => run(`Moviendo a ${s.name}`, (id) => updateOrderState(id, { kind: 'fulfillment', stateId: s._id }))}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left hover:bg-slate-100"
              >
                <span className="size-2 rounded-full" style={{ backgroundColor: s.color }} />
                {s.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
