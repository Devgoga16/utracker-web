import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart2,
  Clock,
  DollarSign,
  Receipt,
  SlidersHorizontal,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { getFinanceSummary, getFinanceOrders, type FinanceFilters } from '@/api/finance'
import { getWorkflow } from '@/api/tenants'
import { listProducts } from '@/api/products'
import { apiErrorMessage } from '@/api/client'
import {
  Alert,
  Badge,
  Button,
  Card,
  Chip,
  ChipBar,
  EmptyState,
  Field,
  PageHeader,
  SectionLabel,
  Select,
  Spinner,
  StateBadge,
  StatCard,
} from '@/components/ui'
import { cn, formatCurrency } from '@/lib/cn'
import type { OrderType } from '@/types'

const ORDER_TYPES: { value: OrderType | ''; label: string }[] = [
  { value: '', label: 'Todos los tipos' },
  { value: 'pickup', label: 'Recojo en tienda' },
  { value: 'delivery_own', label: 'Delivery propio' },
  { value: 'delivery_third_party', label: 'Delivery por courier' },
]

const DATE_PRESETS = [
  { label: 'Hoy', value: 'today' },
  { label: 'Esta semana', value: 'week' },
  { label: 'Este mes', value: 'month' },
  { label: 'Mes anterior', value: 'last_month' },
  { label: 'Todo', value: 'all' },
]

