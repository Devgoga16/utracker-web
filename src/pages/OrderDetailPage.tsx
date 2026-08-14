import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { deleteOrder, deletePayment, getOrder, registerPayment, updateOrderState } from '@/api/orders'
import { getWorkflow } from '@/api/tenants'
import { apiErrorMessage } from '@/api/client'
import { useState } from 'react'
import { CircleCheck, CircleX, ZoomIn } from 'lucide-react'
import { Alert, Button, Card, Field, Input, Spinner, StateBadge } from '@/components/ui'
import { ImageUploader } from '@/components/ImageUploader'
import { StateIcon } from '@/lib/icons'
import { formatCurrency, formatDateTime } from '@/lib/cn'
import type { PaymentKind, WorkflowKind, WorkflowState } from '@/types'

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: order, isLoading } = useQuery({
    queryKey: ['orders', id],
    queryFn: () => getOrder(id!),
    enabled: Boolean(id),
  })
  const { data: workflow } = useQuery({ queryKey: ['workflow'], queryFn: getWorkflow })

  const stateMutation = useMutation({
    mutationFn: (payload: { kind: WorkflowKind; stateId: string }) => updateOrderState(id!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteOrder(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      navigate('/orders')
    },
  })

  const [paymentForm, setPaymentForm] = useState<{ kind: PaymentKind; amount: number; proofImageUrl: string; note: string } | null>(null)
  const [proofLightbox, setProofLightbox] = useState<string | null>(null)

  const deletePaymentMutation = useMutation({
    mutationFn: (kind: PaymentKind) => deletePayment(id!, kind),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders', id] }),
  })

  const paymentMutation = useMutation({
    mutationFn: () => registerPayment(id!, {
      kind: paymentForm!.kind,
      amount: paymentForm!.amount,
      proofImageUrl: paymentForm!.proofImageUrl || undefined,
      note: paymentForm!.note || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', id] })
      setPaymentForm(null)
    },
  })

  if (isLoading) return <Spinner />
  if (!order) return <Alert>Pedido no encontrado</Alert>

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link to="/orders" className="text-sm text-slate-500 hover:text-brand-600">
            ← Volver a pedidos
          </Link>
          <h1 className="mt-2 text-xl font-bold text-slate-900">{order.customer?.name}</h1>
          <p className="text-sm text-slate-500">
            {order.customer?.phone} · Creado {formatDateTime(order.createdAt)} ·{' '}
            {order.createdVia === 'order_link' ? 'vía link' : 'carga manual'}
          </p>
        </div>
        <button
          type="button"
          disabled={deleteMutation.isPending}
          onClick={() => {
            if (confirm('¿Eliminar este pedido? Esta acción no se puede deshacer.')) {
              deleteMutation.mutate()
            }
          }}
          className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 ring-1 ring-red-200 hover:bg-red-50 disabled:opacity-50"
        >
          {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar pedido'}
        </button>
      </div>

      {stateMutation.isError && <Alert>{apiErrorMessage(stateMutation.error)}</Alert>}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <h2 className="mb-4 text-sm font-semibold text-slate-900">Items</h2>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-100">
                {order.items.map((item, i) => (
                  <tr key={i}>
                    <td className="py-2.5">
                      {item.name}
                      {item.variant && <span className="text-slate-500"> · {item.variant}</span>}
                      {item.specs && (
                        <p className="mt-0.5 text-xs whitespace-pre-line text-slate-500">
                          {item.specs}
                        </p>
                      )}
                    </td>
                    <td className="py-2.5 text-center text-slate-500">×{item.quantity}</td>
                    <td className="py-2.5 text-right">{formatCurrency(item.unitPrice * item.quantity)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-slate-200">
                <tr>
                  <td colSpan={2} className="py-3 font-semibold">
                    Total
                  </td>
                  <td className="py-3 text-right text-base font-bold">
                    {formatCurrency(order.totalAmount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </Card>

          {/* ── Pagos ── */}
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">Pagos</h2>
              {(() => {
                const totalPaid = order.payments.reduce((s, p) => s + p.amount, 0)
                const remaining = order.totalAmount - totalPaid
                const hasAdvance = order.payments.some((p) => p.kind === 'advance')
                const hasBalance = order.payments.some((p) => p.kind === 'balance')
                const canAdd = !hasAdvance || !hasBalance
                if (!paymentForm && canAdd) {
                  return (
                    <button
                      type="button"
                      onClick={() => setPaymentForm({ kind: hasAdvance ? 'balance' : 'advance', amount: remaining > 0 ? remaining : 0, proofImageUrl: '', note: '' })}
                      className="text-xs text-brand-600 hover:underline"
                    >
                      + Registrar pago
                    </button>
                  )
                }
                return null
              })()}
            </div>

            {/* resumen */}
            {(() => {
              const totalPaid = order.payments.reduce((s, p) => s + p.amount, 0)
              const remaining = order.totalAmount - totalPaid
              return (
                <div className="mb-4 grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-3 text-center text-xs">
                  <div>
                    <p className="text-slate-500">Total</p>
                    <p className="mt-0.5 font-semibold text-slate-900">{formatCurrency(order.totalAmount)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Pagado</p>
                    <p className="mt-0.5 font-semibold text-emerald-700">{formatCurrency(totalPaid)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Saldo</p>
                    <p className={`mt-0.5 font-semibold ${remaining > 0 ? 'text-amber-700' : 'text-slate-400'}`}>{formatCurrency(remaining)}</p>
                  </div>
                </div>
              )
            })()}

            {/* historial */}
            {order.payments.length > 0 && (
              <ul className="mb-4 space-y-3">
                {order.payments.map((p, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900">
                        {p.kind === 'advance' ? 'Adelanto' : 'Saldo'}
                        {' · '}
                        <span className="text-emerald-700">{formatCurrency(p.amount)}</span>
                      </p>
                      <p className="text-xs text-slate-400">{formatDateTime(p.registeredAt)}</p>
                      {p.note && <p className="mt-0.5 text-xs text-slate-500">{p.note}</p>}
                      <button
                        type="button"
                        disabled={deletePaymentMutation.isPending}
                        onClick={() => deletePaymentMutation.mutate(p.kind)}
                        className="mt-1 text-xs text-slate-400 hover:text-red-600 disabled:opacity-50"
                      >
                        Eliminar
                      </button>
                    </div>
                    {p.proofImageUrl && (
                      <button
                        type="button"
                        onClick={() => setProofLightbox(p.proofImageUrl!)}
                        className="group relative shrink-0"
                        aria-label="Ver comprobante"
                      >
                        <img src={p.proofImageUrl} alt="" className="size-16 rounded-lg object-cover ring-1 ring-slate-200 transition-opacity group-hover:opacity-80" />
                        <span className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 rounded-lg bg-black/0 transition-colors group-hover:bg-black/30">
                          <ZoomIn size={16} className="text-white opacity-0 transition-opacity group-hover:opacity-100" />
                          <span className="text-[9px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">Ver</span>
                        </span>
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {/* form nuevo pago */}
            {paymentForm && (
              <div className="space-y-3 border-t border-slate-100 pt-4">
                {paymentMutation.isError && <Alert>{apiErrorMessage(paymentMutation.error)}</Alert>}
                <div className="flex gap-2">
                  {(['advance', 'balance'] as PaymentKind[]).map((k) => {
                    const taken = order.payments.some((p) => p.kind === k)
                    return (
                      <button
                        key={k}
                        type="button"
                        disabled={taken}
                        onClick={() => setPaymentForm({ ...paymentForm, kind: k })}
                        className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ring-1 transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${paymentForm.kind === k ? 'bg-brand-50 ring-2 ring-brand-500 text-brand-700' : 'bg-white ring-slate-300 text-slate-700 hover:bg-slate-50'}`}
                      >
                        {k === 'advance' ? 'Adelanto' : 'Saldo'}
                        {taken && ' (ya registrado)'}
                      </button>
                    )
                  })}
                </div>
                <Field label="Monto" htmlFor="pay-amount">
                  <Input
                    id="pay-amount"
                    type="number"
                    min={0}
                    step="0.01"
                    value={paymentForm.amount || ''}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
                  />
                </Field>
                <Field label="Nota (opcional)" htmlFor="pay-note">
                  <Input
                    id="pay-note"
                    value={paymentForm.note}
                    onChange={(e) => setPaymentForm({ ...paymentForm, note: e.target.value })}
                  />
                </Field>
                <div>
                  <p className="mb-1.5 text-sm font-medium text-slate-700">Foto del comprobante (opcional)</p>
                  <ImageUploader
                    max={1}
                    folder="payments"
                    value={paymentForm.proofImageUrl ? [paymentForm.proofImageUrl] : []}
                    onChange={(urls) => setPaymentForm({ ...paymentForm, proofImageUrl: urls[0] ?? '' })}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    disabled={!paymentForm.amount || paymentMutation.isPending}
                    onClick={() => paymentMutation.mutate()}
                  >
                    {paymentMutation.isPending ? 'Guardando...' : 'Guardar pago'}
                  </Button>
                  <Button variant="secondary" onClick={() => setPaymentForm(null)}>Cancelar</Button>
                </div>
              </div>
            )}
          </Card>

          {/* ── Lightbox comprobante ── */}
          {proofLightbox && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
              onClick={() => setProofLightbox(null)}
            >
              <img
                src={proofLightbox}
                alt=""
                className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}

          {order.delivery && (
            <Card>
              <h2 className="mb-3 text-sm font-semibold text-slate-900">Entrega</h2>
              <dl className="space-y-1.5 text-sm">
                {order.delivery.address && (
                  <div className="flex gap-2">
                    <dt className="text-slate-500">Dirección:</dt>
                    <dd>{order.delivery.address}</dd>
                  </div>
                )}
                {order.delivery.reference && (
                  <div className="flex gap-2">
                    <dt className="text-slate-500">Referencia:</dt>
                    <dd>{order.delivery.reference}</dd>
                  </div>
                )}
                {order.delivery.courierName && (
                  <div className="flex gap-2">
                    <dt className="text-slate-500">Courier:</dt>
                    <dd>{order.delivery.courierName}</dd>
                  </div>
                )}
                {order.delivery.trackingCode && (
                  <div className="flex gap-2">
                    <dt className="text-slate-500">Guía:</dt>
                    <dd className="font-mono">{order.delivery.trackingCode}</dd>
                  </div>
                )}
              </dl>

              {order.delivery.attempts.length > 0 && (
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <p className="mb-2 text-xs font-medium text-slate-500 uppercase">
                    Intentos de entrega
                  </p>
                  <ul className="space-y-2">
                    {order.delivery.attempts.map((attempt, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        {attempt.succeeded ? (
                          <CircleCheck size={16} className="mt-0.5 shrink-0 text-emerald-600" />
                        ) : (
                          <CircleX size={16} className="mt-0.5 shrink-0 text-red-600" />
                        )}
                        <div>
                          <p className="text-slate-700">{attempt.reason ?? 'Sin motivo'}</p>
                          <p className="text-xs text-slate-500">
                            {formatDateTime(attempt.attemptedAt)}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          )}

          <Card>
            <h2 className="mb-4 text-sm font-semibold text-slate-900">Historial</h2>
            <ol className="space-y-3">
              {order.stateHistory.map((entry, i) => (
                <li key={i} className="flex items-center gap-3 text-sm">
                  <span className="w-16 shrink-0 text-xs text-slate-400 uppercase">
                    {entry.kind === 'payment' ? 'Pago' : 'Pedido'}
                  </span>
                  <StateBadge
                    name={entry.stateName}
                    color={entry.stateColor}
                    icon={entry.stateIcon}
                  />
                  <span className="ml-auto text-xs text-slate-400">
                    {formatDateTime(entry.changedAt)}
                  </span>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="space-y-6">
          <TrackingLinkCard token={order.trackingToken} />

          <StatePicker
            title="Estado del pedido"
            kind="fulfillment"
            states={workflow?.fulfillment ?? []}
            currentId={order.fulfillmentState?._id}
            currentLink={order.fulfillmentLink}
            isPending={stateMutation.isPending}
            onSelect={(stateId, link) => stateMutation.mutate({ kind: 'fulfillment', stateId, link })}
          />
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Estado del pago</h2>
            {order.paymentState && (
              <StateBadge
                name={order.paymentState.name}
                color={order.paymentState.color}
                icon={order.paymentState.icon}
              />
            )}
            <p className="mt-2 text-xs text-slate-400">
              Se actualiza automáticamente al registrar pagos.
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}

function TrackingLinkCard({ token }: { token: string }) {
  const [copied, setCopied] = useState(false)
  const url = `${window.location.origin}/track/${token}`

  async function copy() {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card>
      <h2 className="mb-1 text-sm font-semibold text-slate-900">Link de seguimiento</h2>
      <p className="mb-3 text-xs text-slate-500">
        Mandaselo al cliente para que siga su pedido. No necesita cuenta.
      </p>
      <div className="mb-2 rounded-lg bg-slate-50 p-2.5">
        <p className="font-mono text-xs break-all text-slate-600">{url}</p>
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" className="flex-1" onClick={copy}>
          {copied ? 'Copiado' : 'Copiar link'}
        </Button>
        <a href={url} target="_blank" rel="noreferrer" className="flex-1">
          <Button variant="ghost" className="w-full">
            Ver
          </Button>
        </a>
      </div>
    </Card>
  )
}

interface StatePickerProps {
  title: string
  kind: WorkflowKind
  states: WorkflowState[]
  currentId?: string
  currentLink?: string
  isPending: boolean
  onSelect: (stateId: string, link?: string) => void
}

function StatePicker({ title, states, currentId, currentLink, isPending, onSelect }: StatePickerProps) {
  const [pendingState, setPendingState] = useState<WorkflowState | null>(null)
  const [linkDraft, setLinkDraft] = useState('')

  function handleClick(state: WorkflowState) {
    if (state.requiresLink) {
      setPendingState(state)
      setLinkDraft('')
    } else {
      onSelect(state._id)
    }
  }

  function confirmWithLink() {
    if (!pendingState) return
    onSelect(pendingState._id, linkDraft.trim() || undefined)
    setPendingState(null)
    setLinkDraft('')
  }

  return (
    <Card>
      <h2 className="mb-3 text-sm font-semibold text-slate-900">{title}</h2>

      {currentLink && !pendingState && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs">
          <span className="text-blue-600 font-medium shrink-0">Link activo:</span>
          <a
            href={currentLink}
            target="_blank"
            rel="noreferrer"
            className="truncate text-blue-700 hover:underline"
          >
            {currentLink}
          </a>
        </div>
      )}

      <div className="space-y-2">
        {states.map((state) => {
          const isCurrent = state._id === currentId
          const isPending_ = pendingState?._id === state._id
          return (
            <button
              key={state._id}
              type="button"
              disabled={isCurrent || isPending || Boolean(pendingState && !isPending_)}
              onClick={() => handleClick(state)}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                isCurrent
                  ? 'cursor-default ring-2'
                  : isPending_
                  ? 'ring-2 ring-brand-500 bg-brand-50'
                  : 'text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-50'
              }`}
              style={
                isCurrent
                  ? { backgroundColor: `${state.color}14`, color: state.color, boxShadow: `0 0 0 2px ${state.color}` }
                  : undefined
              }
            >
              <StateIcon name={state.icon} size={16} />
              <span className="font-medium">{state.name}</span>
              {isCurrent && <span className="ml-auto text-xs">actual</span>}
              {state.requiresLink && !isCurrent && (
                <span className="ml-auto text-xs text-slate-400">requiere link</span>
              )}
            </button>
          )
        })}
      </div>

      {pendingState && (
        <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
          <p className="text-xs text-slate-600">
            Pegá el link para el cliente al pasar a <strong>{pendingState.name}</strong>:
          </p>
          <input
            autoFocus
            type="url"
            placeholder="https://..."
            value={linkDraft}
            onChange={(e) => setLinkDraft(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
          <div className="flex gap-2">
            <Button onClick={confirmWithLink} disabled={isPending}>
              {isPending ? 'Guardando...' : 'Confirmar'}
            </Button>
            <Button variant="secondary" onClick={() => setPendingState(null)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}
