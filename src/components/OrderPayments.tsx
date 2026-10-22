import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, CheckCircle2, Plus, Undo2, ZoomIn } from 'lucide-react'
import { deletePayment, refundOrder, registerPayment, validatePayment } from '@/api/orders'
import { useRole } from '@/hooks/useRole'
import { Alert, Button, Card, Field, Input, Lightbox, StateBadge } from '@/components/ui'
import { ImageUploader } from '@/components/ImageUploader'
import { cn, formatCurrency, formatDateTime } from '@/lib/cn'
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS, round2 } from '@/lib/pos'
import type { Order, PaymentEntry, PaymentMethodKind } from '@/types'

/**
 * Los pagos de un pedido, pensados para responder tres preguntas en orden:
 *
 *   1. ¿Cuánto falta cobrar?             — el número grande, arriba.
 *   2. ¿Hay algo que tenga que revisar?  — los comprobantes del cliente.
 *   3. ¿Qué se cobró y cómo?             — la lista, y el botón para sumar uno.
 *
 * Ya no se pregunta si un pago es «adelanto» o «saldo»: un pedido tiene los
 * pagos que haga falta, y lo único que importa es cuánto entró y cuánto falta.
 */
export function OrderPayments({ order }: { order: Order }) {
  const qc = useQueryClient()
  const { isTeam, isManager } = useRole()
  const [mode, setMode] = useState<'idle' | 'pay' | 'refund'>('idle')
  const [lightbox, setLightbox] = useState<string | null>(null)

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['orders', order._id] })
    // El estado de pago se ve en la lista de pedidos.
    qc.invalidateQueries({ queryKey: ['orders'] })
  }

  const paid = round2(
    order.payments.filter((p) => p.validated !== false).reduce((s, p) => s + p.amount, 0),
  )
  const inReview = round2(
    order.payments.filter((p) => p.validated === false).reduce((s, p) => s + p.amount, 0),
  )
  const refunds = order.refunds ?? []
  const refunded = round2(refunds.reduce((s, r) => s + r.amount, 0))
  // Lo que de verdad quedó en manos del negocio.
  const kept = round2(paid - refunded)
  const remaining = Math.max(0, round2(order.totalAmount - kept))
  // Lo que se puede registrar sin pasarse: lo que está en revisión ya está comprometido.
  const room = Math.max(0, round2(remaining - inReview))
  const isPos = order.createdVia === 'pos'
  const isCancelled = Boolean(order.fulfillmentState?.isCancellation)

  const pending = order.payments.filter((p) => p.validated === false)
  const confirmed = order.payments.filter((p) => p.validated !== false)

  const pct = (n: number) => (order.totalAmount > 0 ? Math.min(100, (n / order.totalAmount) * 100) : 0)

  return (
    <Card
      title="Pagos"
      actions={
        order.paymentState && (
          <StateBadge
            name={order.paymentState.name}
            color={order.paymentState.color}
            icon={order.paymentState.icon}
          />
        )
      }
    >
      {/* ── 1. Cuánto falta (o, cancelado, cuánto hay que devolver) ── */}
      <div className="rounded-xl bg-slate-50 p-4">
        {isCancelled ? (
          kept > 0 ? (
            <>
              <p className="text-xs font-medium text-slate-500">Pedido cancelado · por devolver</p>
              <p className="text-3xl font-semibold tracking-tight text-warning-700 tabular-nums">
                {formatCurrency(kept)}
              </p>
            </>
          ) : (
            <p className="text-lg font-semibold text-slate-700">
              {refunded > 0 ? 'Pedido cancelado · dinero devuelto' : 'Pedido cancelado · sin cobros'}
            </p>
          )
        ) : remaining > 0 ? (
          <>
            <p className="text-xs font-medium text-slate-500">Falta cobrar</p>
            <p className="text-3xl font-semibold tracking-tight text-warning-700 tabular-nums">
              {formatCurrency(remaining)}
            </p>
          </>
        ) : (
          <p className="flex items-center gap-2 text-lg font-semibold text-success-700">
            <CheckCircle2 size={20} />
            Pagado completo
          </p>
        )}

        {/* Cobrado en verde, en revisión en ámbar: se ve qué parte ya es segura. */}
        {!isCancelled && (
          <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full bg-success-500 transition-[width] duration-500" style={{ width: `${pct(kept)}%` }} />
            <div className="h-full bg-warning-400 transition-[width] duration-500" style={{ width: `${pct(inReview)}%` }} />
          </div>
        )}

        <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs">
          <Figure label="Total" value={order.totalAmount} />
          <Figure label="Cobrado" value={paid} tone="text-success-700" />
          {refunded > 0 && <Figure label="Devuelto" value={refunded} tone="text-slate-700" />}
          {inReview > 0 && <Figure label="En revisión" value={inReview} tone="text-warning-700" />}
        </dl>
      </div>

      {/* ── 2. Lo que hay que revisar ── */}
      {pending.map((p) => (
        <PendingProof key={p._id ?? p.registeredAt} order={order} payment={p} onDone={refresh} onZoom={setLightbox} />
      ))}

      {/* ── 3. Lo cobrado y lo devuelto ── */}
      {(confirmed.length > 0 || refunds.length > 0) && (
        <ul className="mt-4 divide-y divide-slate-100">
          {confirmed.map((p) => (
            <PaymentRow
              key={p._id ?? p.registeredAt}
              order={order}
              payment={p}
              // Quitar un cobro cambia lo que entró a caja: dueño o administrador.
              canRemove={!isPos && isManager}
              onDone={refresh}
              onZoom={setLightbox}
            />
          ))}
          {refunds.map((r, i) => (
            <li key={r._id ?? i} className="flex items-start gap-3 py-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                <Undo2 size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900">
                  Devuelto <span className="tabular-nums">{formatCurrency(r.amount)}</span>
                  <span className="font-normal text-slate-500">
                    {r.method ? ` · ${PAYMENT_METHOD_LABELS[r.method]}` : ''}
                  </span>
                </p>
                <p className="text-xs text-slate-400">{formatDateTime(r.at)}</p>
                {r.note && <p className="mt-0.5 text-xs text-slate-500">{r.note}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}

      {isPos ? (
        <p className="mt-4 text-xs text-slate-500">
          Venta de mostrador: se cobró en el momento. Si hay que devolverla, anúlala desde la caja.
        </p>
      ) : mode === 'pay' ? (
        <PaymentForm
          order={order}
          room={room}
          onCancel={() => setMode('idle')}
          onSaved={() => {
            setMode('idle')
            refresh()
          }}
        />
      ) : mode === 'refund' ? (
        <RefundForm
          order={order}
          available={kept}
          onCancel={() => setMode('idle')}
          onSaved={() => {
            setMode('idle')
            refresh()
          }}
        />
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          {!isCancelled && room > 0 && (
            <Button variant="secondary" className="flex-1" onClick={() => setMode('pay')}>
              <Plus size={15} />
              Registrar pago
            </Button>
          )}
          {isTeam && kept > 0 && (
            <Button
              variant={isCancelled ? 'primary' : 'ghost'}
              className={isCancelled ? 'flex-1' : undefined}
              onClick={() => setMode('refund')}
            >
              <Undo2 size={15} />
              {isCancelled ? 'Registrar devolución' : 'Devolver dinero'}
            </Button>
          )}
        </div>
      )}

      <Lightbox url={lightbox} onClose={() => setLightbox(null)} />
    </Card>
  )
}

/**
 * Registrar dinero devuelto: cuánto y cómo salió. Arranca en todo lo cobrado,
 * que es el caso de un pedido cancelado.
 */
function RefundForm({
  order,
  available,
  onCancel,
  onSaved,
}: {
  order: Order
  available: number
  onCancel: () => void
  onSaved: () => void
}) {
  const [amount, setAmount] = useState(String(available))
  const [method, setMethod] = useState<PaymentMethodKind | ''>('')
  const [note, setNote] = useState('')

  const value = Number(amount)
  const tooMuch = value > available + 0.001
  const valid = value > 0 && !tooMuch

  const save = useMutation({
    mutationFn: () =>
      refundOrder(order._id, {
        amount: round2(value),
        method: method || undefined,
        note: note.trim() || undefined,
      }),
    onSuccess: onSaved,
  })

  return (
    <form
      className="mt-4 space-y-4 border-t border-slate-100 pt-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (valid) save.mutate()
      }}
    >
      {save.isError && <Alert error={save.error} />}
      <p className="text-sm text-slate-600">
        Registra lo que le devolviste al cliente. Si sale en efectivo con la caja abierta, se resta
        de su cuadre.
      </p>

      <Field label="Monto devuelto" htmlFor="refund-amount" hint={`Cobrado en este pedido: ${formatCurrency(available)}.`}>
        <Input
          id="refund-amount"
          type="number"
          inputMode="decimal"
          min={0}
          step="0.01"
          autoFocus
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className={cn('tabular-nums', tooMuch && 'ring-danger-400')}
        />
        {tooMuch && <p className="text-xs text-danger-600">Es más de lo cobrado.</p>}
      </Field>

      <div>
        <p className="mb-1.5 text-sm font-medium text-slate-700">¿Cómo lo devolviste? (opcional)</p>
        <MethodChips value={method} onChange={setMethod} />
      </div>

      <Field label="Nota (opcional)" htmlFor="refund-note">
        <Input id="refund-note" placeholder="Ej. devuelto por Yape al mismo número" value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>

      <div className="flex gap-2">
        <Button type="submit" className="flex-1 sm:flex-none" disabled={!valid || save.isPending}>
          {save.isPending ? 'Guardando…' : 'Registrar devolución'}
        </Button>
        <Button type="button" variant="secondary" className="flex-1 sm:flex-none" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}

function Figure({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt className="text-slate-500">{label}</dt>
      <dd className={cn('font-semibold tabular-nums', tone ?? 'text-slate-900')}>{formatCurrency(value)}</dd>
    </div>
  )
}

function ProofThumb({ url, onZoom }: { url: string; onZoom: (url: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onZoom(url)}
      className="group relative shrink-0"
      aria-label="Ver comprobante"
    >
      <img src={url} alt="" className="size-14 rounded-lg object-cover border border-slate-200" />
      <span className="absolute inset-0 flex items-center justify-center rounded-lg transition-colors group-hover:bg-black/30">
        <ZoomIn size={16} className="text-white opacity-0 transition-opacity group-hover:opacity-100" />
      </span>
    </button>
  )
}

/**
 * Un comprobante que mandó el cliente. Es lo único de la tarjeta que pide una
 * decisión, así que va destacado y con las dos respuestas posibles en palabras
 * simples: llegó o no llegó.
 */
function PendingProof({
  order,
  payment,
  onDone,
  onZoom,
}: {
  order: Order
  payment: PaymentEntry
  onDone: () => void
  onZoom: (url: string) => void
}) {
  const [method, setMethod] = useState<PaymentMethodKind | ''>('')
  const [rejecting, setRejecting] = useState(false)
  const ref = payment._id ?? payment.kind

  const validate = useMutation({
    mutationFn: () => validatePayment(order._id, ref, method || undefined),
    onSuccess: onDone,
  })
  const reject = useMutation({
    mutationFn: () => deletePayment(order._id, ref),
    onSuccess: onDone,
  })

  return (
    <div className="mt-4 rounded-xl bg-warning-50 p-4 ring-1 ring-warning-200">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-warning-900">
            <AlertCircle size={15} />
            Tu cliente envió un comprobante
          </p>
          <p className="mt-1 text-2xl font-semibold text-warning-900 tabular-nums">
            {formatCurrency(payment.amount)}
          </p>
          <p className="text-xs text-warning-800">
            {formatDateTime(payment.registeredAt)} · Revisa que el dinero te haya llegado. Hasta
            entonces no cuenta como cobrado.
          </p>
        </div>
        {payment.proofImageUrl && <ProofThumb url={payment.proofImageUrl} onZoom={onZoom} />}
      </div>

      {(validate.isError || reject.isError) && (
        <div className="mt-3">
          <Alert error={validate.error ?? reject.error} />
        </div>
      )}

      {rejecting ? (
        <div className="mt-3 rounded-lg bg-white p-3 ring-1 ring-warning-200">
          <p className="text-sm text-slate-700">
            Se quita el comprobante y le avisamos al cliente por WhatsApp para que te lo vuelva a
            mandar.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="danger" disabled={reject.isPending} onClick={() => reject.mutate()}>
              {reject.isPending ? 'Rechazando…' : 'Sí, no llegó'}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setRejecting(false)}>
              Volver
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p className="mt-3 mb-1.5 text-xs font-medium text-warning-900">¿Por dónde llegó? (opcional)</p>
          <MethodChips value={method} onChange={setMethod} small />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" disabled={validate.isPending} onClick={() => validate.mutate()}>
              <CheckCircle2 size={14} />
              {validate.isPending ? 'Confirmando…' : 'Sí, llegó'}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setRejecting(true)}>
              No llegó
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

/** Un pago ya cobrado: cuánto, cómo y cuándo. Quitarlo pide confirmación. */
function PaymentRow({
  order,
  payment,
  canRemove,
  onDone,
  onZoom,
}: {
  order: Order
  payment: PaymentEntry
  canRemove: boolean
  onDone: () => void
  onZoom: (url: string) => void
}) {
  const [confirming, setConfirming] = useState(false)
  const remove = useMutation({
    mutationFn: () => deletePayment(order._id, payment._id ?? payment.kind),
    onSuccess: onDone,
  })
  const method = payment.method ? PAYMENT_METHODS.find((m) => m.key === payment.method) : null
  const Icon = method?.icon

  return (
    <li className="py-3">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-success-50 text-success-600">
          {Icon ? <Icon size={16} /> : <CheckCircle2 size={16} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-900">
            <span className="tabular-nums">{formatCurrency(payment.amount)}</span>
            <span className="font-normal text-slate-500">
              {' '}
              · {payment.method ? PAYMENT_METHOD_LABELS[payment.method] : 'Medio no indicado'}
            </span>
          </p>
          <p className="text-xs text-slate-400">
            {formatDateTime(payment.registeredAt)}
            {payment.method === 'cash' &&
              payment.received !== undefined &&
              payment.received > payment.amount &&
              ` · recibió ${formatCurrency(payment.received)}, vuelto ${formatCurrency(payment.received - payment.amount)}`}
          </p>
          {payment.note && <p className="mt-0.5 text-xs text-slate-500">{payment.note}</p>}

          {canRemove &&
            (confirming ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-600">¿Quitar este pago?</span>
                <Button size="sm" variant="danger" disabled={remove.isPending} onClick={() => remove.mutate()}>
                  {remove.isPending ? 'Quitando…' : 'Quitar'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
                  No
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="mt-1 text-xs text-slate-400 transition-colors hover:text-danger-600"
              >
                Quitar
              </button>
            ))}
          {remove.isError && (
            <div className="mt-2">
              <Alert error={remove.error} />
            </div>
          )}
        </div>
        {payment.proofImageUrl && <ProofThumb url={payment.proofImageUrl} onZoom={onZoom} />}
      </div>
    </li>
  )
}

/** Los medios de pago como botones: un toque, sin abrir un desplegable. */
export function MethodChips({
  value,
  onChange,
  small,
}: {
  value: PaymentMethodKind | ''
  onChange: (m: PaymentMethodKind) => void
  small?: boolean
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {PAYMENT_METHODS.map((m) => (
        <button
          key={m.key}
          type="button"
          aria-pressed={value === m.key}
          onClick={() => onChange(m.key)}
          className={cn(
            'focus-ring inline-flex items-center gap-1.5 rounded-full font-medium transition-[background-color,box-shadow] duration-150',
            small ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm',
            value === m.key
              ? 'bg-brand-600 text-white'
              : 'bg-white text-slate-600 ring-1 ring-slate-300 hover:bg-slate-50',
          )}
        >
          <m.icon size={small ? 12 : 14} />
          {m.label}
        </button>
      ))}
    </div>
  )
}

/**
 * Sumar un pago: cuánto y cómo. El monto arranca en lo que falta, que es el
 * caso más común, y no deja pasarse.
 */
function PaymentForm({
  order,
  room,
  onCancel,
  onSaved,
}: {
  order: Order
  room: number
  onCancel: () => void
  onSaved: () => void
}) {
  const [amount, setAmount] = useState(room ? String(room) : '')
  const [method, setMethod] = useState<PaymentMethodKind | ''>('')
  const [proof, setProof] = useState('')
  const [note, setNote] = useState('')

  const value = Number(amount)
  const tooMuch = value > room + 0.001
  const valid = value > 0 && !tooMuch && method !== ''

  const save = useMutation({
    mutationFn: () =>
      registerPayment(order._id, {
        amount: round2(value),
        method: method || undefined,
        proofImageUrl: proof || undefined,
        note: note.trim() || undefined,
      }),
    onSuccess: onSaved,
  })

  return (
    <form
      className="mt-4 space-y-4 border-t border-slate-100 pt-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (valid) save.mutate()
      }}
    >
      {save.isError && <Alert error={save.error} />}

      <Field
        label="Monto"
        htmlFor="pay-amount"
        hint={tooMuch ? undefined : `Falta cobrar ${formatCurrency(room)}.`}
      >
        <Input
          id="pay-amount"
          type="number"
          inputMode="decimal"
          min={0}
          step="0.01"
          autoFocus
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className={cn('tabular-nums', tooMuch && 'ring-danger-400')}
        />
        {tooMuch && (
          <p className="text-xs text-danger-600">Es más de lo que falta cobrar ({formatCurrency(room)}).</p>
        )}
      </Field>

      <div>
        <p className="mb-1.5 text-sm font-medium text-slate-700">¿Cómo pagó?</p>
        <MethodChips value={method} onChange={setMethod} />
      </div>

      <div>
        <p className="mb-1.5 text-sm font-medium text-slate-700">Foto del comprobante (opcional)</p>
        <ImageUploader max={1} folder="payments" value={proof ? [proof] : []} onChange={(urls) => setProof(urls[0] ?? '')} />
      </div>

      <Field label="Nota (opcional)" htmlFor="pay-note">
        <Input id="pay-note" value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>

      <div className="flex gap-2">
        <Button type="submit" className="flex-1 sm:flex-none" disabled={!valid || save.isPending}>
          {save.isPending ? 'Guardando…' : 'Guardar pago'}
        </Button>
        <Button type="button" variant="secondary" className="flex-1 sm:flex-none" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}

