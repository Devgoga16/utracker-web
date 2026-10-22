import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { login } from '@/api/auth'
import { useAuthStore } from '@/stores/authStore'
import { Alert, Button, Field, Input } from '@/components/ui'
import { AuthShell } from '@/components/AuthShell'
import { CHANGE_PASSWORD_PATH } from '@/lib/paths'

export function LoginPage() {
  const navigate = useNavigate()
  const setSession = useAuthStore((s) => s.setSession)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const mutation = useMutation({
    mutationFn: () => login({ email, password }),
    onSuccess: (session) => {
      setSession(session)
      if (session.user.mustChangePassword) navigate(CHANGE_PASSWORD_PATH)
      else navigate(session.user.isSuperAdmin ? '/superadmin' : '/tenants')
    },
  })

  return (
    <AuthShell
      title="Entra a tu negocio"
      subtitle="Tus pedidos, tal como los dejaste."
      footer={
        <>
          ¿Todavía no tienes cuenta?{' '}
          <Link to="/register" className="font-medium text-brand-600 hover:underline">
            Crea una gratis
          </Link>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          mutation.mutate()
        }}
      >
        {mutation.isError && <Alert error={mutation.error} />}

        <Field label="Correo" htmlFor="email">
          <Input
            id="email"
            type="email"
            autoComplete="email"
            autoFocus
            required
            placeholder="maria@minegocio.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>

        <Field label="Contraseña" htmlFor="password">
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>

        <Button type="submit" className="w-full py-3" disabled={mutation.isPending}>
          {mutation.isPending ? 'Ingresando…' : 'Ingresar'}
        </Button>
      </form>
    </AuthShell>
  )
}
