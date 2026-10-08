import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { LifeBuoy, MessageSquare, Plus } from 'lucide-react'
import { listMyTickets } from '@/api/tickets'
import { useSupportStore } from '@/stores/supportStore'
import { Badge, Button, Card, EmptyState, PageHeader, Spinner } from '@/components/ui'
import {
  TICKET_CATEGORY_LABELS,
  TICKET_STATUS_LABELS,
  TICKET_STATUS_TONES,
  timeAgo,
} from '@/lib/tickets'
import type { Ticket, TicketStatus } from '@/types'

const CLOSED: TicketStatus[] = ['resolved', 'closed']

/**
 * Portal de soporte del negocio: sus tickets y el estado de cada uno.
 *
 * El alta no vive acá sino en el diálogo global, que es el mismo que se abre
 * desde un error. Así un reporte nace igual de completo venga de donde venga.
 */
export function SupportPage() {
  const openReporter = useSupportStore((s) => s.openReporter)

  const { data: tickets, isLoading } = useQuery({
    queryKey: ['tickets'],
    queryFn: listMyTickets,
  })

  const open = tickets?.filter((t) => !CLOSED.includes(t.status)) ?? []
  const done = tickets?.filter((t) => CLOSED.includes(t.status)) ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Soporte"
        description="Reportá un problema o seguí la conversación con el equipo de uTracker."
        actions={
          <Button onClick={() => openReporter({ category: 'question' })}>
            <Plus size={15} />
            <span className="sm:hidden">Nuevo</span>
            <span className="hidden sm:inline">Nuevo ticket</span>
          </Button>
        }
      />

      {isLoading ? (
        <Spinner />
      ) : !tickets?.length ? (
        <EmptyState
          icon={LifeBuoy}
          title="No tenés tickets abiertos"
          description="Si algo no funciona o no se entiende, abrí un ticket: queda registrado con los detalles técnicos y te respondemos por WhatsApp."
          action={
            <Button onClick={() => openReporter({ category: 'question' })}>
              <Plus size={15} />
              Abrir un ticket
            </Button>
          }
        />
      ) : (
        <>
          {open.length > 0 && <TicketList title="En curso" tickets={open} />}
          {done.length > 0 && <TicketList title="Cerrados" tickets={done} />}
        </>
      )}
    </div>
  )
}

function TicketList({ title, tickets }: { title: string; tickets: Ticket[] }) {
  return (
    <Card title={title} flush>
      {/* Tabla en desktop, tarjetas en mobile: una tabla de cuatro columnas en
          375px obliga a arrastrar la pantalla para leer el estado. */}
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs font-semibold tracking-wide text-slate-400 uppercase">
              <th className="px-4 py-2.5">Ticket</th>
              <th className="px-4 py-2.5">Tipo</th>
              <th className="px-4 py-2.5">Estado</th>
              <th className="px-4 py-2.5 text-right">Actividad</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tickets.map((t) => (
              <tr key={t._id} className="transition-colors hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link to={`/support/${t._id}`} className="group block">
                    <span className="flex items-center gap-2">
                      <span className="font-medium text-slate-900 group-hover:text-brand-600">
                        {t.subject}
                      </span>
                      {t.unreadForTenant && <UnreadDot />}
                    </span>
                    <span className="font-mono text-xs text-slate-400">{t.code}</span>
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-500">{TICKET_CATEGORY_LABELS[t.category]}</td>
                <td className="px-4 py-3">
                  <Badge tone={TICKET_STATUS_TONES[t.status]}>
                    {TICKET_STATUS_LABELS[t.status]}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap text-slate-400">
                  <span className="inline-flex items-center gap-1.5">
                    <MessageSquare size={13} />
                    {timeAgo(t.lastMessageAt)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-slate-100 lg:hidden">
        {tickets.map((t) => (
          <li key={t._id}>
            <Link to={`/support/${t._id}`} className="block p-4 active:bg-slate-50">
              <div className="flex items-start gap-2">
                {t.unreadForTenant && <UnreadDot className="mt-1.5" />}
                <p className="min-w-0 flex-1 font-semibold text-slate-900">{t.subject}</p>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge tone={TICKET_STATUS_TONES[t.status]}>
                  {TICKET_STATUS_LABELS[t.status]}
                </Badge>
                <span className="text-xs text-slate-400">
                  {TICKET_CATEGORY_LABELS[t.category]}
                </span>
              </div>

              <div className="mt-2.5 flex items-center justify-between gap-3 border-t border-slate-100 pt-2 text-xs text-slate-400">
                <span className="font-mono">{t.code}</span>
                <span className="inline-flex shrink-0 items-center gap-1.5">
                  <MessageSquare size={12} />
                  {timeAgo(t.lastMessageAt)}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  )
}

function UnreadDot({ className }: { className?: string }) {
  return (
    <span
      className={`size-2 shrink-0 rounded-full bg-brand-500 ${className ?? ''}`}
      title="Tiene una respuesta sin leer"
    />
  )
}
