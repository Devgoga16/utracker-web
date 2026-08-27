import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Calendar,
  Check,
  Copy,
  ExternalLink,
  Image,
  Package,
  PlusCircle,
  ShoppingBag,
  Tag,
  Trash2,
  X,
  Zap,
} from 'lucide-react'
import {
  createCampaign,
  deleteCampaign,
  listCampaigns,
  updateCampaign,
  type CampaignItemInput,
} from '@/api/campaigns'
import { listProducts } from '@/api/products'
import { apiErrorMessage } from '@/api/client'
import { Alert, Button, Card, Field, Input, PageHeader, Spinner } from '@/components/ui'
import { formatCurrency } from '@/lib/cn'
import type { Campaign, CampaignDeliveryType, CampaignStatus, Franja, Product } from '@/types'

const DELIVERY_LABELS: Record<CampaignDeliveryType, string> = {
  pickup: 'Recojo en tienda',
  delivery_own: 'Delivery',
}

const FRANJA_LABELS: Record<Franja, string> = {
  morning: 'Mañana',
  afternoon: 'Tarde',
  evening: 'Noche',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<CampaignStatus, { label: string; className: string }> = {
  draft: { label: 'Borrador', className: 'bg-slate-100 text-slate-600' },
  active: { label: 'Activa', className: 'bg-emerald-100 text-emerald-700' },
  ended: { label: 'Finalizada', className: 'bg-slate-100 text-slate-400' },
  cancelled: { label: 'Cancelada', className: 'bg-red-100 text-red-600' },
}

function derivedStatus(c: Campaign): CampaignStatus {
  const now = new Date()
  if (c.status === 'cancelled') return 'cancelled'
  if (new Date(c.endDate) < now) return 'ended'
  if (c.status === 'active' && new Date(c.startDate) <= now) return 'active'
  return c.status
}

function formatDate(d: string) {
  // Parsear como fecha local para evitar desfase UTC
  const [y, m, day] = d.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, day).toLocaleDateString('es-PE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatDateRange(start: string, end: string) {
  return `${formatDate(start)} — ${formatDate(end)}`
}

function campaignLink(token: string) {
  return `${window.location.origin}/c/${token}`
}

// ─── Campaign form (panel) ────────────────────────────────────────────────────

interface DraftItem {
  productId: string
  name: string
  price: number
  imageUrl?: string
  stock: number
}

function CampaignForm({
  initial,
  onClose,
}: {
  initial?: Campaign
  onClose: () => void
}) {
  const qc = useQueryClient()
  const { data: catalog } = useQuery({ queryKey: ['products'], queryFn: listProducts })

  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [startDate, setStartDate] = useState(initial?.startDate?.slice(0, 10) ?? '')
  const [endDate, setEndDate] = useState(initial?.endDate?.slice(0, 10) ?? '')
  const [items, setItems] = useState<DraftItem[]>(
    initial?.items.map((i) => ({
      productId: i.product,
      name: i.name,
      price: i.price,
      imageUrl: i.imageUrl,
      stock: i.stock,
    })) ?? [],
  )
  const [deliveryTypes, setDeliveryTypes] = useState<CampaignDeliveryType[]>(
    (initial?.deliveryTypes as CampaignDeliveryType[]) ?? ['pickup'],
  )
  const [franjas, setFranjas] = useState<Franja[]>(
    (initial?.schedule?.franjas as Franja[]) ?? [],
  )
  const [error, setError] = useState('')

  const isEdit = !!initial

  function toggleDelivery(t: CampaignDeliveryType, checked: boolean) {
    setDeliveryTypes((prev) => checked ? [...prev, t] : prev.filter((x) => x !== t))
  }
  function toggleFranja(f: Franja, checked: boolean) {
    setFranjas((prev) => checked ? [...prev, f] : prev.filter((x) => x !== f))
  }

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        name,
        description: description || undefined,
        startDate,
        endDate,
        items: items.map((i): CampaignItemInput => ({ productId: i.productId, stock: i.stock })),
        deliveryTypes,
        schedule: deliveryTypes.includes('delivery_own') && franjas.length > 0
          ? { franjas }
          : undefined,
      }
      return isEdit ? updateCampaign(initial!._id, payload) : createCampaign(payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaigns'] })
      onClose()
    },
    onError: (e) => setError(apiErrorMessage(e)),
  })

  function addProduct(product: Product) {
    if (items.find((i) => i.productId === product._id)) return
    setItems((prev) => [
      ...prev,
      {
        productId: product._id,
        name: product.name,
        price: product.price,
        imageUrl: product.images?.[0],
        stock: 1,
      },
    ])
  }

  const available = catalog?.filter((p) => p.isActive && !items.find((i) => i.productId === p._id))
  const canSave = name && startDate && endDate && items.length > 0 && deliveryTypes.length > 0

  return (
    <div className="flex flex-col gap-5">
      {error && <Alert>{error}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Nombre de la campaña" htmlFor="cp-name">
            <Input
              id="cp-name"
              placeholder="Ej. Helados artesanales — fin de semana"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Descripción (opcional)" htmlFor="cp-desc">
            <Input
              id="cp-desc"
              placeholder="Breve descripción visible para tus clientes"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
        </div>
        <Field label="Fecha de inicio" htmlFor="cp-start">
          <Input
            id="cp-start"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </Field>
        <Field label="Fecha de fin" htmlFor="cp-end">
          <Input
            id="cp-end"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </Field>
      </div>

      {/* Tipo de entrega */}
      <div>
        <p className="mb-2 text-sm font-medium text-slate-700">Tipo de entrega aceptado</p>
        <div className="flex flex-wrap gap-4">
          {(['pickup', 'delivery_own'] as CampaignDeliveryType[]).map((t) => (
            <label key={t} className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={deliveryTypes.includes(t)}
                onChange={(e) => toggleDelivery(t, e.target.checked)}
                className="size-4 rounded border-slate-300 accent-brand-600"
              />
              <span className="text-sm text-slate-700">{DELIVERY_LABELS[t]}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Franjas horarias — solo si delivery_own */}
      {deliveryTypes.includes('delivery_own') && (
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Franjas horarias para delivery</p>
          <div className="flex flex-wrap gap-4">
            {(['morning', 'afternoon', 'evening'] as Franja[]).map((f) => (
              <label key={f} className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={franjas.includes(f)}
                  onChange={(e) => toggleFranja(f, e.target.checked)}
                  className="size-4 rounded border-slate-300 accent-brand-600"
                />
                <span className="text-sm text-slate-700">{FRANJA_LABELS[f]}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Product picker */}
      <div>
        <p className="mb-2 text-sm font-medium text-slate-700">Productos de la campaña</p>

        {available && available.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {available.map((p) => (
              <button
                key={p._id}
                type="button"
                onClick={() => addProduct(p)}
                className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:border-brand-400 hover:text-brand-700 transition"
              >
                <PlusCircle size={12} />
                {p.name}
              </button>
            ))}
          </div>
        )}

        {items.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-slate-200 py-6 text-center text-sm text-slate-400">
            Selecciona los productos que incluirá la campaña
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <li
                key={item.productId}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3"
              >
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="size-10 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-slate-400">
                    <Package size={16} />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{item.name}</p>
                  <p className="text-xs text-slate-500">{formatCurrency(item.price)} c/u</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-20">
                    <Field label="Stock" htmlFor={`stk-${item.productId}`}>
                      <Input
                        id={`stk-${item.productId}`}
                        type="number"
                        inputMode="numeric"
                        min={1}
                        value={item.stock}
                        onChange={(e) =>
                          setItems((prev) =>
                            prev.map((i) =>
                              i.productId === item.productId
                                ? { ...i, stock: Math.max(1, Number(e.target.value)) }
                                : i,
                            ),
                          )
                        }
                      />
                    </Field>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setItems((prev) => prev.filter((i) => i.productId !== item.productId))
                    }
                    className="mt-4 rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex gap-2 border-t border-slate-100 pt-2">
        <Button
          disabled={!canSave || mutation.isPending}
          onClick={() => mutation.mutate()}
          className="flex-1"
        >
          {mutation.isPending
            ? isEdit
              ? 'Guardando...'
              : 'Creando...'
            : isEdit
              ? 'Guardar cambios'
              : 'Crear campaña'}
        </Button>
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
      </div>
    </div>
  )
}

// ─── Campaign card ─────────────────────────────────────────────────────────────

function CampaignCard({
  campaign,
  onEdit,
}: {
  campaign: Campaign
  onEdit: (c: Campaign) => void
}) {
  const qc = useQueryClient()
  const [copied, setCopied] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const status = derivedStatus(campaign)
  const cfg = STATUS_CONFIG[status]
  const link = campaignLink(campaign.token)

  const cancel = useMutation({
    mutationFn: () => updateCampaign(campaign._id, { status: 'cancelled' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns'] }),
  })

  const activate = useMutation({
    mutationFn: () => updateCampaign(campaign._id, { status: 'active' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns'] }),
  })

  const remove = useMutation({
    mutationFn: () => deleteCampaign(campaign._id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns'] }),
  })

  function copyLink() {
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const totalStock = campaign.items.reduce((s, i) => s + i.stock, 0)
  const totalSold = campaign.items.reduce((s, i) => s + i.sold, 0)

  return (
    <Card>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${cfg.className}`}>
              {cfg.label}
            </span>
            <h3 className="font-semibold text-slate-900">{campaign.name}</h3>
          </div>
          {campaign.description && (
            <p className="mt-0.5 text-sm text-slate-500">{campaign.description}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Calendar size={12} />
              {formatDateRange(campaign.startDate, campaign.endDate)}
            </span>
            <span className="flex items-center gap-1">
              <Tag size={12} />
              {campaign.items.length} producto{campaign.items.length !== 1 ? 's' : ''}
            </span>
            <span className="flex items-center gap-1">
              <Package size={12} />
              {totalSold}/{totalStock} vendidos
            </span>
          </div>

          {/* Product thumbnails */}
          <div className="mt-3 flex flex-wrap gap-2">
            {campaign.items.map((item) => (
              <div key={item.product} className="flex items-center gap-1.5">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="size-7 rounded-md object-cover ring-1 ring-slate-200"
                  />
                ) : (
                  <div className="flex size-7 items-center justify-center rounded-md bg-slate-100">
                    <Image size={12} className="text-slate-400" />
                  </div>
                )}
                <span className="text-xs text-slate-600">
                  {item.name}
                  <span className="ml-1 text-slate-400">
                    ({item.stock - item.sold} disp.)
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end">
          {status !== 'ended' && status !== 'cancelled' && (
            <Button size="sm" variant="ghost" onClick={() => onEdit(campaign)}>
              Editar
            </Button>
          )}
          {status === 'draft' && (
            <Button
              size="sm"
              onClick={() => activate.mutate()}
              disabled={activate.isPending}
            >
              <Zap size={13} />
              Activar
            </Button>
          )}
          {(status === 'draft' || status === 'active') && (
            <Button
              size="sm"
              variant="secondary"
              onClick={copyLink}
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? 'Copiado' : 'Copiar link'}
            </Button>
          )}
          <Link
            to={`/orders?campaign=${campaign._id}`}
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            <ShoppingBag size={12} />
            Ver pedidos
          </Link>
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            <ExternalLink size={12} />
            Ver pública
          </a>
          {status !== 'ended' && status !== 'cancelled' && (
            <button
              onClick={() => cancel.mutate()}
              disabled={cancel.isPending}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100"
            >
              <X size={12} />
              Cancelar
            </button>
          )}

          {/* Eliminar con confirmación inline */}
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50"
            >
              <Trash2 size={12} />
              Eliminar
            </button>
          ) : (
            <div className="flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5">
              <span className="text-xs text-red-700">¿Seguro?</span>
              <button
                onClick={() => remove.mutate()}
                disabled={remove.isPending}
                className="ml-1 text-xs font-semibold text-red-600 hover:underline disabled:opacity-50"
              >
                {remove.isPending ? 'Eliminando...' : 'Sí'}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-xs text-slate-500 hover:underline"
              >
                No
              </button>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function CampaignsPage() {
  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: listCampaigns,
  })

  const [panel, setPanel] = useState<'create' | Campaign | null>(null)

  return (
    <div className="space-y-6">
      {/* Panel / slide-over */}
      {panel !== null && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setPanel(null)} />
          <div className="relative z-50 flex h-full w-full max-w-lg flex-col overflow-y-auto bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="font-semibold text-slate-800">
                {panel === 'create' ? 'Nueva campaña' : 'Editar campaña'}
              </h2>
              <button
                onClick={() => setPanel(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-5">
              <CampaignForm
                initial={panel === 'create' ? undefined : panel}
                onClose={() => setPanel(null)}
              />
            </div>
          </div>
        </div>
      )}

      <PageHeader
        title="Ventas programadas"
        description="Crea campañas con tiempo y stock limitado para impulsar tus ventas."
        actions={
          <Button onClick={() => setPanel('create')}>
            <PlusCircle size={15} />
            Nueva campaña
          </Button>
        }
      />

      {isLoading ? (
        <Spinner />
      ) : !campaigns?.length ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-slate-100">
            <Zap size={22} className="text-slate-400" />
          </div>
          <div>
            <p className="font-medium text-slate-700">Sin campañas aún</p>
            <p className="mt-0.5 text-sm text-slate-500">
              Crea tu primera venta programada para impulsar tus ventas con stock y tiempo limitados.
            </p>
          </div>
          <Button onClick={() => setPanel('create')}>
            <PlusCircle size={15} />
            Crear mi primera campaña
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {campaigns.map((c) => (
            <CampaignCard key={c._id} campaign={c} onEdit={(c) => setPanel(c)} />
          ))}
        </div>
      )}
    </div>
  )
}
