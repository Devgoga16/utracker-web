import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, Printer } from 'lucide-react'
import { getOrder } from '@/api/orders'
import { Button, Spinner } from '@/components/ui'
import { useAuthStore } from '@/stores/authStore'
import { formatCurrency } from '@/lib/cn'
import type { Franja } from '@/types'

const FRANJA_LABELS: Record<Franja, string> = {
  morning: 'Mañana',
  afternoon: 'Tarde',
  evening: 'Noche',
}

const TYPE_LABELS: Record<string, string> = {
  pickup: 'Recojo en tienda',
  delivery_own: 'Delivery',
  delivery_third_party: 'Envío por courier',
}

/** "2026-10-08" sin pasar por Date, para no arrastrar corrimientos de zona. */
function longDate(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-PE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/**
 * Comprobante de compra, pensado para imprimir o guardar como PDF.
 *
 * No es una boleta electrónica con validez tributaria: es la constancia que el
 * negocio entrega con el pedido. Decirlo en el documento evita que alguien la
 * confunda con un comprobante de SUNAT.
 */
export function ReceiptPage() {
  const { id } = useParams<{ id: string }>()
  const { activeTenant } = useAuthStore()

  const { data: order, isLoading } = useQuery({
    queryKey: ['orders', id],
    queryFn: () => getOrder(id!),
    enabled: Boolean(id),
  })

  // Al imprimir solo debe salir la boleta, no el resto de la aplicación.
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      @media print {
        body * { visibility: hidden; }
        #receipt, #receipt * { visibility: visible; }
        #receipt { position: absolute; inset: 0; margin: 0; box-shadow: none; }
        @page { margin: 14mm; }
      }
    `
    document.head.appendChild(style)
    return () => style.remove()
  }, [])

  if (isLoading) return <Spinner />
  if (!order) return <p className="text-slate-500">No encontramos este pedido.</p>

  // Solo lo confirmado cuenta como pagado, igual que en el resto del sistema.
  const paid = order.payments
    .filter((p) => p.validated !== false)
    .reduce((s, p) => s + p.amount, 0)
  const pending = Math.max(0, order.totalAmount - paid)
  const code = (order.trackingToken ?? '').slice(-6).toUpperCase()

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {/* Controles: no se imprimen. */}
      <div className="flex items-center justify-between gap-3">
        <Link
          to={`/orders/${order._id}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition-colors hover:text-slate-800"
        >
          <ChevronLeft size={15} />
          Volver al pedido
        </Link>
        <Button onClick={() => window.print()}>
          <Printer size={15} />
          Imprimir
        </Button>
      </div>

      <div id="receipt" className="rounded-xl bg-white p-8 ring-1 ring-slate-200 print:ring-0">
        {/* Cabecera */}
        <div className="flex items-start justify-between gap-6 border-b border-slate-200 pb-5">
          <div className="flex items-center gap-3">
            {activeTenant?.logoUrl && (
              <img
                src={activeTenant.logoUrl}
                alt=""
                className="size-14 rounded-xl object-cover ring-1 ring-slate-200"
              />
            )}
            <div>
              <p className="text-lg font-bold text-slate-900">{activeTenant?.name}</p>
              {activeTenant?.phone && (
                <p className="text-sm text-slate-500">WhatsApp {activeTenant.phone}</p>
              )}
            </div>
          </div>

          <div className="text-right">
            <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">
              Comprobante
            </p>
            <p className="font-mono text-lg font-bold text-slate-900">{code}</p>
            <p className="text-xs text-slate-500">
              {new Date(order.createdAt).toLocaleDateString('es-PE')}
            </p>
          </div>
        </div>

        {/* Cliente y entrega */}
        <div className="grid gap-5 border-b border-slate-200 py-5 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-xs font-semibold tracking-wide text-slate-400 uppercase">
              Cliente
            </p>
            <p className="font-medium text-slate-900">{order.customer?.name}</p>
            <p className="text-sm text-slate-600">{order.customer?.phone}</p>
            {order.customer?.email && (
              <p className="text-sm text-slate-600">{order.customer.email}</p>
            )}
          </div>

          <div>
            <p className="mb-1 text-xs font-semibold tracking-wide text-slate-400 uppercase">
              Entrega
            </p>
            <p className="font-medium text-slate-900">{TYPE_LABELS[order.type] ?? order.type}</p>
            {order.delivery?.address && (
              <p className="text-sm text-slate-600">{order.delivery.address}</p>
            )}
            {order.scheduledFor?.date && (
              <p className="text-sm text-slate-600">
                {longDate(order.scheduledFor.date)}
                {order.scheduledFor.franja && ` · ${FRANJA_LABELS[order.scheduledFor.franja]}`}
              </p>
            )}
          </div>
        </div>

        {/* Detalle */}
        <table className="w-full py-5 text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs font-semibold tracking-wide text-slate-400 uppercase">
              <th className="py-2">Descripción</th>
              <th className="py-2 text-center">Cant.</th>
              <th className="py-2 text-right">P. unit.</th>
              <th className="py-2 text-right">Importe</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {order.items.map((item, i) => (
              <tr key={i}>
                <td className="py-2.5">
                  <span className="text-slate-900">{item.name}</span>
                  {item.variant && <span className="text-slate-500"> · {item.variant}</span>}
                  {item.specs && (
                    <span className="block text-xs text-slate-500">{item.specs}</span>
                  )}
                </td>
                <td className="py-2.5 text-center tabular-nums text-slate-600">{item.quantity}</td>
                <td className="py-2.5 text-right tabular-nums text-slate-600">
                  {formatCurrency(item.unitPrice)}
                </td>
                <td className="py-2.5 text-right font-medium tabular-nums text-slate-900">
                  {formatCurrency(item.unitPrice * item.quantity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totales */}
        <div className="flex justify-end border-t border-slate-200 pt-4">
          <div className="w-full max-w-xs space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Total</span>
              <span className="font-semibold tabular-nums text-slate-900">
                {formatCurrency(order.totalAmount)}
              </span>
            </div>

            {order.payments
              .filter((p) => p.validated !== false)
              .map((p, i) => (
                <div key={i} className="flex justify-between text-slate-500">
                  <span>{p.kind === 'advance' ? 'Adelanto' : 'Saldo'}</span>
                  <span className="tabular-nums">− {formatCurrency(p.amount)}</span>
                </div>
              ))}

            <div
              className={`flex justify-between border-t border-slate-200 pt-2 text-base font-bold ${
                pending === 0 ? 'text-emerald-700' : 'text-amber-700'
              }`}
            >
              <span>{pending === 0 ? 'Pagado' : 'Pendiente'}</span>
              <span className="tabular-nums">
                {pending === 0 ? formatCurrency(paid) : formatCurrency(pending)}
              </span>
            </div>
          </div>
        </div>

        {order.notes && (
          <div className="mt-5 border-t border-slate-200 pt-4">
            <p className="mb-1 text-xs font-semibold tracking-wide text-slate-400 uppercase">
              Nota
            </p>
            <p className="text-sm whitespace-pre-line text-slate-600">{order.notes}</p>
          </div>
        )}

        <p className="mt-6 border-t border-slate-200 pt-4 text-center text-[11px] text-slate-400">
          Documento interno sin validez tributaria · ¡Gracias por tu compra!
        </p>
      </div>
    </div>
  )
}
