import { Ban, Printer } from 'lucide-react'
import { EmptyState } from '@/components/ui'
import { cn, formatCurrency } from '@/lib/cn'
import { PAYMENT_METHOD_LABELS, saleCode } from '@/lib/pos'
import type { PosSale } from '@/types'

/**
 * Las ventas de una caja, la más reciente arriba.
 *
 * Las anuladas se quedan en la lista, tachadas: desaparecerlas haría que el
 * turno parezca tener menos movimiento del que tuvo, y es justo lo que el
 * dueño quiere poder revisar.
 */
export function SalesList({
  sales,
  onReprint,
  onVoid,
  voidingId,
}: {
  sales: PosSale[]
  onReprint?: (sale: PosSale) => void
  /** Sin esto no se ofrece anular (rol sin permiso o caja cerrada). */
  onVoid?: (sale: PosSale) => void
  voidingId?: string | null
}) {
  if (!sales.length) {
    return <EmptyState title="Todavía no hay ventas en esta caja" />
  }

  return (
    <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl bg-white border border-slate-200">
      {sales.map((sale) => {
        const voided = Boolean(sale.voidedAt)
        const payment = sale.payments[0]
        const units = sale.items.reduce((s, i) => s + i.quantity, 0)

        return (
          <li key={sale._id} className="flex items-center gap-3 px-3.5 py-3 sm:px-4">
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
                <span className="font-mono text-xs font-semibold text-slate-500">
                  {saleCode(sale.trackingToken)}
                </span>
                <span className="text-slate-400 tabular-nums">
                  {new Date(sale.createdAt).toLocaleTimeString('es-PE', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                {voided ? (
                  <span className="rounded-full bg-danger-50 px-2 py-0.5 text-[11px] font-semibold text-danger-600">
                    Anulada
                  </span>
                ) : (
                  payment?.method && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                      {PAYMENT_METHOD_LABELS[payment.method]}
                    </span>
                  )
                )}
              </p>
              <p className={cn('mt-0.5 truncate text-sm text-slate-700', voided && 'line-through opacity-60')}>
                {sale.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}
              </p>
              <p className="text-xs text-slate-400">
                {units} {units === 1 ? 'unidad' : 'unidades'}
                {sale.createdBy?.name ? ` · ${sale.createdBy.name}` : ''}
              </p>
            </div>

            <p
              className={cn(
                'shrink-0 font-semibold tabular-nums',
                voided ? 'text-slate-400 line-through' : 'text-slate-900',
              )}
            >
              {formatCurrency(sale.totalAmount)}
            </p>

            <div className="flex shrink-0 gap-0.5">
              {onReprint && !voided && (
                <button
                  type="button"
                  onClick={() => onReprint(sale)}
                  aria-label="Reimprimir ticket"
                  title="Reimprimir ticket"
                  className="focus-ring rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                >
                  <Printer size={16} />
                </button>
              )}
              {onVoid && !voided && (
                <button
                  type="button"
                  onClick={() => onVoid(sale)}
                  disabled={voidingId === sale._id}
                  aria-label="Anular venta"
                  title="Anular venta"
                  className="focus-ring rounded-lg p-2 text-slate-400 transition-colors hover:bg-danger-50 hover:text-danger-600 disabled:opacity-50"
                >
                  <Ban size={16} />
                </button>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
