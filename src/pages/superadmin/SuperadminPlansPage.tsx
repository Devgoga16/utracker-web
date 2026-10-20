import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Check, Eye, EyeOff, Package, Plus, Users } from 'lucide-react'
import {
  createPlan,
  deletePlan,
  getFeatureCatalog,
  listPlansAdmin,
  updatePlan,
  type PlanInput,
} from '@/api/plans'
import {
  Alert,
  Badge,
  Button,
  Card,
  CheckboxField,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
  Spinner,
  Textarea,
} from '@/components/ui'
import { cn, formatCurrency } from '@/lib/cn'
import type { FeatureDefinition, FeatureMap, Plan } from '@/types'

/**
 * Planes de suscripción.
 *
 * El formulario no enumera ninguna funcionalidad: se dibuja con el catálogo
 * que sirve la API. Agregar una funcionalidad al sistema es agregarla al
 * catálogo y nada más — esta pantalla la muestra sola, agrupada y con su
 * etiqueta.
 */
export function SuperadminPlansPage() {
  const qc = useQueryClient()

  const { data: catalog, isLoading: catalogLoading } = useQuery({
    queryKey: ['feature-catalog'],
    queryFn: getFeatureCatalog,
    staleTime: Infinity,
  })

  const { data: plans, isLoading } = useQuery({
    queryKey: ['superadmin-plans'],
    queryFn: listPlansAdmin,
  })

  const [editing, setEditing] = useState<Plan | null>(null)
  const [creating, setCreating] = useState(false)
  const [retireTarget, setRetireTarget] = useState<Plan | null>(null)
  const [notice, setNotice] = useState('')

  const retire = useMutation({
    mutationFn: (id: string) => deletePlan(id),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['superadmin-plans'] })
      setRetireTarget(null)
      setNotice(res.message ?? 'El plan se eliminó.')
    },
  })

  if (isLoading || catalogLoading) return <Spinner />

  const allFeatures = catalog?.groups.flatMap((g) => g.features) ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Planes"
        description="Qué incluye cada plan. Lo que edites aquí se aplica al instante a todos los negocios que lo tienen."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus size={15} />
            <span className="hidden sm:inline">Nuevo plan</span>
            <span className="sm:hidden">Nuevo</span>
          </Button>
        }
      />

      {notice && (
        <div className="rounded-xl bg-slate-900 px-4 py-3 text-sm text-white">{notice}</div>
      )}

      {retire.isError && <Alert error={retire.error} />}

      {!plans?.length ? (
        <EmptyState
          icon={Package}
          title="No hay planes todavía"
          description="Crea el primero. Hasta entonces, los negocios sin suscripción operan sin límites."
          action={
            <Button onClick={() => setCreating(true)}>
              <Plus size={15} />
              Crear un plan
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan) => (
            <PlanCard
              key={plan._id}
              plan={plan}
              features={allFeatures}
              onEdit={() => setEditing(plan)}
              onRetire={() => setRetireTarget(plan)}
            />
          ))}
        </div>
      )}

      {(creating || editing) && catalog && (
        <PlanForm
          plan={editing}
          catalog={catalog.groups}
          onClose={() => {
            setCreating(false)
            setEditing(null)
          }}
        />
      )}

      {retireTarget && (
        <Modal
          title={
            retireTarget.tenantCount ? 'Retirar el plan' : `Eliminar "${retireTarget.name}"`
          }
          onClose={() => setRetireTarget(null)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setRetireTarget(null)}>
                Cancelar
              </Button>
              <Button
                variant="danger"
                disabled={retire.isPending}
                onClick={() => retire.mutate(retireTarget._id)}
              >
                {retire.isPending
                  ? 'Procesando…'
                  : retireTarget.tenantCount
                    ? 'Retirar'
                    : 'Eliminar'}
              </Button>
            </>
          }
        >
          {retireTarget.tenantCount ? (
            <p className="text-sm text-slate-600">
              Lo usan <strong>{retireTarget.tenantCount}</strong> negocio(s), así que no se puede
              borrar: quedaría una suscripción apuntando a la nada. Se va a marcar{' '}
              <strong>inactivo y no público</strong>, así nadie nuevo lo contrata y los que ya lo
              tienen siguen funcionando igual.
            </p>
          ) : (
            <p className="text-sm text-slate-600">
              Ningún negocio lo tiene, así que se borra de verdad. No se puede deshacer.
            </p>
          )}
        </Modal>
      )}
    </div>
  )
}

