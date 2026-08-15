import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Check,
  CircleCheck,
  CircleX,
  Copy,
  ExternalLink,
  Link2,
  Trash2,
  ZoomIn,
} from 'lucide-react'
import {
  deleteOrder,
  deletePayment,
  getOrder,
  registerPayment,
  updateOrderState,
} from '@/api/orders'
import { getWorkflow } from '@/api/tenants'
import { apiErrorMessage } from '@/api/client'
import {
  Alert,
  Badge,
  Button,
  Card,
  Field,
  Input,
  Lightbox,
  PageHeader,
  SectionLabel,
  Spinner,
  StateBadge,
} from '@/components/ui'
import { ImageUploader } from '@/components/ImageUploader'
import { StateIcon } from '@/lib/icons'
import { cn, formatCurrency, formatDateTime } from '@/lib/cn'
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
    mutationFn: (payload: { kind: WorkflowKind; stateId: string; link?: string }) =>
      updateOrderState(id!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      // Un estado puede descontar stock: el inventario ya no es fiable.
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteOrder(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      navigate('/orders')
    },
  })

  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [paymentForm, setPaymentForm] = useState<{
    kind: PaymentKind
    amount: number
    proofImageUrl: string
    note: string
  } | null>(null)
  const [proofLightbox, setProofLightbox] = useState<string | null>(null)

  const deletePaymentMutation = useMutation({
    mutationFn: (kind: PaymentKind) => deletePayment(id!, kind),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders', id] }),
  })

  const paymentMutation = useMutation({
    mutationFn: () =>
      registerPayment(id!, {
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

  const totalPaid = order.payments.reduce((s, p) => s + p.amount, 0)
  const remaining = order.totalAmount - totalPaid
  const paidRatio = order.totalAmount > 0 ? totalPaid / order.totalAmount : 0
  const hasAdvance = order.payments.some((p) => p.kind === 'advance')
  const hasBalance = order.payments.some((p) => p.kind === 'balance')

  return (
    <div className="space-y-6">
      <PageHeader
        backTo="/orders"
        backLabel="Volver a pedidos"
        title={order.customer?.name ?? 'Pedido'}
        description={
          <>
            {order.customer?.phone} · Creado {formatDateTime(order.createdAt)} ·{' '}
            {order.createdVia === 'order_link' ? 'vía link' : 'carga manual'}
          </>
        }
        actions={
          <Button
            variant="secondary"
            onClick={() => setConfirmingDelete(true)}
            className="text-red-600 ring-red-200 hover:bg-red-50"
          >
            <Trash2 size={15} />
            <span className="hidden sm:inline">Eliminar</span>
          </Button>
        }
      />

      {confirmingDelete && (
        <Card className="ring-red-200">
          <div className="flex flex-wrap items-center gap-3">
            <p className="min-w-0 flex-1 text-sm text-slate-700">
              ¿Eliminar este pedido? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-2">
              <Button
                variant="danger"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate()}
              >
                {deleteMutation.isPending ? 'Eliminando...' : 'Sí, eliminar'}
              </Button>
              <Button variant="secondary" onClick={() => setConfirmingDelete(false)}>
                Cancelar
              </Button>
            </div>
          </div>
          {deleteMutation.isError && (
            <div className="mt-3">
              <Alert>{apiErrorMessage(deleteMutation.error)}</Alert>
            </div>
          )}
        </Card>
      )}

      {stateMutation.isError && <Alert>{apiErrorMessage(stateMutation.error)}</Alert>}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* En mobile lo primero tiene que ser cambiar el estado, no leer el
            detalle: la columna lateral sube arriba de todo. */}
        <div className="order-first space-y-6 lg:order-last">
          <StatePicker
            title="Estado del pedido"
            states={workflow?.fulfillment ?? []}
            currentId={order.fulfillmentState?._id}
            currentLink={order.fulfillmentLink}
            isPending={stateMutation.isPending}
            onSelect={(stateId, link) => stateMutation.mutate({ kind: 'fulfillment', stateId, link })}
          />

          <Card title="Estado del pago" description="Se actualiza solo al registrar pagos.">
            {order.paymentState && (
              <StateBadge
                name={order.paymentState.name}
                color={order.paymentState.color}
                icon={order.paymentState.icon}
              />
            )}
          </Card>

          <TrackingLinkCard token={order.trackingToken} />
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Card flush title="Items">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-100">
                {order.items.map((item, i) => (
                  <tr key={i}>
                    <td className="w-full py-2.5 pr-2 pl-4 sm:pl-5">
                      <span className="font-medium break-words text-slate-900">{item.name}</span>
                      {item.variant && <span className="text-slate-500"> · {item.variant}</span>}
                      {item.specs && (
                        <p className="mt-0.5 text-xs whitespace-pre-line text-slate-500">
                          {item.specs}
                        </p>
                      )}
                    </td>
                    <td className="py-2.5 pr-2 text-center whitespace-nowrap text-slate-500 tabular-nums">
                      ×{item.quantity}
                    </td>
                    <td className="py-2.5 pr-4 text-right whitespace-nowrap tabular-nums sm:pr-5">
                      {formatCurrency(item.unitPrice * item.quantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-slate-100 bg-slate-50/70">
                <tr>
                  <td colSpan={2} className="py-3 pl-4 font-semibold sm:pl-5">
                    Total
                  </td>
                  <td className="py-3 pr-4 text-right text-base font-bold tabular-nums sm:pr-5">
                    {formatCurrency(order.totalAmount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </Card>

          <Card
            title="Pagos"
            actions={
              !paymentForm &&
              (!hasAdvance || !hasBalance) && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    setPaymentForm({
                      kind: hasAdvance ? 'balance' : 'advance',
                      amount: remaining > 0 ? remaining : 0,
                      proofImageUrl: '',
                      note: '',
                    })
                  }
                >
                  Registrar pago
                </Button>
              )
            }
          >
            <div className="rounded-xl bg-slate-50 p-3.5">
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <p className="text-slate-500">Total</p>
                  <p className="mt-0.5 font-semibold tabular-nums text-slate-900">
                    {formatCurrency(order.totalAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Pagado</p>
                  <p className="mt-0.5 font-semibold tabular-nums text-emerald-700">
                    {formatCurrency(totalPaid)}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Saldo</p>
                  <p
                    className={cn(
                      'mt-0.5 font-semibold tabular-nums',
                      remaining > 0 ? 'text-amber-700' : 'text-slate-400',
                    )}
                  >
                    {formatCurrency(remaining)}
                  </p>
                </div>
              </div>

              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-[width] duration-500"
                  style={{ width: `${Math.min(100, paidRatio * 100)}%` }}
                />
              </div>
            </div>

            {order.payments.length > 0 && (
              <ul className="mt-4 space-y-3">
                {order.payments.map((p, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-1.5 font-medium text-slate-900">
                        {p.kind === 'advance' ? 'Adelanto' : 'Saldo'}
                        <span className="font-semibold tabular-nums text-emerald-700">
                          {formatCurrency(p.amount)}
                        </span>
                      </p>
                      <p className="text-xs text-slate-400">{formatDateTime(p.registeredAt)}</p>
                      {p.note && <p className="mt-0.5 text-xs text-slate-500">{p.note}</p>}
                      <button
                        type="button"
                        disabled={deletePaymentMutation.isPending}
                        onClick={() => deletePaymentMutation.mutate(p.kind)}
                        className="mt-1 text-xs text-slate-400 transition-colors hover:text-red-600 disabled:opacity-50"
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
                        <img
                          src={p.proofImageUrl}
                          alt=""
                          className="size-16 rounded-lg object-cover ring-1 ring-slate-200 transition-opacity group-hover:opacity-80"
                        />
                        <span className="absolute inset-0 flex items-center justify-center rounded-lg transition-colors group-hover:bg-black/30">
                          <ZoomIn
                            size={16}
                            className="text-white opacity-0 transition-opacity group-hover:opacity-100"
                          />
                        </span>
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {paymentForm && (
              <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
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
                        className={cn(
                          'flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40',
                          paymentForm.kind === k
                            ? 'bg-brand-50 text-brand-700 ring-2 ring-brand-500'
                            : 'bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50',
                        )}
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
                    inputMode="decimal"
                    min={0}
                    step="0.01"
                    value={paymentForm.amount || ''}
                    onChange={(e) =>
                      setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })
                    }
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
                  <p className="mb-1.5 text-sm font-medium text-slate-700">
                    Foto del comprobante (opcional)
                  </p>
                  <ImageUploader
                    max={1}
                    folder="payments"
                    value={paymentForm.proofImageUrl ? [paymentForm.proofImageUrl] : []}
                    onChange={(urls) =>
                      setPaymentForm({ ...paymentForm, proofImageUrl: urls[0] ?? '' })
                    }
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    className="flex-1 sm:flex-none"
                    disabled={!paymentForm.amount || paymentMutation.isPending}
                    onClick={() => paymentMutation.mutate()}
                  >
                    {paymentMutation.isPending ? 'Guardando...' : 'Guardar pago'}
                  </Button>
                  <Button
                    variant="secondary"
                    className="flex-1 sm:flex-none"
                    onClick={() => setPaymentForm(null)}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {order.delivery && (
            <Card title="Entrega">
              <dl className="space-y-1.5 text-sm">
                <DeliveryRow label="Dirección" value={order.delivery.address} />
                <DeliveryRow label="Referencia" value={order.delivery.reference} />
                <DeliveryRow label="Courier" value={order.delivery.courierName} />
                <DeliveryRow label="Guía" value={order.delivery.trackingCode} mono />
              </dl>

              {order.delivery.attempts.length > 0 && (
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <SectionLabel className="mb-2">Intentos de entrega</SectionLabel>
                  <ul className="space-y-2">
                    {order.delivery.attempts.map((attempt, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        {attempt.succeeded ? (
                          <CircleCheck size={16} className="mt-0.5 shrink-0 text-emerald-600" />
                        ) : (
                          <CircleX size={16} className="mt-0.5 shrink-0 text-red-600" />
                        )}
                        <div className="min-w-0">
                          <p className="break-words text-slate-700">
                            {attempt.reason ?? 'Sin motivo'}
                          </p>
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

          <Card title="Historial">
            {/* Línea vertical continua: deja ver el recorrido de un vistazo. */}
            <ol className="relative space-y-4 before:absolute before:top-2 before:bottom-2 before:left-[5px] before:w-px before:bg-slate-200">
              {order.stateHistory.map((entry, i) => (
                <li key={i} className="relative flex flex-wrap items-center gap-x-3 gap-y-1 pl-6">
                  <span
                    className="absolute top-1.5 left-0 size-2.5 rounded-full ring-2 ring-white"
                    style={{ backgroundColor: entry.stateColor }}
                  />
                  <Badge>{entry.kind === 'payment' ? 'Pago' : 'Pedido'}</Badge>
                  <StateBadge
                    name={entry.stateName}
                    color={entry.stateColor}
                    icon={entry.stateIcon}
                  />
                  <span className="ml-auto text-xs whitespace-nowrap text-slate-400">
                    {formatDateTime(entry.changedAt)}
                  </span>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>

      <Lightbox url={proofLightbox} onClose={() => setProofLightbox(null)} />
    </div>
  )
}

function DeliveryRow({
  label,
  value,
  mono,
}: {
  label: string
  value?: string
  mono?: boolean
}) {
  if (!value) return null
  return (
    <div className="flex flex-wrap gap-x-2">
      <dt className="shrink-0 text-slate-500">{label}:</dt>
      <dd className={cn('min-w-0', mono ? 'font-mono break-all' : 'break-words')}>{value}</dd>
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
    <Card
      title="Link de seguimiento"
      description="Mándaselo al cliente para que siga su pedido. No necesita cuenta."
    >
      <div className="rounded-lg bg-slate-50 px-3 py-2.5 ring-1 ring-slate-200">
        <p className="font-mono text-xs break-all text-slate-600">{url}</p>
      </div>
      <div className="mt-3 flex gap-2">
        <Button variant="secondary" size="sm" className="flex-1" onClick={copy}>
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'Copiado' : 'Copiar'}
        </Button>
        <a href={url} target="_blank" rel="noreferrer" className="flex-1">
          <Button variant="ghost" size="sm" className="w-full">
            <ExternalLink size={14} />
            Ver
          </Button>
        </a>
      </div>
    </Card>
  )
}

interface StatePickerProps {
  title: string
  states: WorkflowState[]
  currentId?: string
  currentLink?: string
  isPending: boolean
  onSelect: (stateId: string, link?: string) => void
}

function StatePicker({
  title,
  states,
  currentId,
  currentLink,
  isPending,
  onSelect,
}: StatePickerProps) {
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
    <Card title={title} description="Toca un estado para mover el pedido ahí.">
      {currentLink && !pendingState && (
        <a
          href={currentLink}
          target="_blank"
          rel="noreferrer"
          className="mb-3 flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs ring-1 ring-blue-100 transition-colors hover:bg-blue-100"
        >
          <Link2 size={13} className="shrink-0 text-blue-600" />
          <span className="truncate text-blue-700">{currentLink}</span>
        </a>
      )}

      <div className="space-y-1.5">
        {states.map((state) => {
          const isCurrent = state._id === currentId
          const isChosen = pendingState?._id === state._id

          return (
            <button
              key={state._id}
              type="button"
              disabled={isCurrent || isPending || Boolean(pendingState && !isChosen)}
              onClick={() => handleClick(state)}
              className={cn(
                'flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors sm:py-2',
                isCurrent && 'cursor-default',
                isChosen && 'bg-brand-50 ring-2 ring-brand-500',
                !isCurrent &&
                  !isChosen &&
                  'text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-50',
              )}
              style={
                isCurrent
                  ? {
                      backgroundColor: `${state.color}14`,
                      color: state.color,
                      boxShadow: `inset 0 0 0 2px ${state.color}`,
                    }
                  : undefined
              }
            >
              <StateIcon name={state.icon} size={16} className="shrink-0" />
              <span className="min-w-0 flex-1 truncate font-medium">{state.name}</span>
              {isCurrent && <span className="shrink-0 text-[11px] font-semibold">actual</span>}
              {state.requiresLink && !isCurrent && (
                <Link2 size={13} className="shrink-0 text-slate-400" />
              )}
            </button>
          )
        })}
      </div>

      {pendingState && (
        <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
          <p className="text-xs text-slate-600">
            Pega el link para el cliente al pasar a <strong>{pendingState.name}</strong>:
          </p>
          <Input
            autoFocus
            type="url"
            inputMode="url"
            placeholder="https://..."
            value={linkDraft}
            onChange={(e) => setLinkDraft(e.target.value)}
          />
          <div className="flex gap-2">
            <Button size="sm" className="flex-1" onClick={confirmWithLink} disabled={isPending}>
              {isPending ? 'Guardando...' : 'Confirmar'}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="flex-1"
              onClick={() => setPendingState(null)}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}
