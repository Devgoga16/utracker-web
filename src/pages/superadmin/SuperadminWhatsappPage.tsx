import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  CheckCircle2,
  Loader2,
  QrCode,
  RefreshCw,
  Send,
  ServerCog,
  WifiOff,
} from 'lucide-react'
import { getWaStatus, sendWaTest, type WaStatus } from '@/api/whatsapp'
import { apiErrorMessage } from '@/api/client'
import { Alert, Button, Card, Field, Input, PageHeader, Spinner } from '@/components/ui'

const STATUS_INFO: Record<WaStatus, { label: string; color: string }> = {
  connected:    { label: 'Conectado',     color: 'text-emerald-600' },
  open:         { label: 'Conectado',     color: 'text-emerald-600' },
  connecting:   { label: 'Conectando…',   color: 'text-amber-600'   },
  reconnecting: { label: 'Reconectando…', color: 'text-amber-600'   },
  close:        { label: 'Desconectado',  color: 'text-slate-500'   },
  qr:           { label: 'Esperando QR',  color: 'text-violet-600'  },
}

function StatusDot({ connected, status }: { connected: boolean; status: WaStatus }) {
  if (connected) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200">
        <span className="size-2 animate-pulse rounded-full bg-emerald-500" />
        {STATUS_INFO.open.label}
      </span>
    )
  }
  const info = STATUS_INFO[status] ?? STATUS_INFO.close
  const isSpinning = status === 'connecting' || status === 'reconnecting'
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-sm font-medium ${info.color}`}
    >
      {isSpinning ? <Loader2 size={13} className="animate-spin" /> : <WifiOff size={13} />}
      {info.label}
    </span>
  )
}

/* ─────────────────── Prueba de envío ─────────────────── */

function TestSender() {
  const [to, setTo] = useState('')
  const [message, setMessage] = useState('')

  const mutation = useMutation({
    mutationFn: () => sendWaTest(to, message || undefined),
  })

  const digits = to.replace(/\D/g, '')
  const canSend = digits.length >= 8 && digits.length <= 15

  return (
    <Card
      title="Probar envío"
      description="Manda un mensaje real usando el mismo código que usan las notificaciones."
    >
      <div className="space-y-4">
        {mutation.isError && <Alert>{apiErrorMessage(mutation.error)}</Alert>}

        {mutation.isSuccess && (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3.5 py-2.5 text-sm font-medium text-emerald-800 ring-1 ring-emerald-200">
            <CheckCircle2 size={16} />
            Mensaje enviado a {mutation.data.to}. Revisa el celular.
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Número de destino" htmlFor="wa-to">
            <Input
              id="wa-to"
              type="tel"
              inputMode="tel"
              placeholder="51987654321"
              value={to}
              onChange={(e) => {
                setTo(e.target.value)
                mutation.reset()
              }}
            />
            <p className="mt-1.5 text-xs text-slate-500">
              Con código de país. El bot lo agrega si falta.
            </p>
          </Field>

          <Field label="Mensaje (opcional)" htmlFor="wa-msg">
            <Input
              id="wa-msg"
              placeholder="Mensaje de prueba desde uTracker…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </Field>
        </div>

        <Button disabled={!canSend || mutation.isPending} onClick={() => mutation.mutate()}>
          <Send size={15} />
          {mutation.isPending ? 'Enviando…' : 'Enviar prueba'}
        </Button>
      </div>
    </Card>
  )
}

/* ─────────────────── Página ─────────────────── */

export function SuperadminWhatsappPage() {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['wa-status'],
    queryFn: getWaStatus,
    // Mientras no esté conectado el QR se renueva, así que conviene relevarlo.
    refetchInterval: (query) => (query.state.data?.connected ? false : 4000),
    retry: 1,
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="WhatsApp"
        description="Estado del bot que envía las notificaciones a dueños y clientes."
        actions={
          <Button variant="secondary" size="sm" onClick={() => refetch()} disabled={isFetching}>
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
          <p className="font-semibold text-red-700">No se pudo obtener el estado</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-red-600">
            {apiErrorMessage(error)}
          </p>
          <Button variant="secondary" className="mt-4" onClick={() => refetch()}>
            Reintentar
          </Button>
        </div>
      ) : data && !data.configured ? (
        /* ── Falta configuración en el servidor ─────────────────────── */
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <div className="flex gap-3">
            <ServerCog size={20} className="mt-0.5 shrink-0 text-amber-600" />
            <div>
              <p className="font-semibold text-amber-900">El bot no está configurado</p>
              <p className="mt-1 text-sm text-amber-800">
                Falta definir <code className="font-mono">WHATSAPP_API_URL</code> y{' '}
                <code className="font-mono">WHATSAPP_API_KEY</code> en las variables de entorno de
                la API. Hasta entonces no se envía ninguna notificación.
              </p>
            </div>
          </div>
        </div>
      ) : data?.connected ? (
        /* ── Conectado ──────────────────────────────────────────────── */
        <>
          <div className="flex flex-col items-center gap-5 rounded-2xl border border-slate-200 bg-white py-12">
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
            <StatusDot connected status={data.status} />
            <p className="px-6 text-center text-xs text-slate-400">
              El bot está activo. Esta página avisará si se desconecta.
            </p>
          </div>

          <TestSender />
        </>
      ) : (
        /* ── Desconectado: hay que escanear ─────────────────────────── */
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
              <img src={data.qr} alt="Código QR de WhatsApp" className="w-full rounded-xl" />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 py-16">
              <QrCode size={36} className="text-slate-300" />
              <p className="text-sm text-slate-500">Esperando código QR…</p>
            </div>
          )}

          <div className="space-y-1.5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
            <p className="font-medium text-slate-700">Cómo conectar:</p>
            <ol className="list-decimal space-y-1 pl-4">
              <li>Abre WhatsApp en el celular del negocio.</li>
              <li>
                Entra a <strong>Dispositivos vinculados</strong> →{' '}
                <strong>Vincular un dispositivo</strong>.
              </li>
              <li>Escanea el código de arriba.</li>
            </ol>
            <p className="pt-1 text-xs text-slate-400">El QR se renueva cada 4 segundos.</p>
          </div>
        </div>
      )}
    </div>
  )
}
