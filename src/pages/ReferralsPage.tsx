import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Check, Copy, MessageCircle, Users } from 'lucide-react'
import { getMyReferrals } from '@/api/referrals'
import { useAuthStore } from '@/stores/authStore'
import { useSubscription } from '@/hooks/useSubscription'
import { toast } from '@/stores/toastStore'
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  PageHeader,
  Spinner,
  type Tone,
} from '@/components/ui'
import { formatCurrency } from '@/lib/cn'
import { referralLink } from '@/lib/referral'
import type { ReferralStatus } from '@/types'

const STATUS: Record<ReferralStatus, { label: string; tone: Tone; hint: string }> = {
  active: { label: 'Activo', tone: 'success', hint: 'Te descuenta cada mes' },
  pending: { label: 'Aún no paga', tone: 'warning', hint: 'Cuenta cuando pague su primer mes' },
  inactive: { label: 'Inactivo', tone: 'neutral', hint: 'Vuelve a contar cuando se ponga al día' },
  rejected: { label: 'Anulado', tone: 'danger', hint: 'No cuenta para el descuento' },
}

/**
 * Invita y gana: el negocio comparte su link y paga menos por cada invitado
 * que siga activo. El descuento lo aplica la API al generar la cuenta del mes;
 * aquí solo se muestra.
 */
export function ReferralsPage() {
  const tenantName = useAuthStore((s) => s.activeTenant?.name)
  const { plan } = useSubscription()
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['my-referrals'],
    queryFn: getMyReferrals,
  })

  if (isLoading) return <Spinner />
  if (isError || !data) return <Alert error={error} />

  const link = referralLink(data.code)
  const message =
    `¡Hola! Uso uTracker para manejar los pedidos de ${tenantName ?? 'mi negocio'}. ` +
    `Si te registras con mi link, tus primeros ${data.promoMonths} meses del plan Negocio ` +
    `te salen al precio de Emprende: ${link}`

  // Cuánto falta para que el plan salga gratis. Sin plan pagado no aplica.
  const planPrice = plan?.price ?? 0
  const coveredPct = planPrice > 0 ? Math.min(100, (data.monthlyDiscount / planPrice) * 100) : 0
  const missing =
    planPrice > 0
      ? Math.max(0, Math.ceil((planPrice - data.monthlyDiscount) / data.discountPerReferral))
      : 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invita y gana"
        description={`Por cada negocio que invites y siga activo, pagas ${formatCurrency(data.discountPerReferral)} menos al mes.`}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Tu descuento">
          <p className="text-3xl font-semibold tracking-tight text-slate-900 tabular-nums">
            {formatCurrency(data.monthlyDiscount)}
            <span className="ml-1 text-base font-normal text-slate-500">menos al mes</span>
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {data.activeCount === 1 ? '1 invitado activo' : `${data.activeCount} invitados activos`}
          </p>

          {planPrice > 0 && (
            <div className="mt-4">
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-success-500 transition-[width]"
                  style={{ width: `${coveredPct}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-slate-500">
                {missing === 0
                  ? `Tu plan ${plan?.name} te sale gratis. ¡Bien hecho!`
                  : `Te ${missing === 1 ? 'falta 1 invitado' : `faltan ${missing} invitados`} para que tu plan ${plan?.name} (${formatCurrency(planPrice)}) te salga gratis.`}
              </p>
            </div>
          )}
        </Card>

        <Card title="Tu link de invitación">
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="min-w-0 flex-1 truncate font-mono text-sm text-slate-700">{link}</p>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Tu código: <span className="font-mono font-semibold text-slate-900">{data.code}</span>
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(message)}`}
              target="_blank"
              rel="noreferrer"
              className="focus-ring inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[#25D366] px-3 text-[13px] font-medium text-white hover:bg-[#1ebe5b]"
            >
              <MessageCircle size={15} />
              Compartir por WhatsApp
            </a>
            <CopyButton text={link} label="Copiar link" />
            <CopyButton text={message} label="Copiar mensaje" variant="ghost" />
          </div>
        </Card>
      </div>

      <Card title="Cómo funciona">
        <ol className="grid gap-4 sm:grid-cols-3">
          {[
            [
              'Comparte tu link',
              'Por WhatsApp, en tu grupo de emprendedores o a un negocio amigo.',
            ],
            [
              'Se registra y paga',
              `Sus primeros ${data.promoMonths} meses del plan Negocio le salen al precio de Emprende.`,
            ],
            [
              'Tú pagas menos',
              `Mientras siga activo, tu cuenta del mes baja ${formatCurrency(data.discountPerReferral)}. Hasta que te salga gratis.`,
            ],
          ].map(([title, text], i) => (
            <li key={title} className="flex gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700">
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="font-medium text-slate-900">{title}</p>
                <p className="mt-0.5 text-sm text-slate-500">{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </Card>

      <div>
        <h2 className="mb-3 font-semibold text-slate-800">Tus invitados</h2>
        {data.referrals.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Todavía no invitaste a nadie"
            description="Cuando un negocio se registre con tu link, aparecerá aquí."
          />
        ) : (
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
            {data.referrals.map((r) => {
              const st = STATUS[r.status]
              return (
                <li key={r._id} className="flex items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-900">{r.name}</p>
                    <p className="truncate text-xs text-slate-500">
                      Se registró el {new Date(r.createdAt).toLocaleDateString('es-PE')} · {st.hint}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <Badge tone={st.tone} dot>
                      {st.label}
                    </Badge>
                    {r.status === 'active' && (
                      <span className="text-xs font-medium text-success-700 tabular-nums">
                        −{formatCurrency(data.discountPerReferral)}/mes
                      </span>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

function CopyButton({
  text,
  label,
  variant = 'secondary',
}: {
  text: string
  label: string
  variant?: 'secondary' | 'ghost'
}) {
  const [copied, setCopied] = useState(false)

  return (
    <Button
      variant={variant}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        } catch {
          toast.error('No se pudo copiar. Selecciónalo y cópialo a mano.')
        }
      }}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {copied ? 'Copiado' : label}
    </Button>
  )
}
