import { Fragment, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AlertOctagon, AlertTriangle, Info, RefreshCw, Search, ScrollText } from 'lucide-react'
import { getLogStats, listLogs, type LogListParams } from '@/api/support'
import {
  Badge,
  Button,
  Card,
  Chip,
  ChipBar,
  EmptyState,
  Input,
  PageHeader,
  Select,
  Spinner,
  StatCard,
} from '@/components/ui'
import { cn } from '@/lib/cn'
import type { LogLevel, LogSource, SystemLog } from '@/types'

const PAGE_SIZE = 50

const LEVEL_TONES: Record<LogLevel, 'red' | 'amber' | 'slate'> = {
  error: 'red',
  warn: 'amber',
  info: 'slate',
}

const LEVEL_LABELS: Record<LogLevel, string> = {
  error: 'Error',
  warn: 'Aviso',
  info: 'Info',
}

const SOURCE_LABELS: Record<LogSource, string> = {
  api: 'API',
  web: 'Navegador',
  whatsapp: 'WhatsApp',
  storefront: 'Tienda externa',
  support: 'Soporte',
  job: 'Proceso',
}

/**
 * Visor de logs del sistema.
 *
 * Es la contraparte del código que se le muestra al usuario cuando algo falla:
 * él dice "me salió E3F9A1C2" y acá aparece el stack, el negocio, el usuario y
 * el body de esa request exacta.
 */
