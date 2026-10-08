import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import {
  ArrowLeft,
  CheckCircle,
  Image as ImageIcon,
  Minus,
  Plus,
  ShoppingBag,
  Store,
  Truck,
  Upload,
  X,
} from 'lucide-react'
import { createStoreOrder, uploadStoreProof } from '@/api/store'
import { apiErrorMessage } from '@/api/client'
import { Alert, Button, Field, Input } from '@/components/ui'
import { cn, formatCurrency } from '@/lib/cn'
import type { Franja, Product, Tenant } from '@/types'

/** Una línea del carrito. `variant` distingue dos líneas del mismo producto. */
export interface CartLine {
  product: Product
  variant?: string
  quantity: number
}

const FRANJA_LABELS: Record<string, string> = {
  morning: 'Mañana',
  afternoon: 'Tarde',
  evening: 'Noche',
}

export function lineKey(productId: string, variant?: string) {
  return variant ? `${productId}__${variant}` : productId
}

export function linePrice(line: CartLine) {
  const mod = line.variant
    ? (line.product.variants?.find((v) => v.name === line.variant)?.priceModifier ?? 0)
    : 0
  return line.product.price + mod
}

/**
 * Adelanto de una línea. Es un espejo del cálculo del servidor, que es el que
 * manda: acá solo sirve para mostrárselo al cliente antes de confirmar.
 */
export function lineAdvance(line: CartLine) {
  const p = line.product
  if (!p.requiresAdvance || !p.advanceValue) return 0
  const subtotal = linePrice(line) * line.quantity
  const raw =
    p.advanceType === 'fixed' ? p.advanceValue * line.quantity : (subtotal * p.advanceValue) / 100
  return Math.min(Math.round(raw * 100) / 100, subtotal)
}

/* ═════════════ Barra flotante ═════════════ */

