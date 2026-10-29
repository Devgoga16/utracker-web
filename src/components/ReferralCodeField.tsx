import { Check, Gift } from 'lucide-react'
import { Field, Input } from '@/components/ui'
import { normalizeReferralCode } from '@/lib/referral'
import type { useReferralLookup } from '@/hooks/useReferralLookup'

/**
 * El código de invitación escrito a mano: para quien lo vio en una publicidad,
 * un flyer o un post, y no tiene el link.
 */
export function ReferralCodeField({
  value,
  onChange,
  lookup,
  autoFocus,
}: {
  value: string
  onChange: (value: string) => void
  lookup: ReturnType<typeof useReferralLookup>
  autoFocus?: boolean
}) {
  const { referrer, checking, invalid } = lookup

  return (
    <Field
      label="Código de invitación"
      htmlFor="referral-code"
      hint={
        referrer ? (
          <span className="inline-flex items-start gap-1 text-success-700">
            <Check size={13} className="mt-px shrink-0" />
            <span>
              Te invitó {referrer.name}: tus primeros {referrer.promoMonths} meses del plan Negocio
              te salen al precio de Emprende.
            </span>
          </span>
        ) : invalid ? (
          <span className="text-danger-600">Ese código no existe. Revísalo o bórralo.</span>
        ) : checking ? (
          'Buscando…'
        ) : (
          'Opcional. Si un negocio te recomendó uTracker, escribe su código.'
        )
      }
    >
      <div className="relative">
        <Gift
          size={15}
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
        />
        <Input
          id="referral-code"
          autoFocus={autoFocus}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={16}
          placeholder="Ej. DOMINOR"
          value={value}
          onChange={(e) => onChange(normalizeReferralCode(e.target.value))}
          className="pl-9 font-mono tracking-wide uppercase"
          aria-invalid={invalid || undefined}
        />
      </div>
    </Field>
  )
}
