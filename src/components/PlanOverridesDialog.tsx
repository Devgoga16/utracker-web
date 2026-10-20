import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { RotateCcw, SlidersHorizontal } from 'lucide-react'
import { getFeatureCatalog } from '@/api/plans'
import { assignSubscription } from '@/api/superadmin'
import {
  Alert,
  Badge,
  Button,
  Input,
  Modal,
  Select,
  Spinner,
} from '@/components/ui'
import type { FeatureDefinition, FeatureMap, Subscription } from '@/types'

type OverrideDraft = Record<string, boolean | number | null>

/**
 * Excepciones por negocio: cambiarle una funcionalidad o un límite sin tocar
 * su plan ni inventar uno nuevo.
 *
 * Existe porque los acuerdos puntuales son la norma, no la excepción:
 * "déjale 800 pedidos este mes", "regálale finanzas hasta fin de año". Sin
 * esto, cada acuerdo terminaba siendo un plan a medida más en la lista.
 */
export function PlanOverridesDialog({
  tenantId,
  tenantName,
  subscription,
  onClose,
}: {
  tenantId: string
  tenantName: string
  subscription: Subscription
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [draft, setDraft] = useState<OverrideDraft>({})

  const { data: catalog, isLoading } = useQuery({
    queryKey: ['feature-catalog'],
    queryFn: getFeatureCatalog,
    staleTime: Infinity,
  })

  const planFeatures = (subscription.plan?.features ?? {}) as FeatureMap
  const current = (subscription.overrides ?? {}) as FeatureMap

  const save = useMutation({
    mutationFn: () =>
      assignSubscription(tenantId, {
        planId: subscription.plan._id,
        status: subscription.status,
        expiresAt: subscription.expiresAt,
        notes: subscription.notes,
        overrides: draft,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenant-detail', tenantId] })
      qc.invalidateQueries({ queryKey: ['superadmin-tenants'] })
      onClose()
    },
  })

  /** Lo que va a quedar: el borrador si se tocó, si no la excepción vigente. */
  function effective(key: string): boolean | number | null | undefined {
    if (key in draft) return draft[key]
    return current[key as keyof FeatureMap] ?? undefined
  }

  function setValue(key: string, value: boolean | number | null) {
    setDraft((d) => ({ ...d, [key]: value }))
  }

  const touched = Object.keys(draft).length > 0

  return (
    <Modal
      title="Excepciones del plan"
      description={tenantName}
      onClose={onClose}
      wide
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={!touched || save.isPending} onClick={() => save.mutate()}>
            <SlidersHorizontal size={15} />
            {save.isPending ? 'Guardando…' : 'Guardar excepciones'}
          </Button>
        </>
      }
    >
      {isLoading ? (
        <Spinner />
      ) : (
        <div className="space-y-5">
          {save.isError && <Alert error={save.error} />}

          <p className="text-sm text-slate-600">
            Lo que dejes en <strong>«Según el plan»</strong> sigue al plan{' '}
            <strong>{subscription.plan?.name}</strong>. Lo que cambies vale solo para este negocio
            y queda por encima del plan, incluso si el plan cambia después.
          </p>

          {catalog?.groups.map((group) => (
            <div key={group.key} className="border-t border-slate-100 pt-4">
              <p className="mb-3 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                {group.label}
              </p>

              <ul className="space-y-3">
                {group.features.map((feature) => (
                  <OverrideRow
                    key={feature.key}
                    feature={feature}
                    planValue={planFeatures[feature.key]}
                    value={effective(feature.key)}
                    onChange={(v) => setValue(feature.key, v)}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}

function OverrideRow({
  feature,
  planValue,
  value,
  onChange,
}: {
  feature: FeatureDefinition
  planValue: boolean | number | undefined
  value: boolean | number | null | undefined
  onChange: (value: boolean | number | null) => void
}) {
  const isOverridden = value !== undefined && value !== null
  const fromPlan = feature.kind === 'flag' ? Boolean(planValue) : Number(planValue ?? 0)

  return (
    <li className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-800">
          {feature.label}
          {isOverridden && <Badge tone="brand">Excepción</Badge>}
        </p>
        <p className="text-xs text-slate-400">
          Según el plan:{' '}
          {feature.kind === 'flag'
            ? fromPlan
              ? 'incluida'
              : 'no incluida'
            : fromPlan === 0
              ? 'sin límite'
              : fromPlan}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {feature.kind === 'flag' ? (
          <Select
            className="w-auto"
            value={value === undefined || value === null ? '' : String(value)}
            onChange={(e) => onChange(e.target.value === '' ? null : e.target.value === 'true')}
          >
            <option value="">Según el plan</option>
            <option value="true">Incluida</option>
            <option value="false">No incluida</option>
          </Select>
        ) : (
          <>
            <Input
              type="number"
              min={0}
              className="w-28"
              placeholder="Plan"
              value={value === undefined || value === null ? '' : String(value)}
              onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
            />
            {isOverridden && (
              <button
                type="button"
                aria-label="Volver al valor del plan"
                title="Volver al valor del plan"
                onClick={() => onChange(null)}
                className="flex size-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <RotateCcw size={15} />
              </button>
            )}
          </>
        )}
      </div>
    </li>
  )
}
