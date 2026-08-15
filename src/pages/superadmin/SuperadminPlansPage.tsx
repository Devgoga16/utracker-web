import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Plus, Trash2, X } from 'lucide-react'
import { createPlan, deletePlan, listSuperadminPlans, updatePlan } from '@/api/superadmin'
import { apiErrorMessage } from '@/api/client'
import { Alert, Button, Card, CheckboxField, Field, Input, PageHeader, Spinner } from '@/components/ui'
import type { Plan, PlanFeatures } from '@/types'
import { formatCurrency } from '@/lib/cn'

const emptyFeatures = (): PlanFeatures => ({
  maxOrdersPerMonth: 0,
  maxCatalogItems: 0,
  maxMembers: 0,
  maxWorkflowStates: 0,
  workflowCustomization: false,
  publicOrderLinks: false,
  imageUploads: false,
  deliveryTypes: false,
  publicTracking: false,
  advancePayments: false,
  inventory: false,
  finances: false,
})

const emptyForm = () => ({ name: '', description: '', price: 0, features: emptyFeatures() })

function planToForm(p: Plan) {
  return { name: p.name, description: p.description ?? '', price: p.price, features: { ...p.features } }
}

const FEATURE_FLAGS: (keyof PlanFeatures)[] = [
  'workflowCustomization',
  'publicOrderLinks',
  'imageUploads',
  'deliveryTypes',
  'publicTracking',
  'advancePayments',
  'inventory',
  'finances',
]

const FLAG_LABELS: Record<string, string> = {
  workflowCustomization: 'Workflow personalizable',
  publicOrderLinks: 'Links públicos de pedido',
  imageUploads: 'Subida de imágenes',
  deliveryTypes: 'Tipos de entrega',
  publicTracking: 'Seguimiento público',
  advancePayments: 'Adelantos de pago',
  inventory: 'Inventario',
  finances: 'Finanzas',
}

const LIMIT_KEYS: (keyof PlanFeatures)[] = [
  'maxOrdersPerMonth',
  'maxCatalogItems',
  'maxMembers',
  'maxWorkflowStates',
]

const LIMIT_LABELS: Record<string, string> = {
  maxOrdersPerMonth: 'Pedidos / mes (0 = ilimitado)',
  maxCatalogItems: 'Productos en catálogo (0 = ilimitado)',
  maxMembers: 'Miembros del equipo (0 = ilimitado)',
  maxWorkflowStates: 'Estados del workflow (0 = ilimitado)',
}

export function SuperadminPlansPage() {
  const qc = useQueryClient()
  const { data: plans, isLoading } = useQuery({
    queryKey: ['superadmin-plans'],
    queryFn: listSuperadminPlans,
  })

  const [editing, setEditing] = useState<Plan | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [error, setError] = useState('')

  function openCreate() {
    setForm(emptyForm())
    setEditing(null)
    setCreating(true)
    setError('')
  }

  function openEdit(p: Plan) {
    setForm(planToForm(p))
    setEditing(p)
    setCreating(true)
    setError('')
  }

  function closeForm() {
    setCreating(false)
    setEditing(null)
    setError('')
  }

  const saveMutation = useMutation({
    mutationFn: () =>
      editing
        ? updatePlan(editing._id, form)
        : createPlan(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['superadmin-plans'] })
      closeForm()
    },
    onError: (e) => setError(apiErrorMessage(e)),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePlan(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['superadmin-plans'] })
      setConfirmDelete(null)
    },
    onError: (e) => setError(apiErrorMessage(e)),
  })

  function setFeature(key: keyof PlanFeatures, value: boolean | number) {
    setForm((f) => ({ ...f, features: { ...f.features, [key]: value } }))
  }

  if (isLoading) return <Spinner />

  return (
    <div className="space-y-6">
      <PageHeader
        title="Planes"
        description="Define los planes de suscripción y sus límites."
        actions={
          <Button onClick={openCreate}>
            <Plus size={15} />
            Nuevo plan
          </Button>
        }
      />

      {error && <Alert>{error}</Alert>}

      {creating && (
        <Card title={editing ? `Editar: ${editing.name}` : 'Nuevo plan'}>
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nombre" htmlFor="p-name">
                <Input
                  id="p-name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </Field>
              <Field label="Precio referencial (S/)" htmlFor="p-price">
                <Input
                  id="p-price"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.price || ''}
                  onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))}
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Descripción (opcional)" htmlFor="p-desc">
                  <Input
                    id="p-desc"
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  />
                </Field>
              </div>
            </div>

            <div>
              <p className="mb-3 text-sm font-semibold text-slate-700">Límites numéricos</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {LIMIT_KEYS.map((key) => (
                  <Field key={key} label={LIMIT_LABELS[key]} htmlFor={`lim-${key}`}>
                    <Input
                      id={`lim-${key}`}
                      type="number"
                      min={0}
                      value={form.features[key] as number}
                      onChange={(e) => setFeature(key, Number(e.target.value))}
                    />
                  </Field>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-3 text-sm font-semibold text-slate-700">Funcionalidades</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {FEATURE_FLAGS.map((key) => (
                  <CheckboxField
                    key={key}
                    label={FLAG_LABELS[key]}
                    checked={form.features[key] as boolean}
                    onChange={(v) => setFeature(key, v)}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-2 border-t border-slate-100 pt-4">
              <Button
                disabled={!form.name || saveMutation.isPending}
                onClick={() => saveMutation.mutate()}
              >
                {saveMutation.isPending ? 'Guardando...' : 'Guardar plan'}
              </Button>
              <Button variant="ghost" onClick={closeForm}>
                Cancelar
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {plans?.map((plan) => (
          <Card key={plan._id} title={plan.name} description={plan.description}>
            <p className="text-2xl font-bold text-slate-900">
              {plan.price === 0 ? 'Gratis' : formatCurrency(plan.price)}
              {plan.price > 0 && <span className="text-sm font-normal text-slate-400"> / mes</span>}
            </p>

            <ul className="mt-3 space-y-1">
              {FEATURE_FLAGS.filter((k) => plan.features[k]).map((k) => (
                <li key={k} className="flex items-center gap-1.5 text-xs text-slate-600">
                  <Check size={12} className="text-emerald-500 shrink-0" />
                  {FLAG_LABELS[k]}
                </li>
              ))}
            </ul>

            <div className="mt-2 space-y-0.5">
              {LIMIT_KEYS.filter((k) => (plan.features[k] as number) > 0).map((k) => (
                <p key={k} className="text-xs text-slate-400">
                  {LIMIT_LABELS[k].split(' (')[0]}: {plan.features[k]}
                </p>
              ))}
            </div>

            {!plan.isActive && (
              <span className="mt-2 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-400">
                Inactivo
              </span>
            )}

            <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3">
              <Button size="sm" variant="secondary" onClick={() => openEdit(plan)}>
                Editar
              </Button>
              {confirmDelete === plan._id ? (
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={deleteMutation.isPending}
                    onClick={() => deleteMutation.mutate(plan._id)}
                  >
                    Confirmar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(null)}>
                    <X size={14} />
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(plan._id)}>
                  <Trash2 size={14} />
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {plans?.length === 0 && !creating && (
        <div className="rounded-xl border-2 border-dashed border-slate-200 py-12 text-center">
          <p className="text-sm text-slate-500">No hay planes todavía. Crea el primero.</p>
        </div>
      )}
    </div>
  )
}
