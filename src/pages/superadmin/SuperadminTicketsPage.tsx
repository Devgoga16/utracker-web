import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Inbox, MailWarning, Search, Siren, Ticket as TicketIcon } from 'lucide-react'
import { getTicketStats, listAllTickets, type TicketListParams } from '@/api/support'
import {
  Badge,
  Button,
  Card,
  Chip,
  ChipBar,
  EmptyState,
  Input,
  PageHeader,
  Spinner,
  StatCard,
} from '@/components/ui'
import {
  TICKET_CATEGORY_LABELS,
  TICKET_PRIORITY_LABELS,
  TICKET_PRIORITY_TONES,
  TICKET_STATUS_LABELS_SUPPORT,
  TICKET_STATUS_TONES,
  timeAgo,
} from '@/lib/tickets'
import type { TicketStatus } from '@/types'

const TABS: { label: string; status?: TicketStatus; scope?: 'all' }[] = [
  { label: 'Pendientes' },
  { label: 'Abiertos', status: 'open' },
  { label: 'En revisión', status: 'in_progress' },
  { label: 'Esperando al negocio', status: 'waiting_customer' },
  { label: 'Resueltos', status: 'resolved' },
  { label: 'Todos', scope: 'all' },
]

/** Bandeja de entrada de soporte: todos los tickets de todos los negocios. */
export function SuperadminTicketsPage() {
  const [tab, setTab] = useState(0)
  const [search, setSearch] = useState('')
  const [applied, setApplied] = useState('')

  const params: TicketListParams = {
    status: TABS[tab].status,
    scope: TABS[tab].scope,
    q: applied.trim() || undefined,
  }

  const { data: stats } = useQuery({ queryKey: ['ticket-stats'], queryFn: getTicketStats })
  const { data: tickets, isLoading } = useQuery({
    queryKey: ['superadmin-tickets', params],
    queryFn: () => listAllTickets(params),
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tickets"
        description="Lo que reportan los negocios, con el contexto técnico ya adjunto."
      />

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <StatCard
          icon={Inbox}
          label="Pendientes"
          value={String(stats?.open ?? 0)}
        />
        <StatCard
          icon={MailWarning}
          tone="amber"
          label="Sin leer"
          value={String(stats?.unread ?? 0)}
        />
        <StatCard
          icon={Siren}
          tone="red"
          label="Urgentes"
          value={String(stats?.urgent ?? 0)}
        />
      </div>

      <div className="space-y-3">
        <ChipBar>
          {TABS.map((t, i) => (
            <Chip
              key={t.label}
              active={tab === i}
              count={t.status ? stats?.byStatus[t.status] : undefined}
              onClick={() => setTab(i)}
            >
              {t.label}
            </Chip>
          ))}
        </ChipBar>

        <div className="flex gap-2">
          <Input
            value={search}
            placeholder="Asunto, código o quién lo abrió…"
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setApplied(search)}
          />
          <Button variant="secondary" onClick={() => setApplied(search)}>
            <Search size={15} />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Spinner />
      ) : !tickets?.length ? (
        <EmptyState
          icon={TicketIcon}
          title="Nada por acá"
          description="Cuando un negocio reporte algo, aparece en esta bandeja."
        />
      ) : (
        <Card flush>
          {/* Tabla en desktop, tarjetas en mobile: cinco columnas no entran en
              un celular y la bandeja se atiende tanto desde ahí como del escritorio. */}
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-semibold tracking-wide text-slate-400 uppercase">
                  <th className="px-4 py-2.5">Ticket</th>
                  <th className="px-4 py-2.5">Negocio</th>
                  <th className="px-4 py-2.5">Prioridad</th>
                  <th className="px-4 py-2.5">Estado</th>
                  <th className="px-4 py-2.5 text-right">Actividad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tickets.map((t) => {
                  const tenant = typeof t.tenant === 'object' ? t.tenant : null

                  return (
                    <tr key={t._id} className="transition-colors hover:bg-slate-50">
                      <td className="max-w-sm px-4 py-3">
                        <Link to={`/superadmin/tickets/${t._id}`} className="group block">
                          <span className="flex items-center gap-2">
                            {t.unreadForSupport && (
                              <span
                                className="size-2 shrink-0 rounded-full bg-violet-500"
                                title="Sin leer"
                              />
                            )}
                            <span className="truncate font-medium text-slate-900 group-hover:text-violet-700">
                              {t.subject}
                            </span>
                          </span>
                          <span className="font-mono text-xs text-slate-400">
                            {t.code} · {TICKET_CATEGORY_LABELS[t.category]} · {t.createdByName}
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{tenant?.name ?? '—'}</td>
                      <td className="px-4 py-3">
                        <Badge tone={TICKET_PRIORITY_TONES[t.priority]}>
                          {TICKET_PRIORITY_LABELS[t.priority]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={TICKET_STATUS_TONES[t.status]}>
                          {TICKET_STATUS_LABELS_SUPPORT[t.status]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap text-xs text-slate-400">
                        {timeAgo(t.lastMessageAt)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <ul className="divide-y divide-slate-100 lg:hidden">
            {tickets.map((t) => {
              const tenant = typeof t.tenant === 'object' ? t.tenant : null

              return (
                <li key={t._id}>
                  <Link to={`/superadmin/tickets/${t._id}`} className="block p-4 active:bg-slate-50">
                    <div className="flex items-start gap-2">
                      {t.unreadForSupport && (
                        <span
                          className="mt-1.5 size-2 shrink-0 rounded-full bg-violet-500"
                          title="Sin leer"
                        />
                      )}
                      <p className="min-w-0 flex-1 font-semibold text-slate-900">{t.subject}</p>
                    </div>

                    <p className="mt-0.5 truncate text-sm text-slate-500">
                      {tenant?.name ?? 'Sin negocio'}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <Badge tone={TICKET_STATUS_TONES[t.status]}>
                        {TICKET_STATUS_LABELS_SUPPORT[t.status]}
                      </Badge>
                      <Badge tone={TICKET_PRIORITY_TONES[t.priority]}>
                        {TICKET_PRIORITY_LABELS[t.priority]}
                      </Badge>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between gap-3 border-t border-slate-100 pt-2 text-xs text-slate-400">
                      <span className="min-w-0 truncate font-mono">
                        {t.code} · {TICKET_CATEGORY_LABELS[t.category]}
                      </span>
                      <span className="shrink-0">{timeAgo(t.lastMessageAt)}</span>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        </Card>
      )}
    </div>
  )
}
