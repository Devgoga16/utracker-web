import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ArrowRight, Store, UserCheck } from 'lucide-react'
import { acceptInvitation, getPublicInvitation } from '@/api/team'
import { apiErrorMessage } from '@/api/client'
import { useAuthStore } from '@/stores/authStore'
import { Alert, Button, Field, Input, Spinner } from '@/components/ui'

const ROLE_HINTS: Record<string, string> = {
  owner: 'Vas a tener acceso total al negocio.',
  admin: 'Vas a poder manejar el catálogo, el workflow y los ajustes.',
  staff: 'Vas a trabajar los pedidos del día a día.',
  driver: 'Vas a mover las entregas en los estados que te habiliten.',
}

/**
 * Lo que abre el invitado. Público: el token de la URL es la credencial.
 *
 * Resuelve los dos casos en una sola pantalla: quien ya tiene cuenta en
 * uTracker pone su contraseña, y quien no la tiene la elige aquí mismo. En
 * ambos casos queda con la sesión abierta y adentro del negocio, porque
 * mandarlo al login después de aceptar es perderlo en el camino.
 */
export function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { setSession, setActiveTenant } = useAuthStore()

  const [name, setName] = useState('')
  const [password, setPassword] = useState('')

  const { data: invitation, isLoading, error } = useQuery({
    queryKey: ['invitation', token],
    queryFn: () => getPublicInvitation(token!),
    enabled: Boolean(token),
    retry: false,
  })

  const accept = useMutation({
    mutationFn: () =>
      acceptInvitation(token!, {
        name: invitation?.needsAccount ? name.trim() : undefined,
        password,
      }),
    onSuccess: (res) => {
      setSession({
        user: res.user,
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
      })
      // Entra directo al negocio que lo invitó, sin pasar por el selector.
      if (res.tenant) setActiveTenant(res.tenant)
      navigate(res.tenant ? '/orders' : '/tenants', { replace: true })
    },
  })

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Spinner />
      </div>
    )
  }

  /* La invitación no sirve: vencida, cancelada o ya usada. */
  if (error || !invitation) {
    return (
      <Shell>
        <h1 className="text-lg font-semibold text-slate-900">Esta invitación no se puede usar</h1>
        <p className="mt-2 text-sm text-slate-600">{apiErrorMessage(error)}</p>
        <Link to="/login" className="mt-5 inline-block">
          <Button variant="secondary">Ir a iniciar sesión</Button>
        </Link>
      </Shell>
    )
  }

  const canSubmit =
    password.length > 0 && (!invitation.needsAccount || name.trim().length > 0)

  return (
    <Shell>
      <div className="flex items-center gap-3">
        {invitation.business.logoUrl ? (
          <img
            src={invitation.business.logoUrl}
            alt=""
            className="size-12 shrink-0 rounded-xl object-cover ring-1 ring-slate-200"
          />
        ) : (
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <Store size={20} />
          </span>
        )}
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
            Invitación a un equipo
          </p>
          <h1 className="truncate text-lg font-bold text-slate-900">
            {invitation.business.name}
          </h1>
        </div>
      </div>

      <p className="mt-4 text-sm text-slate-600">
        {invitation.invitedBy ? `${invitation.invitedBy} te invitó` : 'Te invitaron'} a trabajar en{' '}
        <strong>{invitation.business.name}</strong> como{' '}
        <strong>{invitation.roleLabel.toLowerCase()}</strong>.{' '}
        {ROLE_HINTS[invitation.role]}
      </p>

      <div className="mt-5 space-y-4 border-t border-slate-200 pt-5">
        {accept.isError && <Alert error={accept.error} />}

        <Field label="Tu correo" htmlFor="invite-email" hint="Es con el que vas a entrar.">
          <Input id="invite-email" value={invitation.email} readOnly disabled />
        </Field>

        {invitation.needsAccount ? (
          <>
            <Field label="Tu nombre" htmlFor="accept-name">
              <Input
                id="accept-name"
                autoFocus
                value={name}
                placeholder="María Sánchez"
                onChange={(e) => setName(e.target.value)}
              />
            </Field>

            <Field
              label="Elige una contraseña"
              htmlFor="accept-password"
              hint="Al menos 8 caracteres."
            >
              <Input
                id="accept-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
          </>
        ) : (
          <Field
            label="Tu contraseña de uTracker"
            htmlFor="accept-password"
            hint={
              invitation.name
                ? `Ya tienes cuenta como ${invitation.name}. Confirma que eres tú.`
                : 'Ya tienes una cuenta con este correo.'
            }
          >
            <Input
              id="accept-password"
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && canSubmit && accept.mutate()}
            />
          </Field>
        )}

        <Button
          className="w-full"
          disabled={!canSubmit || accept.isPending}
          onClick={() => accept.mutate()}
        >
          {invitation.needsAccount ? <UserCheck size={16} /> : <ArrowRight size={16} />}
          {accept.isPending
            ? 'Entrando…'
            : invitation.needsAccount
              ? 'Crear mi cuenta y entrar'
              : 'Aceptar y entrar'}
        </Button>
      </div>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-card ring-1 ring-slate-200 sm:p-7">
        {children}
      </div>
    </div>
  )
}
