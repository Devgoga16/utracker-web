import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Alert, Button, Field, Input, Modal } from '@/components/ui'
import { cn, formatCurrency } from '@/lib/cn'
import { PAYMENT_METHODS, round2 } from '@/lib/pos'
import type { PaymentMethodKind } from '@/types'

export interface CheckoutResult {
  method: PaymentMethodKind
  received?: number
  customer?: { name?: string; phone?: string }
  note?: string
}

/** Billetes con los que alguien suele pagar, para tocar en vez de escribir. */
const BILLS = [10, 20, 50, 100, 200]

/**
 * Cobrar: cómo pagó y, en efectivo, con cuánto, para calcular el vuelto.
 *
 * El cliente es opcional y va plegado: en un mostrador casi nadie da su
 * nombre, y pedirlo siempre haría la cola más lenta.
 */
export function CheckoutModal({
  total,
  pending,
  error,
  onConfirm,
  onClose,
}: {
  total: number
  pending: boolean
  error: unknown
  onConfirm: (result: CheckoutResult) => void
  onClose: () => void
}) {
  const [method, setMethod] = useState<PaymentMethodKind>('cash')
  const [received, setReceived] = useState('')
  const [withCustomer, setWithCustomer] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')

  const receivedValue = received === '' ? null : Number(received)
  const change = receivedValue !== null ? round2(receivedValue - total) : null
  const short = method === 'cash' && change !== null && change < 0

  // Los billetes que alcanzan, más «exacto». Nada que haga vuelto absurdo.
  const quick = BILLS.filter((b) => b > total).slice(0, 3)

  const submit = () => {
    if (pending || short) return
    onConfirm({
      method,
      received: method === 'cash' && receivedValue !== null ? receivedValue : undefined,
      customer: withCustomer && phone.trim() ? { name: name.trim(), phone: phone.trim() } : undefined,
    })
  }

  return (
    <Modal
      title="Cobrar"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Volver
          </Button>
          <Button onClick={submit} disabled={pending || short} className="min-w-40">
            {pending ? 'Registrando…' : `Cobrar ${formatCurrency(total)}`}
          </Button>
        </>
      }
    >
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        {error != null && <Alert error={error} />}

        <div className="rounded-xl bg-slate-50 py-4 text-center">
          <p className="text-xs font-medium text-slate-500">Total a cobrar</p>
          <p className="mt-0.5 text-4xl font-semibold tracking-tight text-slate-900 tabular-nums">
            {formatCurrency(total)}
          </p>
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-slate-700">¿Cómo pagó?</legend>
          <div className="grid grid-cols-3 gap-2">
            {PAYMENT_METHODS.map((m) => (
              <button
                key={m.key}
                type="button"
                aria-pressed={method === m.key}
                onClick={() => setMethod(m.key)}
                className={cn(
                  'focus-ring flex flex-col items-center gap-1 rounded-xl px-2 py-3 text-xs font-medium transition-[background-color,box-shadow,transform] duration-150 active:scale-[.97]',
                  method === m.key
                    ? 'bg-brand-50 text-brand-700 ring-2 ring-brand-500'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50',
                )}
              >
                <m.icon size={18} />
                {m.label}
              </button>
            ))}
          </div>
        </fieldset>

        {method === 'cash' && (
          <div className="space-y-2.5">
            <Field label="Recibido" htmlFor="pos-received" hint="Déjalo vacío si te pagó exacto.">
              <Input
                id="pos-received"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                autoFocus
                placeholder={total.toFixed(2)}
                value={received}
                onChange={(e) => setReceived(e.target.value)}
                className="text-lg tabular-nums sm:text-lg"
              />
            </Field>
            <div className="flex flex-wrap gap-2">
              <QuickButton onClick={() => setReceived(total.toFixed(2))}>Exacto</QuickButton>
              {quick.map((bill) => (
                <QuickButton key={bill} onClick={() => setReceived(String(bill))}>
                  S/ {bill}
                </QuickButton>
              ))}
            </div>

            {change !== null && (
              <div
                className={cn(
                  'flex items-center justify-between rounded-xl px-4 py-3',
                  short ? 'bg-danger-50 text-danger-700' : 'bg-success-50 text-success-800',
                )}
                aria-live="polite"
              >
                <span className="text-sm font-medium">{short ? 'Falta' : 'Vuelto'}</span>
                <span className="text-2xl font-semibold tabular-nums">
                  {formatCurrency(Math.abs(change))}
                </span>
              </div>
            )}
          </div>
        )}

        <div>
          <button
            type="button"
            onClick={() => setWithCustomer((v) => !v)}
            aria-expanded={withCustomer}
            className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <ChevronDown
              size={15}
              className={cn('transition-transform duration-200', withCustomer && 'rotate-180')}
            />
            Datos del cliente (opcional)
          </button>
          {withCustomer && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Nombre" htmlFor="pos-c-name">
                <Input id="pos-c-name" value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
              <Field label="Celular" htmlFor="pos-c-phone" hint="Sin celular no se guarda el cliente.">
                <Input
                  id="pos-c-phone"
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </Field>
            </div>
          )}
        </div>

        {/* Enter cobra desde cualquier campo. */}
        <button type="submit" hidden />
      </form>
    </Modal>
  )
}

function QuickButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="focus-ring rounded-full bg-white px-3.5 py-1.5 text-sm font-medium text-slate-700 ring-1 ring-slate-300 transition-[background-color,transform] duration-150 hover:bg-slate-50 active:scale-95"
    >
      {children}
    </button>
  )
}
