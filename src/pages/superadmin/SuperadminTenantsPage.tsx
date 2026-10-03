import { Fragment, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Trash2, X } from 'lucide-react'
import {
  assignSubscription,
  deleteTenant,
  listSuperadminPlans,
  listSuperadminTenants,
  type DeletedTenantSummary,
} from '@/api/superadmin'
import { toggleTenantSubscription } from '@/api/billing'
import type { TenantRow } from '@/api/superadmin'
import { apiErrorMessage } from '@/api/client'
import { Alert, Button, Field, Input, PageHeader, Select, Spinner } from '@/components/ui'
import type { SubscriptionStatus } from '@/types'

const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  trial: 'Trial',
  active: 'Activa',
  suspended: 'Suspendida',
}

const STATUS_COLORS: Record<SubscriptionStatus, string> = {
  trial: 'bg-amber-100 text-amber-700',
  active: 'bg-emerald-100 text-emerald-700',
  suspended: 'bg-red-100 text-red-700',
}

function AssignForm({ tenant, onClose }: { tenant: TenantRow; onClose: () => void }) {
  const qc = useQueryClient()
  const { data: plans } = useQuery({ queryKey: ['superadmin-plans'], queryFn: listSuperadminPlans })

  const [planId, setPlanId] = useState(tenant.subscription?.plan?._id ?? '')
  const [status, setStatus] = useState<SubscriptionStatus>(tenant.subscription?.status ?? 'trial')
  const [expiresAt, setExpiresAt] = useState(
    tenant.subscription?.expiresAt ? tenant.subscription.expiresAt.slice(0, 10) : ''
  )
  const [notes, setNotes] = useState(tenant.subscription?.notes ?? '')
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: () =>
      assignSubscription(tenant._id, {
        planId,
        status,
        expiresAt: expiresAt || undefined,
        notes: notes.trim() || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['superadmin-tenants'] })
      onClose()
    },
    onError: (e) => setError(apiErrorMessage(e)),
  })

  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
      {error && <Alert>{error}</Alert>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Plan" htmlFor={`plan-${tenant._id}`}>
          <Select
            id={`plan-${tenant._id}`}
            value={planId}
            onChange={(e) => setPlanId(e.target.value)}
          >
            <option value="" disabled>
              Seleccionar plan...
            </option>
            {plans?.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Estado" htmlFor={`status-${tenant._id}`}>
          <Select
            id={`status-${tenant._id}`}
            value={status}
            onChange={(e) => setStatus(e.target.value as SubscriptionStatus)}
          >
            <option value="trial">Trial</option>
            <option value="active">Activa</option>
            <option value="suspended">Suspendida</option>
          </Select>
        </Field>
        <Field label="Vence (opcional)" htmlFor={`exp-${tenant._id}`}>
          <Input
            id={`exp-${tenant._id}`}
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
          />
        </Field>
        <Field label="Notas internas (opcional)" htmlFor={`notes-${tenant._id}`}>
          <Input
            id={`notes-${tenant._id}`}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>
      </div>
      <div className="mt-3 flex gap-2">
        <Button
          size="sm"
          disabled={!planId || mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? 'Guardando...' : 'Guardar'}
        </Button>
        <Button size="sm" variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
      </div>
    </div>
  )
}

function ToggleButton({ tenant }: { tenant: TenantRow }) {
  const qc = useQueryClient()
  const status = tenant.subscription?.status as SubscriptionStatus | undefined

  const mutation = useMutation({
    mutationFn: () => toggleTenantSubscription(tenant._id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['superadmin-tenants'] }),
  })

  if (!status || status === 'trial') return null

  return (
    <Button
      size="sm"
      variant={status === 'suspended' ? 'secondary' : 'ghost'}
      disabled={mutation.isPending}
      onClick={() => mutation.mutate()}
      className={status === 'active' ? 'text-red-600 hover:text-red-700' : ''}
    >
      {mutation.isPending
        ? '...'
        : status === 'active'
          ? 'Suspender'
          : 'Activar'}
    </Button>
  )
}

/** Lo que se va a borrar, dicho sin eufemismos antes de que no haya vuelta. */
const WHAT_GETS_DELETED = [
  'Todos los pedidos y su historial de estados',
  'El catálogo completo: productos, categorías e inventario',
  'Los clientes registrados del negocio',
  'Las campañas y sus links públicos',
  'Las facturas y la suscripción',
  'Los accesos de todo el equipo',
  'Las imágenes subidas (logo, fotos, comprobantes)',
]

