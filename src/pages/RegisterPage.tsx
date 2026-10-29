import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { Gift } from 'lucide-react'
import { register } from '@/api/auth'
import { useAuthStore } from '@/stores/authStore'
import { Alert, Banner, Button, Field, Input } from '@/components/ui'
import { AuthShell } from '@/components/AuthShell'
import {
  clearPendingReferral,
  normalizeReferralCode,
  readPendingReferral,
  savePendingReferral,
} from '@/lib/referral'
import { ReferralCodeField } from '@/components/ReferralCodeField'
import { useReferralLookup } from '@/hooks/useReferralLookup'

export function RegisterPage() {
  const navigate = useNavigate()
  const setSession = useAuthStore((s) => s.setSession)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // El código del link se guarda: el negocio se crea después, en otra pantalla.
  const [searchParams] = useSearchParams()
  const refParam = searchParams.get('ref')
  useEffect(() => {
    if (refParam) savePendingReferral(refParam)
  }, [refParam])

  /*
   * También se puede escribir a mano: quien lo vio en una publicidad tiene el
   * código, no el link. Con link, el campo ya viene lleno.
   */
  const [code, setCode] = useState(() =>
    normalizeReferralCode(refParam ?? readPendingReferral() ?? ''),
  )
  const [showCode, setShowCode] = useState(Boolean(code))
  const lookup = useReferralLookup(code)
  const referrer = lookup.referrer
  // Un código mal escrito no se deja pasar callado: perdería su promo sin enterarse.
  const blockedByCode = Boolean(code) && (lookup.invalid || lookup.checking)

  const mutation = useMutation({
    mutationFn: () => register({ name, email, password }),
    onSuccess: (session) => {
      if (code && referrer) savePendingReferral(code)
      else clearPendingReferral()
      setSession(session)
      navigate('/tenants')
    },
  })

  return (
    <AuthShell
      title="Crea tu cuenta"
      subtitle="Sin tarjeta y sin contrato. Lleva menos de un minuto."
      footer={
        <>
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="font-medium text-brand-600 hover:underline">
            Ingresa
          </Link>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (blockedByCode) return
          mutation.mutate()
        }}
      >
        {referrer && refParam && (
          <Banner tone="success" icon={Gift} title={`Te invitó ${referrer.name}`}>
            Tus primeros {referrer.promoMonths} meses del plan Negocio te salen al precio de
            Emprende.
          </Banner>
        )}

        {mutation.isError && <Alert error={mutation.error} />}

        <Field label="Tu nombre" htmlFor="name">
          <Input
            id="name"
            required
            autoFocus
            autoComplete="name"
            placeholder="María Sánchez"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>

        <Field label="Tu correo" htmlFor="email">
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            placeholder="maria@minegocio.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>

        <Field label="Contraseña" htmlFor="password" hint="Al menos 8 caracteres.">
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>

        {showCode ? (
          <ReferralCodeField
            value={code}
            onChange={setCode}
            lookup={lookup}
            autoFocus={!refParam && !code}
          />
        ) : (
          <button
            type="button"
            onClick={() => setShowCode(true)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:underline"
          >
            <Gift size={14} />
            ¿Tienes un código de invitación?
          </button>
        )}

        <Button
          type="submit"
          className="w-full py-3"
          disabled={mutation.isPending || blockedByCode}
        >
          {mutation.isPending ? 'Creando tu cuenta…' : 'Crear mi cuenta'}
        </Button>
      </form>
    </AuthShell>
  )
}
