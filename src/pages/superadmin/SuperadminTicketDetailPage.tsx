import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Building2, ExternalLink, Paperclip, UserCheck } from 'lucide-react'
import {
  getTicketAsSupport,
  replyAsSupport,
  updateTicket,
} from '@/api/support'
import { TicketThread } from '@/components/TicketThread'
import {
  Alert,
  Badge,
  Button,
  Card,
  CheckboxField,
  PageHeader,
  Select,
  Spinner,
} from '@/components/ui'
import {
  TICKET_CATEGORY_LABELS,
  TICKET_PRIORITY_LABELS,
  TICKET_PRIORITY_TONES,
  TICKET_STATUS_LABELS_SUPPORT,
  TICKET_STATUS_TONES,
} from '@/lib/tickets'
import { formatDateTime } from '@/lib/cn'
import type { TicketPriority, TicketStatus } from '@/types'

const STATUS_OPTIONS: TicketStatus[] = [
  'open',
  'in_progress',
  'waiting_customer',
  'resolved',
  'closed',
]

/** Un ticket visto por soporte, con el contexto técnico y los controles de gestión. */
export function SuperadminTicketDetailPage() {
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()

  const [nextStatus, setNextStatus] = useState<TicketStatus>('in_progress')
  const [notify, setNotify] = useState(true)

  const { data: ticket, isLoading, error } = useQuery({
    queryKey: ['superadmin-ticket', id],
    queryFn: () => getTicketAsSupport(id!),
    enabled: Boolean(id),
  })

  function refreshLists(updated: unknown) {
    qc.setQueryData(['superadmin-ticket', id], updated)
    qc.invalidateQueries({ queryKey: ['superadmin-tickets'] })
    qc.invalidateQueries({ queryKey: ['ticket-stats'] })
  }

  const reply = useMutation({
    mutationFn: (body: string) => replyAsSupport(id!, { body, status: nextStatus, notify }),
    onSuccess: refreshLists,
  })

  const patch = useMutation({
    mutationFn: (data: { status?: TicketStatus; priority?: TicketPriority; assignToMe?: boolean }) =>
      updateTicket(id!, data),
    onSuccess: refreshLists,
  })

  if (isLoading) return <Spinner />
  if (error) return <Alert error={error} />
  if (!ticket) return <Alert>No encontramos este ticket.</Alert>

  const tenant = typeof ticket.tenant === 'object' ? ticket.tenant : null
  const assigned = typeof ticket.assignedTo === 'object' ? ticket.assignedTo : null

  return (
    <div className="space-y-5">
      <PageHeader
        backTo="/superadmin/tickets"
        backLabel="Tickets"
        title={ticket.subject}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono">{ticket.code}</span>
            <span className="text-slate-300">·</span>
            {TICKET_CATEGORY_LABELS[ticket.category]}
            <span className="text-slate-300">·</span>
            {ticket.createdByName}
            <span className="text-slate-300">·</span>
            {formatDateTime(ticket.createdAt)}
          </span>
        }
        actions={
          !assigned ? (
            <Button
              variant="secondary"
              disabled={patch.isPending}
              onClick={() => patch.mutate({ assignToMe: true })}
            >
              <UserCheck size={15} />
              Tomarlo
            </Button>
          ) : undefined
        }
      />

      {(reply.isError || patch.isError) && (
        <Alert error={reply.error ?? patch.error} />
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_18rem]">
        <div className="min-w-0 space-y-4">
          <TicketThread
            ticket={ticket}
            viewerIsSupport
            sending={reply.isPending}
            onSend={(body) => reply.mutate(body)}
            composerExtra={
              <>
                <Select
                  className="w-full sm:w-auto"
                  value={nextStatus}
                  onChange={(e) => setNextStatus(e.target.value as TicketStatus)}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      Dejar como: {TICKET_STATUS_LABELS_SUPPORT[s]}
                    </option>
                  ))}
                </Select>
                <CheckboxField
                  label="Avisar por WhatsApp"
                  checked={notify}
                  onChange={setNotify}
                />
              </>
            }
          />
        </div>

        <div className="space-y-4">
          <Card title="Estado">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge tone={TICKET_STATUS_TONES[ticket.status]}>
                  {TICKET_STATUS_LABELS_SUPPORT[ticket.status]}
                </Badge>
                <Badge tone={TICKET_PRIORITY_TONES[ticket.priority]}>
                  {TICKET_PRIORITY_LABELS[ticket.priority]}
                </Badge>
              </div>

              <Select
                value={ticket.priority}
                disabled={patch.isPending}
                onChange={(e) => patch.mutate({ priority: e.target.value as TicketPriority })}
              >
                {(Object.keys(TICKET_PRIORITY_LABELS) as TicketPriority[]).map((p) => (
                  <option key={p} value={p}>
                    Prioridad: {TICKET_PRIORITY_LABELS[p]}
                  </option>
                ))}
              </Select>

              <Select
                value={ticket.status}
                disabled={patch.isPending}
                onChange={(e) => patch.mutate({ status: e.target.value as TicketStatus })}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    Estado: {TICKET_STATUS_LABELS_SUPPORT[s]}
                  </option>
                ))}
              </Select>

              {assigned && (
                <p className="text-xs text-slate-500">
                  Atendido por <span className="font-medium text-slate-700">{assigned.name}</span>
                </p>
              )}
            </div>
          </Card>

          {tenant && (
            <Card title="Negocio">
              <div className="space-y-2 text-sm">
                <p className="flex items-center gap-2 font-medium text-slate-900">
                  <Building2 size={15} className="shrink-0 text-slate-400" />
                  {tenant.name}
                </p>
                {tenant.phone && <p className="text-slate-500">WhatsApp {tenant.phone}</p>}
                <Link
                  to={`/superadmin/tenants/${tenant._id}`}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-violet-700 hover:text-violet-800"
                >
                  Ver ficha técnica
                  <ExternalLink size={13} />
                </Link>
              </div>
            </Card>
          )}

          {/* Lo que el navegador adjuntó solo: la mitad del diagnóstico ya está acá. */}
          {ticket.context && (
            <Card title="Contexto técnico">
              <dl className="space-y-2 text-xs">
                {ticket.context.url && (
                  <div>
                    <dt className="text-slate-400">Pantalla</dt>
                    <dd className="font-mono break-all text-slate-700">{ticket.context.url}</dd>
                  </div>
                )}
                {ticket.context.logRef && (
                  <div>
                    <dt className="text-slate-400">Log de la API</dt>
                    <dd>
                      <Link
                        to={`/superadmin/logs?ref=${ticket.context.logRef}`}
                        className="font-mono font-semibold text-violet-700 hover:underline"
                      >
                        {ticket.context.logRef}
                      </Link>
                    </dd>
                  </div>
                )}
                {ticket.context.appVersion && (
                  <div>
                    <dt className="text-slate-400">Versión</dt>
                    <dd className="font-mono text-slate-700">{ticket.context.appVersion}</dd>
                  </div>
                )}
                {ticket.context.userAgent && (
                  <div>
                    <dt className="text-slate-400">Navegador</dt>
                    <dd className="break-words text-slate-600">{ticket.context.userAgent}</dd>
                  </div>
                )}
                {ticket.context.recentErrors && ticket.context.recentErrors.length > 0 && (
                  <div>
                    <dt className="flex items-center gap-1 text-slate-400">
                      <Paperclip size={11} />
                      Fallas previas
                    </dt>
                    <dd>
                      <ul className="mt-1 space-y-1 font-mono text-[11px] leading-relaxed text-slate-600">
                        {ticket.context.recentErrors.map((e, i) => (
                          <li key={i} className="break-all">
                            {e}
                          </li>
                        ))}
                      </ul>
                    </dd>
                  </div>
                )}
              </dl>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
