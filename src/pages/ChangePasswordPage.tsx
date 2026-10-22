import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { changePassword } from '@/api/auth'
import { useAuthStore } from '@/stores/authStore'
import { Alert, Button, Field, Input } from '@/components/ui'
import { AuthShell } from '@/components/AuthShell'

const MIN = 8

/**
 * Elegir contraseña propia.
 *
 * Se llega aquí obligado al entrar con una contraseña temporal que generó
 * soporte: hasta cambiarla no se puede usar nada más. Por eso no pide la
 * actual —se acaba de escribir para entrar— y la única otra salida es salir.
 */
export function ChangePasswordPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const setSession = useAuthStore((s) => s.setSession)
  const logout = useAuthStore((s) => s.logout)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')

  const mutation = useMutation({
    mutationFn: () => changePassword({ newPassword: password }),
    onSuccess: (session) => {
      setSession(session)
      navigate(session.user.isSuperAdmin ? '/superadmin' : '/tenants', { replace: true })
    },
  })

  const tooShort = password.length > 0 && password.length < MIN
  const mismatch = confirm.length > 0 && confirm !== password
  const valid = password.length >= MIN && confirm === password

  return (
    <AuthShell
      title="Elige tu contraseña"
      subtitle={`Entraste con una contraseña temporal. Crea una tuya para seguir${user ? `, ${user.name.split(' ')[0]}` : ''}.`}
      footer={
        <button
          type="button"
          onClick={() => {
            logout()
            navigate('/login', { replace: true })
          }}
          className="font-medium text-slate-500 hover:text-slate-800"
        >
          Salir
        </button>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (valid) mutation.mutate()
        }}
      >
        {mutation.isError && <Alert error={mutation.error} />}

        {user && <input type="email" autoComplete="username" value={user.email} readOnly hidden />}

        <Field
          label="Contraseña nueva"
          htmlFor="new-password"
          hint={tooShort ? `Mínimo ${MIN} caracteres.` : `Al menos ${MIN} caracteres.`}
        >
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            autoFocus
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>

        <Field
          label="Repítela"
          htmlFor="confirm-password"
          hint={mismatch ? 'No coincide con la de arriba.' : undefined}
        >
          <Input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </Field>

        <Button type="submit" className="w-full py-3" disabled={!valid} loading={mutation.isPending}>
          Guardar y entrar
        </Button>
      </form>
    </AuthShell>
  )
}
