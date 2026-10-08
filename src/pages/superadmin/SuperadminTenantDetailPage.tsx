import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle2,
  Clock,
  KeyRound,
  LogIn,
  MessageCircle,
  ShieldAlert,
  Store,
  Ticket as TicketIcon,
  XCircle,
} from 'lucide-react'
import {
  getTenantDetail,
  grantSupportAccess,
  revokeSupportAccess,
  type HealthCheck,
} from '@/api/support'
import { apiErrorMessage } from '@/api/client'
import { useAuthStore } from '@/stores/authStore'
import {
  Alert,
  Badge,
  Button,
  Card,
  CheckboxField,
  Field,
  Modal,
  PageHeader,
  Select,
  Spinner,
  StatCard,
  Textarea,
} from '@/components/ui'
import { cn, formatDateTime } from '@/lib/cn'
import { timeAgo } from '@/lib/tickets'
import type { MembershipRole, SupportAccess } from '@/types'

const SUBSCRIPTION_LABELS: Record<string, string> = {
  trial: 'Prueba',
  active: 'Activa',
  suspended: 'Suspendida',
}

const ROLE_LABELS: Record<MembershipRole, string> = {
  owner: 'Dueño',
  admin: 'Administrador',
  staff: 'Personal',
  driver: 'Repartidor',
}

/**
 * Ficha técnica de un negocio: todo lo que hace falta para atenderlo sin
 * pedirle capturas de pantalla.
 *
 * Los chequeos de salud son la parte importante: la mayoría de los reclamos
 * ("no me llega el WhatsApp", "no me deja crear pedidos") son configuración
 * faltante, no fallas, y se ven de un vistazo.
 */
