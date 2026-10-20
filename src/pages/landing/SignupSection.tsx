import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { ArrowRight, Check, Clock, CreditCard, ShieldCheck } from 'lucide-react'
import { register } from '@/api/auth'
import { useAuthStore } from '@/stores/authStore'
import { Alert, Button, Field, Input } from '@/components/ui'
import { Accent, Eyebrow, Halo, Headline, Reveal } from './primitives'

const REASONS: { icon: typeof Clock; title: string; body: string }[] = [
  {
    icon: Clock,
    title: 'Listo en una tarde',
    body: 'Creas tu negocio, cargas tu catálogo y mandas el primer link de seguimiento el mismo día.',
  },
  {
    icon: CreditCard,
    title: 'Sin tarjeta para empezar',
    body: 'No pedimos datos de pago para crear la cuenta. Cuando quieras seguir, arreglamos.',
  },
  {
    icon: ShieldCheck,
    title: 'Tus datos son tuyos',
    body: 'Cada negocio ve solo lo suyo, y puedes sacar a cualquiera del equipo en un clic.',
  },
]

/**
 * Registro dentro de la landing, no un enlace a otra página.
 *
 * Cada pantalla intermedia entre "me convenció" y "ya estoy adentro" pierde
 * gente. Aquí el formulario es el mismo de /register —misma API, mismo manejo
 * de error— pero sin hacer que nadie navegue para encontrarlo.
 */
export function SignupSection() {
  const navigate = useNavigate()
  const setSession = useAuthStore((s) => s.setSession)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const mutation = useMutation({
    mutationFn: () => register({ name: name.trim(), email: email.trim(), password }),
    onSuccess: (session) => {
      setSession(session)
      // Lo primero que necesita es un negocio; el selector lo pide ahí.
      navigate('/tenants')
    },
  })

  const canSubmit = name.trim() && email.trim() && password.length >= 8

  return (
    <section
      id="crear-cuenta"
      className="relative scroll-mt-20 overflow-hidden bg-ink py-20 text-white sm:py-28"
    >
      <Halo className="-top-40 left-1/2 size-[46rem] -translate-x-1/2" strength={26} />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          {/* ── Por qué ── */}
          <Reveal>
            <Eyebrow dark>Crear tu cuenta</Eyebrow>
            <Headline className="mt-4">
              Deja el cuaderno
              <br />
              <Accent className="text-brand-300">esta semana.</Accent>
            </Headline>

            <ul className="mt-8 space-y-5">
              {REASONS.map((reason) => (
                <li key={reason.title} className="flex gap-3.5">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-brand-300">
                    <reason.icon size={17} />
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-white">{reason.title}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-slate-400">{reason.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Reveal>

          {/* ── Formulario ── */}
          <Reveal delay={140}>
            <div className="rounded-[1.75rem] bg-white p-6 text-slate-900 shadow-float sm:p-8">
              <p className="text-lg font-semibold text-slate-900">Empieza gratis</p>
              <p className="mt-1 text-sm text-slate-500">
                Te toma menos de un minuto. No pedimos tarjeta.
              </p>

              <form
                className="mt-6 space-y-4"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (canSubmit) mutation.mutate()
                }}
              >
                {mutation.isError && <Alert error={mutation.error} />}

                <Field label="Tu nombre" htmlFor="signup-name">
                  <Input
                    id="signup-name"
                    required
                    autoComplete="name"
                    placeholder="María Sánchez"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </Field>

                <Field label="Tu correo" htmlFor="signup-email">
                  <Input
                    id="signup-email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="maria@minegocio.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </Field>

                <Field
                  label="Contraseña"
                  htmlFor="signup-password"
                  hint="Al menos 8 caracteres."
                >
                  <Input
                    id="signup-password"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </Field>

                <Button
                  type="submit"
                  className="w-full py-3"
                  disabled={!canSubmit || mutation.isPending}
                >
                  {mutation.isPending ? 'Creando tu cuenta…' : 'Crear mi cuenta'}
                  {!mutation.isPending && <ArrowRight size={16} />}
                </Button>
              </form>

              <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-slate-100 pt-4">
                {['Sin contrato', 'Sin comisión por venta', 'Cancelas cuando quieras'].map(
                  (item) => (
                    <li key={item} className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Check size={12} className="shrink-0 text-emerald-500" />
                      {item}
                    </li>
                  ),
                )}
              </ul>

              <p className="mt-4 text-center text-sm text-slate-500">
                ¿Ya tienes cuenta?{' '}
                <Link to="/login" className="font-medium text-brand-600 hover:underline">
                  Ingresa
                </Link>
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