function DeleteTenantDialog({
  tenant,
  onClose,
  onDeleted,
}: {
  tenant: TenantRow
  onClose: () => void
  onDeleted: (summary: DeletedTenantSummary) => void
}) {
  const qc = useQueryClient()
  const [typed, setTyped] = useState('')

  const mutation = useMutation({
    mutationFn: () => deleteTenant(tenant._id, typed.trim()),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['superadmin-tenants'] })
      qc.invalidateQueries({ queryKey: ['superadmin-stats'] })
      onDeleted(res.deleted)
      onClose()
    },
  })

  const matches = typed.trim() === tenant.name

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Eliminar ${tenant.name}`}
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-start gap-3 border-b border-slate-100 p-5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle size={20} className="text-red-600" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-bold text-slate-900">Eliminar negocio</h2>
            <p className="mt-0.5 truncate text-sm text-slate-500">{tenant.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {mutation.isError && <Alert>{apiErrorMessage(mutation.error)}</Alert>}

          <div className="rounded-xl bg-red-50 p-4 ring-1 ring-red-200">
            <p className="text-sm font-semibold text-red-900">
              Esto borra permanentemente:
            </p>
            <ul className="mt-2 space-y-1 text-[13px] text-red-800">
              {WHAT_GETS_DELETED.map((item) => (
                <li key={item} className="flex gap-2">
                  <span aria-hidden>•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[13px] font-semibold text-red-900">
              No hay forma de deshacerlo.
            </p>
          </div>

          <Field
            label={`Escribe "${tenant.name}" para confirmar`}
            htmlFor="confirm-tenant-name"
          >
            <Input
              id="confirm-tenant-name"
              value={typed}
              autoComplete="off"
              placeholder={tenant.name}
              onChange={(e) => setTyped(e.target.value)}
            />
          </Field>

          <div className="flex gap-2">
            <Button
              variant="danger"
              className="flex-1"
              disabled={!matches || mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? 'Eliminando...' : 'Eliminar definitivamente'}
            </Button>
            <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>
              Cancelar
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function SuperadminTenantsPage() {
  const { data: tenants, isLoading } = useQuery({
    queryKey: ['superadmin-tenants'],
    queryFn: listSuperadminTenants,
  })

  const [assigning, setAssigning] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<TenantRow | null>(null)
  const [lastDeleted, setLastDeleted] = useState<{
    name: string
    summary: DeletedTenantSummary
  } | null>(null)
  const [search, setSearch] = useState('')

  if (isLoading) return <Spinner />

  const filtered = tenants?.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.owner?.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Negocios"
        description="Lista de todos los tenants y sus suscripciones."
      />

      {lastDeleted && (
        <div className="flex items-start gap-3 rounded-xl bg-slate-900 px-4 py-3 text-white">
          <Trash2 size={16} className="mt-0.5 shrink-0 text-slate-400" />
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-semibold">«{lastDeleted.name}» fue eliminado</p>
            <p className="mt-0.5 text-slate-300">
              {lastDeleted.summary.orders} pedidos · {lastDeleted.summary.products} productos ·{' '}
              {lastDeleted.summary.customers} clientes · {lastDeleted.summary.campaigns} campañas ·{' '}
              {lastDeleted.summary.images} imágenes
            </p>
          </div>
          <button
            type="button"
            onClick={() => setLastDeleted(null)}
            aria-label="Cerrar aviso"
            className="shrink-0 rounded-lg p-1 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X size={15} />
          </button>
        </div>
      )}

      <div className="max-w-xs">
        <Input
          placeholder="Buscar por nombre o email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Negocio</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Owner</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Plan</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered?.map((tenant) => {
              const sub = tenant.subscription
              const status = sub?.status as SubscriptionStatus | undefined

              return (
                <Fragment key={tenant._id}>
                  <tr className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{tenant.name}</p>
                      <p className="text-xs text-slate-400">{tenant.slug}</p>
                    </td>
                    <td className="px-4 py-3">
                      {tenant.owner ? (
                        <>
                          <p className="text-slate-700">{tenant.owner.name}</p>
                          <p className="text-xs text-slate-400">{tenant.owner.email}</p>
                        </>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {sub?.plan ? (
                        <span className="text-slate-700">{(sub.plan as any).name}</span>
                      ) : (
                        <span className="text-slate-400">Sin plan</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {status ? (
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[status]}`}
                        >
                          {STATUS_LABELS[status]}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <ToggleButton tenant={tenant} />
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            setAssigning((prev) => (prev === tenant._id ? null : tenant._id))
                          }
                        >
                          {assigning === tenant._id ? 'Cancelar' : 'Asignar plan'}
                        </Button>
                        <button
                          type="button"
                          onClick={() => setDeleting(tenant)}
                          aria-label={`Eliminar ${tenant.name}`}
                          title="Eliminar negocio"
                          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {assigning === tenant._id && (
                    <tr>
                      <td colSpan={5} className="px-4 pb-4">
                        <AssignForm tenant={tenant} onClose={() => setAssigning(null)} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>

        {filtered?.length === 0 && (
          <div className="py-10 text-center text-sm text-slate-400">
            No se encontraron negocios.
          </div>
        )}
      </div>

      {deleting && (
        <DeleteTenantDialog
          tenant={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={(summary) => setLastDeleted({ name: deleting.name, summary })}
        />
      )}
    </div>
  )
}
