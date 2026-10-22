import { useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileCheck2,
  PackageSearch,
  Plus,
  ShoppingCart,
  Store,
  Truck,
  ZoomIn,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { getToday, updateOrderState, validatePayment } from '@/api/orders'
import { getWorkflow } from '@/api/tenants'
import { listProducts } from '@/api/products'
import { listInventory } from '@/api/inventory'
import { OrderStatusTrio } from '@/components/OrderStatus'
import {
  Alert,
  Banner,
  Button,
  EmptyState,
  Lightbox,
  PageHeader,
  Spinner,
  StatStrip,
} from '@/components/ui'
import { useRole } from '@/hooks/useRole'
import { useSubscription } from '@/hooks/useSubscription'
import { useAuthStore } from '@/stores/authStore'
import { toast } from '@/stores/toastStore'
import { cn, formatCurrency } from '@/lib/cn'
import { FRANJA_LABELS, FRANJA_ORDER, longDay, shortDay } from '@/lib/dates'
import { deliveryStatus, nextState } from '@/lib/orderStatus'
import { itemsSummary, orderCode, owed } from '@/lib/orders'
import { timeAgo } from '@/lib/tickets'
import type { Franja, Order, WorkflowState } from '@/types'

/* ────────────────────────────────────────────────────────────
   Hoy

   La pantalla con la que se abre el negocio. Ordena por urgencia:

     1. Lo atrasado: un problema que ya existe.
     2. Lo que espera una acción: comprobantes por revisar.
     3. Lo que se entrega o se recoge hoy, por turno.
     4. Lo que viene: mañana y lo que no tiene fecha.

   Una sección vacía no ocupa espacio: o no aparece, o es una línea.
   ──────────────────────────────────────────────────────────── */

/** Pedidos que entraron solos (tienda, link, campaña) en las últimas 24 horas. */
function isFreshOnline(order: Order) {
  return order.createdVia !== 'manual' && Date.now() - new Date(order.createdAt).getTime() < 86_400_000
}

const franjaOf = (o: Order): Franja | 'none' => o.scheduledFor?.franja ?? 'none'

export function TodayPage() {
  const { isTeam, isManager, role } = useRole()
  const { can } = useSubscription()

  // El día del navegador, no el del servidor.
  const [date] = useState(() => {
    const d = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  })

  const { data, isLoading, error } = useQuery({
    queryKey: ['today', date],
    queryFn: () => getToday(date),
    // Pedidos de la tienda entran solos: que aparezcan sin recargar.
    refetchInterval: 60_000,
  })
  const { data: workflow } = useQuery({ queryKey: ['workflow'], queryFn: getWorkflow })
  const { data: products } = useQuery({ queryKey: ['products'], queryFn: listProducts, enabled: isManager })
  const { data: inventory } = useQuery({
    queryKey: ['inventory'],
    queryFn: listInventory,
    enabled: isManager && can('inventory'),
  })

  if (isLoading) return <Spinner />
  if (error) return <Alert error={error} />
  if (!data) return null

  const states = workflow?.fulfillment
  const lowStock = inventory?.products.filter((p) => (p.stock ?? 0) <= p.threshold).length ?? 0
  const pendingProofs = data.proofs.flatMap((order) =>
    order.payments.filter((p) => p.validated === false).map((payment) => ({ order, payment })),
  )
  // El más atrasado primero: es el que más urge.
  const overdue = [...data.overdue].sort((a, b) =>
    (a.scheduledFor?.date ?? '').localeCompare(b.scheduledFor?.date ?? ''),
  )
  const delivering = data.today.filter((o) => o.type !== 'pickup').length
  const nothingYet =
    isManager && products !== undefined && products.length === 0 && !data.today.length && !data.overdue.length

  // La agenda de hoy agrupada por turno, en el orden del día.
  const byFranja = (['morning', 'afternoon', 'evening', 'none'] as const)
    .map((f) => ({ franja: f, orders: data.today.filter((o) => franjaOf(o) === f) }))
    .filter((g) => g.orders.length)

  const row = (order: Order) => (
    <OrderRow key={order._id} order={order} states={states} role={role} today={data.date} />
  )

  return (
    <div className="space-y-5">
      <PageHeader
        title="Hoy"
        description={longDay(data.date)}
        actions={
          isTeam && (
            <>
              {can('pos') && (
                <Link to="/pos">
                  <Button variant="secondary">
                    <ShoppingCart size={15} />
                    Vender
                  </Button>
                </Link>
              )}
              <Link to="/orders/new">
                <Button>
                  <Plus size={15} />
                  Nuevo pedido
                </Button>
              </Link>
            </>
          )
        }
      />

      {/* ── Resumen: el color solo donde hay algo que mirar ── */}
      <StatStrip
        stats={[
          {
            label: 'Atrasados',
            value: String(overdue.length),
            hint: overdue.length ? 'Fecha acordada ya pasó' : 'Todo a tiempo',
            tone: overdue.length ? 'bad' : 'default',
            href: overdue.length ? '#atrasados' : undefined,
          },
          {
            label: 'Por validar',
            value: String(pendingProofs.length),
            hint: pendingProofs.length ? 'Comprobantes sin revisar' : 'Nada pendiente',
            tone: pendingProofs.length ? 'warn' : 'default',
            href: pendingProofs.length ? '#por-validar' : undefined,
          },
          {
            label: 'Para hoy',
            value: String(data.today.length),
            hint: `${delivering} delivery · ${data.today.length - delivering} recojo`,
            href: '#para-hoy',
          },
          {
            label: 'Para mañana',
            value: String(data.tomorrowOrders.length),
            hint: shortDay(data.tomorrow),
            href: data.tomorrowOrders.length ? '#manana' : undefined,
          },
          { label: 'Por cobrar al entregar', value: formatCurrency(data.toCollect), hint: 'Atrasados y de hoy' },
        ]}
      />

      {nothingYet && <FirstSteps />}

      {isManager && lowStock > 0 && (
        <Banner
          tone="warning"
          icon={PackageSearch}
          title={`${lowStock} ${lowStock === 1 ? 'producto tiene' : 'productos tienen'} stock bajo`}
          action={
            <Link to="/inventory">
              <Button size="sm" variant="secondary">
                Ver inventario
              </Button>
            </Link>
          }
        />
      )}

      {/* ── 1. Atrasados: lo primero cuando existe ── */}
      {overdue.length > 0 && (
        <Section
          id="atrasados"
          icon={AlertTriangle}
          tone="danger"
          title={`${overdue.length} ${overdue.length === 1 ? 'pedido atrasado' : 'pedidos atrasados'}`}
          hint="Su fecha acordada ya pasó y todavía no se entregan."
        >
          {overdue.map(row)}
        </Section>
      )}

      {/* ── 2. Comprobantes por revisar ── */}
      {pendingProofs.length > 0 && (
        <Section
          id="por-validar"
          icon={FileCheck2}
          tone="warning"
          title="Comprobantes por revisar"
          hint="Mira tu Yape, Plin o banco. Hasta confirmarlos no cuentan como cobrados."
        >
          {pendingProofs.map(({ order, payment }) => (
            <ProofRow
              key={`${order._id}-${payment._id ?? payment.registeredAt}`}
              order={order}
              paymentId={payment._id ?? payment.kind}
              amount={payment.amount}
              at={payment.registeredAt}
              proofUrl={payment.proofImageUrl}
              canValidate={can('advancePayments')}
            />
          ))}
        </Section>
      )}

      {/* ── 3. Agenda de hoy, por turno ── */}
      <Section
        id="para-hoy"
        icon={CalendarClock}
        title="Agenda de hoy"
        hint={data.today.length ? 'Entregas y recojos acordados para hoy, por turno.' : undefined}
      >
        {byFranja.length ? (
          byFranja.map((group) => (
            <li key={group.franja}>
              <p className="border-b border-slate-100 bg-slate-50/60 px-4 py-1.5 text-[11px] font-medium tracking-[0.06em] text-slate-500 uppercase">
                {group.franja === 'none' ? 'Sin turno' : FRANJA_LABELS[group.franja]} · {group.orders.length}
              </p>
              <ul className="divide-y divide-slate-100">
                {[...group.orders]
                  .sort((a, b) => (FRANJA_ORDER[a.scheduledFor?.franja ?? 'evening'] ?? 3) - (FRANJA_ORDER[b.scheduledFor?.franja ?? 'evening'] ?? 3))
                  .map(row)}
              </ul>
            </li>
          ))
        ) : (
          <li>
            <EmptyState
              compact
              icon={CalendarDays}
              title="No hay entregas ni recojos para hoy."
              action={
                data.tomorrowOrders.length ? (
                  <a href="#manana" className="text-[13px] font-medium text-brand-600 hover:underline">
                    Ver los {data.tomorrowOrders.length} de mañana
                  </a>
                ) : can('orderCalendar') ? (
                  <Link to="/calendar" className="text-[13px] font-medium text-brand-600 hover:underline">
                    Abrir calendario
                  </Link>
                ) : undefined
              }
            />
          </li>
        )}
      </Section>

      {/* ── 4. Lo que viene ── */}
      {data.tomorrowOrders.length > 0 && (
        <Section
          id="manana"
          icon={CalendarDays}
          title={`Mañana · ${shortDay(data.tomorrow)}`}
          hint="Para adelantar lo que necesita preparación."
        >
          {[...data.tomorrowOrders]
            .sort((a, b) => (FRANJA_ORDER[a.scheduledFor?.franja ?? 'evening'] ?? 3) - (FRANJA_ORDER[b.scheduledFor?.franja ?? 'evening'] ?? 3))
            .map(row)}
        </Section>
      )}

      {data.unscheduled.length > 0 && (
        <Section id="sin-fecha" icon={Clock} title="Sin fecha acordada" hint="Pedidos abiertos que no tienen día de entrega.">
          {data.unscheduled.map(row)}
        </Section>
      )}
    </div>
  )
}

/* ─────────────────────────── Piezas ─────────────────────────── */

function Section({
  id,
  icon: Icon,
  title,
  hint,
  tone,
  children,
}: {
  id: string
  icon: LucideIcon
  title: string
  hint?: string
  tone?: 'warning' | 'danger'
  children: ReactNode
}) {
  return (
    <section
      id={id}
      aria-label={title}
      className={cn(
        'scroll-mt-20 overflow-hidden rounded-xl border bg-white',
        tone === 'danger' ? 'border-danger-200' : tone === 'warning' ? 'border-warning-200' : 'border-slate-200',
      )}
    >
      <header
        className={cn(
          'flex items-start gap-2.5 border-b px-4 py-2.5',
          tone === 'danger'
            ? 'border-danger-200 bg-danger-50 text-danger-700'
            : tone === 'warning'
              ? 'border-warning-200 bg-warning-50 text-warning-700'
              : 'border-slate-200 bg-slate-50/60 text-slate-900',
        )}
      >
        <Icon size={15} className={cn('mt-0.5 shrink-0', !tone && 'text-slate-400')} />
        <div className="min-w-0">
          <h2 className="text-[13px] font-semibold">{title}</h2>
          {hint && <p className={cn('text-xs', tone ? 'opacity-80' : 'text-slate-500')}>{hint}</p>}
        </div>
      </header>
      <ul className="divide-y divide-slate-100">{children}</ul>
    </section>
  )
}

/**
 * Un pedido en «Hoy». Cuatro bloques que no se mezclan:
 * quién y qué · cuándo y cómo se entrega · sus tres estados · lo que se hace.
 * En escritorio van en columnas; en el celular, uno debajo del otro.
 */
function OrderRow({
  order,
  states,
  role,
  today,
}: {
  order: Order
  states: WorkflowState[] | undefined
  role: ReturnType<typeof useRole>['role']
  today: string
}) {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const next = nextState(order, states, role)
  const delivery = deliveryStatus(order, today)
  const due = owed(order)
  const DeliveryIcon = order.type === 'pickup' ? Store : Truck

  const advance = useMutation({
    mutationFn: () => updateOrderState(order._id, { kind: 'fulfillment', stateId: next!._id }),
    onSuccess: () => {
      toast.success(`${order.customer?.name ?? 'Pedido'}: pasó a ${next!.name}`)
      qc.invalidateQueries({ queryKey: ['today'] })
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: ['inventory'] })
    },
    onError: (err) => toast.error(err),
  })

  return (
    <li className="grid gap-x-6 gap-y-2.5 px-4 py-3.5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1.1fr)_minmax(0,1.6fr)_auto] lg:items-center">
      {/* Quién y qué */}
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <Link to={`/orders/${order._id}`} className="focus-ring rounded font-medium text-slate-900 hover:text-brand-600">
            {order.customer?.name ?? 'Cliente'}
          </Link>
          <span className="font-mono text-[11px] text-slate-400">{orderCode(order.trackingToken)}</span>
          {isFreshOnline(order) && (
            <span className="rounded-md border border-info-200 bg-info-50 px-1.5 text-[11px] font-medium text-info-700">Nuevo</span>
          )}
        </p>
        <p className="truncate text-[13px] text-slate-600">{itemsSummary(order.items)}</p>
      </div>

      {/* Cuándo y cómo */}
      <div className="min-w-0 text-[13px]">
        <p className="text-slate-700">
          {delivery.dateLabel ? (
            <>
              <span className="text-slate-400">Acordado </span>
              {delivery.dateLabel}
            </>
          ) : (
            <span className="text-slate-400">Sin fecha acordada</span>
          )}
          {delivery.key === 'overdue' && <span className="font-medium text-danger-600"> · {delivery.relative}</span>}
        </p>
        <p className="flex items-center gap-1.5 truncate text-xs text-slate-500">
          <DeliveryIcon size={12} className="shrink-0" />
          {order.type === 'pickup' ? 'Recojo en tienda' : `Delivery${order.delivery?.address ? ` · ${order.delivery.address}` : ''}`}
        </p>
      </div>

      {/* Sus tres estados */}
      <OrderStatusTrio order={order} today={today} />

      {/* Lo que se hace */}
      <div className="flex items-center gap-2 lg:justify-end">
        {due > 0 && (
          <span className="mr-auto text-[13px] font-medium text-slate-900 tabular-nums lg:mr-0">
            <span className="font-normal text-slate-400">Saldo </span>
            {formatCurrency(due)}
          </span>
        )}
        {next ? (
          <Button
            size="sm"
            loading={advance.isPending}
            onClick={() =>
              // Un estado que pide link (el rastreo del courier) se completa en el detalle.
              next.requiresLink ? navigate(`/orders/${order._id}`) : advance.mutate()
            }
          >
            {next.name}
            <ArrowRight size={13} />
          </Button>
        ) : (
          <Link to={`/orders/${order._id}`}>
            <Button size="sm" variant="secondary">
              Ver pedido
            </Button>
          </Link>
        )}
        {next && (
          <Link
            to={`/orders/${order._id}`}
            aria-label={`Ver pedido de ${order.customer?.name ?? 'cliente'}`}
            className="focus-ring rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <ChevronRight size={16} />
          </Link>
        )}
      </div>
    </li>
  )
}

