import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { listOrders } from '@/api/orders'
import { getWorkflow } from '@/api/tenants'
import { Button, EmptyState, Spinner, StateBadge } from '@/components/ui'
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-900">Pedidos</h1>
        <Link to="/orders/new" className="shrink-0">
          <Button>
            <span className="sm:hidden">+ Nuevo</span>
            <span className="hidden sm:inline">+ Nuevo pedido</span>
          </Button>
        </Link>
      </div>

      {workflow && (
        // En mobile la tira se desliza de costado en vez de apilarse en
        // cuatro filas de chips.
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
          <button
            type="button"
            onClick={() => setStateFilter(null)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition-colors ${
              stateFilter === null
                ? 'bg-slate-900 text-white ring-slate-900'
                : 'bg-white text-slate-600 ring-slate-300 hover:bg-slate-50'
            }`}
          >
            Todos ({orders?.length ?? 0})
          </button>
          {workflow.fulfillment.map((state) => {
            const count = orders?.filter((o) => o.fulfillmentState?._id === state._id).length ?? 0
            return (
              <button
                key={state._id}
                type="button"
                onClick={() => setStateFilter(state._id)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap ring-1 transition-colors ${
                  stateFilter === state._id
                    ? 'bg-slate-900 text-white ring-slate-900'
                    : 'bg-white text-slate-600 ring-slate-300 hover:bg-slate-50'
                }`}
              >
                <StateIcon name={state.icon} size={14} />
                {state.name} ({count})
              </button>
            )
          })}
        </div>
      )}

      {isLoading ? (
        <Spinner />
      ) : !filtered?.length ? (
        <EmptyState
          title="No hay pedidos todavía"
          description="Creá el primero o compartí un link de pedido con tu cliente."
        />
      ) : (
        <>
        {/* Mobile: una tarjeta por pedido, tocable entera. */}
        <ul className="space-y-3 lg:hidden">
          {filtered.map((order) => (
            <li key={order._id}>
              <Link
                to={`/orders/${order._id}`}
                className="block rounded-xl bg-white p-4 ring-1 ring-slate-200 active:bg-slate-50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">
                      {order.customer?.name ?? 'Sin cliente'}
                    </p>
                    <p className="truncate text-xs text-slate-500">{order.customer?.phone}</p>
                  </div>
                  <p className="shrink-0 font-semibold text-slate-900">
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

                <div className="mt-2.5 flex items-center justify-between gap-3 text-xs text-slate-400">
                  <span className="truncate">{orderTypeLabels[order.type]}</span>
                  <span className="shrink-0">{formatDateTime(order.createdAt)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>

        <div className="hidden overflow-hidden rounded-xl bg-white ring-1 ring-slate-200 lg:block">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium text-slate-500 uppercase">
              <tr>
                <th className="px-5 py-3">Cliente</th>
                <th className="px-5 py-3">Entrega</th>
                <th className="px-5 py-3">Estado</th>
                <th className="px-5 py-3">Pago</th>
                <th className="px-5 py-3 text-right">Total</th>
                <th className="px-5 py-3">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((order) => (
                <tr key={order._id} className="transition-colors hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <Link to={`/orders/${order._id}`} className="font-medium text-brand-600 hover:underline">
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
                  <td className="px-5 py-3 text-right font-medium">
                    {formatCurrency(order.totalAmount)}
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-500">
                    {formatDateTime(order.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}
    </div>
  )
}
