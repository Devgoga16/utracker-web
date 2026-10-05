import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle,
  ChevronLeft,
  Clock,
  Image,
  MessageCircle,
  Minus,
  Package,
  Plus,
  ShoppingBag,
  Sparkles,
  Store,
  Truck,
  X,
} from 'lucide-react'
import { confirmCampaignOrder, getPublicCampaign } from '@/api/campaigns'
import { apiErrorMessage } from '@/api/client'
import { Alert, Button, Field, Input, Spinner } from '@/components/ui'
import { formatCurrency, cn } from '@/lib/cn'
import { applyBrandColor } from '@/lib/brandColor'
import type { Campaign, CampaignItem, Franja, Tenant } from '@/types'

type PublicTenant = Pick<Tenant, '_id' | 'name' | 'slug' | 'logoUrl' | 'phone' | 'brandColor'>

/** Parseo local: "2026-09-05" → Date en zona local, sin corrimiento UTC. */
function localDate(iso: string, dayOffset = 0) {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d + dayOffset)
}

function formatDate(d: string) {
  return localDate(d).toLocaleDateString('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

function formatShort(d: string) {
  return localDate(d).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })
}

const FRANJA_LABELS: Record<string, string> = {
  morning: 'Mañana',
  afternoon: 'Tarde',
  evening: 'Noche',
}

/* ═══════════════════ Cuenta regresiva ═══════════════════ */

function useCountdown(target: Date) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const diff = Math.max(0, target.getTime() - now)
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff / 3_600_000) % 24),
    minutes: Math.floor((diff / 60_000) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  }
}

/** Bloque de dos dígitos de la cuenta regresiva. */
function TimeUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="flex min-w-[2.75rem] justify-center rounded-lg bg-white/15 px-2 py-1.5 text-xl leading-none font-bold tabular-nums text-white ring-1 ring-white/20">
        {String(value).padStart(2, '0')}
      </span>
      <span className="mt-1 text-[9px] font-semibold tracking-wider text-white/55 uppercase">
        {label}
      </span>
    </div>
  )
}

/**
 * Encabezado de la campaña. No hay foto de portada: la jerarquía la dan el
 * color del negocio, el nombre y el reloj.
 */
