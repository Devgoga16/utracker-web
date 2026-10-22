import { useEffect } from 'react'
import { formatCurrency } from '@/lib/cn'
import { PAYMENT_METHOD_LABELS, saleCode } from '@/lib/pos'
import type { OrderItem, PaymentEntry } from '@/types'

export interface TicketData {
  trackingToken: string
  items: OrderItem[]
  totalAmount: number
  payments: PaymentEntry[]
  createdAt: string
  customer?: { name: string; phone: string } | null
  /** Quién vendió. Al reimprimir, el de la venta y no el que reimprime. */
  cashier?: string
}

/**
 * Ticket para impresora térmica de 80 mm (también sale bien en 58 mm).
 *
 * En pantalla no se ve: existe solo para `window.print()`, que esconde todo
 * lo demás. Se imprime desde el navegador porque así funciona con cualquier
 * ticketera que Windows o Android reconozcan, sin instalar nada.
 *
 * No es una boleta electrónica, y lo dice: alguien que lo recibe no debe
 * confundirlo con un comprobante de SUNAT.
 */
export function PosTicket({
  sale,
  businessName,
  businessPhone,
  cashier,
}: {
  sale: TicketData
  businessName: string
  businessPhone?: string
  cashier?: string
}) {
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      @media print {
        body * { visibility: hidden; }
        #pos-ticket, #pos-ticket * { visibility: visible; }
        #pos-ticket { position: absolute; top: 0; left: 0; }
        @page { size: 80mm auto; margin: 3mm; }
      }
    `
    document.head.appendChild(style)
    return () => style.remove()
  }, [])

  const payment = sale.payments[0]
  const change =
    payment?.method === 'cash' && payment.received !== undefined
      ? payment.received - payment.amount
      : null
  const walkIn = !sale.customer || sale.customer.phone === 'mostrador'

  return (
    <div
      id="pos-ticket"
      aria-hidden
      className="hidden w-[72mm] bg-white font-mono text-[11px] leading-snug text-black print:block"
    >
      <div className="text-center">
        <p className="text-[14px] font-bold">{businessName}</p>
        {businessPhone && <p>Tel. {businessPhone}</p>}
        <p className="mt-1">Ticket de venta · {saleCode(sale.trackingToken)}</p>
        <p>
          {new Date(sale.createdAt).toLocaleString('es-PE', {
            dateStyle: 'short',
            timeStyle: 'short',
          })}
        </p>
        {(sale.cashier ?? cashier) && <p>Atendió: {sale.cashier ?? cashier}</p>}
      </div>

      <Rule />

      {sale.items.map((item, i) => (
        <div key={i} className="mb-1">
          <div className="flex justify-between gap-2">
            <span className="min-w-0 flex-1 break-words">
              {item.quantity} × {item.name}
              {item.variant ? ` (${item.variant})` : ''}
            </span>
            <span className="shrink-0">{formatCurrency(item.unitPrice * item.quantity)}</span>
          </div>
          {item.quantity > 1 && <p className="pl-3">c/u {formatCurrency(item.unitPrice)}</p>}
        </div>
      ))}

      <Rule />

      <div className="flex justify-between text-[13px] font-bold">
        <span>TOTAL</span>
        <span>{formatCurrency(sale.totalAmount)}</span>
      </div>

      {payment && (
        <div className="mt-1">
          <Line label={payment.method ? PAYMENT_METHOD_LABELS[payment.method] : 'Pago'} value={payment.amount} />
          {change !== null && (
            <>
              <Line label="Recibido" value={payment.received!} />
              <Line label="Vuelto" value={change} />
            </>
          )}
        </div>
      )}

      {!walkIn && (
        <>
          <Rule />
          <p>Cliente: {sale.customer!.name}</p>
        </>
      )}

      <Rule />
      <p className="text-center">¡Gracias por tu compra!</p>
      <p className="mt-1 text-center text-[9px]">
        Constancia interna. No es un comprobante de pago electrónico.
      </p>
    </div>
  )
}

function Rule() {
  return <div className="my-1.5 border-t border-dashed border-black" />
}

function Line({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span>{formatCurrency(value)}</span>
    </div>
  )
}
