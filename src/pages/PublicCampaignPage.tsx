import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { CheckCircle, Clock, Image, Minus, Package, Plus, ShoppingBag } from 'lucide-react'
import { confirmCampaignOrder, getPublicCampaign } from '@/api/campaigns'
import { apiErrorMessage } from '@/api/client'
import { Alert, Button, Field, Input, Spinner } from '@/components/ui'
import { formatCurrency, cn } from '@/lib/cn'
import type { CampaignItem } from '@/types'

function formatDate(d: string) {
  const [y, m, day] = d.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, day).toLocaleDateString('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function ProgressBar({ sold, stock }: { sold: number; stock: number }) {
  const pct = stock === 0 ? 100 : Math.min(100, Math.round((sold / stock) * 100))
  return (
    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
      <div
        className={cn(
          'h-full rounded-full transition-all',
          pct >= 80 ? 'bg-red-500' : pct >= 50 ? 'bg-amber-500' : 'bg-emerald-500',
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

function ItemCard({
  item,
  qty,
  onQtyChange,
}: {
  item: CampaignItem
  qty: number
  onQtyChange: (delta: number) => void
}) {
  const available = item.stock - item.sold
  const soldOut = available <= 0

  return (
    <div
      className={cn(
        'flex gap-3 rounded-2xl border bg-white p-4 transition',
        soldOut ? 'opacity-60' : 'border-slate-200',
        qty > 0 && !soldOut && 'border-brand-400 ring-1 ring-brand-200',
      )}
    >
      {/* Image */}
      {item.imageUrl ? (
        <img
          src={item.imageUrl}
          alt={item.name}
          className="size-20 shrink-0 rounded-xl object-cover"
        />
      ) : (
        <div className="flex size-20 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-300">
          <Image size={28} />
        </div>
      )}

      {/* Info */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="font-semibold text-slate-900">{item.name}</p>
        <p className="text-sm font-bold text-brand-600">{formatCurrency(item.price)}</p>
        <p className="text-xs text-slate-500">
          {soldOut ? 'Agotado' : `${available} disponible${available !== 1 ? 's' : ''}`}
        </p>
        <ProgressBar sold={item.sold} stock={item.stock} />
      </div>

      {/* Qty control */}
      {!soldOut && (
        <div className="flex shrink-0 flex-col items-center justify-center gap-1">
          <button
            type="button"
            onClick={() => onQtyChange(1)}
            disabled={qty >= available}
            className="flex size-8 items-center justify-center rounded-full border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
          >
            <Plus size={14} />
          </button>
          <span className="w-8 text-center text-sm font-semibold tabular-nums">{qty}</span>
          <button
            type="button"
            onClick={() => onQtyChange(-1)}
            disabled={qty <= 0}
            className="flex size-8 items-center justify-center rounded-full border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
          >
            <Minus size={14} />
          </button>
        </div>
      )}
    </div>
  )
}

export function PublicCampaignPage() {
  const { token } = useParams<{ token: string }>()

  const { data: campaign, isLoading, error } = useQuery({
    queryKey: ['public-campaign', token],
    queryFn: () => getPublicCampaign(token!),
    enabled: !!token,
    retry: false,
  })

  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [customer, setCustomer] = useState({ name: '', phone: '', email: '' })
  const [deliveryType, setDeliveryType] = useState<'pickup' | 'delivery_own'>('pickup')

  // Default to first available delivery type when campaign loads
  useEffect(() => {
    if (campaign?.deliveryTypes?.length) {
      setDeliveryType(campaign.deliveryTypes[0] as 'pickup' | 'delivery_own')
    }
  }, [campaign?.deliveryTypes])
  const [address, setAddress] = useState('')
  const [schedDate, setSchedDate] = useState('')
  const [schedFranja, setSchedFranja] = useState('')
  const [orderError, setOrderError] = useState('')
  const [confirmed, setConfirmed] = useState<{ trackingUrl: string } | null>(null)

  const orderMutation = useMutation({
    mutationFn: () =>
      confirmCampaignOrder(token!, {
        customer,
        orderItems: Object.entries(quantities)
          .filter(([, q]) => q > 0)
          .map(([productId, quantity]) => ({ productId, quantity })),
        type: deliveryType,
        address: deliveryType !== 'pickup' ? address : undefined,
        scheduledFor:
          deliveryType === 'delivery_own' && schedDate && schedFranja
            ? { date: schedDate, franja: schedFranja }
            : undefined,
      }),
    onSuccess: (data) => setConfirmed({ trackingUrl: data.trackingUrl }),
    onError: (e) => setOrderError(apiErrorMessage(e)),
  })

  function changeQty(productId: string, delta: number) {
    setQuantities((prev) => ({
      ...prev,
      [productId]: Math.max(0, (prev[productId] ?? 0) + delta),
    }))
  }

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
  // Comparar solo fechas (sin hora) para evitar desfase UTC
  const [ey, em, ed] = campaign.endDate.slice(0, 10).split('-').map(Number)
  const endDay = new Date(ey, em - 1, ed + 1) // fin del día de endDate
  const [sy, sm, sd] = campaign.startDate.slice(0, 10).split('-').map(Number)
  const startDay = new Date(sy, sm - 1, sd)

  const isEnded = now >= endDay || campaign.status === 'ended' || campaign.status === 'cancelled'
  // Activa = campaña publicada (status active) y no terminada — el cliente puede reservar ANTES de startDate
  const isAcceptingOrders = campaign.status === 'active' && !isEnded
  const isLive = isAcceptingOrders && now >= startDay   // ya empezó
  const isUpcoming = isAcceptingOrders && now < startDay // aún no empieza pero acepta reservas

  const selectedItems = Object.entries(quantities).filter(([, q]) => q > 0)
  const total = selectedItems.reduce((sum, [pid, qty]) => {
    const item = campaign.items.find((i) => i.product === pid)
    return sum + (item?.price ?? 0) * qty
  }, 0)
  const needsSchedule = deliveryType === 'delivery_own'
  const canOrder =
    isAcceptingOrders &&
    selectedItems.length > 0 &&
    !!customer.name &&
    !!customer.phone &&
    (deliveryType === 'pickup' || !!address) &&
    (!needsSchedule || (!!schedDate && !!schedFranja))

  // ─── Confirmed state ──────────────────────────────────────────────────────────
  if (confirmed) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 p-8 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle size={32} className="text-emerald-600" />
        </div>
        <div>
          <p className="text-xl font-bold text-slate-900">¡Pedido registrado!</p>
          <p className="mt-1 text-sm text-slate-500">
            Tu pedido de la campaña <strong>{campaign.name}</strong> fue registrado con éxito.
          </p>
        </div>
        <a
          href={confirmed.trackingUrl}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-3 font-semibold text-white hover:bg-brand-700"
        >
          Seguir mi pedido
        </a>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero */}
      <div className="bg-white border-b border-slate-100">
        {campaign.coverImageUrl && (
          <img
            src={campaign.coverImageUrl}
            alt=""
            className="h-40 w-full object-cover sm:h-56"
          />
        )}
        <div className="mx-auto max-w-2xl px-4 py-5">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
                isLive
                  ? 'bg-emerald-100 text-emerald-700'
                  : isUpcoming
                    ? 'bg-violet-100 text-violet-700'
                    : 'bg-slate-100 text-slate-500',
              )}
            >
              {isLive ? (
                <><span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />En vivo</>
              ) : isUpcoming ? (
                <><Clock size={11} />Reserva anticipada</>
              ) : (
                'Finalizada'
              )}
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">{campaign.name}</h1>
          {campaign.description && (
            <p className="mt-1 text-slate-600">{campaign.description}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
            <span>Desde: {formatDate(campaign.startDate)}</span>
            <span>Hasta: {formatDate(campaign.endDate)}</span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        {/* Reserva anticipada — aviso informativo, pero el form SÍ aparece */}
        {isUpcoming && (
          <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
            <p className="font-semibold text-violet-800">
              ¡Reserva tu pedido ahora!
            </p>
            <p className="mt-0.5 text-sm text-violet-600">
              Esta venta empieza el {formatDate(campaign.startDate)}. Puedes reservar hoy y lo preparamos para esa fecha.
            </p>
          </div>
        )}

        {isEnded && (
          <div className="rounded-2xl border border-slate-200 bg-slate-100 p-5 text-center">
            <p className="font-semibold text-slate-600">Esta campaña ya finalizó</p>
          </div>
        )}

        {/* Products */}
        <div>
          <p className="mb-3 font-semibold text-slate-800">Productos disponibles</p>
          <div className="space-y-3">
            {campaign.items.map((item) => (
              <ItemCard
                key={item.product}
                item={item}
                qty={quantities[item.product] ?? 0}
                onQtyChange={(delta) => changeQty(item.product, delta)}
              />
            ))}
          </div>
        </div>

        {/* Order form — visible cuando acepta pedidos (activa o reserva anticipada) */}
        {isAcceptingOrders && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <ShoppingBag size={18} className="text-brand-600" />
              <h2 className="font-semibold text-slate-800">Tu pedido</h2>
              {selectedItems.length > 0 && (
                <span className="ml-auto text-sm font-bold text-slate-900">
                  {formatCurrency(total)}
                </span>
              )}
            </div>

            {selectedItems.length === 0 ? (
              <p className="text-center text-sm text-slate-400 py-4">
                Selecciona productos para continuar
              </p>
            ) : (
              <div className="space-y-4">
                {orderError && <Alert>{orderError}</Alert>}

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Tu nombre" htmlFor="pub-name">
                    <Input
                      id="pub-name"
                      placeholder="Nombre completo"
                      value={customer.name}
                      onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                    />
                  </Field>
                  <Field label="Teléfono" htmlFor="pub-phone">
                    <Input
                      id="pub-phone"
                      type="tel"
                      inputMode="tel"
                      placeholder="987 654 321"
                      value={customer.phone}
                      onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                    />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="Email (opcional)" htmlFor="pub-email">
                      <Input
                        id="pub-email"
                        type="email"
                        placeholder="tucorreo@email.com"
                        value={customer.email}
                        onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                      />
                    </Field>
                  </div>
                </div>

                {/* Delivery type — filtrado por lo que acepta la campaña */}
                {(campaign.deliveryTypes?.length ?? 0) > 1 && (
                  <div>
                    <p className="mb-2 text-sm font-medium text-slate-700">Tipo de entrega</p>
                    <div className="flex gap-2">
                      {(campaign.deliveryTypes as ('pickup' | 'delivery_own')[]).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setDeliveryType(t)}
                          className={cn(
                            'flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium transition',
                            deliveryType === t
                              ? 'border-brand-500 bg-brand-50 text-brand-700'
                              : 'border-slate-200 text-slate-600 hover:border-slate-300',
                          )}
                        >
                          {t === 'pickup' ? 'Recojo en tienda' : 'Delivery a mi dirección'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {deliveryType === 'delivery_own' && (
                  <>
                    <Field label="Dirección de entrega" htmlFor="pub-addr">
                      <Input
                        id="pub-addr"
                        placeholder="Calle, número, referencia"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                      />
                    </Field>

                    {/* Fecha y franja de delivery */}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Fecha de entrega" htmlFor="pub-sched-date">
                        <Input
                          id="pub-sched-date"
                          type="date"
                          min={campaign.startDate.slice(0, 10)}
                          max={campaign.endDate.slice(0, 10)}
                          value={schedDate}
                          onChange={(e) => setSchedDate(e.target.value)}
                        />
                      </Field>
                      <div>
                        <p className="mb-1.5 text-sm font-medium text-slate-700">Horario</p>
                        <div className="flex flex-col gap-1.5">
                          {(campaign.schedule?.franjas ?? ['morning', 'afternoon', 'evening']).map((f) => (
                            <button
                              key={f}
                              type="button"
                              onClick={() => setSchedFranja(f)}
                              className={cn(
                                'rounded-lg border px-3 py-2 text-sm font-medium text-left transition',
                                schedFranja === f
                                  ? 'border-brand-500 bg-brand-50 text-brand-700'
                                  : 'border-slate-200 text-slate-600 hover:border-slate-300',
                              )}
                            >
                              {f === 'morning' ? 'Mañana' : f === 'afternoon' ? 'Tarde' : 'Noche'}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                )}

                <Button
                  className="w-full"
                  disabled={!canOrder || orderMutation.isPending}
                  onClick={() => orderMutation.mutate()}
                >
                  {orderMutation.isPending
                    ? 'Registrando...'
                    : isUpcoming
                      ? `Reservar pedido · ${formatCurrency(total)}`
                      : `Confirmar pedido · ${formatCurrency(total)}`}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