function presetToDates(preset: string): { from?: string; to?: string } {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

  if (preset === 'today') {
    const t = fmt(now)
    return { from: t, to: t }
  }
  if (preset === 'week') {
    const start = new Date(now)
    start.setDate(now.getDate() - now.getDay())
    return { from: fmt(start), to: fmt(now) }
  }
  if (preset === 'month') {
    return { from: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`, to: fmt(now) }
  }
  if (preset === 'last_month') {
    const first = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const last = new Date(now.getFullYear(), now.getMonth(), 0)
    return { from: fmt(first), to: fmt(last) }
  }
  return {}
}

export function FinancesPage() {
  const [preset, setPreset] = useState('month')
  const [type, setType] = useState('')
  const [fulfillmentStateId, setFulfillmentStateId] = useState('')
  const [paymentStateId, setPaymentStateId] = useState('')
  const [productId, setProductId] = useState('')
  const [page, setPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)

  const dates = presetToDates(preset)
  const filters: FinanceFilters = {
    ...dates,
    ...(type && { type }),
    ...(fulfillmentStateId && { fulfillmentStateId }),
    ...(paymentStateId && { paymentStateId }),
    ...(productId && { productId }),
  }

  // El periodo tiene su propia tira de chips, así que no cuenta acá.
  const extraFilterCount = [type, fulfillmentStateId, paymentStateId, productId].filter(
    Boolean,
  ).length

  const { data: summary, isLoading: summaryLoading, error: summaryError } = useQuery({
    queryKey: ['finance-summary', filters],
    queryFn: () => getFinanceSummary(filters),
  })

  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['finance-orders', filters, page],
    queryFn: () => getFinanceOrders({ ...filters, page }),
  })

  const { data: workflow } = useQuery({ queryKey: ['workflow'], queryFn: getWorkflow })
  const { data: products } = useQuery({ queryKey: ['products'], queryFn: listProducts })

  function resetPage() {
    setPage(1)
  }

  function clearExtraFilters() {
    setType('')
    setFulfillmentStateId('')
    setPaymentStateId('')
    setProductId('')
    resetPage()
  }

  const collectedRatio =
    summary && summary.totalRevenue > 0 ? summary.totalCollected / summary.totalRevenue : 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finanzas"
        description="Ingresos, cobros y pendientes del periodo que elijas."
        actions={
          <Button
            variant={showFilters ? 'primary' : 'secondary'}
            onClick={() => setShowFilters((v) => !v)}
          >
            <SlidersHorizontal size={15} />
            Filtros
            {extraFilterCount > 0 && (
              <span
                className={cn(
                  'flex size-5 items-center justify-center rounded-full text-[11px] font-bold',
                  showFilters ? 'bg-white/20 text-white' : 'bg-brand-100 text-brand-700',
                )}
              >
                {extraFilterCount}
              </span>
            )}
          </Button>
        }
      />

      <ChipBar>
        {DATE_PRESETS.map((p) => (
          <Chip
            key={p.value}
            active={preset === p.value}
            onClick={() => {
              setPreset(p.value)
              resetPage()
            }}
          >
            {p.label}
          </Chip>
        ))}
      </ChipBar>

      {showFilters && (
        <Card
          title="Filtros adicionales"
          description="Se combinan entre sí y con el periodo."
          actions={
            extraFilterCount > 0 && (
              <Button size="sm" variant="ghost" onClick={clearExtraFilters}>
                Limpiar
              </Button>
            )
          }
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Tipo de entrega" htmlFor="f-type">
              <Select
                id="f-type"
                value={type}
                onChange={(e) => {
                  setType(e.target.value)
                  resetPage()
                }}
              >
                {ORDER_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Estado del pedido" htmlFor="f-fulfillment">
              <Select
                id="f-fulfillment"
                value={fulfillmentStateId}
                onChange={(e) => {
                  setFulfillmentStateId(e.target.value)
                  resetPage()
                }}
              >
                <option value="">Todos</option>
                {workflow?.fulfillment.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Estado de pago" htmlFor="f-payment">
              <Select
                id="f-payment"
                value={paymentStateId}
                onChange={(e) => {
                  setPaymentStateId(e.target.value)
                  resetPage()
                }}
              >
                <option value="">Todos</option>
                {workflow?.payment.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Producto" htmlFor="f-product">
              <Select
                id="f-product"
                value={productId}
                onChange={(e) => {
                  setProductId(e.target.value)
                  resetPage()
                }}
              >
                <option value="">Todos los productos</option>
                {products?.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </Card>
      )}

      {summaryError && <Alert>{apiErrorMessage(summaryError)}</Alert>}

      {summaryLoading ? (
        <Spinner />
      ) : summary ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              icon={TrendingUp}
              label="Total facturado"
              value={formatCurrency(summary.totalRevenue)}
              hint={`${summary.orderCount} pedido${summary.orderCount === 1 ? '' : 's'}`}
              tone="brand"
            />
            <StatCard
              icon={DollarSign}
              label="Total cobrado"
              value={formatCurrency(summary.totalCollected)}
              hint={`${Math.round(collectedRatio * 100)}% de lo facturado`}
              tone="green"
            />
            <StatCard
              icon={Clock}
              label="Pendiente por cobrar"
              value={formatCurrency(summary.totalPending)}
              hint={summary.totalPending > 0 ? 'Falta cobrar' : 'Todo cobrado'}
              tone={summary.totalPending > 0 ? 'amber' : 'green'}
            />
            <StatCard
              icon={Receipt}
              label="Ticket promedio"
              value={formatCurrency(summary.avgOrderValue)}
            />
            <StatCard
              icon={Wallet}
              label="Pedidos en el periodo"
              value={String(summary.orderCount)}
            />
          </div>

          {/* Barra de avance de cobro: lee más rápido que dos cifras sueltas. */}
          {summary.totalRevenue > 0 && (
            <Card>
              <div className="flex items-end justify-between gap-3">
                <SectionLabel>Avance de cobro</SectionLabel>
                <span className="text-sm font-semibold tabular-nums text-slate-900">
                  {Math.round(collectedRatio * 100)}%
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-[width] duration-500"
                  style={{ width: `${Math.min(100, collectedRatio * 100)}%` }}
                />
              </div>
              <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-slate-500">
                <span>Cobrado {formatCurrency(summary.totalCollected)}</span>
                <span>Pendiente {formatCurrency(summary.totalPending)}</span>
              </div>
            </Card>
          )}

          {summary.topProducts.length > 0 && (
            <Card title="Top productos por ingreso">
              <ul className="space-y-3">
                {summary.topProducts.map((p, i) => {
                  const share =
                    summary.totalRevenue > 0 ? (p.revenue / summary.totalRevenue) * 100 : 0
                  return (
                    <li key={p.productId}>
                      <div className="flex items-center gap-3">
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                          {i + 1}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">
                          {p.name}
                        </span>
                        <Badge>{p.quantity} u.</Badge>
                        <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-900">
                          {formatCurrency(p.revenue)}
                        </span>
                      </div>
                      <div className="mt-1.5 ml-9 h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-brand-500"
                          style={{ width: `${share}%` }}
                        />
                      </div>
                    </li>
                  )
                })}
              </ul>
            </Card>
          )}
        </>
      ) : null}

      <Card
        flush
        title="Pedidos del periodo"
        description={
          ordersData ? `${ordersData.total} en total` : undefined
        }
      >
        {ordersLoading ? (
          <div className="pb-4">
            <Spinner inline />
          </div>
        ) : ordersData?.orders.length === 0 ? (
          <div className="px-4 pb-5 sm:px-5">
            <EmptyState
              icon={BarChart2}
              title="Sin pedidos"
              description="Ningún pedido coincide con los filtros seleccionados."
            />
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-sm">
                <thead className="border-y border-slate-100 bg-slate-50/70 text-left text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                  <tr>
                    <th className="px-5 py-2.5">Cliente</th>
                    <th className="px-5 py-2.5">Fecha</th>
                    <th className="px-5 py-2.5">Estado pedido</th>
                    <th className="px-5 py-2.5">Estado pago</th>
                    <th className="px-5 py-2.5 text-right">Total</th>
                    <th className="px-5 py-2.5 text-right">Cobrado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {ordersData?.orders.map((order) => {
                    const cobrado = order.payments.reduce((s, p) => s + p.amount, 0)
                    return (
                      <tr key={order._id} className="transition-colors hover:bg-slate-50">
                        <td className="px-5 py-3 font-medium text-slate-900">
                          {order.customer?.name ?? 'Sin cliente'}
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap text-slate-500">
                          {new Date(order.createdAt).toLocaleDateString('es-PE')}
                        </td>
                        <td className="px-5 py-3">
                          {order.fulfillmentState && (
                            <StateBadge
                              name={order.fulfillmentState.name}
                              color={order.fulfillmentState.color}
                              icon={order.fulfillmentState.icon}
                            />
                          )}
                        </td>
                        <td className="px-5 py-3">
                          {order.paymentState && (
                            <StateBadge
                              name={order.paymentState.name}
                              color={order.paymentState.color}
                              icon={order.paymentState.icon}
                            />
                          )}
                        </td>
                        <td className="px-5 py-3 text-right font-medium tabular-nums">
                          {formatCurrency(order.totalAmount)}
                        </td>
                        <td
                          className={cn(
                            'px-5 py-3 text-right font-medium tabular-nums',
                            cobrado >= order.totalAmount
                              ? 'text-emerald-600'
                              : cobrado > 0
                                ? 'text-amber-600'
                                : 'text-slate-300',
                          )}
                        >
                          {formatCurrency(cobrado)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-slate-100 lg:hidden">
              {ordersData?.orders.map((order) => {
                const cobrado = order.payments.reduce((s, p) => s + p.amount, 0)
                return (
                  <li key={order._id} className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 truncate font-semibold text-slate-900">
                        {order.customer?.name ?? 'Sin cliente'}
                      </p>
                      <p className="shrink-0 text-xs text-slate-400">
                        {new Date(order.createdAt).toLocaleDateString('es-PE')}
                      </p>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {order.fulfillmentState && (
                        <StateBadge
                          name={order.fulfillmentState.name}
                          color={order.fulfillmentState.color}
                          icon={order.fulfillmentState.icon}
                        />
                      )}
                      {order.paymentState && (
                        <StateBadge
                          name={order.paymentState.name}
                          color={order.paymentState.color}
                          icon={order.paymentState.icon}
                        />
                      )}
                    </div>

                    <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 text-sm">
                      <span className="text-slate-500">Total</span>
                      <span className="font-semibold tabular-nums">
                        {formatCurrency(order.totalAmount)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Cobrado</span>
                      <span
                        className={cn(
                          'font-semibold tabular-nums',
                          cobrado >= order.totalAmount
                            ? 'text-emerald-600'
                            : cobrado > 0
                              ? 'text-amber-600'
                              : 'text-slate-300',
                        )}
                      >
                        {formatCurrency(cobrado)}
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>

            {ordersData && ordersData.pages > 1 && (
              <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-4 py-3 sm:px-5">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Anterior
                </Button>
                <span className="text-xs text-slate-500 tabular-nums">
                  Página {ordersData.page} de {ordersData.pages}
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={page >= ordersData.pages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Siguiente
                </Button>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  )
}