function PlanCard({
  plan,
  features,
  onEdit,
  onRetire,
}: {
  plan: Plan
  features: FeatureDefinition[]
  onEdit: () => void
  onRetire: () => void
}) {
  const flags = features.filter((f) => f.kind === 'flag' && plan.features[f.key])
  const limits = features.filter((f) => f.kind === 'limit')

  return (
    <Card
      title={
        <span className="flex flex-wrap items-center gap-2">
          {plan.name}
          {!plan.isActive && <Badge tone="slate">Inactivo</Badge>}
          {!plan.isPublic && (
            <Badge tone="slate">
              <EyeOff size={11} />
              Oculto
            </Badge>
          )}
        </span>
      }
      description={plan.description}
    >
      <div className="flex items-end justify-between gap-3">
        <p className="text-2xl font-bold text-slate-900">
          {plan.price === 0 ? 'Gratis' : formatCurrency(plan.price)}
          {plan.price > 0 && <span className="text-sm font-normal text-slate-400"> /mes</span>}
        </p>
        {!!plan.tenantCount && (
          <span className="flex items-center gap-1.5 text-xs text-slate-400">
            <Users size={13} />
            {plan.tenantCount} negocio{plan.tenantCount === 1 ? '' : 's'}
          </span>
        )}
      </div>

      {plan.code && <p className="mt-0.5 font-mono text-xs text-slate-400">{plan.code}</p>}

      <dl className="mt-3 space-y-0.5 border-t border-slate-100 pt-3 text-xs">
        {limits.map((f) => {
          const value = Number(plan.features[f.key] ?? 0)
          return (
            <div key={f.key} className="flex justify-between gap-2">
              <dt className="truncate text-slate-500">{f.label}</dt>
              <dd className="shrink-0 font-medium tabular-nums text-slate-700">
                {value === 0 ? 'Sin límite' : value}
              </dd>
            </div>
          )
        })}
      </dl>

      <ul className="mt-3 space-y-1 border-t border-slate-100 pt-3">
        {flags.length === 0 && (
          <li className="text-xs text-slate-400">Sin funcionalidades adicionales.</li>
        )}
        {flags.map((f) => (
          <li key={f.key} className="flex items-start gap-1.5 text-xs text-slate-600">
            <Check size={12} className="mt-0.5 shrink-0 text-emerald-500" />
            {f.label}
          </li>
        ))}
      </ul>

      <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3">
        <Button size="sm" variant="secondary" onClick={onEdit}>
          Editar
        </Button>
        <Button size="sm" variant="ghost" onClick={onRetire}>
          {plan.tenantCount ? 'Retirar' : 'Eliminar'}
        </Button>
      </div>
    </Card>
  )
}

