import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowDownLeft, ArrowUpRight, LockKeyhole } from 'lucide-react'
import { addMovement, closeSession, openSession } from '@/api/pos'
import { Alert, Button, Field, Input, Modal, Textarea } from '@/components/ui'
import { cn, formatCurrency } from '@/lib/cn'
import { PAYMENT_METHODS, round2 } from '@/lib/pos'
import type { CashSummary } from '@/types'

/** Pantalla de la caja cerrada: lo único que se puede hacer es abrirla. */
export function OpenCashCard() {
  const qc = useQueryClient()
  const [amount, setAmount] = useState('')

  const mutation = useMutation({
    mutationFn: () => openSession(Number(amount || 0)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pos-session'] }),
  })

  return (
    <div className="mx-auto max-w-sm rounded-xl bg-white p-6 text-center border border-slate-200 sm:p-8">
      <span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
        <LockKeyhole size={22} />
      </span>
      <h2 className="mt-4 text-lg font-semibold text-slate-900">La caja está cerrada</h2>
      <p className="mt-1 text-sm text-slate-500">
        Ábrela con el sencillo que hay en el cajón. Al cerrar, el sistema te dice cuánto debería
        haber.
      </p>

      <form
        className="mt-6 space-y-4 text-left"
        onSubmit={(e) => {
          e.preventDefault()
          mutation.mutate()
        }}
      >
        {mutation.isError && <Alert error={mutation.error} />}
        <Field label="Monto inicial en efectivo" htmlFor="cash-opening">
          <Input
            id="cash-opening"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            placeholder="0.00"
            autoFocus
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>
        <Button type="submit" className="w-full" disabled={mutation.isPending}>
          {mutation.isPending ? 'Abriendo…' : 'Abrir caja'}
        </Button>
      </form>
    </div>
  )
}

/** Plata que entra o sale del cajón sin ser una venta: sencillo, un pago a un proveedor. */
export function MovementModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [type, setType] = useState<'in' | 'out'>('out')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')

  const mutation = useMutation({
    mutationFn: () => addMovement({ type, amount: Number(amount), note: note.trim() || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pos-session'] })
      onClose()
    },
  })

  const valid = Number(amount) > 0 && (type === 'in' || note.trim())

  return (
    <Modal
      title="Movimiento de caja"
      description="Dinero que entra o sale del cajón sin ser una venta."
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={!valid || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? 'Guardando…' : 'Registrar'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {mutation.isError && <Alert error={mutation.error} />}
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ['out', 'Retiro', ArrowUpRight],
              ['in', 'Ingreso', ArrowDownLeft],
            ] as const
          ).map(([key, label, Icon]) => (
            <button
              key={key}
              type="button"
              aria-pressed={type === key}
              onClick={() => setType(key)}
              className={cn(
                'focus-ring flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                type === key
                  ? 'bg-brand-50 text-brand-700 ring-2 ring-brand-500'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50',
              )}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
        <Field label="Monto" htmlFor="mov-amount">
          <Input
            id="mov-amount"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            autoFocus
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>
        <Field
          label={type === 'out' ? 'Motivo' : 'Motivo (opcional)'}
          htmlFor="mov-note"
          hint={type === 'out' ? 'Ej.: pago al proveedor de harina, devolución a un cliente.' : undefined}
        >
          <Input id="mov-note" value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </div>
    </Modal>
  )
}

/** El cuadre: lo que debería haber, lo que hay, y la diferencia. */
export function CloseCashModal({
  openingAmount,
  summary,
  onClose,
}: {
  openingAmount: number
  summary: CashSummary
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [counted, setCounted] = useState('')
  const [note, setNote] = useState('')

  const mutation = useMutation({
    mutationFn: () => closeSession({ countedCash: Number(counted), note: note.trim() || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pos-session'] })
      qc.invalidateQueries({ queryKey: ['pos-sessions'] })
      onClose()
    },
  })

  const difference = counted === '' ? null : round2(Number(counted) - summary.expectedCash)

  return (
    <Modal
      title="Cerrar caja"
      description="Cuenta el efectivo del cajón y anótalo."
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={counted === '' || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? 'Cerrando…' : 'Cerrar caja'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {mutation.isError && <Alert error={mutation.error} />}

        <SummaryTable openingAmount={openingAmount} summary={summary} />

        <Field label="Efectivo contado" htmlFor="cash-counted">
          <Input
            id="cash-counted"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            autoFocus
            value={counted}
            onChange={(e) => setCounted(e.target.value)}
            className="text-lg tabular-nums sm:text-lg"
          />
        </Field>

        {difference !== null && <DifferenceBadge difference={difference} large />}

        <Field label="Nota (opcional)" htmlFor="cash-note">
          <Textarea
            id="cash-note"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Si no cuadra, anota por qué."
          />
        </Field>
      </div>
    </Modal>
  )
}

/** El resumen de una caja: por medio de pago y el efectivo que debería haber. */
export function SummaryTable({
  openingAmount,
  summary,
}: {
  openingAmount: number
  summary: CashSummary
}) {
  const methods = PAYMENT_METHODS.filter((m) => summary.byMethod[m.key])

  return (
    <dl className="divide-y divide-slate-100 rounded-xl text-sm border border-slate-200">
      <Row label={`Ventas (${summary.salesCount})`} value={summary.salesTotal} strong />
      {methods.map((m) => (
        <Row key={m.key} label={`Cobrado en ${m.label.toLowerCase()}`} value={summary.byMethod[m.key]!} muted />
      ))}
      {(summary.refunds ?? 0) > 0 && (
        <Row label="Devuelto a clientes" value={-(summary.refunds ?? 0)} muted />
      )}
      <Row label="Monto inicial" value={openingAmount} />
      {summary.cashIn > 0 && <Row label="Ingresos" value={summary.cashIn} />}
      {summary.cashOut > 0 && <Row label="Retiros" value={-summary.cashOut} />}
      <Row label="Efectivo esperado" value={summary.expectedCash} strong />
    </dl>
  )
}

function Row({
  label,
  value,
  strong,
  muted,
}: {
  label: string
  value: number
  strong?: boolean
  muted?: boolean
}) {
  return (
    <div className={cn('flex items-center justify-between gap-3 px-3.5 py-2.5', strong && 'bg-slate-50')}>
      <dt className={cn(muted ? 'pl-3 text-slate-500' : 'text-slate-700', strong && 'font-semibold text-slate-900')}>
        {label}
      </dt>
      <dd className={cn('tabular-nums', strong ? 'font-semibold text-slate-900' : 'text-slate-700')}>
        {formatCurrency(value)}
      </dd>
    </div>
  )
}

/** Cuadra, faltante o sobrante, con el color que corresponde. */
export function DifferenceBadge({ difference, large }: { difference: number; large?: boolean }) {
  const tone =
    difference === 0
      ? 'bg-success-50 text-success-700 ring-success-200'
      : difference < 0
        ? 'bg-danger-50 text-danger-700 ring-danger-200'
        : 'bg-warning-50 text-warning-800 ring-warning-200'
  const label =
    difference === 0 ? 'Cuadra' : difference < 0 ? 'Faltante' : 'Sobrante'

  if (!large) {
    return (
      <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1', tone)}>
        {label}
        {difference !== 0 && <span className="tabular-nums">{formatCurrency(Math.abs(difference))}</span>}
      </span>
    )
  }

  return (
    <div className={cn('flex items-center justify-between rounded-xl px-4 py-3 ring-1', tone)} aria-live="polite">
      <span className="text-sm font-semibold">{label}</span>
      {difference !== 0 && (
        <span className="text-2xl font-semibold tabular-nums">{formatCurrency(Math.abs(difference))}</span>
      )}
    </div>
  )
}