function ProofRow({
  order,
  paymentId,
  amount,
  at,
  proofUrl,
  canValidate,
}: {
  order: Order
  paymentId: string
  amount: number
  at: string
  proofUrl?: string
  canValidate: boolean
}) {
  const qc = useQueryClient()
  const [zoom, setZoom] = useState<string | null>(null)

  const validate = useMutation({
    mutationFn: () => validatePayment(order._id, paymentId),
    onSuccess: () => {
      toast.success(`Pago de ${formatCurrency(amount)} confirmado`)
      qc.invalidateQueries({ queryKey: ['today'] })
      qc.invalidateQueries({ queryKey: ['orders'] })
    },
    onError: (err) => toast.error(err),
  })

  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3">
      {proofUrl && (
        <button
          type="button"
          onClick={() => setZoom(proofUrl)}
          className="focus-ring group relative shrink-0 rounded-lg"
          aria-label="Ver comprobante"
        >
          <img src={proofUrl} alt="" className="size-11 rounded-lg border border-slate-200 object-cover" />
          <span className="absolute inset-0 flex items-center justify-center rounded-lg transition-colors group-hover:bg-black/30">
            <ZoomIn size={14} className="text-white opacity-0 group-hover:opacity-100" />
          </span>
        </button>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[13px]">
          <Link to={`/orders/${order._id}`} className="font-medium text-slate-900 hover:text-brand-600">
            {order.customer?.name ?? 'Cliente'}
          </Link>{' '}
          <span className="font-mono text-[11px] text-slate-400">{orderCode(order.trackingToken)}</span>
        </p>
        <p className="text-xs text-slate-500">
          Envió <strong className="font-medium text-slate-700">{formatCurrency(amount)}</strong> · {timeAgo(at)}
        </p>
      </div>
      <div className="flex gap-2">
        <Link to={`/orders/${order._id}`}>
          <Button size="sm" variant="secondary">
            Revisar
          </Button>
        </Link>
        {canValidate && (
          <Button size="sm" loading={validate.isPending} onClick={() => validate.mutate()}>
            <CheckCircle2 size={13} />
            Llegó
          </Button>
        )}
      </div>
      <Lightbox url={zoom} onClose={() => setZoom(null)} />
    </li>
  )
}

/** Para un negocio recién creado: lo mínimo para empezar a recibir pedidos. */
function FirstSteps() {
  const slug = useAuthStore((s) => s.activeTenant?.slug)
  const steps: { to: string; label: string; hint: string }[] = [
    { to: '/settings', label: 'Completa tu negocio', hint: 'Logo, WhatsApp, entregas, medios de pago y horario.' },
    { to: '/catalog', label: 'Carga tu catálogo', hint: 'Tus productos con foto y precio.' },
    { to: '/workflow', label: 'Revisa tus estados', hint: 'El recorrido de un pedido, como trabajas tú.' },
    { to: '/orders/new', label: 'Registra tu primer pedido', hint: 'O comparte tu tienda y espera el primero.' },
  ]
  return (
    <section aria-label="Para empezar" className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="text-[13px] font-semibold text-slate-900">Para empezar</h2>
      <p className="mt-0.5 text-xs text-slate-500">
        Cuatro pasos y tu negocio queda listo para recibir pedidos.
        {slug && ' Tu tienda ya tiene link: lo encuentras en Ajustes.'}
      </p>
      <ol className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, i) => (
          <li key={step.to}>
            <Link
              to={step.to}
              className="focus-ring flex h-full items-start gap-3 rounded-lg border border-slate-200 p-3 transition-colors hover:border-brand-200 hover:bg-brand-50/40"
            >
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-500 text-[11px] font-semibold text-white">
                {i + 1}
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-medium text-slate-900">{step.label}</span>
                <span className="block text-xs text-slate-500">{step.hint}</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  )
}
