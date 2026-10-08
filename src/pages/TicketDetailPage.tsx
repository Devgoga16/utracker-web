import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2 } from 'lucide-react'
import { closeTicket, getMyTicket, replyToTicket } from '@/api/tickets'
import { TicketThread } from '@/components/TicketThread'
import { Alert, Badge, Button, PageHeader, Spinner } from '@/components/ui'
import {
  TICKET_CATEGORY_LABELS,
  TICKET_STATUS_LABELS,
  TICKET_STATUS_TONES,
} from '@/lib/tickets'
import { formatDateTime } from '@/lib/cn'

/** Un ticket visto por el negocio que lo abrió. */
export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()

  const { data: ticket, isLoading, error } = useQuery({
    queryKey: ['tickets', id],
    queryFn: () => getMyTicket(id!),
    enabled: Boolean(id),
  })

  const reply = useMutation({
    mutationFn: (body: string) => replyToTicket(id!, body),
    onSuccess: (updated) => {
      qc.setQueryData(['tickets', id], updated)
      qc.invalidateQueries({ queryKey: ['tickets'] })
    },
  })

  const close = useMutation({
    mutationFn: () => closeTicket(id!),
    onSuccess: (updated) => {
      qc.setQueryData(['tickets', id], updated)
      qc.invalidateQueries({ queryKey: ['tickets'] })
    },
  })

  if (isLoading) return <Spinner />
  if (error) return <Alert error={error} />
  if (!ticket) return <Alert>No encontramos este ticket.</Alert>

  const isClosed = ticket.status === 'closed'

  return (
    <div className="space-y-5">
      <PageHeader
        backTo="/support"
        backLabel="Soporte"
        title={ticket.subject}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono">{ticket.code}</span>
            <span className="text-slate-300">·</span>
            {TICKET_CATEGORY_LABELS[ticket.category]}
            <span className="text-slate-300">·</span>
            Abierto el {formatDateTime(ticket.createdAt)}
          </span>
        }
        actions={
          !isClosed && ticket.status === 'resolved' ? (
            <Button variant="secondary" disabled={close.isPending} onClick={() => close.mutate()}>
              <CheckCircle2 size={15} />
              Cerrar ticket
            </Button>
          ) : undefined
        }
      />

      <Badge tone={TICKET_STATUS_TONES[ticket.status]}>
        {TICKET_STATUS_LABELS[ticket.status]}
      </Badge>

      {reply.isError && <Alert error={reply.error} />}

      <TicketThread
        ticket={ticket}
        viewerIsSupport={false}
        sending={reply.isPending}
        onSend={(body) => reply.mutate(body)}
        disabledReason={
          isClosed
            ? 'Este ticket está cerrado. Si el problema volvió, abrí uno nuevo desde Soporte.'
            : undefined
        }
      />
    </div>
  )
}
