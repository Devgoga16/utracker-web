import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Calendar,
  Check,
  CircleCheck,
  Receipt,
  CircleX,
  Copy,
  ExternalLink,
  Link2,
  Trash2,
} from 'lucide-react'
import { cancelOrder, deleteOrder, getOrder, updateOrderState } from '@/api/orders'
import { useRole } from '@/hooks/useRole'
import { OrderPayments } from '@/components/OrderPayments'
import { OrderSummaryStrip } from '@/components/OrderStatus'
import { getWorkflow } from '@/api/tenants'
import {
  Alert,
  Badge,
  Button,
  Card,
  Field,
  IconButton,
  Input,
  PageHeader,
  SectionLabel,
  Spinner,
  StateBadge,
} from '@/components/ui'
import { useSubscription } from '@/hooks/useSubscription'
import { StateIcon } from '@/lib/icons'
import { cn, formatCurrency, formatDateTime } from '@/lib/cn'
import type {
  Franja,
  OrderCreatedVia,
  WorkflowKind,
  WorkflowState,
} from '@/types'

const ORIGIN_LABELS: Record<OrderCreatedVia, string> = {
  manual: 'carga manual',
  order_link: 'vía link',
  store: 'tienda online',
  pos: 'punto de venta',
}

const FRANJA_LABEL: Record<Franja, string> = {
  morning: 'por la mañana',
  afternoon: 'por la tarde',
  evening: 'por la noche',
}

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
  const { can } = useSubscription()

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
  const [cancelling, setCancelling] = useState(false)
  const [reason, setReason] = useState('')
  const { isTeam, isManager } = useRole()

  const cancelMutation = useMutation({
    mutationFn: () => cancelOrder(id!, reason.trim() || undefined),
    onSuccess: () => {
      setCancelling(false)
      setReason('')
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      // Cancelar devuelve el stock.
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
    },
  })

  if (isLoading) return <Spinner />
  if (!order) return <Alert>Pedido no encontrado</Alert>

  // Solo lo validado: un comprobante sin revisar no es dinero recibido.
  const totalPaid = order.payments
    .filter((p) => p.validated !== false)
    .reduce((s, p) => s + p.amount, 0)
  const remaining = order.totalAmount - totalPaid
  const isCancelled = Boolean(order.fulfillmentState?.isCancellation)
  const isPos = order.createdVia === 'pos'

  // El motivo de la cancelación vive en el historial, en el paso que la registró.
  const cancelNote = isCancelled
    ? [...order.stateHistory]
        .reverse()
        .find((h) => h.kind === 'fulfillment' && h.state === order.fulfillmentState?._id)?.note
    : undefined

  /**
   * Los estados que no aplican a este tipo de entrega no se ofrecen: en un
   * pedido de recojo, "En camino" solo invita a equivocarse. El estado actual
   * se deja siempre, para no esconder dónde está el pedido.
   */
  const availableStates = (workflow?.fulfillment ?? []).filter(
    (s) =>
      !s.appliesTo?.length ||
      s.appliesTo.includes(order.type) ||
      s._id === order.fulfillmentState?._id,
  )

  return (
    <div className="space-y-6">
      <PageHeader
        backTo="/orders"
        backLabel="Volver a pedidos"
        title={order.customer?.name ?? 'Pedido'}
        description={
          <>
            {order.customer?.phone} · Creado {formatDateTime(order.createdAt)} ·{' '}
            {ORIGIN_LABELS[order.createdVia] ?? 'carga manual'}
          </>
        }
        actions={
          <div className="flex items-center gap-2">
            {/* El comprobante recien tiene sentido con el pago completo. */}
            {can('receipts') && remaining <= 0 && totalPaid > 0 && (
              <Link to={`/orders/${order._id}/receipt`}>
                <Button variant="secondary">
                  <Receipt size={15} />
                  <span className="hidden sm:inline">Comprobante</span>
                </Button>
              </Link>
            )}
            {/*
              Cancelar es lo normal: el pedido queda con su historia y el stock
              vuelve. Eliminar borra hasta el rastro, así que queda solo para el
              dueño y el administrador. Una venta de mostrador se anula desde la caja.
            */}
            {!isPos && isTeam && !isCancelled && (
              <Button variant="secondary" onClick={() => setCancelling(true)}>
                <CircleX size={15} />
                <span className="hidden sm:inline">Cancelar pedido</span>
              </Button>
            )}
            {!isPos && isManager && (
              <IconButton label="Eliminar pedido" tone="danger" onClick={() => setConfirmingDelete(true)}>
                <Trash2 size={15} />
              </IconButton>
            )}
          </div>
        }
      />

      {/* Las tres dimensiones del pedido, antes que cualquier detalle. */}
      <OrderSummaryStrip order={order} />

      {order.voidedAt && (
        <Alert>
          Venta anulada el {formatDateTime(order.voidedAt)}. El stock volvió al inventario y el
          dinero salió de la caja.
        </Alert>
      )}

      {isCancelled && !order.voidedAt && (
        <div className="rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700 border border-slate-200">
          <p className="font-medium text-slate-900">Pedido cancelado</p>
          {cancelNote && <p className="mt-0.5">Motivo: {cancelNote}</p>}
          <p className="mt-0.5 text-slate-500">
            El stock que había descontado volvió al inventario. Si cobraste algo, regístralo como
            devuelto en Pagos.
          </p>
        </div>
      )}

      {cancelling && (
        <Card className="ring-warning-200">
          <p className="text-sm font-medium text-slate-800">¿Cancelar este pedido?</p>
          <p className="mt-1 text-sm text-slate-500">
            El pedido queda en tu lista como cancelado, con el motivo en su historial. Lo que haya
            descontado del inventario vuelve.
          </p>
          <div className="mt-3">
            <Field label="Motivo (opcional)" htmlFor="cancel-reason">
              <Input
                id="cancel-reason"
                autoFocus
                placeholder="Ej. el cliente ya no lo necesita"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </Field>
          </div>
          {cancelMutation.isError && (
            <div className="mt-3">
              <Alert error={cancelMutation.error} />
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="danger"
              disabled={cancelMutation.isPending}
              onClick={() => cancelMutation.mutate()}
            >
              {cancelMutation.isPending ? 'Cancelando...' : 'Sí, cancelar pedido'}
            </Button>
            <Button variant="secondary" onClick={() => setCancelling(false)}>
              Volver
            </Button>
          </div>
        </Card>
      )}

      {confirmingDelete && (
        <Card className="ring-danger-200">
          <p className="text-sm font-medium text-slate-800">
            ¿Eliminar este pedido? Esta acción no se puede deshacer.
          </p>

          {/* Borrar y cancelar no hacen lo mismo con el stock: conviene decirlo
              antes, no después. */}
          <ul className="mt-3 space-y-1.5 rounded-lg bg-warning-50 p-3 text-[13px] text-warning-900 ring-1 ring-warning-200">
            <li className="flex gap-2">
              <span aria-hidden>•</span>
              <span>
                <strong>No se devolverá el stock</strong> que este pedido haya descontado de tu
                catálogo. Si quieres que vuelva, cancela el pedido en vez de eliminarlo.
              </span>
            </li>
            {order.campaign && (
              <li className="flex gap-2">
                <span aria-hidden>•</span>
                <span>
                  Las unidades reservadas de la <strong>campaña</strong> sí volverán a estar
                  disponibles.
                </span>
              </li>
            )}
          </ul>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="danger"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
            >
              {deleteMutation.isPending ? 'Eliminando...' : 'Sí, eliminar'}
            </Button>
            <Button variant="secondary" onClick={() => setConfirmingDelete(false)}>
              No, volver
            </Button>
          </div>
          {deleteMutation.isError && (
            <div className="mt-3">
              <Alert error={deleteMutation.error} />
            </div>
          )}
        </Card>
      )}

      {stateMutation.isError && <Alert error={stateMutation.error} />}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* En mobile lo primero tiene que ser cambiar el estado, no leer el
            detalle: la columna lateral sube arriba de todo. */}
        <div className="order-first space-y-6 lg:order-last">
          <StatePicker
            title="Estado del pedido"
            states={availableStates}
            currentId={order.fulfillmentState?._id}
            currentLink={order.fulfillmentLink}
            isPending={stateMutation.isPending}
            onSelect={(stateId, link) => stateMutation.mutate({ kind: 'fulfillment', stateId, link })}
          />

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
                  <td className="py-3 pr-4 text-right text-base font-semibold tabular-nums sm:pr-5">
                    {formatCurrency(order.totalAmount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </Card>

          {order.scheduledFor && (
            <div className="flex items-center gap-2.5 rounded-xl bg-slate-50 px-4 py-3 text-sm border border-slate-200">
              <Calendar size={15} className="shrink-0 text-slate-400" />
              <span className="text-slate-600">
                <span className="font-medium text-slate-900">Entrega preferida:</span>{' '}
                {new Date(order.scheduledFor.date + 'T12:00:00').toLocaleDateString('es-PE', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}{' '}
                {order.scheduledFor.franja ? FRANJA_LABEL[order.scheduledFor.franja] : ''}
              </span>
            </div>
          )}

          <OrderPayments order={order} />

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
                          <CircleCheck size={16} className="mt-0.5 shrink-0 text-success-600" />
                        ) : (
                          <CircleX size={16} className="mt-0.5 shrink-0 text-danger-600" />
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
                  {entry.note && <p className="w-full text-xs text-slate-500">{entry.note}</p>}
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>

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
      <div className="rounded-lg bg-slate-50 px-3 py-2.5 border border-slate-200">
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
          className="mb-3 flex items-center gap-2 rounded-lg bg-info-50 px-3 py-2 text-xs ring-1 ring-info-100 transition-colors hover:bg-info-100"
        >
          <Link2 size={13} className="shrink-0 text-info-600" />
          <span className="truncate text-info-700">{currentLink}</span>
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
                  'text-slate-600 border border-slate-200 hover:bg-slate-50 disabled:opacity-50',
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
