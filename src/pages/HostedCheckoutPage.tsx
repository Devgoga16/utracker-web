import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  CheckCircle,
  Clock,
  Image as ImageIcon,
  Lock,
  Store,
  Truck,
  Upload,
  XCircle,
} from 'lucide-react'
import {
  confirmCheckoutSession,
  getCheckoutSession,
  uploadCheckoutProof,
} from '@/api/storefront'
import { apiErrorMessage } from '@/api/client'
import { Alert, Button, Field, Input, Spinner } from '@/components/ui'
import { cn, formatCurrency } from '@/lib/cn'
import { applyBrandColor } from '@/lib/brandColor'
import type { Franja } from '@/types'

const FRANJA_LABELS: Record<string, string> = {
  morning: 'Mañana',
  afternoon: 'Tarde',
  evening: 'Noche',
}

/**
 * Checkout hospedado por uTracker, abierto desde la web de un tercero.
 *
 * Vive acá y no en la web del integrador para que los datos del comprador y
 * el comprobante nunca pasen por un sitio que no controlamos. El tercero solo
 * sabe qué se pidió; quién lo pidió y cómo pagó es nuestro.
 */
export function HostedCheckoutPage() {
  const { token } = useParams<{ token: string }>()

  const { data, isLoading, error } = useQuery({
    queryKey: ['checkout-session', token],
    queryFn: () => getCheckoutSession(token!),
    enabled: !!token,
    retry: false,
  })

  useEffect(() => applyBrandColor(data?.store.brandColor), [data?.store.brandColor])

  const [customer, setCustomer] = useState({ name: '', phone: '', email: '' })
  const [type, setType] = useState<'pickup' | 'delivery_own'>('pickup')
  const [address, setAddress] = useState('')
  const [reference, setReference] = useState('')
  const [schedDate, setSchedDate] = useState('')
  const [schedFranja, setSchedFranja] = useState('')
  const [notes, setNotes] = useState('')
  const [proofUrl, setProofUrl] = useState<string | null>(null)
  const [done, setDone] = useState<{ trackingUrl: string; returnUrl?: string } | null>(null)

  // Arranca con la primera entrega que acepte la tienda.
  useEffect(() => {
    const first = data?.store.deliveryTypes?.[0]
    if (first) setType(first)
  }, [data?.store.deliveryTypes])

  const uploadProof = useMutation({
    mutationFn: (file: File) => uploadCheckoutProof(token!, file),
    onSuccess: setProofUrl,
  })

  const confirm = useMutation({
    mutationFn: () =>
      confirmCheckoutSession(token!, {
        customer: {
          name: customer.name.trim(),
          phone: customer.phone.trim(),
          email: customer.email.trim() || undefined,
        },
        type,
        address: type !== 'pickup' ? address.trim() : undefined,
        reference: type !== 'pickup' ? reference.trim() || undefined : undefined,
        scheduledFor: schedDate
          ? { date: schedDate, franja: (schedFranja as Franja) || undefined }
          : undefined,
        notes: notes.trim() || undefined,
        advanceProofUrl: proofUrl ?? undefined,
      }),
    onSuccess: (res) => {
      setDone({ trackingUrl: res.trackingUrl, returnUrl: res.returnUrl })
      /**
       * Avisa a la web que abrió esta ventana. Así puede vaciar su carrito o
       * mostrar su propio mensaje sin tener que consultarnos nada.
       */
      window.opener?.postMessage(
        { source: 'utracker', type: 'checkout:completed', trackingUrl: res.trackingUrl },
        '*',
      )
    },
  })

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-8 text-center">
        <XCircle size={40} className="text-slate-300" />
        <p className="font-semibold text-slate-700">No pudimos abrir tu compra</p>
        <p className="max-w-sm text-sm text-slate-500">
          {error ? apiErrorMessage(error) : 'Esta sesión no existe o ya venció.'}
        </p>
        <p className="text-xs text-slate-400">Vuelve a la tienda y arma tu pedido otra vez.</p>
      </div>
    )
  }

  /* ── Confirmado ──────────────────────────────────────────────── */
  if (done) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
        <div className="flex size-20 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle size={40} className="text-emerald-600" />
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-900">¡Pedido enviado!</p>
          <p className="mx-auto mt-2 max-w-sm text-slate-500">
            {data.store.name} ya lo recibió y te contactará para coordinar la entrega.
          </p>
        </div>
        <div className="flex w-full max-w-xs flex-col gap-2.5">
          <a
            href={done.trackingUrl}
            className="rounded-xl bg-brand-600 px-6 py-3.5 font-semibold text-white transition-colors hover:bg-brand-700"
          >
            Seguir mi pedido
          </a>
          {done.returnUrl && (
            <a
              href={done.returnUrl}
              className="rounded-xl px-6 py-3 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
            >
              Volver a la tienda
            </a>
          )}
        </div>
      </div>
    )
  }

  const franjas = data.store.deliveryFranjas ?? []
  const methods = data.store.paymentMethods ?? []
  const earliest = new Date()
  earliest.setDate(earliest.getDate() + data.maxPrepDays)
  const minDate = earliest.toISOString().slice(0, 10)

  const canConfirm =
    customer.name.trim().length > 1 &&
    customer.phone.replace(/\D/g, '').length >= 6 &&
    (type === 'pickup' || address.trim().length > 3) &&
    !!schedDate &&
    (franjas.length === 0 || !!schedFranja) &&
    (data.advanceDue === 0 || !!proofUrl)

  return (
    <div className="min-h-screen bg-slate-100 py-0 sm:py-8">
      <div className="mx-auto max-w-xl bg-white shadow-sm sm:rounded-2xl sm:ring-1 sm:ring-slate-200">
        {/* Identidad de la tienda, para que el comprador sepa dónde está. */}
        <header className="flex items-center gap-3 border-b border-slate-200 p-4 sm:rounded-t-2xl">
          {data.store.logoUrl ? (
            <img
              src={data.store.logoUrl}
              alt={data.store.name}
              className="size-10 shrink-0 rounded-xl object-cover ring-1 ring-slate-200"
            />
          ) : (
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-sm font-bold text-brand-700">
              {data.store.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-slate-900">{data.store.name}</p>
            <p className="text-xs text-slate-500">Completa tu pedido</p>
          </div>
          <span className="flex shrink-0 items-center gap-1 text-[11px] text-slate-400">
            <Lock size={11} />
            Seguro
          </span>
        </header>

        <div className="divide-y divide-slate-100">
          {confirm.isError && (
            <div className="p-4">
              <Alert>{apiErrorMessage(confirm.error)}</Alert>
            </div>
          )}

          {/* Resumen (no editable: el carrito lo armó la otra web) */}
          <section className="p-4">
            <h2 className="mb-2.5 text-xs font-bold tracking-wide text-slate-500 uppercase">
              Tu pedido
            </h2>
            <ul className="space-y-2">
              {data.items.map((i, idx) => (
                <li key={idx} className="flex items-center gap-3">
                  {i.imageUrl ? (
                    <img src={i.imageUrl} alt="" className="size-11 rounded-lg object-cover" />
                  ) : (
                    <div className="flex size-11 items-center justify-center rounded-lg bg-slate-100 text-slate-300">
                      <ImageIcon size={15} />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">
                      <span className="text-slate-500">{i.quantity}×</span> {i.name}
                    </p>
                    {i.variant && <p className="text-xs text-slate-500">{i.variant}</p>}
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-700">
                    {formatCurrency(i.unitPrice * i.quantity)}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* Datos */}
          <section className="space-y-3 p-4">
            <h2 className="text-xs font-bold tracking-wide text-slate-500 uppercase">Tus datos</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Tu nombre" htmlFor="hc-name">
                <Input
                  id="hc-name"
                  autoComplete="name"
                  placeholder="Nombre completo"
                  value={customer.name}
                  onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                />
              </Field>
              <Field label="Teléfono" htmlFor="hc-phone">
                <Input
                  id="hc-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="987 654 321"
                  value={customer.phone}
                  onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Email (opcional)" htmlFor="hc-email">
                  <Input
                    id="hc-email"
                    type="email"
                    autoComplete="email"
                    value={customer.email}
                    onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                  />
                </Field>
              </div>
            </div>
          </section>

          {/* Entrega */}
          <section className="space-y-3 p-4">
            <h2 className="text-xs font-bold tracking-wide text-slate-500 uppercase">Entrega</h2>

            {data.store.deliveryTypes.length > 1 && (
              <div className="grid grid-cols-2 gap-2.5">
                {data.store.deliveryTypes.map((t) => {
                  const active = type === t
                  const Icon = t === 'pickup' ? Store : Truck
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className={cn(
                        'flex flex-col items-center gap-1.5 rounded-xl border-2 px-3 py-3 text-sm font-medium transition-all',
                        active
                          ? 'border-brand-500 bg-brand-50 text-brand-700'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300',
                      )}
                    >
                      <Icon size={18} className={active ? 'text-brand-600' : 'text-slate-400'} />
                      {t === 'pickup' ? 'Recojo en tienda' : 'Delivery'}
                    </button>
                  )
                })}
              </div>
            )}

            {type === 'delivery_own' && (
              <>
                <Field label="Dirección" htmlFor="hc-addr">
                  <Input
                    id="hc-addr"
                    placeholder="Calle, número, distrito"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </Field>
                <Field label="Referencia (opcional)" htmlFor="hc-ref">
                  <Input
                    id="hc-ref"
                    placeholder="Portón verde, frente al parque..."
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                  />
                </Field>
              </>
            )}

            <Field
              label={type === 'pickup' ? '¿Qué día lo recoges?' : '¿Qué día te lo llevamos?'}
              htmlFor="hc-date"
            >
              <Input
                id="hc-date"
                type="date"
                min={minDate}
                value={schedDate}
                onChange={(e) => setSchedDate(e.target.value)}
              />
              {data.maxPrepDays > 0 && (
                <p className="mt-1.5 flex items-center gap-1 text-xs text-amber-700">
                  <Clock size={11} />
                  Necesita {data.maxPrepDays} día{data.maxPrepDays > 1 ? 's' : ''} de preparación.
                </p>
              )}
            </Field>

            {franjas.length > 0 && (
              <div>
                <p className="mb-1.5 text-sm font-medium text-slate-700">Horario</p>
                <div className="grid grid-cols-3 gap-2">
                  {franjas.map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setSchedFranja(f)}
                      className={cn(
                        'rounded-xl border-2 px-2 py-2.5 text-sm font-medium transition-all',
                        schedFranja === f
                          ? 'border-brand-500 bg-brand-50 text-brand-700'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300',
                      )}
                    >
                      {FRANJA_LABELS[f]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <Field label="Nota (opcional)" htmlFor="hc-notes">
              <Input
                id="hc-notes"
                placeholder="Sin azúcar, para regalo…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>
          </section>

          {/* Adelanto */}
          {data.advanceDue > 0 && (
            <section className="space-y-3 p-4">
              <h2 className="text-xs font-bold tracking-wide text-slate-500 uppercase">
                Adelanto
              </h2>

              <div className="rounded-xl bg-amber-50 p-3.5 ring-1 ring-amber-200">
                <p className="text-sm text-amber-900">
                  Este pedido requiere un adelanto de{' '}
                  <strong>{formatCurrency(data.advanceDue)}</strong>
                </p>
              </div>

              {methods.length > 0 ? (
                <ul className="space-y-1.5">
                  {methods.map((m, i) => (
                    <li
                      key={i}
                      className="rounded-lg bg-slate-50 px-3 py-2 text-sm ring-1 ring-slate-200"
                    >
                      <span className="font-semibold text-slate-900">{m.name}</span>
                      {m.details && <span className="text-slate-600"> · {m.details}</span>}
                    </li>
                  ))}
                </ul>
              ) : (
                <Alert>
                  Esta tienda aún no publicó sus medios de pago. Escríbele para coordinar.
                </Alert>
              )}

              {proofUrl ? (
                <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-3 ring-1 ring-emerald-200">
                  <img src={proofUrl} alt="" className="size-14 rounded-lg object-cover" />
                  <p className="flex-1 text-sm font-medium text-emerald-800">
                    Comprobante cargado
                  </p>
                  <button
                    type="button"
                    onClick={() => setProofUrl(null)}
                    className="text-xs font-medium text-slate-500 hover:underline"
                  >
                    Cambiar
                  </button>
                </div>
              ) : (
                <label className="flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border-2 border-dashed border-slate-300 p-5 text-center transition-colors hover:border-brand-400 hover:bg-slate-50">
                  <Upload size={19} className="text-slate-400" />
                  <span className="text-sm font-medium text-slate-700">
                    {uploadProof.isPending ? 'Subiendo...' : 'Sube tu comprobante'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadProof.isPending}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) uploadProof.mutate(file)
                      e.target.value = ''
                    }}
                  />
                </label>
              )}

              {uploadProof.isError && (
                <p className="text-xs text-red-600">{apiErrorMessage(uploadProof.error)}</p>
              )}
            </section>
          )}
        </div>

        {/* Total y confirmación */}
        <div className="pb-safe sticky bottom-0 border-t border-slate-200 bg-white p-4 sm:rounded-b-2xl">
          <div className="mb-2.5 space-y-1">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-slate-500">Total</span>
              <span className="text-xl font-bold tabular-nums text-slate-900">
                {formatCurrency(data.totalAmount)}
              </span>
            </div>
            {data.advanceDue > 0 && (
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-amber-700">Adelanto ahora</span>
                <span className="font-semibold tabular-nums text-amber-700">
                  {formatCurrency(data.advanceDue)}
                </span>
              </div>
            )}
          </div>

          <Button
            className="w-full py-3.5 text-base"
            disabled={!canConfirm || confirm.isPending}
            onClick={() => confirm.mutate()}
          >
            {confirm.isPending ? 'Enviando...' : 'Confirmar pedido'}
          </Button>

          <p className="mt-2 text-center text-[11px] text-slate-400">
            Tus datos van directo a {data.store.name}.
          </p>
        </div>
      </div>
    </div>
  )
}
