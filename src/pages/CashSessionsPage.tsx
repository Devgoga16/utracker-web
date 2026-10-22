import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowDownLeft, ArrowUpRight, ChevronRight, Wallet } from 'lucide-react'
import { getSession, listSessions } from '@/api/pos'
import { Alert, Card, EmptyState, PageHeader, Spinner } from '@/components/ui'
import { useAuthStore } from '@/stores/authStore'
import { cn, formatCurrency, formatDateTime } from '@/lib/cn'
import type { CashMovement, PosSale } from '@/types'
import { DifferenceBadge, SummaryTable } from './pos/CashControls'
import { PosTicket, type TicketData } from './pos/PosTicket'
import { SalesList } from './pos/SalesList'

/**
 * Las cajas anteriores: cuándo se abrió cada una, cuánto se vendió y si
 * cuadró. Es lo que el dueño revisa cuando no estuvo en el mostrador.
 */
export function CashSessionsPage() {
  const { data: sessions, isLoading, error } = useQuery({
    queryKey: ['pos-sessions'],
    queryFn: listSessions,
  })

  return (
    <div className="space-y-6">
      <PageHeader
        backTo="/pos"
        backLabel="Volver al punto de venta"
        title="Cajas anteriores"
        description="Cada apertura y cierre, con lo que se vendió y si cuadró."
      />

      {isLoading ? (
        <Spinner />
      ) : error ? (
        <Alert error={error} />
      ) : !sessions?.length ? (
        <EmptyState icon={Wallet} title="Todavía no se abrió ninguna caja" />
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl bg-white border border-slate-200">
          {sessions.map((s) => (
            <li key={s._id}>
              <Link
                to={`/pos/cajas/${s._id}`}
                className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-slate-50"
              >
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-900">
                    {formatDateTime(s.openedAt)}
                    {s.status === 'open' ? (
                      <span className="rounded-full bg-success-50 px-2 py-0.5 text-xs font-semibold text-success-700">
                        Abierta
                      </span>
                    ) : (
                      s.difference !== undefined && <DifferenceBadge difference={s.difference} />
                    )}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {s.openedBy?.name ?? '—'}
                    {s.closedAt &&
                      ` · cerró ${s.closedBy?.name ?? ''} a las ${new Date(s.closedAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}`}
                  </p>
                </div>
                {s.summary && (
                  <div className="shrink-0 text-right">
                    <p className="font-semibold text-slate-900 tabular-nums">
                      {formatCurrency(s.summary.salesTotal)}
                    </p>
                    <p className="text-xs text-slate-400">
                      {s.summary.salesCount} {s.summary.salesCount === 1 ? 'venta' : 'ventas'}
                    </p>
                  </div>
                )}
                <ChevronRight size={16} className="shrink-0 text-slate-300" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Una caja: su cuadre, los movimientos y cada venta. */
export function CashSessionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { activeTenant, user } = useAuthStore()
  const { data, isLoading, error } = useQuery({
    queryKey: ['pos-sessions', id],
    queryFn: () => getSession(id!),
    enabled: Boolean(id),
  })

  const [ticket, setTicket] = useState<TicketData | null>(null)
  const [printRequest, setPrintRequest] = useState(0)
  useEffect(() => {
    if (!printRequest || !ticket) return
    const frame = requestAnimationFrame(() => window.print())
    return () => cancelAnimationFrame(frame)
  }, [printRequest, ticket])

  if (isLoading) return <Spinner />
  if (error) return <Alert error={error} />
  if (!data) return null

  const { session, summary, sales } = data
  const movements = (session.movements ?? []) as CashMovement[]

  return (
    <div className="space-y-6">
      <PageHeader
        backTo="/pos/cajas"
        backLabel="Cajas anteriores"
        title={`Caja del ${new Date(session.openedAt).toLocaleDateString('es-PE', { day: 'numeric', month: 'long' })}`}
        description={
          <>
            Abrió {session.openedBy?.name ?? '—'} a las{' '}
            {new Date(session.openedAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
            {session.closedAt
              ? ` · cerró ${session.closedBy?.name ?? '—'} a las ${new Date(session.closedAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}`
              : ' · sigue abierta'}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card title="Cuadre">
            <SummaryTable openingAmount={session.openingAmount} summary={summary} />
            {session.status === 'closed' && session.countedCash !== undefined && (
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Efectivo contado</span>
                  <span className="font-semibold text-slate-900 tabular-nums">
                    {formatCurrency(session.countedCash)}
                  </span>
                </div>
                {session.difference !== undefined && (
                  <DifferenceBadge difference={session.difference} large />
                )}
                {session.closingNote && (
                  <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                    {session.closingNote}
                  </p>
                )}
              </div>
            )}
          </Card>

          {movements.length > 0 && (
            <Card title="Movimientos" flush>
              <ul className="divide-y divide-slate-100">
                {movements.map((m, i) => (
                  <li key={i} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                    <span
                      className={cn(
                        'flex size-8 shrink-0 items-center justify-center rounded-lg',
                        m.type === 'in' ? 'bg-success-50 text-success-600' : 'bg-danger-50 text-danger-600',
                      )}
                    >
                      {m.type === 'in' ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-slate-800">
                        {m.note || (m.type === 'in' ? 'Ingreso' : 'Retiro')}
                      </p>
                      <p className="text-xs text-slate-400">
                        {new Date(m.at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                        {typeof m.by === 'object' && m.by?.name ? ` · ${m.by.name}` : ''}
                      </p>
                    </div>
                    <span
                      className={cn(
                        'shrink-0 text-sm font-semibold tabular-nums',
                        m.type === 'in' ? 'text-success-700' : 'text-danger-600',
                      )}
                    >
                      {m.type === 'in' ? '+' : '−'}
                      {formatCurrency(m.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <section className="min-w-0 space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">Ventas</h2>
          <SalesList
            sales={sales}
            onReprint={(s: PosSale) => {
              setTicket({ ...s, customer: s.customer, cashier: s.createdBy?.name })
              setPrintRequest((n) => n + 1)
            }}
          />
          {session.status === 'open' && (
            <p className="text-xs text-slate-500">
              Para anular una venta de esta caja, hazlo desde el punto de venta mientras siga
              abierta.
            </p>
          )}
        </section>
      </div>

      {ticket && (
        <PosTicket
          sale={ticket}
          businessName={activeTenant?.name ?? ''}
          businessPhone={activeTenant?.phone}
          cashier={user?.name}
        />
      )}
    </div>
  )
}
