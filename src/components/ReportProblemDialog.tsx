import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, LifeBuoy, Paperclip } from 'lucide-react'
import { createTicket } from '@/api/tickets'
import { apiErrorMessage } from '@/api/client'
import { browserContext, describeFailures, lastLogRef } from '@/lib/problemReport'
import { useSupportStore } from '@/stores/supportStore'
import { useAuthStore } from '@/stores/authStore'
import { Alert, Button, Field, Input, Modal, Select, Textarea } from '@/components/ui'
import type { TicketCategory } from '@/types'

const CATEGORY_OPTIONS: { value: TicketCategory; label: string }[] = [
  { value: 'error', label: 'Algo se rompió' },
  { value: 'question', label: 'Tengo una duda' },
  { value: 'billing', label: 'Suscripción o pagos' },
  { value: 'feature', label: 'Me gustaría que haga otra cosa' },
  { value: 'other', label: 'Otro' },
]

/**
 * Formulario único para reportar un problema desde cualquier parte del sistema.
 *
 * Lo pesado del reporte —URL, navegador, las últimas requests que fallaron, el
 * código del log del servidor— se adjunta solo. Al usuario se le pide lo único
 * que el sistema no puede saber: qué estaba intentando hacer.
 */
export function ReportProblemDialog() {
  const { draft, closeReporter } = useSupportStore()
  const { activeTenant } = useAuthStore()
  const qc = useQueryClient()

  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [category, setCategory] = useState<TicketCategory>('error')
  const [error, setError] = useState('')
  const [createdCode, setCreatedCode] = useState<{ id: string; code: string } | null>(null)

  // El draft trae lo que el disparador ya sabe (el asunto de un error, por
  // ejemplo). Se copia a los campos al abrir, y desde ahí es del usuario.
  useEffect(() => {
    if (!draft) return
    setSubject(draft.subject ?? '')
    setBody(draft.body ?? '')
    setCategory(draft.category ?? 'error')
    setError('')
    setCreatedCode(null)
  }, [draft])

  const failures = draft?.failures ?? describeFailures()
  const logRef = draft?.logRef ?? lastLogRef()

  function handleClose() {
    closeReporter()
    setSubject('')
    setBody('')
    setError('')
    setCreatedCode(null)
  }

  const mutation = useMutation({
    mutationFn: () =>
      createTicket({
        subject: subject.trim(),
        body: body.trim(),
        category,
        priority: category === 'error' ? 'high' : 'normal',
        context: { ...browserContext(), logRef, recentErrors: failures },
      }),
    onSuccess: (ticket) => {
      qc.invalidateQueries({ queryKey: ['tickets'] })
      setCreatedCode({ id: ticket._id, code: ticket.code })
    },
    onError: (e) => setError(apiErrorMessage(e)),
  })

  if (!draft) return null

  /* Ya se creó: se muestra el código y por dónde seguir la conversación. */
  if (createdCode) {
    return (
      <Modal
        title="Reporte enviado"
        description={`Tu ticket es ${createdCode.code}`}
        onClose={handleClose}
        footer={
          <>
            <Button variant="ghost" onClick={handleClose}>
              Cerrar
            </Button>
            <Link to={`/support/${createdCode.id}`} onClick={handleClose}>
              <Button>Ver el ticket</Button>
            </Link>
          </>
        }
      >
        <div className="flex items-start gap-3 rounded-xl bg-emerald-50 p-4 ring-1 ring-emerald-200">
          <Check size={18} className="mt-0.5 shrink-0 text-emerald-600" />
          <p className="text-sm text-emerald-800">
            Soporte ya lo tiene, con los detalles técnicos adjuntos. Cuando te respondan te
            avisamos por WhatsApp al número del negocio.
          </p>
        </div>
      </Modal>
    )
  }

  /* Sin negocio activo no hay a quién asociar el ticket. */
  if (!activeTenant) {
    return (
      <Modal title="Reportar un problema" onClose={handleClose}>
        <p className="text-sm text-slate-600">
          Entrá a uno de tus negocios para abrir un ticket: los reportes van asociados al negocio
          donde pasó el problema.
        </p>
        {logRef && (
          <p className="mt-3 text-sm text-slate-600">
            Igual ya registramos el error. Si escribís por otro medio, pasá este código:{' '}
            <span className="font-mono font-semibold text-slate-900">{logRef}</span>
          </p>
        )}
      </Modal>
    )
  }

  return (
    <Modal
      title="Reportar un problema"
      description="Lo revisa soporte de uTracker"
      onClose={handleClose}
      wide
      footer={
        <>
          <Button variant="ghost" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            disabled={!subject.trim() || !body.trim() || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            <LifeBuoy size={15} />
            {mutation.isPending ? 'Enviando…' : 'Enviar reporte'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <Alert>{error}</Alert>}

        <Field label="¿De qué se trata?" htmlFor="report-category">
          <Select
            id="report-category"
            value={category}
            onChange={(e) => setCategory(e.target.value as TicketCategory)}
          >
            {CATEGORY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Resumen en una línea" htmlFor="report-subject">
          <Input
            id="report-subject"
            value={subject}
            maxLength={160}
            placeholder="No puedo validar el pago de un pedido"
            onChange={(e) => setSubject(e.target.value)}
          />
        </Field>

        <Field
          label="¿Qué estabas haciendo?"
          htmlFor="report-body"
          hint="Mientras más concreto, más rápido se resuelve."
        >
          <Textarea
            id="report-body"
            rows={5}
            value={body}
            placeholder="Entré al pedido, le di a Validar y la pantalla se quedó cargando."
            onChange={(e) => setBody(e.target.value)}
          />
        </Field>

        {/* Lo técnico se adjunta solo; se muestra para que nadie se sorprenda de qué se envía. */}
        {(failures.length > 0 || logRef) && (
          <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
              <Paperclip size={13} />
              Se adjunta automáticamente
            </p>
            <ul className="mt-2 space-y-1 font-mono text-[11px] leading-relaxed text-slate-500">
              <li className="truncate">{window.location.pathname}</li>
              {logRef && <li>ref {logRef}</li>}
              {failures.slice(0, 4).map((f, i) => (
                <li key={i} className="truncate">
                  {f}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  )
}

/**
 * Botón para colgar el reportador en cualquier lado —al costado de un error,
 * en un menú, en una pantalla vacía— sin repetir el cableado del store.
 */
export function ReportProblemButton({
  subject,
  logRef,
  label = 'Reportar el problema',
  size = 'sm',
  variant = 'secondary',
}: {
  subject?: string
  logRef?: string
  label?: string
  size?: 'sm' | 'md'
  variant?: 'primary' | 'secondary' | 'ghost'
}) {
  const openReporter = useSupportStore((s) => s.openReporter)

  return (
    <Button
      size={size}
      variant={variant}
      onClick={() => openReporter({ category: 'error', subject, logRef })}
    >
      <LifeBuoy size={15} />
      {label}
    </Button>
  )
}
