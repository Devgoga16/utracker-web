import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { register } from '@/api/auth'
import { apiErrorMessage } from '@/api/client'
import { useAuthStore } from '@/stores/authStore'
import { Alert, Button, Card, Field, Input } from '@/components/ui'

export function RegisterPage() {
  const navigate = useNavigate()
  const setSession = useAuthStore((s) => s.setSession)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const mutation = useMutation({
    mutationFn: () => register({ name, email, password }),
    onSuccess: (session) => {
      setSession(session)
      navigate('/tenants')
    },
  })

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-10 sm:px-6 sm:py-16">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-brand-600">uTracker</h1>
          <p className="mt-1 text-sm text-slate-500">Creá tu cuenta</p>
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

            <Field label="Nombre" htmlFor="name">
              <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
            </Field>

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

            <Field label="Contraseña" htmlFor="password" hint="Mínimo 8 caracteres">
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

            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending ? 'Creando...' : 'Crear cuenta'}
            </Button>
          </form>
        </Card>

        <p className="text-center text-sm text-slate-500">
          ¿Ya tenés cuenta?{' '}
          <Link to="/login" className="font-medium text-brand-600 hover:underline">
            Ingresar
          </Link>
        </p>
      </div>
    </div>
  )
}