export function StoreCart({
  tenant,
  lines,
  onChangeQty,
  onDone,
}: {
  tenant: Tenant
  lines: CartLine[]
  onChangeQty: (key: string, delta: number) => void
  onDone: () => void
}) {
  const [open, setOpen] = useState(false)
  const [confirmed, setConfirmed] = useState<{ trackingUrl: string } | null>(null)

  const units = lines.reduce((n, l) => n + l.quantity, 0)
  const total = lines.reduce((n, l) => n + linePrice(l) * l.quantity, 0)

  // Si el carrito queda vacío mientras el checkout está abierto, no tiene
  // sentido dejar la hoja encima de una tienda sin nada seleccionado.
  useEffect(() => {
    if (lines.length === 0) setOpen(false)
  }, [lines.length])

  if (confirmed) {
    return (
      <ConfirmedScreen
        tenant={tenant}
        trackingUrl={confirmed.trackingUrl}
        onClose={() => {
          setConfirmed(null)
          onDone()
        }}
      />
    )
  }

  if (lines.length === 0) return null

  return (
    <>
      {!open && (
        <div className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-slate-400">
                {units} {units === 1 ? 'producto' : 'productos'}
              </p>
              <p className="text-lg leading-tight font-bold tabular-nums text-slate-900">
                {formatCurrency(total)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="flex shrink-0 items-center gap-2 rounded-full bg-brand-600 px-6 py-3 font-semibold text-white transition-all hover:bg-brand-700 active:scale-[0.98]"
            >
              <ShoppingBag size={17} />
              Ver mi pedido
            </button>
          </div>
        </div>
      )}

      {open && (
        <CheckoutSheet
          tenant={tenant}
          lines={lines}
          total={total}
          onChangeQty={onChangeQty}
          onClose={() => setOpen(false)}
          onSuccess={(trackingUrl) => setConfirmed({ trackingUrl })}
        />
      )}
    </>
  )
}

/* ═════════════ Checkout ═════════════ */

function CheckoutSheet({
  tenant,
  lines,
  total,
  onChangeQty,
  onClose,
  onSuccess,
}: {
  tenant: Tenant
  lines: CartLine[]
  total: number
  onChangeQty: (key: string, delta: number) => void
  onClose: () => void
  onSuccess: (trackingUrl: string) => void
}) {
  const allowed = (tenant.deliveryTypes ?? []) as ('pickup' | 'delivery_own')[]
  const franjas = (tenant.deliveryFranjas ?? []) as Franja[]

  const [customer, setCustomer] = useState({ name: '', phone: '', email: '' })
  const [type, setType] = useState<'pickup' | 'delivery_own'>(allowed[0] ?? 'pickup')
  const [address, setAddress] = useState('')
  const [reference, setReference] = useState('')
  const [schedDate, setSchedDate] = useState('')
  const [schedFranja, setSchedFranja] = useState('')
  const [notes, setNotes] = useState('')
  const [proofUrl, setProofUrl] = useState<string | null>(null)
  const [proofError, setProofError] = useState('')

  const advanceDue = Math.round(lines.reduce((n, l) => n + lineAdvance(l), 0) * 100) / 100
  const methods = tenant.paymentMethods ?? []

  const uploadProof = useMutation({
    mutationFn: (file: File) => uploadStoreProof(tenant.slug, file),
    onSuccess: (url) => {
      setProofUrl(url)
      setProofError('')
    },
    onError: (e) => setProofError(apiErrorMessage(e)),
  })

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [onClose])

  const mutation = useMutation({
    mutationFn: () =>
      createStoreOrder(tenant.slug, {
        customer: {
          name: customer.name.trim(),
          phone: customer.phone.trim(),
          email: customer.email.trim() || undefined,
        },
        items: lines.map((l) => ({
          productId: l.product._id,
          quantity: l.quantity,
          variant: l.variant,
        })),
        type,
        address: type !== 'pickup' ? address.trim() : undefined,
        reference: type !== 'pickup' ? reference.trim() || undefined : undefined,
        scheduledFor: schedDate
          ? { date: schedDate, franja: (schedFranja as Franja) || undefined }
          : undefined,
        notes: notes.trim() || undefined,
        advanceProofUrl: proofUrl ?? undefined,
      }),
    onSuccess: (data) => onSuccess(data.trackingUrl),
  })

  /** El pedido no puede estar listo antes que el producto que más demora. */
  const maxPrepDays = lines.reduce((n, l) => Math.max(n, l.product.preparationDays ?? 0), 0)
  const earliest = new Date()
  earliest.setDate(earliest.getDate() + maxPrepDays)
  const minDate = earliest.toISOString().slice(0, 10)

  const needsSchedule = franjas.length > 0
  const canOrder =
    customer.name.trim().length > 1 &&
    customer.phone.replace(/\D/g, '').length >= 6 &&
    (type === 'pickup' || address.trim().length > 3) &&
    !!schedDate &&
    (!needsSchedule || !!schedFranja) &&
    (advanceDue === 0 || !!proofUrl)


  return (
    <div className="animate-fade fixed inset-0 z-40 flex justify-center bg-slate-900/50">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Completa tu pedido"
        className="animate-sheet flex h-full w-full max-w-2xl flex-col bg-white sm:my-6 sm:h-[calc(100%-3rem)] sm:rounded-2xl sm:shadow-2xl"
      >
        <div className="flex shrink-0 items-center gap-3 border-b border-slate-200 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            aria-label="Volver"
            className="-ml-1.5 rounded-full p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <ArrowLeft size={20} />
          </button>
          <h2 className="flex-1 font-bold text-slate-900">Completa tu pedido</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 sm:hidden"
          >
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {mutation.isError && (
            <div className="px-4 pt-4">
              <Alert error={mutation.error} />
            </div>
          )}

          <h3 className="bg-slate-50 px-4 py-2 text-xs font-bold tracking-wide text-slate-500 uppercase">
            Tu pedido
          </h3>
          <ul className="divide-y divide-slate-100">
            {lines.map((l) => {
              const key = lineKey(l.product._id, l.variant)
              const price = linePrice(l)
              const max = l.product.trackStock ? (l.product.stock ?? 0) : Infinity
              return (
                <li key={key} className="flex items-center gap-3 px-4 py-2.5">
                  {l.product.images?.[0] ? (
                    <img
                      src={l.product.images[0]}
                      alt=""
                      className="size-12 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-300">
                      <ImageIcon size={16} />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">{l.product.name}</p>
                    {l.variant && <p className="text-xs text-slate-500">{l.variant}</p>}
                    <p className="text-sm font-semibold tabular-nums text-slate-600">
                      {formatCurrency(price * l.quantity)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1 rounded-lg bg-slate-100 p-0.5">
                    <button
                      type="button"
                      aria-label={`Quitar ${l.product.name}`}
                      onClick={() => onChangeQty(key, -1)}
                      className="flex size-7 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-white active:scale-90"
                    >
                      <Minus size={13} />
                    </button>
                    <span className="w-5 text-center text-sm font-bold tabular-nums text-slate-900">
                      {l.quantity}
                    </span>
                    <button
                      type="button"
                      aria-label={`Agregar ${l.product.name}`}
                      disabled={l.quantity >= max}
                      onClick={() => onChangeQty(key, 1)}
                      className="flex size-7 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-white active:scale-90 disabled:opacity-30"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>

          <h3 className="bg-slate-50 px-4 py-2 text-xs font-bold tracking-wide text-slate-500 uppercase">
            Tus datos
          </h3>
          <div className="grid gap-3 px-4 py-4 sm:grid-cols-2">
            <Field label="Tu nombre" htmlFor="ck-name">
              <Input
                id="ck-name"
                autoComplete="name"
                placeholder="Nombre completo"
                value={customer.name}
                onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
              />
            </Field>
            <Field label="Teléfono" htmlFor="ck-phone">
              <Input
                id="ck-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="987 654 321"
                value={customer.phone}
                onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Email (opcional)" htmlFor="ck-email">
                <Input
                  id="ck-email"
                  type="email"
                  autoComplete="email"
                  placeholder="tucorreo@email.com"
                  value={customer.email}
                  onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                />
              </Field>
            </div>
          </div>

          <h3 className="bg-slate-50 px-4 py-2 text-xs font-bold tracking-wide text-slate-500 uppercase">
            Entrega
          </h3>
          <div className="space-y-4 px-4 py-4">
            {allowed.length > 1 && (
              <div className="grid grid-cols-2 gap-2.5">
                {allowed.map((t) => {
                  const active = type === t
                  const Icon = t === 'pickup' ? Store : Truck
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className={cn(
                        'flex flex-col items-center gap-1.5 rounded-xl border-2 px-3 py-3.5 text-sm font-medium transition-all',
                        active
                          ? 'border-brand-500 bg-brand-50 text-brand-700'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300',
                      )}
                    >
                      <Icon size={19} className={active ? 'text-brand-600' : 'text-slate-400'} />
                      {t === 'pickup' ? 'Recojo en tienda' : 'Delivery'}
                    </button>
                  )
                })}
              </div>
            )}

            {type === 'delivery_own' ? (
              <>
                <Field label="Dirección de entrega" htmlFor="ck-addr">
                  <Input
                    id="ck-addr"
                    placeholder="Calle, número, distrito"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </Field>
                <Field label="Referencia (opcional)" htmlFor="ck-ref">
                  <Input
                    id="ck-ref"
                    placeholder="Portón verde, frente al parque..."
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                  />
                </Field>
              </>
            ) : (
              <p className="rounded-xl bg-slate-50 px-3.5 py-3 text-[13px] text-slate-600">
                Recoges tu pedido en la tienda de {tenant.name} el día que elijas abajo.
              </p>
            )}

            {/* La fecha se pide siempre: para recojo o para envío. */}
            <Field
              label={type === 'pickup' ? '¿Qué día lo recoges?' : '¿Qué día te lo llevamos?'}
              htmlFor="ck-date"
            >
              <Input
                id="ck-date"
                type="date"
                min={minDate}
                value={schedDate}
                onChange={(e) => setSchedDate(e.target.value)}
              />
              {maxPrepDays > 0 && (
                <p className="mt-1.5 text-xs text-amber-700">
                  Tu pedido necesita {maxPrepDays} día{maxPrepDays > 1 ? 's' : ''} de preparación:
                  la fecha más próxima es el {minDate.split('-').reverse().join('/')}.
                </p>
              )}
            </Field>

            {franjas.length > 0 && (
              <div>
                <p className="mb-1.5 text-sm font-medium text-slate-700">
                  {type === 'pickup' ? '¿A qué hora pasas?' : 'Horario de entrega'}
                </p>
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

            <Field label="Nota para el negocio (opcional)" htmlFor="ck-notes">
              <Input
                id="ck-notes"
                placeholder="Sin azúcar, para regalo, etc."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>
          </div>

          {/* Adelanto: dónde pagar y el comprobante. */}
          {advanceDue > 0 && (
            <>
              <h3 className="bg-slate-50 px-4 py-2 text-xs font-bold tracking-wide text-slate-500 uppercase">
                Adelanto
              </h3>
              <div className="space-y-4 px-4 py-4">
                <div className="rounded-xl bg-amber-50 p-4 ring-1 ring-amber-200">
                  <p className="text-sm text-amber-900">
                    Este pedido requiere un adelanto de{' '}
                    <strong className="text-base">{formatCurrency(advanceDue)}</strong>
                  </p>
                  <p className="mt-1 text-xs text-amber-800">
                    Páguelo por uno de los medios de abajo y sube la captura. {tenant.name} la
                    revisará antes de preparar tu pedido.
                  </p>
                </div>

                {methods.length > 0 ? (
                  <div>
                    <p className="mb-2 text-sm font-medium text-slate-700">¿Dónde pagar?</p>
                    <ul className="space-y-2">
                      {methods.map((m, i) => (
                        <li
                          key={i}
                          className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200"
                        >
                          {m.qrImageUrl && (
                            <img
                              src={m.qrImageUrl}
                              alt={`QR de ${m.name}`}
                              className="size-14 shrink-0 rounded-lg object-cover"
                            />
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900">{m.name}</p>
                            {m.details && (
                              <p className="text-sm text-slate-600">{m.details}</p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <Alert>
                    Este negocio aún no publicó sus medios de pago. Escríbele por WhatsApp para
                    coordinar el adelanto.
                  </Alert>
                )}

                {/* Comprobante */}
                <div>
                  <p className="mb-2 text-sm font-medium text-slate-700">
                    Comprobante del pago
                  </p>

                  {proofUrl ? (
                    <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-3 ring-1 ring-emerald-200">
                      <img
                        src={proofUrl}
                        alt="Comprobante"
                        className="size-16 shrink-0 rounded-lg object-cover"
                      />
                      <p className="min-w-0 flex-1 text-sm font-medium text-emerald-800">
                        Comprobante cargado
                      </p>
                      <button
                        type="button"
                        onClick={() => setProofUrl(null)}
                        className="shrink-0 text-xs font-medium text-slate-500 hover:underline"
                      >
                        Cambiar
                      </button>
                    </div>
                  ) : (
                    <label
                      className={cn(
                        'flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border-2 border-dashed p-6 text-center transition-colors',
                        uploadProof.isPending
                          ? 'border-slate-200 bg-slate-50'
                          : 'border-slate-300 hover:border-brand-400 hover:bg-slate-50',
                      )}
                    >
                      <Upload size={20} className="text-slate-400" />
                      <span className="text-sm font-medium text-slate-700">
                        {uploadProof.isPending ? 'Subiendo...' : 'Sube tu captura o foto'}
                      </span>
                      <span className="text-xs text-slate-400">JPG, PNG o WebP</span>
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

                  {proofError && <p className="mt-2 text-xs text-red-600">{proofError}</p>}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="pb-safe shrink-0 border-t border-slate-200 p-4">
          <div className="mb-2.5 space-y-1">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-slate-500">Total</span>
              <span className="text-xl font-bold tabular-nums text-slate-900">
                {formatCurrency(total)}
              </span>
            </div>
            {advanceDue > 0 && (
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-amber-700">Adelanto ahora</span>
                <span className="font-semibold tabular-nums text-amber-700">
                  {formatCurrency(advanceDue)}
                </span>
              </div>
            )}
          </div>
          <Button
            className="w-full py-3.5 text-base"
            disabled={!canOrder || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? 'Enviando...' : 'Confirmar pedido'}
          </Button>
          <p className="mt-2 text-center text-[11px] text-slate-400">
            {advanceDue > 0
              ? `${tenant.name} revisará tu comprobante y te confirmará el pedido.`
              : `No se cobra nada ahora. ${tenant.name} te contactará para coordinar el pago.`}
          </p>
        </div>
      </div>
    </div>
  )
}

/* ═════════════ Confirmación ═════════════ */

function ConfirmedScreen({
  tenant,
  trackingUrl,
  onClose,
}: {
  tenant: Tenant
  trackingUrl: string
  onClose: () => void
}) {
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  return (
    <div className="animate-fade fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-white p-8 text-center">
      <div className="flex size-20 items-center justify-center rounded-full bg-emerald-100">
        <CheckCircle size={40} className="text-emerald-600" />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900">¡Pedido enviado!</p>
        <p className="mx-auto mt-2 max-w-sm text-slate-500">
          {tenant.name} ya recibió tu pedido y te contactará para coordinar la entrega y el pago.
        </p>
      </div>
      <div className="flex w-full max-w-xs flex-col gap-2.5">
        <a
          href={trackingUrl}
          className="rounded-xl bg-brand-600 px-6 py-3.5 font-semibold text-white transition-colors hover:bg-brand-700"
        >
          Seguir mi pedido
        </a>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl px-6 py-3 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
        >
          Seguir comprando
        </button>
      </div>
    </div>
  )
}