function PlanForm({
  plan,
  catalog,
  onClose,
}: {
  plan: Plan | null
  catalog: { key: string; label: string; features: FeatureDefinition[] }[]
  onClose: () => void
}) {
  const qc = useQueryClient()

  const [form, setForm] = useState<PlanInput>(() => ({
    code: plan?.code ?? '',
    name: plan?.name ?? '',
    description: plan?.description ?? '',
    price: plan?.price ?? 0,
    priceYearly: plan?.priceYearly ?? null,
    features: { ...(plan?.features ?? {}) } as FeatureMap,
    isPublic: plan?.isPublic ?? true,
    isActive: plan?.isActive ?? true,
    sortOrder: plan?.sortOrder ?? 0,
  }))

  // Si se cambia de plan sin cerrar el diálogo, el formulario se rearma.
  useEffect(() => {
    setForm({
      code: plan?.code ?? '',
      name: plan?.name ?? '',
      description: plan?.description ?? '',
      price: plan?.price ?? 0,
      priceYearly: plan?.priceYearly ?? null,
      features: { ...(plan?.features ?? {}) } as FeatureMap,
      isPublic: plan?.isPublic ?? true,
      isActive: plan?.isActive ?? true,
      sortOrder: plan?.sortOrder ?? 0,
    })
  }, [plan])

  const save = useMutation({
    mutationFn: () => {
      const payload: PlanInput = {
        ...form,
        description: form.description?.trim() || undefined,
        priceYearly: form.priceYearly ? Number(form.priceYearly) : null,
      }
      // El código no se edita: es lo que referencian los enlaces y los acuerdos.
      if (plan) {
        const { code: _code, ...rest } = payload
        return updatePlan(plan._id, rest)
      }
      return createPlan({ ...payload, code: payload.code?.trim() || undefined })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['superadmin-plans'] })
      onClose()
    },
  })

  function setFeature(key: FeatureDefinition['key'], value: boolean | number) {
    setForm((f) => ({ ...f, features: { ...f.features, [key]: value } }))
  }

  return (
    <Modal
      title={plan ? `Editar: ${plan.name}` : 'Nuevo plan'}
      description={
        plan?.tenantCount
          ? `Lo usan ${plan.tenantCount} negocio(s): el cambio les aplica al instante.`
          : 'Elige qué incluye y qué bloquea.'
      }
      onClose={onClose}
      wide
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={!form.name.trim() || save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? 'Guardando…' : 'Guardar plan'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {save.isError && <Alert error={save.error} />}

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nombre" htmlFor="plan-name">
            <Input
              id="plan-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </Field>

          <Field
            label="Código"
            htmlFor="plan-code"
            hint={plan ? 'No se puede cambiar.' : 'Si lo dejas vacío, sale del nombre.'}
          >
            <Input
              id="plan-code"
              value={form.code ?? ''}
              disabled={Boolean(plan)}
              placeholder="negocio"
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
            />
          </Field>

          <Field label="Precio mensual (S/)" htmlFor="plan-price">
            <Input
              id="plan-price"
              type="number"
              min={0}
              step="0.01"
              value={form.price || ''}
              onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))}
            />
          </Field>

          <Field
            label="Precio anual (S/)"
            htmlFor="plan-price-year"
            hint="El año completo, ya con descuento. Opcional."
          >
            <Input
              id="plan-price-year"
              type="number"
              min={0}
              step="0.01"
              value={form.priceYearly ?? ''}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  priceYearly: e.target.value === '' ? null : Number(e.target.value),
                }))
              }
            />
          </Field>

          <div className="sm:col-span-2">
            <Field label="Descripción" htmlFor="plan-desc" hint="Una línea, para la tarjeta.">
              <Textarea
                id="plan-desc"
                rows={2}
                value={form.description ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </Field>
          </div>

          <Field label="Orden" htmlFor="plan-order" hint="Menor primero.">
            <Input
              id="plan-order"
              type="number"
              value={form.sortOrder}
              onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))}
            />
          </Field>

          <div className="space-y-2 self-end">
            <CheckboxField
              label="Se puede contratar"
              hint="Uno inactivo sigue valiendo para quien ya lo tiene."
              checked={form.isActive}
              onChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
            />
            <CheckboxField
              label="Visible en la página de precios"
              checked={form.isPublic}
              onChange={(v) => setForm((f) => ({ ...f, isPublic: v }))}
            />
          </div>
        </div>

        {/* Todo lo de abajo sale del catálogo de la API, no de esta pantalla. */}
        {catalog.map((group) => (
          <div key={group.key} className="border-t border-slate-100 pt-4">
            <p className="mb-3 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
              {group.label}
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              {group.features.map((feature) =>
                feature.kind === 'limit' ? (
                  <Field
                    key={feature.key}
                    label={feature.label}
                    htmlFor={`f-${feature.key}`}
                    hint={limitHint(feature)}
                  >
                    <Input
                      id={`f-${feature.key}`}
                      type="number"
                      min={0}
                      placeholder="0 = sin límite"
                      value={(form.features[feature.key] as number) ?? ''}
                      onChange={(e) => setFeature(feature.key, Number(e.target.value) || 0)}
                    />
                  </Field>
                ) : (
                  <div key={feature.key}>
                    <CheckboxField
                      label={feature.label}
                      hint={feature.hint}
                      checked={Boolean(form.features[feature.key])}
                      onChange={(v) => setFeature(feature.key, v)}
                    />
                    <EnforcementNote feature={feature} />
                  </div>
                ),
              )}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  )
}

function limitHint(feature: FeatureDefinition): string {
  const base = '0 = sin límite.'
  return feature.hint ? `${base} ${feature.hint}` : base
}

/**
 * Avisa cuando apagar la funcionalidad no bloquea nada en el servidor.
 *
 * Es la diferencia entre un plan y una promesa: si la API no lo rechaza, el
 * negocio lo va a poder usar igual y conviene saberlo antes de venderlo.
 */
function EnforcementNote({ feature }: { feature: FeatureDefinition }) {
  if (feature.enforcement === 'api') return null

  return (
    <p
      className={cn(
        'mt-1 ml-6.5 flex items-start gap-1 text-xs',
        feature.enforcement === 'none' ? 'text-amber-600' : 'text-slate-400',
      )}
    >
      {feature.enforcement === 'none' ? (
        <>
          <AlertTriangle size={11} className="mt-0.5 shrink-0" />
          No bloquea nada todavía: el valor se guarda y no tiene efecto.
        </>
      ) : (
        <>
          <Eye size={11} className="mt-0.5 shrink-0" />
          Solo se esconde del panel; no hay endpoint que bloquear.
        </>
      )}
    </p>
  )
}