export function SuperadminTenantDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [showAccess, setShowAccess] = useState(false)

  const { data, isLoading, error } = useQuery({
    queryKey: ['tenant-detail', id],
    queryFn: () => getTenantDetail(id!),
    enabled: Boolean(id),
  })

  if (isLoading) return <Spinner />
  if (error) return <Alert error={error} />
  if (!data) return <Alert>No encontramos este negocio.</Alert>

  const { tenant, counts, health, members, recentErrors, subscription, supportAccesses } = data
  const failing = health.filter((h) => !h.ok)

  const activeAccess = supportAccesses.find(
    (a) => !a.revokedAt && new Date(a.expiresAt) > new Date(),
  )

  return (
    <div className="space-y-6">
      <PageHeader
        backTo="/superadmin/tenants"
        backLabel="Negocios"
        title={tenant.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono">/{tenant.slug}</span>
            <span className="text-slate-300">·</span>
            Desde {formatDateTime(tenant.createdAt)}
            {!tenant.isActive && (
              <>
                <span className="text-slate-300">·</span>
                <span className="font-medium text-red-600">Inactivo</span>
              </>
            )}
          </span>
        }
        actions={
          <>
            <a href={`/store/${tenant.slug}`} target="_blank" rel="noreferrer">
              <Button variant="secondary">
                <Store size={15} />
                <span className="hidden sm:inline">Ver tienda</span>
                <span className="sm:hidden">Tienda</span>
              </Button>
            </a>
            <Button onClick={() => setShowAccess(true)}>
              <KeyRound size={15} />
              <span className="hidden sm:inline">Entrar como soporte</span>
              <span className="sm:hidden">Soporte</span>
            </Button>
          </>
        }
      />

      {activeAccess && <ActiveAccessBanner access={activeAccess} tenantId={id!} tenant={tenant} />}

      {/* Lo que está mal, primero y sin que haya que buscarlo. */}
      {failing.length > 0 && (
        <Card
          title={`${failing.length} ${failing.length === 1 ? 'problema' : 'problemas'} de configuración`}
          description="Explican la mayoría de los reclamos antes de abrir un solo log."
        >
          <ul className="space-y-2.5">
            {failing.map((h) => (
              <HealthRow key={h.key} check={h} />
            ))}
          </ul>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <StatCard label="Pedidos" value={String(counts.orders)} hint={`${counts.ordersThisMonth} este mes`} />
        <StatCard
          label="Catálogo"
          value={String(counts.activeProducts)}
          hint={`${counts.products} en total`}
        />
        <StatCard label="Clientes" value={String(counts.customers)} />
        <StatCard
          icon={TicketIcon}
          tone={counts.openTickets > 0 ? 'amber' : 'slate'}
          label="Tickets abiertos"
          value={String(counts.openTickets)}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Chequeos" description="Estado de la configuración del negocio">
          <ul className="space-y-2.5">
            {health.map((h) => (
              <HealthRow key={h.key} check={h} />
            ))}
          </ul>
        </Card>

        <div className="space-y-5">
          <Card title="Suscripción">
            {subscription ? (
              <dl className="space-y-1.5 text-sm">
                <Row label="Plan" value={subscription.plan?.name ?? '—'} />
                <div className="flex items-center gap-2">
                  <dt className="shrink-0 text-slate-400">Estado:</dt>
                  <dd>
                    <Badge
                      tone={
                        subscription.status === 'active'
                          ? 'green'
                          : subscription.status === 'suspended'
                            ? 'red'
                            : 'amber'
                      }
                    >
                      {SUBSCRIPTION_LABELS[subscription.status] ?? subscription.status}
                    </Badge>
                  </dd>
                </div>
                {subscription.expiresAt && (
                  <Row label="Vence" value={formatDateTime(subscription.expiresAt)} />
                )}
                {subscription.notes && <Row label="Notas" value={subscription.notes} />}
              </dl>
            ) : (
              <p className="text-sm text-slate-500">Sin suscripción asignada.</p>
            )}
          </Card>

          <Card title="WhatsApp">
            <p className="flex items-center gap-2 text-sm text-slate-700">
              <MessageCircle size={15} className="shrink-0 text-slate-400" />
              {tenant.whatsappMode === 'own'
                ? 'Sesión propia del negocio'
                : 'Bot compartido de uTracker'}
            </p>
            {tenant.phone ? (
              <p className="mt-1 text-sm text-slate-500">Número {tenant.phone}</p>
            ) : (
              <p className="mt-1 text-sm text-amber-700">Sin número configurado</p>
            )}
          </Card>
        </div>
      </div>

      <Card title={`Usuarios (${members.length})`} flush>
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-semibold tracking-wide text-slate-400 uppercase">
                <th className="px-4 py-2.5">Nombre</th>
                <th className="px-4 py-2.5">Email</th>
                <th className="px-4 py-2.5">Rol</th>
                <th className="px-4 py-2.5">Desde</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {members.map((m) => (
                <tr key={m._id}>
                  <td className="px-4 py-2.5 font-medium text-slate-900">
                    {m.user?.name ?? 'Usuario eliminado'}
                    {!m.isActive && <span className="ml-2 text-xs text-red-600">inactivo</span>}
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">{m.user?.email ?? '—'}</td>
                  <td className="px-4 py-2.5 text-slate-600">{ROLE_LABELS[m.role] ?? m.role}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-400">
                    {formatDateTime(m.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ul className="divide-y divide-slate-100 lg:hidden">
          {members.map((m) => (
            <li key={m._id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 truncate font-medium text-slate-900">
                  {m.user?.name ?? 'Usuario eliminado'}
                </p>
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                  {ROLE_LABELS[m.role] ?? m.role}
                </span>
              </div>
              <p className="truncate text-sm text-slate-500">{m.user?.email ?? '—'}</p>
              <p className="mt-1 text-xs text-slate-400">
                Desde {formatDateTime(m.createdAt)}
                {!m.isActive && <span className="ml-2 text-red-600">inactivo</span>}
              </p>
            </li>
          ))}
        </ul>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card
          title="Últimos errores"
          description="Los 10 más recientes de este negocio"
          actions={
            <Link
              to={`/superadmin/logs?tenant=${tenant._id}`}
              className="text-sm font-medium text-violet-700 hover:text-violet-800"
            >
              Ver todos
            </Link>
          }
        >
          {recentErrors.length === 0 ? (
            <p className="text-sm text-slate-500">Ningún error registrado. Buena señal.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentErrors.map((e) => (
                <li key={e._id} className="py-2 first:pt-0 last:pb-0">
                  <p className="truncate text-sm text-slate-800">{e.message}</p>
                  <p className="truncate font-mono text-xs text-slate-400">
                    {e.ref} · {e.action ?? '—'}
                    {e.statusCode ? ` · ${e.statusCode}` : ''} · {timeAgo(e.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Accesos de soporte" description="Quién entró a este negocio y por qué">
          {supportAccesses.length === 0 ? (
            <p className="text-sm text-slate-500">Nadie de soporte entró todavía.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {supportAccesses.map((a) => (
                <AccessRow key={a._id} access={a} tenantId={id!} />
              ))}
            </ul>
          )}
        </Card>
      </div>

      {showAccess && (
        <GrantAccessDialog
          tenantId={id!}
          tenantName={tenant.name}
          onClose={() => setShowAccess(false)}
        />
      )}
    </div>
  )
}

function HealthRow({ check }: { check: HealthCheck }) {
  const Icon = check.ok ? CheckCircle2 : XCircle

  return (
    <li className="flex items-start gap-2.5">
      <Icon
        size={16}
        className={cn('mt-0.5 shrink-0', check.ok ? 'text-emerald-500' : 'text-red-500')}
      />
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-800">{check.label}</p>
        <p className={cn('text-xs', check.ok ? 'text-slate-500' : 'text-red-600')}>
          {check.detail}
        </p>
      </div>
    </li>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="shrink-0 text-slate-400">{label}:</dt>
      <dd className="min-w-0 text-slate-700">{value}</dd>
    </div>
  )
}

function AccessRow({ access, tenantId }: { access: SupportAccess; tenantId: string }) {
  const qc = useQueryClient()
  const user = typeof access.user === 'object' ? access.user : null
  const expired = new Date(access.expiresAt) <= new Date()

  const revoke = useMutation({
    mutationFn: () => revokeSupportAccess(access._id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tenant-detail', tenantId] }),
  })

  return (
    <li className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="truncate text-sm text-slate-800">
          {user?.name ?? 'Soporte'}
          <span className="ml-2 text-xs text-slate-400">
            {access.canWrite ? 'con cambios' : 'solo lectura'}
          </span>
        </p>
        <p className="truncate text-xs text-slate-500">{access.reason}</p>
        <p className="text-xs text-slate-400">
          {access.revokedAt
            ? `Revocado ${timeAgo(access.revokedAt)}`
            : expired
              ? `Vencido ${timeAgo(access.expiresAt)}`
              : `Vence ${formatDateTime(access.expiresAt)}`}
        </p>
      </div>

      {!access.revokedAt && !expired && (
        <Button
          size="sm"
          variant="ghost"
          disabled={revoke.isPending}
          onClick={() => revoke.mutate()}
        >
          Revocar
        </Button>
      )}
    </li>
  )
}

/** Aviso de que hay un acceso vigente, con el atajo para entrar al panel. */
function ActiveAccessBanner({
  access,
  tenantId,
  tenant,
}: {
  access: SupportAccess
  tenantId: string
  tenant: { _id: string; name: string; slug: string; logoUrl?: string; isActive: boolean }
}) {
  const navigate = useNavigate()
  const setActiveTenant = useAuthStore((s) => s.setActiveTenant)

  function enterPanel() {
    setActiveTenant({
      _id: tenantId,
      name: tenant.name,
      slug: tenant.slug,
      logoUrl: tenant.logoUrl,
      isActive: tenant.isActive,
      role: 'owner',
      support: {
        canWrite: access.canWrite,
        expiresAt: access.expiresAt,
        reason: access.reason,
      },
    })
    navigate('/orders')
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl bg-violet-50 px-4 py-3 text-sm text-violet-900 ring-1 ring-violet-200">
      <ShieldAlert size={16} className="shrink-0 text-violet-600" />
      <span className="min-w-0 flex-1">
        Acceso de soporte vigente ({access.canWrite ? 'con cambios' : 'solo lectura'}), vence{' '}
        {formatDateTime(access.expiresAt)}.
      </span>
      <Button size="sm" onClick={enterPanel}>
        <LogIn size={14} />
        Entrar al panel
      </Button>
    </div>
  )
}

function GrantAccessDialog({
  tenantId,
  tenantName,
  onClose,
}: {
  tenantId: string
  tenantName: string
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [reason, setReason] = useState('')
  const [minutes, setMinutes] = useState(60)
  const [canWrite, setCanWrite] = useState(false)
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: () => grantSupportAccess(tenantId, { reason: reason.trim(), minutes, canWrite }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenant-detail', tenantId] })
      onClose()
    },
    onError: (e) => setError(apiErrorMessage(e)),
  })

  return (
    <Modal
      title="Entrar como soporte"
      description={tenantName}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={!reason.trim() || mutation.isPending} onClick={() => mutation.mutate()}>
            <KeyRound size={15} />
            {mutation.isPending ? 'Creando…' : 'Crear acceso'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <Alert>{error}</Alert>}

        <p className="text-sm text-slate-600">
          Vas a poder usar el panel de este negocio como si fueras el dueño. Queda registrado en su
          bitácora con tu nombre y el motivo, y se vence solo.
        </p>

        <Field
          label="Motivo"
          htmlFor="access-reason"
          hint="Lo ve cualquier superadmin que revise la ficha del negocio."
        >
          <Textarea
            id="access-reason"
            rows={2}
            value={reason}
            placeholder="Ticket TK-4F2A91: no puede validar pagos"
            onChange={(e) => setReason(e.target.value)}
          />
        </Field>

        <Field label="Duración" htmlFor="access-minutes">
          <Select
            id="access-minutes"
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value))}
          >
            <option value={15}>15 minutos</option>
            <option value={60}>1 hora</option>
            <option value={240}>4 horas</option>
            <option value={480}>8 horas</option>
          </Select>
        </Field>

        <CheckboxField
          label="Permitir cambios"
          hint="Sin esto el acceso es de solo lectura, que alcanza para casi todo diagnóstico."
          checked={canWrite}
          onChange={setCanWrite}
        />

        <p className="flex items-start gap-2 text-xs text-slate-500">
          <Clock size={13} className="mt-0.5 shrink-0" />
          Al vencer, el negocio deja de aparecer en tu lista y cualquier acción se rechaza.
        </p>
      </div>
    </Modal>
  )
}