function CampaignHero({
  name,
  description,
  target,
  live,
  ended,
  draft,
}: {
  name: string
  description?: string
  target: Date
  live: boolean
  ended: boolean
  draft: boolean
}) {
  const { days, hours, minutes, seconds } = useCountdown(target)
  const showClock = live || (!ended && !draft)

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 px-4 pt-5 pb-6">
      {/* Textura suave para que el bloque de color no se vea plano. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 -right-12 size-56 rounded-full bg-white/10 blur-2xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-20 -left-10 size-48 rounded-full bg-black/15 blur-2xl"
      />

      <div className="relative">
        {/* Estado */}
        {live ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold tracking-wide text-white uppercase ring-1 ring-white/25 backdrop-blur-sm">
            <span className="size-1.5 animate-pulse rounded-full bg-emerald-300" />
            Venta en vivo
          </span>
        ) : ended ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold tracking-wide text-white/70 uppercase ring-1 ring-white/15">
            Finalizada
          </span>
        ) : draft ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold tracking-wide text-white/70 uppercase ring-1 ring-white/15">
            No disponible
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold tracking-wide text-white uppercase ring-1 ring-white/25 backdrop-blur-sm">
            <Sparkles size={11} />
            Reserva anticipada
          </span>
        )}

        <h1 className="mt-3 text-3xl leading-[1.1] font-bold tracking-tight text-white sm:text-4xl">
          {name}
        </h1>

        {description && (
          <p className="mt-2 max-w-md text-[15px] leading-relaxed text-white/70">{description}</p>
        )}

        {showClock && (
          <div className="mt-5">
            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-white/60 uppercase">
              <Clock size={11} />
              {live ? 'Cierra en' : 'Empieza en'}
            </p>
            <div className="flex gap-2">
              {days > 0 && <TimeUnit value={days} label="días" />}
              <TimeUnit value={hours} label="hrs" />
              <TimeUnit value={minutes} label="min" />
              <TimeUnit value={seconds} label="seg" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/** Prueba social: cuánto se lleva vendido de la campaña. */
function SoldProgress({
  items,
  sold,
  stock,
}: {
  items: CampaignItem[]
  sold: number
  stock: number
}) {
  const pct = stock === 0 ? 0 : Math.round((sold / stock) * 100)
  const thumbs = items.filter((i) => i.imageUrl).slice(0, 4)
  const extra = items.length - thumbs.length

  return (
    <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
      {/* Miniaturas encimadas de los productos incluidos. */}
      {thumbs.length > 0 ? (
        <div className="flex shrink-0 -space-x-2">
          {thumbs.map((i) => (
            <img
              key={i.product}
              src={i.imageUrl}
              alt=""
              loading="lazy"
              className="size-8 rounded-full border-2 border-white object-cover"
            />
          ))}
          {extra > 0 && (
            <span className="flex size-8 items-center justify-center rounded-full border-2 border-white bg-slate-200 text-[10px] font-bold text-slate-600">
              +{extra}
            </span>
          )}
        </div>
      ) : (
        <span className="shrink-0 rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
          {items.length} {items.length === 1 ? 'producto' : 'productos'}
        </span>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xs font-semibold text-slate-700">
            {sold > 0 ? `${sold} vendidos` : 'Sé el primero en pedir'}
          </span>
          <span className="shrink-0 text-xs font-medium text-slate-400">
            {stock - sold} disponibles
          </span>
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-700',
              pct >= 75 ? 'bg-red-500' : pct >= 45 ? 'bg-amber-500' : 'bg-emerald-500',
            )}
            style={{ width: `${Math.max(pct, sold > 0 ? 4 : 0)}%` }}
          />
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════ Fila de producto ═══════════════════ */

function ItemRow({
  item,
  qty,
  onQtyChange,
  disabled,
}: {
  item: CampaignItem
  qty: number
  onQtyChange: (delta: number) => void
  disabled: boolean
}) {
  const available = item.stock - item.sold
  const soldOut = available <= 0
  const scarce = !soldOut && available <= Math.max(2, Math.ceil(item.stock * 0.2))
  const pct = item.stock === 0 ? 100 : Math.min(100, Math.round((item.sold / item.stock) * 100))

  return (
    <li
      className={cn(
        'flex items-center gap-3 px-4 py-3 transition-colors',
        soldOut ? 'opacity-55' : qty > 0 && 'bg-brand-50/40',
      )}
    >
      {/* Foto */}
      <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-slate-100">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            loading="lazy"
            className="size-full object-cover"
          />
        ) : (
          <span className="flex size-full items-center justify-center text-slate-300">
            <Image size={22} />
          </span>
        )}
        {soldOut && (
          <span className="absolute inset-0 flex items-center justify-center bg-white/70">
            <span className="rounded bg-slate-900/85 px-1.5 py-0.5 text-[9px] font-bold text-white uppercase">
              Agotado
            </span>
          </span>
        )}
      </div>

      {/* Datos */}
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-slate-900">{item.name}</p>
        <p className="mt-0.5 text-base font-bold text-slate-900">{formatCurrency(item.price)}</p>

        <div className="mt-1.5 flex items-center gap-2">
          <div className="h-1 w-16 overflow-hidden rounded-full bg-slate-200">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                pct >= 75 ? 'bg-red-500' : pct >= 45 ? 'bg-amber-500' : 'bg-emerald-500',
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span
            className={cn(
              'text-[11px] font-medium',
              soldOut ? 'text-slate-400' : scarce ? 'text-red-600' : 'text-slate-500',
            )}
          >
            {soldOut ? 'Sin unidades' : scarce ? `¡Solo ${available}!` : `${available} disp.`}
          </span>
        </div>
      </div>

      {/* Stepper */}
      {!soldOut && !disabled && (
        <div className="shrink-0">
          {qty === 0 ? (
            <button
              type="button"
              aria-label={`Agregar ${item.name}`}
              onClick={() => onQtyChange(1)}
              className="flex size-10 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm transition-all hover:bg-brand-700 active:scale-90"
            >
              <Plus size={18} />
            </button>
          ) : (
            <div className="flex items-center gap-1 rounded-xl bg-brand-600 p-1 shadow-sm">
              <button
                type="button"
                aria-label={`Quitar ${item.name}`}
                onClick={() => onQtyChange(-1)}
                className="flex size-8 items-center justify-center rounded-lg text-white transition-colors hover:bg-white/20 active:scale-90"
              >
                <Minus size={15} />
              </button>
              <span className="w-5 text-center text-sm font-bold tabular-nums text-white">
                {qty}
              </span>
              <button
                type="button"
                aria-label={`Agregar ${item.name}`}
                onClick={() => onQtyChange(1)}
                disabled={qty >= available}
                className="flex size-8 items-center justify-center rounded-lg text-white transition-colors hover:bg-white/20 active:scale-90 disabled:opacity-40"
              >
                <Plus size={15} />
              </button>
            </div>
          )}
        </div>
      )}
    </li>
  )
}

/* ═══════════════════ Página ═══════════════════ */

export function PublicCampaignPage() {
  const { token } = useParams<{ token: string }>()

  const { data, isLoading, error } = useQuery({
    queryKey: ['public-campaign', token],
    queryFn: () => getPublicCampaign(token!),
    enabled: !!token,
    retry: false,
  })

  const campaign = data?.campaign
  const tenant = data?.tenant

  // La campaña hereda el color de la tienda.
  useEffect(() => applyBrandColor(tenant?.brandColor), [tenant?.brandColor])

  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [confirmed, setConfirmed] = useState<{ trackingUrl: string } | null>(null)

  function changeQty(productId: string, delta: number) {
    setQuantities((prev) => ({
      ...prev,
      [productId]: Math.max(0, (prev[productId] ?? 0) + delta),
    }))
  }

  const selectedItems = useMemo(
    () => Object.entries(quantities).filter(([, q]) => q > 0),
    [quantities],
  )
  const totalUnits = selectedItems.reduce((s, [, q]) => s + q, 0)
  const total = selectedItems.reduce((sum, [pid, qty]) => {
    const item = campaign?.items.find((i) => i.product === pid)
    return sum + (item?.price ?? 0) * qty
  }, 0)

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (error || !campaign) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-8 text-center">
        <Package size={40} className="text-slate-300" />
        <p className="font-semibold text-slate-700">Campaña no encontrada</p>
        <p className="text-sm text-slate-500">Este link no existe o ya no está disponible.</p>
      </div>
    )
  }

  const now = new Date()
  const endDay = localDate(campaign.endDate, 1) // fin del último día
  const startDay = localDate(campaign.startDate)

  const isEnded = now >= endDay || campaign.status === 'ended' || campaign.status === 'cancelled'
  const isDraft = campaign.status === 'draft'
  const isAcceptingOrders = campaign.status === 'active' && !isEnded
  const isLive = isAcceptingOrders && now >= startDay
  const isUpcoming = isAcceptingOrders && now < startDay

  const totalStock = campaign.items.reduce((s, i) => s + i.stock, 0)
  const totalSold = campaign.items.reduce((s, i) => s + i.sold, 0)

  /* ── Confirmado ──────────────────────────────────────────────── */
  if (confirmed) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-white p-8 text-center">
        <div className="flex size-20 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle size={40} className="text-emerald-600" />
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-900">¡Pedido registrado!</p>
          <p className="mt-2 max-w-sm text-slate-500">
            Tu pedido de <strong className="text-slate-700">{campaign.name}</strong> quedó
            confirmado. {tenant?.name ?? 'El negocio'} te contactará para coordinar la entrega.
          </p>
        </div>
        <div className="flex w-full max-w-xs flex-col gap-2.5">
          <a
            href={confirmed.trackingUrl}
            className="rounded-xl bg-brand-600 px-6 py-3.5 font-semibold text-white transition-colors hover:bg-brand-700 active:scale-[0.98]"
          >
            Seguir mi pedido
          </a>
          {tenant?.slug && (
            <a
              href={`/store/${tenant.slug}`}
              className="rounded-xl px-6 py-3 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
            >
              Ver el catálogo de {tenant.name}
            </a>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto min-h-screen max-w-2xl bg-white pb-24">
        {/* ── Barra superior, fija ─────────────────────────────────── */}
        <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white/95 px-4 py-2.5 backdrop-blur">
          {tenant?.slug ? (
            <a
              href={`/store/${tenant.slug}`}
              aria-label="Volver al catálogo"
              className="-ml-1.5 shrink-0 rounded-full p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              <ChevronLeft size={20} />
            </a>
          ) : (
            <span className="w-1" />
          )}

          {tenant?.logoUrl ? (
            <img
              src={tenant.logoUrl}
              alt=""
              className="size-8 shrink-0 rounded-lg object-cover ring-1 ring-slate-200"
            />
          ) : tenant ? (
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-xs font-bold text-brand-700">
              {tenant.name.charAt(0).toUpperCase()}
            </div>
          ) : null}

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">
              {tenant?.name ?? 'Venta programada'}
            </p>
            <p className="text-[11px] text-slate-400">Venta programada</p>
          </div>

          {tenant?.phone && (
            <a
              href={`https://wa.me/${tenant.phone}?text=${encodeURIComponent(
                `Hola! Tengo una consulta sobre la venta *${campaign.name}*.`,
              )}`}
              target="_blank"
              rel="noreferrer"
              aria-label="Consultar por WhatsApp"
              className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white transition-colors hover:bg-emerald-700"
            >
              <MessageCircle size={16} />
            </a>
          )}
        </div>

        {/* ── Encabezado ───────────────────────────────────────────── */}
        <CampaignHero
          name={campaign.name}
          description={campaign.description}
          target={isLive ? endDay : startDay}
          live={isLive}
          ended={isEnded}
          draft={isDraft}
        />

        {/* Progreso de venta */}
        {isAcceptingOrders && (
          <SoldProgress items={campaign.items} sold={totalSold} stock={totalStock} />
        )}

        {/* Cuándo y cómo */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-slate-200 px-4 py-3 text-[13px]">
          <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
            <CalendarDays size={14} className="text-slate-400" />
            {formatShort(campaign.startDate)} — {formatShort(campaign.endDate)}
          </span>

          {campaign.deliveryTypes?.map((t) => (
            <span key={t} className="inline-flex items-center gap-1.5 text-slate-500">
              {t === 'pickup' ? (
                <Store size={14} className="text-slate-400" />
              ) : (
                <Truck size={14} className="text-slate-400" />
              )}
              {t === 'pickup' ? 'Recojo en tienda' : 'Delivery'}
            </span>
          ))}
        </div>

        {/* Avisos de estado */}
        {isUpcoming && (
          <div className="border-b border-slate-200 bg-violet-50 px-4 py-3">
            <p className="text-sm font-semibold text-violet-900">¡Reserva tu pedido ahora!</p>
            <p className="mt-0.5 text-[13px] text-violet-700">
              La venta empieza el {formatDate(campaign.startDate)}. Aparta lo tuyo hoy y lo
              preparamos para esa fecha.
            </p>
          </div>
        )}

        {isDraft && (
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-6 text-center">
            <p className="font-semibold text-slate-700">Esta campaña aún no está disponible</p>
            <p className="mt-1 text-sm text-slate-500">El negocio la activará pronto.</p>
          </div>
        )}

        {isEnded && (
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-6 text-center">
            <p className="font-semibold text-slate-700">Esta campaña ya finalizó</p>
            <p className="mt-1 text-sm text-slate-500">Gracias a todos los que participaron.</p>
          </div>
        )}

        {/* ── Productos ────────────────────────────────────────────── */}
        <h2 className="bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-900">
          Productos de esta venta
        </h2>
        <ul className="divide-y divide-slate-100">
          {campaign.items.map((item) => (
            <ItemRow
              key={item.product}
              item={item}
              qty={quantities[item.product] ?? 0}
              onQtyChange={(delta) => changeQty(item.product, delta)}
              disabled={!isAcceptingOrders}
            />
          ))}
        </ul>

        <p className="px-4 py-6 text-center text-xs text-slate-400">
          {tenant?.name ?? 'Esta tienda'} · hecho con{' '}
          <span className="font-medium text-slate-500">uTracker</span>
        </p>
      </div>

      {/* ── Barra de carrito, fija abajo ─────────────────────────── */}
      {isAcceptingOrders && selectedItems.length > 0 && !checkoutOpen && (
        <div className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
          <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-slate-400">
                {totalUnits} {totalUnits === 1 ? 'producto' : 'productos'}
              </p>
              <p className="text-lg leading-tight font-bold tabular-nums text-slate-900">
                {formatCurrency(total)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCheckoutOpen(true)}
              className="flex shrink-0 items-center gap-2 rounded-xl bg-brand-600 px-6 py-3 font-semibold text-white transition-all hover:bg-brand-700 active:scale-[0.98]"
            >
              <ShoppingBag size={17} />
              {isUpcoming ? 'Reservar' : 'Continuar'}
            </button>
          </div>
        </div>
      )}

      {/* ── Checkout ─────────────────────────────────────────────── */}
      {checkoutOpen && campaign && (
        <CheckoutSheet
          token={token!}
          campaign={campaign}
          tenant={tenant ?? null}
          quantities={quantities}
          total={total}
          isUpcoming={isUpcoming}
          onClose={() => setCheckoutOpen(false)}
          onQtyChange={changeQty}
          onSuccess={(trackingUrl) => {
            setCheckoutOpen(false)
            setConfirmed({ trackingUrl })
          }}
        />
      )}
    </div>
  )
}

/* ═══════════════════ Hoja de checkout ═══════════════════ */

function CheckoutSheet({
  token,
  campaign,
  tenant,
  quantities,
  total,
  isUpcoming,
  onClose,
  onQtyChange,
  onSuccess,
}: {
  token: string
  campaign: Campaign
  tenant: PublicTenant | null
  quantities: Record<string, number>
  total: number
  isUpcoming: boolean
  onClose: () => void
  onQtyChange: (productId: string, delta: number) => void
  onSuccess: (trackingUrl: string) => void
}) {
  const [customer, setCustomer] = useState({ name: '', phone: '', email: '' })
  const [deliveryType, setDeliveryType] = useState<'pickup' | 'delivery_own'>(
    (campaign.deliveryTypes?.[0] as 'pickup' | 'delivery_own') ?? 'pickup',
  )
  const [address, setAddress] = useState('')
  const [schedDate, setSchedDate] = useState('')
  const [schedFranja, setSchedFranja] = useState('')
  const [orderError, setOrderError] = useState('')

  // Con la hoja abierta el fondo no debe hacer scroll.
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const selected = Object.entries(quantities).filter(([, q]) => q > 0)

  const mutation = useMutation({
    mutationFn: () =>
      confirmCampaignOrder(token, {
        customer,
        orderItems: selected.map(([productId, quantity]) => ({ productId, quantity })),
        type: deliveryType,
        address: deliveryType !== 'pickup' ? address : undefined,
        scheduledFor:
          schedDate
            ? { date: schedDate, franja: (schedFranja as Franja) || undefined }
            : undefined,
      }),
    onSuccess: (data) => onSuccess(data.trackingUrl),
    onError: (e) => setOrderError(apiErrorMessage(e)),
  })

  // La fecha es obligatoria siempre; la franja solo si la campaña define alguna.
  const needsFranja = (campaign.schedule?.franjas?.length ?? 0) > 0
  const canOrder =
    selected.length > 0 &&
    !!customer.name &&
    !!customer.phone &&
    (deliveryType === 'pickup' || !!address) &&
    !!schedDate &&
    (!needsFranja || !!schedFranja)

  // Si vacía el carrito desde la hoja, no tiene sentido dejarla abierta.
  useEffect(() => {
    if (selected.length === 0) onClose()
  }, [selected.length, onClose])

  return (
    <div className="animate-fade fixed inset-0 z-40 flex justify-center bg-slate-900/50">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Completa tu pedido"
        className="animate-sheet flex h-full w-full max-w-2xl flex-col bg-white sm:my-6 sm:h-[calc(100%-3rem)] sm:rounded-2xl sm:shadow-2xl"
      >
        {/* Cabecera */}
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

        {/* Contenido */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {orderError && (
            <div className="px-4 pt-4">
              <Alert>{orderError}</Alert>
            </div>
          )}

          {/* Resumen editable */}
          <h3 className="bg-slate-50 px-4 py-2 text-xs font-bold tracking-wide text-slate-500 uppercase">
            Tu pedido
          </h3>
          <ul className="divide-y divide-slate-100">
            {selected.map(([pid, qty]) => {
              const item = campaign.items.find((i) => i.product === pid)
              if (!item) return null
              const available = item.stock - item.sold
              return (
                <li key={pid} className="flex items-center gap-3 px-4 py-2.5">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt=""
                      className="size-12 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-300">
                      <Image size={16} />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">{item.name}</p>
                    <p className="text-sm font-semibold tabular-nums text-slate-600">
                      {formatCurrency(item.price * qty)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1 rounded-lg bg-slate-100 p-0.5">
                    <button
                      type="button"
                      aria-label={`Quitar ${item.name}`}
                      onClick={() => onQtyChange(pid, -1)}
                      className="flex size-7 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-white active:scale-90"
                    >
                      <Minus size={13} />
                    </button>
                    <span className="w-5 text-center text-sm font-bold tabular-nums text-slate-900">
                      {qty}
                    </span>
                    <button
                      type="button"
                      aria-label={`Agregar ${item.name}`}
                      onClick={() => onQtyChange(pid, 1)}
                      disabled={qty >= available}
                      className="flex size-7 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-white active:scale-90 disabled:opacity-30"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>

          {/* Datos */}
          <h3 className="bg-slate-50 px-4 py-2 text-xs font-bold tracking-wide text-slate-500 uppercase">
            Tus datos
          </h3>
          <div className="grid gap-3 px-4 py-4 sm:grid-cols-2">
            <Field label="Tu nombre" htmlFor="ck-name">
              <Input
                id="ck-name"
                placeholder="Nombre completo"
                autoComplete="name"
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

          {/* Entrega */}
          <h3 className="bg-slate-50 px-4 py-2 text-xs font-bold tracking-wide text-slate-500 uppercase">
            Entrega
          </h3>
          <div className="space-y-4 px-4 py-4">
            {(campaign.deliveryTypes?.length ?? 0) > 1 && (
              <div className="grid grid-cols-2 gap-2.5">
                {(campaign.deliveryTypes as ('pickup' | 'delivery_own')[]).map((t) => {
                  const active = deliveryType === t
                  const Icon = t === 'pickup' ? Store : Truck
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setDeliveryType(t)}
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

            {deliveryType === 'delivery_own' && (
              <Field label="Dirección de entrega" htmlFor="ck-addr">
                <Input
                  id="ck-addr"
                  placeholder="Calle, número, referencia"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </Field>
            )}

            {/* La fecha se pide siempre: para recojo o para envío. */}
            <>
                <Field
                  label={
                    deliveryType === 'pickup' ? '¿Qué día lo recoges?' : '¿Qué día te lo llevamos?'
                  }
                  htmlFor="ck-date"
                >
                  <Input
                    id="ck-date"
                    type="date"
                    min={campaign.startDate.slice(0, 10)}
                    max={campaign.endDate.slice(0, 10)}
                    value={schedDate}
                    onChange={(e) => setSchedDate(e.target.value)}
                  />
                </Field>

                {needsFranja && (
                <div>
                  <p className="mb-1.5 text-sm font-medium text-slate-700">
                    {deliveryType === 'pickup' ? '¿A qué hora pasas?' : 'Horario de entrega'}
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {(campaign.schedule?.franjas ?? []).map((f) => (
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
              </>

            {deliveryType === 'pickup' && tenant?.phone && (
              <p className="rounded-xl bg-slate-50 px-3.5 py-3 text-[13px] text-slate-600">
                {tenant.name} te escribirá por WhatsApp para coordinar cuándo recoges tu pedido.
              </p>
            )}
          </div>
        </div>

        {/* Acción fija */}
        <div className="pb-safe shrink-0 border-t border-slate-200 p-4">
          <div className="mb-2.5 flex items-baseline justify-between">
            <span className="text-sm text-slate-500">Total a pagar</span>
            <span className="text-xl font-bold tabular-nums text-slate-900">
              {formatCurrency(total)}
            </span>
          </div>
          <Button
            className="w-full py-3.5 text-base"
            disabled={!canOrder || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending
              ? 'Registrando...'
              : isUpcoming
                ? 'Reservar mi pedido'
                : 'Confirmar pedido'}
          </Button>
        </div>
      </div>
    </div>
  )
}
