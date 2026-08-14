import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { login } from '@/api/auth'
import { apiErrorMessage } from '@/api/client'
import { useAuthStore } from '@/stores/authStore'
import { Alert, Button, Card, Field, Input } from '@/components/ui'

export function LoginPage() {
  const navigate = useNavigate()
  const setSession = useAuthStore((s) => s.setSession)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const mutation = useMutation({
    mutationFn: () => login({ email, password }),
    onSuccess: (session) => {
      setSession(session)
      navigate('/tenants')
    },
  })

  return (
    <div className="flex min-h-full items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-brand-600">uTracker</h1>
          <p className="mt-1 text-sm text-slate-500">Gestor de pedidos</p>
        </div>

        <Card>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              mutation.mutate()
            }}
          >
            {mutation.isError && <Alert>{apiErrorMessage(mutation.error)}</Alert>}

            <Field label="Email" htmlFor="email">
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
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

            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending ? 'Ingresando...' : 'Ingresar'}
            </Button>
          </form>
        </Card>

        <p className="text-center text-sm text-slate-500">
          ¿No tenés cuenta?{' '}
          <Link to="/register" className="font-medium text-brand-600 hover:underline">
            Crear una
          </Link>
        </p>
      </div>
    </div>
  )
}
