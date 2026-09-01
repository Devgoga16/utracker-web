import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, Loader2, QrCode, RefreshCw, WifiOff } from 'lucide-react'
import { getWaStatus, type WaStatus } from '@/api/whatsapp'
import { Button, PageHeader, Spinner } from '@/components/ui'

const STATUS_INFO: Record<WaStatus, { label: string; color: string }> = {
  connected:    { label: 'Conectado',      color: 'text-emerald-600' },
  open:         { label: 'Conectado',      color: 'text-emerald-600' },
  connecting:   { label: 'Conectando…',    color: 'text-amber-600'   },
  reconnecting: { label: 'Reconectando…',  color: 'text-amber-600'   },
  close:        { label: 'Desconectado',   color: 'text-slate-500'   },
  qr:           { label: 'Esperando QR',   color: 'text-violet-600'  },
}

function StatusDot({ connected, status }: { connected: boolean; status: WaStatus }) {
  if (connected) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200">
        <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
        {STATUS_INFO.open.label}
      </span>
    )
  }
  const info = STATUS_INFO[status] ?? STATUS_INFO.close
  const isSpinning = status === 'connecting' || status === 'reconnecting'
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-sm font-medium ${info.color}`}>
      {isSpinning
        ? <Loader2 size={13} className="animate-spin" />
        : <WifiOff size={13} />}
      {info.label}
    </span>
  )
}

export function SuperadminWhatsappPage() {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['wa-status'],
    queryFn: getWaStatus,
    // Polling cada 4s mientras no esté conectado
    refetchInterval: (query) =>
      query.state.data?.connected ? false : 4000,
    retry: 2,
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="WhatsApp"
        description="Escanea el código QR con tu celular para conectar el bot."
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
            Actualizar
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Spinner />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="font-semibold text-red-700">No se pudo obtener el estado de WhatsApp</p>
          <p className="mt-1 text-sm text-red-500">
            Verifica que el servicio esté disponible y que la API key sea correcta.
          </p>
          <Button variant="secondary" className="mt-4" onClick={() => refetch()}>
            Reintentar
          </Button>
        </div>
      ) : data?.connected ? (
        /* ── CONECTADO ─────────────────────────────────────────────────── */
        <div className="flex flex-col items-center gap-6 py-16">
          <div className="flex size-20 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 size={40} className="text-emerald-600" />
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-900">¡WhatsApp conectado!</p>
            {data.phone && (
              <p className="mt-1 text-slate-500">
                <span className="font-medium">{data.phone.name}</span>
                {' · '}
                <span>+{data.phone.number}</span>
              </p>
            )}
          </div>
          <StatusDot connected={data.connected} status={data.status} />
          <p className="text-xs text-slate-400">
            El bot está activo. La página se actualizará automáticamente si se desconecta.
          </p>
        </div>
      ) : (
        /* ── DESCONECTADO / QR ─────────────────────────────────────────── */
        <div className="mx-auto max-w-sm space-y-5">
          <div className="flex items-center justify-between">
            <StatusDot connected={false} status={data?.status ?? 'close'} />
            {isFetching && (
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <Loader2 size={11} className="animate-spin" />
                Actualizando…
              </span>
            )}
          </div>

          {data?.qr ? (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <img
                src={data.qr}
                alt="Código QR de WhatsApp"
                className="w-full rounded-xl"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 py-16">
              <QrCode size={36} className="text-slate-300" />
              <p className="text-sm text-slate-500">Esperando código QR…</p>
            </div>
          )}

          <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600 space-y-1.5">
            <p className="font-medium text-slate-700">Cómo conectar:</p>
            <ol className="list-decimal pl-4 space-y-1">
              <li>Abre WhatsApp en tu celular.</li>
              <li>Ve a <strong>Dispositivos vinculados</strong> → <strong>Vincular un dispositivo</strong>.</li>
              <li>Escanea el código QR de arriba.</li>
            </ol>
            <p className="text-xs text-slate-400 pt-1">
              El QR se actualiza automáticamente cada 4 segundos.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
