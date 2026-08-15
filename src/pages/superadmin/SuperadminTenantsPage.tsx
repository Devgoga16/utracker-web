import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { assignSubscription, listSuperadminPlans, listSuperadminTenants } from '@/api/superadmin'
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

export function SuperadminTenantsPage() {
  const { data: tenants, isLoading } = useQuery({
    queryKey: ['superadmin-tenants'],
    queryFn: listSuperadminTenants,
  })

  const [assigning, setAssigning] = useState<string | null>(null)
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
                <>
                  <tr key={tenant._id} className="border-b border-slate-50 hover:bg-slate-50">
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
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          setAssigning((prev) => (prev === tenant._id ? null : tenant._id))
                        }
                      >
                        {assigning === tenant._id ? 'Cancelar' : 'Asignar plan'}
                      </Button>
                    </td>
                  </tr>
                  {assigning === tenant._id && (
                    <tr key={`${tenant._id}-form`}>
                      <td colSpan={5} className="px-4 pb-4">
                        <AssignForm tenant={tenant} onClose={() => setAssigning(null)} />
                      </td>
                    </tr>
                  )}
                </>
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
    </div>
  )
}
