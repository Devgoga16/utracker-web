import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, Gift } from 'lucide-react'
import { listAllReferrals, setReferralRejected } from '@/api/referrals'
import { apiErrorMessage } from '@/api/client'
import { toast } from '@/stores/toastStore'
import { Alert, Badge, Button, EmptyState, PageHeader, Spinner, type Tone } from '@/components/ui'
import type { AdminReferral, ReferralStatus } from '@/types'

const STATUS: Record<ReferralStatus, { label: string; tone: Tone }> = {
  active: { label: 'Activo', tone: 'success' },
  pending: { label: 'Aún no paga', tone: 'warning' },
  inactive: { label: 'Inactivo', tone: 'neutral' },
  rejected: { label: 'Anulado', tone: 'danger' },
}

/**
 * Quién invitó a quién. Sirve para detectar al que se invita a sí mismo con
 * otro correo y anularlo: el descuento deja de correr desde la cuenta siguiente.
 */
export function SuperadminReferralsPage() {
  const {
    data: referrals,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['superadmin-referrals'],
    queryFn: listAllReferrals,
  })

  return (
    <div className="space-y-5">
      <PageHeader
        title="Referidos"
        count={referrals?.length}
        description="Negocios que llegaron con un link de invitación. Anula los que no correspondan."
      />

      {isLoading ? (
        <Spinner />
      ) : isError ? (
        <Alert error={error} />
      ) : !referrals?.length ? (
        <EmptyState
          icon={Gift}
          title="Todavía no hay referidos"
          description="Cuando un negocio se registre con el link de otro, aparecerá aquí."
        />
      ) : (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {referrals.map((r) => (
            <ReferralRow key={r._id} referral={r} />
          ))}
        </ul>
      )}
    </div>
  )
}

function ReferralRow({ referral: r }: { referral: AdminReferral }) {
  const qc = useQueryClient()
  const rejected = r.status === 'rejected'
  // Mismo teléfono en los dos lados: casi seguro es el mismo dueño.
  const samePhone = Boolean(r.phone && r.referrer?.phone && r.phone === r.referrer.phone)

  const mutation = useMutation({
    mutationFn: () => setReferralRejected(r._id, !rejected),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['superadmin-referrals'] })
      toast.success(rejected ? `${r.name} vuelve a contar` : `Referido de ${r.name} anulado`)
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  const st = STATUS[r.status]

  return (
    <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5 text-sm">
          {r.referrer ? (
            <Link
              to={`/superadmin/tenants/${r.referrer._id}`}
              className="truncate font-medium text-slate-700 hover:underline"
            >
              {r.referrer.name}
            </Link>
          ) : (
            <span className="text-slate-400">Negocio eliminado</span>
          )}
          <ArrowRight size={13} className="shrink-0 text-slate-400" />
          <Link
            to={`/superadmin/tenants/${r._id}`}
            className="truncate font-semibold text-slate-900 hover:underline"
          >
            {r.name}
          </Link>
          <Badge tone={st.tone} dot>
            {st.label}
          </Badge>
          {samePhone && !rejected && <Badge tone="danger">Mismo teléfono</Badge>}
        </div>
        <p className="mt-0.5 text-xs text-slate-500">
          Se registró el {new Date(r.createdAt).toLocaleDateString('es-PE')}
        </p>
      </div>
      <Button
        size="sm"
        variant={rejected ? 'secondary' : 'ghost'}
        disabled={mutation.isPending}
        onClick={() => mutation.mutate()}
      >
        {rejected ? 'Restituir' : 'Anular'}
      </Button>
    </li>
  )
}
