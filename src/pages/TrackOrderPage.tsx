import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { trackOrder, type TrackingStep } from '@/api/tracking'
import { apiErrorMessage } from '@/api/client'
import { Alert, Card, Spinner, StateBadge } from '@/components/ui'
import { StateIcon } from '@/lib/icons'
import { formatCurrency, formatDateTime } from '@/lib/cn'
import type { OrderType } from '@/types'

const typeLabels: Record<OrderType, string> = {
  pickup: 'Retiro en tienda',
  delivery_third_party: 'Envío a domicilio',
  delivery_own: 'Envío a domicilio',
}

const shakeStyle = `
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  15% { transform: translateX(-4px) rotate(-1deg); }
  30% { transform: translateX(4px) rotate(1deg); }
  45% { transform: translateX(-3px); }
  60% { transform: translateX(3px); }
  75% { transform: translateX(-1px); }
}
.animate-shake { animation: shake 0.8s ease-in-out infinite; animation-delay: 0s; }
`

export function TrackOrderPage() {
  const { token } = useParams<{ token: string }>()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [lightbox, setLightbox] = useState<{ urls: string[]; index: number } | null>(null)

  function openLightbox(urls: string[], index: number) {
    setLightbox({ urls, index })
  }
  function lightboxPrev() {
    setLightbox((lb) => lb && { ...lb, index: (lb.index - 1 + lb.urls.length) % lb.urls.length })
  }
  function lightboxNext() {
    setLightbox((lb) => lb && { ...lb, index: (lb.index + 1) % lb.urls.length })
  }

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['track', token],
    queryFn: () => trackOrder(token!),
    enabled: Boolean(token),
    retry: false,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  })

  if (isLoading) return <Spinner />

  if (isError) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 sm:px-6 sm:py-20">
        <Alert>{apiErrorMessage(error)}</Alert>
        <p className="mt-4 text-center text-sm text-slate-500">
          Revisa el enlace o pídele uno nuevo al negocio.
        </p>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="mx-auto max-w-md space-y-5 px-5 py-8">
      <style>{shakeStyle}</style>
      <header className="text-center">
        {data.tenant.logoUrl && (
          <img
            src={data.tenant.logoUrl}
            alt={data.tenant.name}
            className="mx-auto mb-3 size-12 rounded-full object-cover ring-1 ring-slate-200"
          />
        )}
        <p className="text-sm text-slate-500">{data.tenant.name}</p>
        <h1 className="mt-1 text-xl font-bold text-slate-900">Tu pedido</h1>
        <p className="mt-1 text-xs text-slate-400">
          {typeLabels[data.type]} · {formatDateTime(data.createdAt)}
        </p>
      </header>

      {data.currentState && (
        <Card className="text-center">
          <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
            Estado actual
          </p>

          {/* Pulse icon — click to see order detail */}
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="group mx-auto mt-3 flex flex-col items-center gap-2 focus:outline-none"
            aria-label="Ver detalle del pedido"
          >
            <div className="relative">
              {/* Ping ring */}
              <span
                className="absolute inset-0 animate-ping rounded-full opacity-30"
                style={{ backgroundColor: data.currentState.color }}
              />
              <div
                className="relative flex size-16 items-center justify-center rounded-full transition-transform group-hover:scale-105"
                style={{ backgroundColor: `${data.currentState.color}1f` }}
              >
                <StateIcon name={data.currentState.icon} size={30} color={data.currentState.color} />
              </div>
            </div>

            <p className="text-lg font-bold" style={{ color: data.currentState.color }}>
              {data.currentState.name}
            </p>

            <p className="text-xs text-slate-400 underline underline-offset-2">
              Toca para ver qué pediste
            </p>
          </button>

          {data.fulfillmentLink && (
            <a
              href={data.fulfillmentLink}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: data.currentState?.color ?? '#64748b' }}
            >
              Seguir mi pedido →
            </a>
          )}
        </Card>
      )}

      {!data.isCancelled && data.steps.length > 0 && (
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Seguimiento</h2>
          <ol>
            {data.steps.map((step, i) => (
              <Step key={i} step={step} isLast={i === data.steps.length - 1} />
            ))}
          </ol>
        </Card>
      )}

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Resumen</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-slate-500">Total del pedido</dt>
            <dd className="font-bold">{formatCurrency(data.totalAmount)}</dd>
          </div>

          {/* Desglose de pagos */}
          {data.payments.totalPaid > 0 && (
            <>
              {data.payments.advance > 0 && (
                <div className="flex items-center justify-between">
                  <dt className="text-slate-500">Adelanto</dt>
                  <dd className="font-medium text-emerald-600">
                    {formatCurrency(data.payments.advance)}
                  </dd>
                </div>
              )}
              {data.payments.balance > 0 && (
                <div className="flex items-center justify-between">
                  <dt className="text-slate-500">Saldo pagado</dt>
                  <dd className="font-medium text-emerald-600">
                    {formatCurrency(data.payments.balance)}
                  </dd>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-slate-100 pt-2">
                <dt className="text-slate-500">Total pagado</dt>
                <dd className="font-semibold text-emerald-700">
                  {formatCurrency(data.payments.totalPaid)}
                </dd>
              </div>
            </>
          )}

          {data.payments.remaining > 0 && (
            <div className="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2">
              <dt className="font-medium text-amber-700">Resta pagar</dt>
              <dd className="font-bold text-amber-700">
                {formatCurrency(data.payments.remaining)}
              </dd>
            </div>
          )}

          {data.payments.remaining === 0 && data.payments.totalPaid > 0 && (
            <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2">
              <dt className="font-medium text-emerald-700">Pagado en su totalidad</dt>
              <dd className="text-emerald-600">✓</dd>
            </div>
          )}

          {data.paymentState && (
            <div className="flex items-center justify-between pt-1">
              <dt className="text-slate-500">Estado de pago</dt>
              <dd>
                <StateBadge
                  name={data.paymentState.name}
                  color={data.paymentState.color}
                  icon={data.paymentState.icon}
                />
              </dd>
            </div>
          )}

          {data.deliveryAddress && (
            <div className="flex justify-between gap-4 border-t border-slate-100 pt-2">
              <dt className="shrink-0 text-slate-500">Entrega</dt>
              <dd className="min-w-0 text-right break-words">{data.deliveryAddress}</dd>
            </div>
          )}
        </dl>
      </Card>

      <p className="pb-4 text-center text-xs text-slate-400">
        Esta página se actualiza sola. Puedes volver cuando quieras.
      </p>

      {/* ── Modal centrado — detalle del pedido ── */}
      {sheetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSheetOpen(false)}
          />

          {/* Modal */}
          <div className="relative w-full max-w-md max-h-[85dvh] overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
              <h2 className="font-semibold text-slate-900">Lo que pediste</h2>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <ul className="divide-y divide-slate-100 px-5">
              {data.items.map((item, i) => (
                <li key={i} className="flex gap-4 py-4">
                  {/* Images */}
                  {item.images.length > 0 && (
                    <div className="flex shrink-0 flex-col gap-1.5">
                      <button
                        type="button"
                        onClick={() => openLightbox(item.images, 0)}
                        className="overflow-hidden rounded-lg focus:outline-none"
                      >
                        <img
                          src={item.images[0]}
                          alt={item.name}
                          className="size-20 object-cover transition-opacity hover:opacity-80"
                        />
                      </button>
                      {item.images.length > 1 && (
                        <div className="flex gap-1">
                          {item.images.slice(1).map((url, j) => (
                            <button
                              key={url}
                              type="button"
                              onClick={() => openLightbox(item.images, j + 1)}
                              className="overflow-hidden rounded focus:outline-none"
                            >
                              <img src={url} alt="" className="size-9 object-cover opacity-80 hover:opacity-100" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900">{item.name}</p>
                    {item.variant && (
                      <p className="text-xs text-slate-500">{item.variant}</p>
                    )}
                    {item.specs && (
                      <p className="mt-1 text-xs whitespace-pre-line text-slate-500">{item.specs}</p>
                    )}
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs text-slate-400">×{item.quantity}</span>
                      <span className="text-sm font-semibold text-slate-800">
                        {formatCurrency(item.unitPrice * item.quantity)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mx-5 mb-5 flex items-center justify-between border-t-2 border-slate-200 pt-4">
              <span className="font-semibold text-slate-900">Total</span>
              <span className="text-base font-bold text-slate-900">{formatCurrency(data.totalAmount)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox fotos con navegación */}
      {lightbox && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90">
          {/* Imagen */}
          <img
            src={lightbox.urls[lightbox.index]}
            alt=""
            className="max-h-[75dvh] max-w-[78vw] rounded-xl object-contain shadow-2xl"
          />

          {/* Cerrar */}
          <button
            type="button"
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 flex size-9 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
          >
            <X size={18} />
          </button>

          {/* Anterior */}
          {lightbox.urls.length > 1 && (
            <button
              type="button"
              onClick={lightboxPrev}
              className="absolute left-4 flex size-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
            >
              <ChevronLeft size={22} />
            </button>
          )}

          {/* Siguiente */}
          {lightbox.urls.length > 1 && (
            <button
              type="button"
              onClick={lightboxNext}
              className="absolute right-4 flex size-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
            >
              <ChevronRight size={22} />
            </button>
          )}

          {/* Contador */}
          {lightbox.urls.length > 1 && (
            <p className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-black/40 px-3 py-1 text-xs text-white">
              {lightbox.index + 1} / {lightbox.urls.length}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function Step({ step, isLast }: { step: TrackingStep; isLast: boolean }) {
  const reached = step.done || step.current

  return (
    <li className="flex gap-3">
      <div className="flex flex-col items-center">
        <div
          className={`flex size-8 shrink-0 items-center justify-center rounded-full ${step.current && step.vibrant ? 'animate-shake' : ''}`}
          style={{ backgroundColor: reached ? `${step.color}1f` : '#f1f5f9' }}
        >
          <StateIcon name={step.icon} size={16} color={reached ? step.color : '#cbd5e1'} />
        </div>
        {!isLast && (
          <div
            className="my-1 w-0.5 flex-1"
            style={{ backgroundColor: step.done ? step.color : '#e2e8f0' }}
          />
        )}
      </div>

      <div className={isLast ? 'pb-0' : 'pb-5'}>
        <p
          className={`text-sm ${step.current ? 'font-bold' : reached ? 'font-medium text-slate-700' : 'text-slate-400'}`}
          style={step.current ? { color: step.color } : undefined}
        >
          {step.name}
        </p>
        {step.at && <p className="text-xs text-slate-400">{formatDateTime(step.at)}</p>}
      </div>
    </li>
  )
}
