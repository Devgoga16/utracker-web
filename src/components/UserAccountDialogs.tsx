import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Check, Copy, KeyRound, MessageCircle } from 'lucide-react'
import { changeUserEmail, resetUserPassword } from '@/api/superadmin'
import { Alert, Banner, Button, Field, Input, Modal } from '@/components/ui'
import { toast } from '@/stores/toastStore'

/** La persona sobre la que actúa soporte. */
export interface AccountTarget {
  _id: string
  name: string
  email: string
}

/** Corregir el correo con el que alguien entra. La contraseña no cambia. */
export function ChangeEmailDialog({
  user,
  onClose,
  onDone,
}: {
  user: AccountTarget
  onClose: () => void
  onDone: () => void
}) {
  const [email, setEmail] = useState(user.email)

  const mutation = useMutation({
    mutationFn: () => changeUserEmail(user._id, email.trim()),
    onSuccess: (updated) => {
      toast.success(`Ahora ${updated.name} entra con ${updated.email}`)
      onDone()
      onClose()
    },
  })

  const unchanged = email.trim().toLowerCase() === user.email

  return (
    <Modal
      title="Cambiar correo"
      description={`El correo con el que ${user.name} entra a uTracker. Su contraseña sigue siendo la misma.`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            loading={mutation.isPending}
            disabled={unchanged || !email.trim()}
            onClick={() => mutation.mutate()}
          >
            Guardar correo
          </Button>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (!unchanged) mutation.mutate()
        }}
      >
        {mutation.isError && <Alert error={mutation.error} />}
        <Field label="Correo nuevo" htmlFor="account-email" hint={`Antes: ${user.email}`}>
          <Input
            id="account-email"
            type="email"
            autoFocus
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <button type="submit" hidden />
      </form>
    </Modal>
  )
}

/**
 * Darle a alguien una contraseña temporal.
 *
 * Primero explica qué va a pasar y pide confirmar; después muestra la
 * contraseña una sola vez, lista para copiar o mandar por WhatsApp. Al cerrar
 * el diálogo ya no se puede volver a ver: si se perdió, se genera otra.
 */
export function ResetPasswordDialog({
  user,
  onClose,
  onDone,
}: {
  user: AccountTarget
  onClose: () => void
  onDone: () => void
}) {
  const mutation = useMutation({
    mutationFn: () => resetUserPassword(user._id),
    onSuccess: onDone,
  })

  const result = mutation.data

  if (result) {
    const loginUrl = `${window.location.origin}/login`
    const message =
      `Hola ${result.name}, te generamos una contraseña temporal para uTracker.\n\n` +
      `Ingresa en ${loginUrl}\n` +
      `Correo: ${result.email}\n` +
      `Contraseña temporal: ${result.temporaryPassword}\n\n` +
      `Al entrar te pedirá que elijas una contraseña tuya.`

    return (
      <Modal
        title="Contraseña temporal lista"
        description="Cópiala ahora: al cerrar esta ventana ya no se puede volver a ver."
        onClose={onClose}
        footer={<Button onClick={onClose}>Listo</Button>}
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Correo</p>
            <p className="truncate text-sm font-medium text-slate-900">{result.email}</p>
            <p className="mt-3 text-xs text-slate-500">Contraseña temporal</p>
            <div className="mt-1 flex items-center justify-between gap-3">
              <code className="font-mono text-xl font-semibold tracking-wider text-slate-900 select-all">
                {result.temporaryPassword}
              </code>
              <CopyButton text={result.temporaryPassword} label="Copiar" />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <CopyButton text={message} label="Copiar mensaje completo" />
            <a
              href={`https://wa.me/?text=${encodeURIComponent(message)}`}
              target="_blank"
              rel="noreferrer"
              className="focus-ring inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
            >
              <MessageCircle size={15} />
              Enviar por WhatsApp
            </a>
          </div>

          <Banner tone="info">
            Cuando {result.name.split(' ')[0]} entre con esta contraseña, uTracker le pedirá que elija
            una propia antes de seguir.
          </Banner>
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      title="Generar contraseña temporal"
      description={`Para ${user.name} (${user.email}).`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button loading={mutation.isPending} onClick={() => mutation.mutate()}>
            <KeyRound size={15} />
            Generar contraseña
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {mutation.isError && <Alert error={mutation.error} />}
        <ul className="space-y-2 text-sm text-slate-600">
          <li>• Su contraseña actual deja de funcionar.</li>
          <li>• Se cierran las sesiones que tenga abiertas, en cualquier dispositivo.</li>
          <li>• Al entrar con la temporal, tendrá que elegir una contraseña propia.</li>
        </ul>
      </div>
    </Modal>
  )
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        } catch {
          toast.error('No se pudo copiar. Selecciónala y cópiala a mano.')
        }
      }}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {copied ? 'Copiado' : label}
    </Button>
  )
}