export function SuperadminLogsPage() {
  // Los enlaces de un ticket y de la ficha de un negocio caen acá ya filtrados:
  // "ver el log de este error" tiene que ser un clic, no una búsqueda a mano.
  const [searchParams] = useSearchParams()
  const initialRef = searchParams.get('ref') ?? ''
  const tenantId = searchParams.get('tenant') ?? undefined
  const initialLevel = (searchParams.get('level') ?? '') as LogLevel | ''

  const [level, setLevel] = useState<LogLevel | ''>(initialLevel)
  const [source, setSource] = useState<LogSource | ''>('')
  const [search, setSearch] = useState(initialRef)
  const [applied, setApplied] = useState(initialRef)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [skip, setSkip] = useState(0)
  const [expanded, setExpanded] = useState<string | null>(null)

  const params: LogListParams = {
    level: level || undefined,
    source: source || undefined,
    tenantId,
    from: from || undefined,
    to: to || undefined,
    limit: PAGE_SIZE,
    skip,
    // Un código de referencia es exacto: buscarlo como texto libre no sirve.
    ...(/^[0-9a-f]{8}$/i.test(applied.trim())
      ? { ref: applied.trim() }
      : applied.trim()
        ? { q: applied.trim() }
        : {}),
  }

  const { data: stats } = useQuery({ queryKey: ['log-stats'], queryFn: getLogStats })
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['logs', params],
    queryFn: () => listLogs(params),
  })

  function applySearch() {
    setApplied(search)
    setSkip(0)
  }

  function pickLevel(next: LogLevel | '') {
    setLevel(next)
    setSkip(0)
  }

  const total = data?.total ?? 0
  const page = Math.floor(skip / PAGE_SIZE) + 1
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Logs del sistema"
        description={
          data
            ? `Se guardan ${data.retentionDays} días y después se borran solos.`
            : 'Errores de la API, del navegador y de las notificaciones.'
        }
        actions={
          <Button variant="secondary" disabled={isFetching} onClick={() => refetch()}>
            <RefreshCw size={15} className={cn(isFetching && 'animate-spin')} />
            Actualizar
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <StatCard
          icon={AlertOctagon}
          tone="red"
          label="Errores (24 h)"
          value={String(stats?.last24h.error ?? 0)}
        />
        <StatCard
          icon={AlertTriangle}
          tone="amber"
          label="Avisos (24 h)"
          value={String(stats?.last24h.warn ?? 0)}
        />
        <StatCard
          icon={Info}
          label="Info (24 h)"
          value={String(stats?.last24h.info ?? 0)}
        />
        <StatCard
          icon={ScrollText}
          label="Errores (7 días)"
          value={String(stats?.errors7d ?? 0)}
        />
      </div>

      {/* Lo que más se repite casi siempre es lo que hay que arreglar primero. */}
      {stats?.top && stats.top.length > 0 && (
        <Card title="Lo que más se repite" description="Errores de los últimos 7 días">
          <ul className="divide-y divide-slate-100">
            {stats.top.map((t, i) => (
              <li key={i} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                <Badge tone="red">{t.count}×</Badge>
                <div className="min-w-0">
                  <p className="truncate text-sm text-slate-800">{t.message}</p>
                  {t.action && (
                    <p className="truncate font-mono text-xs text-slate-400">{t.action}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="space-y-3">
        <ChipBar>
          <Chip active={level === ''} onClick={() => pickLevel('')}>
            Todos
          </Chip>
          <Chip active={level === 'error'} onClick={() => pickLevel('error')}>
            Errores
          </Chip>
          <Chip active={level === 'warn'} onClick={() => pickLevel('warn')}>
            Avisos
          </Chip>
          <Chip active={level === 'info'} onClick={() => pickLevel('info')}>
            Info
          </Chip>
        </ChipBar>

        <div className="grid gap-2 lg:grid-cols-[1fr_auto_auto_auto]">
          <div className="flex gap-2">
            <Input
              value={search}
              placeholder="Mensaje, ruta o código de referencia…"
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applySearch()}
            />
            <Button variant="secondary" onClick={applySearch}>
              <Search size={15} />
            </Button>
          </div>

          <Select
            value={source}
            onChange={(e) => {
              setSource(e.target.value as LogSource | '')
              setSkip(0)
            }}
          >
            <option value="">Todo origen</option>
            {Object.entries(SOURCE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>

          {/* Las dos fechas comparten fila en mobile: sueltas, ocupan media pantalla. */}
          <div className="grid grid-cols-2 gap-2 lg:contents">
            <Input
              type="date"
              value={from}
              title="Desde"
              aria-label="Desde"
              onChange={(e) => {
                setFrom(e.target.value)
                setSkip(0)
              }}
            />
            <Input
              type="date"
              value={to}
              title="Hasta"
              aria-label="Hasta"
              onChange={(e) => {
                setTo(e.target.value)
                setSkip(0)
              }}
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <Spinner />
      ) : !data?.logs.length ? (
        <EmptyState
          icon={ScrollText}
          title="No hay eventos con estos filtros"
          description="Probá ampliar el rango de fechas o quitar el filtro de nivel."
        />
      ) : (
        <Card flush>
          {/* Tabla en desktop, tarjetas en mobile. Un log tiene demasiados
              campos para cinco columnas en un celular, y el visor sirve
              justamente cuando el reclamo llega estando lejos del escritorio. */}
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-semibold tracking-wide text-slate-400 uppercase">
                  <th className="px-4 py-2.5">Cuándo</th>
                  <th className="px-4 py-2.5">Nivel</th>
                  <th className="px-4 py-2.5">Qué pasó</th>
                  <th className="px-4 py-2.5">Negocio</th>
                  <th className="px-4 py-2.5">Ref</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.logs.map((log) => (
                  <Fragment key={log._id}>
                    <tr
                      className="cursor-pointer transition-colors hover:bg-slate-50"
                      onClick={() => setExpanded(expanded === log._id ? null : log._id)}
                    >
                      <td className="px-4 py-2.5 whitespace-nowrap text-xs text-slate-500">
                        {new Date(log.createdAt).toLocaleString('es-PE', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge tone={LEVEL_TONES[log.level]}>{LEVEL_LABELS[log.level]}</Badge>
                      </td>
                      <td className="max-w-md px-4 py-2.5">
                        <p className="truncate text-slate-800">{log.message}</p>
                        <p className="truncate font-mono text-xs text-slate-400">
                          {SOURCE_LABELS[log.source]}
                          {log.action && ` · ${log.action}`}
                          {log.statusCode ? ` · ${log.statusCode}` : ''}
                        </p>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-500">
                        {log.tenant?.name ?? '—'}
                        {log.user && (
                          <span className="block truncate text-slate-400">{log.user.name}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-400">{log.ref}</td>
                    </tr>

                    {expanded === log._id && (
                      <tr className="bg-slate-50">
                        <td colSpan={5} className="px-4 py-4">
                          <LogDetail log={log} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="divide-y divide-slate-100 lg:hidden">
            {data.logs.map((log) => (
              <li key={log._id}>
                <button
                  type="button"
                  onClick={() => setExpanded(expanded === log._id ? null : log._id)}
                  className="block w-full p-4 text-left active:bg-slate-50"
                >
                  <div className="flex items-center gap-2">
                    <Badge tone={LEVEL_TONES[log.level]}>{LEVEL_LABELS[log.level]}</Badge>
                    <span className="ml-auto shrink-0 text-xs text-slate-400">
                      {new Date(log.createdAt).toLocaleString('es-PE', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-slate-800">{log.message}</p>
                  <p className="mt-0.5 truncate font-mono text-xs text-slate-400">
                    {SOURCE_LABELS[log.source]}
                    {log.action && ` · ${log.action}`}
                    {log.statusCode ? ` · ${log.statusCode}` : ''}
                  </p>

                  <div className="mt-2.5 flex items-center justify-between gap-3 border-t border-slate-100 pt-2 text-xs text-slate-400">
                    <span className="min-w-0 truncate">{log.tenant?.name ?? 'Sin negocio'}</span>
                    <span className="shrink-0 font-mono">{log.ref}</span>
                  </div>
                </button>

                {expanded === log._id && (
                  <div className="bg-slate-50 px-4 py-4">
                    <LogDetail log={log} />
                  </div>
                )}
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
            <span>
              {total.toLocaleString('es-PE')} eventos · página {page} de {pages}
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={skip === 0}
                onClick={() => setSkip(Math.max(0, skip - PAGE_SIZE))}
              >
                Anterior
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={skip + PAGE_SIZE >= total}
                onClick={() => setSkip(skip + PAGE_SIZE)}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}

function LogDetail({ log }: { log: SystemLog }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-800">{log.message}</p>

      <dl className="grid gap-x-6 gap-y-1 text-xs sm:grid-cols-2">
        <Row label="Referencia" value={log.ref} mono />
        <Row label="Origen" value={SOURCE_LABELS[log.source]} />
        {log.action && <Row label="Acción" value={log.action} mono />}
        {log.statusCode && <Row label="HTTP" value={String(log.statusCode)} />}
        {log.tenant && <Row label="Negocio" value={log.tenant.name} />}
        {log.user && <Row label="Usuario" value={`${log.user.name} · ${log.user.email}`} />}
      </dl>

      {log.context && (
        <div>
          <p className="mb-1 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
            Contexto
          </p>
          <pre className="max-h-64 overflow-auto rounded-lg bg-white p-3 font-mono text-[11px] leading-relaxed text-slate-600 ring-1 ring-slate-200">
            {JSON.stringify(log.context, null, 2)}
          </pre>
        </div>
      )}

      {log.stack && (
        <div>
          <p className="mb-1 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
            Stack
          </p>
          <pre className="max-h-64 overflow-auto rounded-lg bg-white p-3 font-mono text-[11px] leading-relaxed text-slate-600 ring-1 ring-slate-200">
            {log.stack}
          </pre>
        </div>
      )}
    </div>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex gap-2">
      <dt className="shrink-0 text-slate-400">{label}:</dt>
      <dd className={cn('min-w-0 truncate text-slate-700', mono && 'font-mono')}>{value}</dd>
    </div>
  )
}
