import { useState } from 'react'
import { Headset, Send, Store } from 'lucide-react'
import { Button, Card, Textarea } from '@/components/ui'
import { cn, formatDateTime } from '@/lib/cn'
import type { Ticket } from '@/types'

/**
 * El hilo de un ticket, igual para el negocio y para soporte.
 *
 * Lo único que cambia de un lado al otro es de qué lado se dibujan los
 * mensajes propios, así que se decide con `viewerIsSupport` en vez de
 * mantener dos componentes que se van desincronizando.
 */
export function TicketThread({
  ticket,
  viewerIsSupport,
  onSend,
  sending,
  disabledReason,
  composerExtra,
}: {
  ticket: Ticket
  viewerIsSupport: boolean
  onSend: (body: string) => void
  sending?: boolean
  /** Si está, se muestra en vez del cuadro de respuesta. */
  disabledReason?: string
  /** Controles propios de cada lado (p. ej. el estado que deja soporte al responder). */
  composerExtra?: React.ReactNode
}) {
  const [body, setBody] = useState('')

  function send() {
    if (!body.trim()) return
    onSend(body.trim())
    setBody('')
  }

  return (
    <Card flush>
      <ul className="divide-y divide-slate-100">
        {ticket.messages.map((m, i) => {
          const mine = m.fromSupport === viewerIsSupport
          const Icon = m.fromSupport ? Headset : Store

          return (
            <li key={i} className={cn('px-4 py-4 sm:px-5', mine && 'bg-slate-50/60')}>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'flex size-7 shrink-0 items-center justify-center rounded-full',
                    m.fromSupport ? 'bg-violet-100 text-violet-600' : 'bg-brand-50 text-brand-600',
                  )}
                >
                  <Icon size={14} />
                </span>
                <span className="min-w-0 truncate text-sm font-semibold text-slate-900">
                  {m.authorName}
                </span>
                {m.fromSupport && (
                  <span className="shrink-0 rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700">
                    Soporte
                  </span>
                )}
                <span className="ml-auto shrink-0 text-xs text-slate-400">
                  {formatDateTime(m.createdAt)}
                </span>
              </div>

              <p className="mt-2 text-sm whitespace-pre-line text-slate-700 sm:pl-9">{m.body}</p>
            </li>
          )
        })}
      </ul>

      <div className="border-t border-slate-200 bg-slate-50 px-4 py-4 sm:px-5">
        {disabledReason ? (
          <p className="text-sm text-slate-500">{disabledReason}</p>
        ) : (
          <>
            <Textarea
              rows={3}
              value={body}
              placeholder="Escribí tu respuesta…"
              onChange={(e) => setBody(e.target.value)}
              // Ctrl+Enter envía: el Enter solo tiene que poder hacer párrafos.
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) send()
              }}
            />
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              {composerExtra && (
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                  {composerExtra}
                </div>
              )}
              <Button
                className="w-full sm:ml-auto sm:w-auto"
                disabled={!body.trim() || sending}
                onClick={send}
              >
                <Send size={15} />
                {sending ? 'Enviando…' : 'Responder'}
              </Button>
            </div>
          </>
        )}
      </div>
    </Card>
  )
}
