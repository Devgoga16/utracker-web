import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight, ClipboardList, Plus } from 'lucide-react'
import { listOrders } from '@/api/orders'
import { getWorkflow } from '@/api/tenants'
import {
  Button,
  Card,
  Chip,
  ChipBar,
  EmptyState,
  PageHeader,
  Spinner,
  StateBadge,
} from '@/components/ui'
import { StateIcon } from '@/lib/icons'
import { formatCurrency, formatDateTime } from '@/lib/cn'
import type { OrderType } from '@/types'

const orderTypeLabels: Record<OrderType, string> = {
  pickup: 'Recojo',
  delivery_third_party: 'Delivery (courier)',
  delivery_own: 'Delivery propio',
}

export function OrdersPage() {
  const [stateFilter, setStateFilter] = useState<string | null>(null)

  const { data: orders, isLoading } = useQuery({ queryKey: ['orders'], queryFn: listOrders })
  const { data: workflow } = useQuery({ queryKey: ['workflow'], queryFn: getWorkflow })

  const filtered = stateFilter
    ? orders?.filter((o) => o.fulfillmentState?._id === stateFilter)
    : orders

  const activeStateName = stateFilter
    ? workflow?.fulfillment.find((s) => s._id === stateFilter)?.name
    : null

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pedidos"
        description={
          orders?.length
            ? `${orders.length} pedido${orders.length === 1 ? '' : 's'} en total`
            : undefined
        }
        actions={
          <Link to="/orders/new">
            <Button>
              <Plus size={16} />
              <span className="sm:hidden">Nuevo</span>
              <span className="hidden sm:inline">Nuevo pedido</span>
            </Button>
          </Link>
        }
      />

      {workflow && (
        <ChipBar>
          <Chip
            active={stateFilter === null}
            count={orders?.length ?? 0}
            onClick={() => setStateFilter(null)}
          >
            Todos
          </Chip>
          {workflow.fulfillment.map((state) => {
            const count = orders?.filter((o) => o.fulfillmentState?._id === state._id).length ?? 0
            return (
              <Chip
                key={state._id}
                active={stateFilter === state._id}
                count={count}
                onClick={() => setStateFilter(state._id)}
              >
                <StateIcon name={state.icon} size={14} />
                {state.name}
              </Chip>
            )
          })}
        </ChipBar>
      )}

      {isLoading ? (
        <Spinner />
      ) : !filtered?.length ? (
        <EmptyState
          icon={ClipboardList}
          title={activeStateName ? `Nada en "${activeStateName}"` : 'No hay pedidos todavía'}
          description={
            activeStateName
              ? 'Ningún pedido está en este estado ahora mismo.'
              : 'Crea el primero o comparte un link de pedido con tu cliente.'
          }
          action={
            activeStateName ? (
              <Button variant="secondary" onClick={() => setStateFilter(null)}>
                Ver todos
              </Button>
            ) : (
              <Link to="/orders/new">
                <Button>
                  <Plus size={16} />
                  Nuevo pedido
                </Button>
              </Link>
            )
          }
        />
      ) : (
        <>
          {/* Mobile: una tarjeta por pedido, tocable entera. */}
          <ul className="space-y-2.5 lg:hidden">
            {filtered.map((order) => (
              <li key={order._id}>
                <Link
                  to={`/orders/${order._id}`}
                  className="block rounded-xl bg-white p-4 shadow-sm shadow-slate-900/[0.03] ring-1 ring-slate-200 transition-colors active:bg-slate-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">
                        {order.customer?.name ?? 'Sin cliente'}
                      </p>
                      <p className="truncate text-xs text-slate-500">{order.customer?.phone}</p>
                    </div>
                    <p className="shrink-0 font-semibold tabular-nums text-slate-900">
                      {formatCurrency(order.totalAmount)}
                    </p>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
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

                  <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-2.5 text-xs text-slate-400">
                    <span className="truncate">{orderTypeLabels[order.type]}</span>
                    <span className="shrink-0">{formatDateTime(order.createdAt)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          <Card flush className="hidden overflow-hidden lg:block">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/70 text-left text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                <tr>
                  <th className="px-5 py-3">Cliente</th>
                  <th className="px-5 py-3">Entrega</th>
                  <th className="px-5 py-3">Estado</th>
                  <th className="px-5 py-3">Pago</th>
                  <th className="px-5 py-3 text-right">Total</th>
                  <th className="px-5 py-3">Fecha</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((order) => (
                  <tr key={order._id} className="group transition-colors hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <Link
                        to={`/orders/${order._id}`}
                        className="font-medium text-slate-900 transition-colors group-hover:text-brand-600"
                      >
                        {order.customer?.name ?? 'Sin cliente'}
                      </Link>
                      <p className="text-xs text-slate-500">{order.customer?.phone}</p>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{orderTypeLabels[order.type]}</td>
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
                    <td className="px-5 py-3 text-xs whitespace-nowrap text-slate-500">
                      {formatDateTime(order.createdAt)}
                    </td>
                    <td className="pr-4">
                      <Link
                        to={`/orders/${order._id}`}
                        aria-label={`Ver pedido de ${order.customer?.name ?? 'cliente'}`}
                        className="block text-slate-300 transition-colors group-hover:text-brand-500"
                      >
                        <ChevronRight size={16} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  )
}
