import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowDownUp,
  Check,
  ChevronRight,
  Clock,
  MessageCircle,
  Package,
  PackageX,
  Search,
  Share2,
  Wrench,
  X,
  Zap,
} from 'lucide-react'
import { api } from '@/api/client'
import { Lightbox, Spinner } from '@/components/ui'
import { cn, formatCurrency } from '@/lib/cn'
import { applyBrandColor } from '@/lib/brandColor'
import type { Campaign, Product, Tenant } from '@/types'

async function getStoreCatalog(slug: string) {
  const { data } = await api.get<{ tenant: Tenant; products: Product[]; campaigns?: Campaign[] }>(
    `/store/${slug}`,
  )
  return data
}

type SortKey = 'default' | 'price_asc' | 'price_desc' | 'name_asc'

const SORT_LABELS: Record<SortKey, string> = {
  default: 'Más recientes',
  price_asc: 'Precio: menor a mayor',
  price_desc: 'Precio: mayor a menor',
  name_asc: 'Nombre A–Z',
}

const SIN_CATEGORIA = 'Otros'

function isOutOfStock(p: Product) {
  return p.kind === 'product' && p.trackStock && (p.stock ?? 0) <= 0
}

/** Link de WhatsApp con el producto ya escrito, para que el cliente solo mande. */
function waLink(phone: string, item?: Product) {
  const text = item
    ? `Hola! Vi *${item.name}*${
        item.pricingMode === 'quoted' ? '' : ` (${formatCurrency(item.price)})`
      } en su catálogo y quisiera más información.`
    : 'Hola! Vi su catálogo y quisiera más información.'
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
}

/* ═══════════════════════════ Página ═══════════════════════════ */

export function StorePage() {
  const { slug } = useParams<{ slug: string }>()

  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [lightboxImages, setLightboxImages] = useState<string[]>([])
  const [detail, setDetail] = useState<Product | null>(null)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [sort, setSort] = useState<SortKey>('default')
  const [onlyAvailable, setOnlyAvailable] = useState(false)
  const [showSortMenu, setShowSortMenu] = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['store', slug],
    queryFn: () => getStoreCatalog(slug!),
    enabled: Boolean(slug),
  })

  // El color del negocio tiñe toda la tienda; al salir vuelve el índigo.
  useEffect(() => applyBrandColor(data?.tenant?.brandColor), [data?.tenant?.brandColor])

  const products = data?.products ?? []
  const campaigns = (data?.campaigns ?? []).filter(
    (c) => new Date(c.endDate) > new Date() && c.status !== 'cancelled',
  )

  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category ?? '').filter(Boolean))),
    [products],
  )

  // Si nadie lleva control de stock, el filtro "Disponibles" no aporta nada.
  const hasTrackedStock = useMemo(
    () => products.some((p) => p.kind === 'product' && p.trackStock),
    [products],
  )

  const filtered = useMemo(() => {
    let list = [...products]

    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q),
      )
    }
    if (activeCategory) list = list.filter((p) => p.category === activeCategory)
    if (onlyAvailable) list = list.filter((p) => !isOutOfStock(p))

    if (sort === 'price_asc') list.sort((a, b) => a.price - b.price)
    else if (sort === 'price_desc') list.sort((a, b) => b.price - a.price)
    else if (sort === 'name_asc') list.sort((a, b) => a.name.localeCompare(b.name))

    return list
  }, [products, search, activeCategory, sort, onlyAvailable])

  /**
   * Sin filtros la lista va agrupada por categoría, como el menú de una app de
   * delivery. Con búsqueda o filtro activo eso estorba: ahí va lista plana.
   */
  const grouped = useMemo(() => {
    const flat = search.trim() || activeCategory || sort !== 'default'
    if (flat) return [{ label: null as string | null, items: filtered }]

    const map = new Map<string, Product[]>()
    for (const p of filtered) {
      const key = p.category || SIN_CATEGORIA
      const bucket = map.get(key)
      if (bucket) bucket.push(p)
      else map.set(key, [p])
    }
    // "Otros" siempre al final.
    return Array.from(map.entries())
      .sort((a, b) =>
        a[0] === SIN_CATEGORIA ? 1 : b[0] === SIN_CATEGORIA ? -1 : a[0].localeCompare(b[0]),
      )
      .map(([label, items]) => ({ label, items }))
  }, [filtered, search, activeCategory, sort])

  function clearFilters() {
    setSearch('')
    setActiveCategory(null)
    setSort('default')
    setOnlyAvailable(false)
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 px-6 text-center">
        <PackageX size={32} className="text-slate-300" />
        <p className="font-medium text-slate-700">No encontramos esta tienda</p>
        <p className="text-sm text-slate-400">Revisa que el link esté completo y bien escrito.</p>
      </div>
    )
  }

  const { tenant } = data
  const activeFilters =
    (activeCategory ? 1 : 0) +
    (onlyAvailable ? 1 : 0) +
    (sort !== 'default' ? 1 : 0) +
    (search ? 1 : 0)

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto min-h-screen max-w-2xl bg-white">
        <StoreHeader tenant={tenant} productCount={products.length} />

        {/* Buscador + filtros: se pegan arriba al hacer scroll. */}
        {products.length > 0 && (
          <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
            <div className="flex gap-2 px-4 pt-3">
              <div className="relative min-w-0 flex-1">
                <Search
                  size={16}
                  className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar en el catálogo"
                  className="w-full rounded-xl border-0 bg-slate-100 py-2.5 pr-3 pl-9 text-base ring-1 ring-transparent transition outline-none placeholder:text-slate-400 focus:bg-white focus:ring-brand-500 sm:text-sm"
                />
              </div>

              <div className="relative shrink-0">
                <button
                  type="button"
                  aria-label="Ordenar"
                  onClick={() => setShowSortMenu((v) => !v)}
                  className={cn(
                    'flex size-full items-center gap-1.5 rounded-xl px-3 text-xs font-semibold transition-colors',
                    sort !== 'default'
                      ? 'bg-brand-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                  )}
                >
                  <ArrowDownUp size={14} />
                </button>

                {showSortMenu && (
                  <>
                    <button
                      type="button"
                      aria-label="Cerrar"
                      onClick={() => setShowSortMenu(false)}
                      className="fixed inset-0 z-10 cursor-default"
                    />
                    <div className="absolute top-full right-0 z-20 mt-1.5 w-52 overflow-hidden rounded-xl bg-white py-1 shadow-xl ring-1 ring-slate-200">
                      {(Object.entries(SORT_LABELS) as [SortKey, string][]).map(([key, label]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => {
                            setSort(key)
                            setShowSortMenu(false)
                          }}
                          className={cn(
                            'flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors hover:bg-slate-50',
                            sort === key ? 'font-semibold text-brand-700' : 'text-slate-700',
                          )}
                        >
                          <Check
                            size={14}
                            className={cn('shrink-0', sort === key ? 'opacity-100' : 'opacity-0')}
                          />
                          {label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Chips de categoría */}
            {(categories.length > 0 || hasTrackedStock) && (
              <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-2.5">
                <Chip active={activeCategory === null} onClick={() => setActiveCategory(null)}>
                  Todos
                </Chip>
                {categories.map((cat) => (
                  <Chip
                    key={cat}
                    active={activeCategory === cat}
                    onClick={() => setActiveCategory(cat === activeCategory ? null : cat)}
                  >
                    {cat}
                  </Chip>
                ))}
                {hasTrackedStock && (
                  <Chip
                    active={onlyAvailable}
                    tone="emerald"
                    onClick={() => setOnlyAvailable((v) => !v)}
                  >
                    Disponibles
                  </Chip>
                )}
              </div>
            )}

            {activeFilters > 0 && (
              <div className="flex items-center gap-2 px-4 pb-2">
                <span className="text-[11px] text-slate-400">
                  {filtered.length} resultado{filtered.length !== 1 && 's'}
                </span>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-[11px] font-semibold text-brand-600 hover:underline"
                >
                  Limpiar
                </button>
              </div>
            )}
          </div>
        )}

        {/* Ventas programadas */}
        {campaigns.length > 0 && <CampaignStrip campaigns={campaigns} />}

        {/* Catálogo */}
        <main className="pb-10">
          {products.length === 0 ? (
            <EmptyState
              title="Todavía no hay nada publicado"
              hint="Este negocio aún no cargó su catálogo. Vuelve en un rato."
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              title="Nada coincide con tu búsqueda"
              hint="Prueba con otra palabra o quita algún filtro."
              action={
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-sm font-semibold text-brand-600 hover:underline"
                >
                  Limpiar filtros
                </button>
              }
            />
          ) : (
            grouped.map((group) => (
              <section key={group.label ?? '_flat'}>
                {group.label && (
                  <h2 className="flex items-baseline gap-2 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-900">
                    {group.label}
                    <span className="text-xs font-medium text-slate-400">
                      {group.items.length}
                    </span>
                  </h2>
                )}
                <ul className="divide-y divide-slate-100">
                  {group.items.map((item) => (
                    <ProductRow
                      key={item._id}
                      item={item}
                      phone={tenant.phone}
                      onOpen={() => setDetail(item)}
                    />
                  ))}
                </ul>
              </section>
            ))
          )}
        </main>

        <footer className="border-t border-slate-200 bg-slate-50 px-4 py-8 text-center">
          {tenant.phone && (
            <a
              href={waLink(tenant.phone)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 active:scale-[0.98]"
            >
              <MessageCircle size={16} />
              Escríbenos por WhatsApp
            </a>
          )}
          <p className="mt-5 text-xs text-slate-400">
            {tenant.name} · hecho con <span className="font-medium text-slate-500">uTracker</span>
          </p>
        </footer>
      </div>

      <ProductDetail
        item={detail}
        phone={tenant.phone}
        onClose={() => setDetail(null)}
        onZoom={(images, url) => {
          setLightboxImages(images)
          setLightboxUrl(url)
        }}
      />

      <Lightbox url={lightboxUrl} images={lightboxImages} onClose={() => setLightboxUrl(null)} />
    </div>
  )
}

/* ═══════════════════════════ Cabecera ═══════════════════════════ */

function StoreHeader({ tenant, productCount }: { tenant: Tenant; productCount: number }) {
  const [copied, setCopied] = useState(false)

  function share() {
    const url = window.location.href
    if (navigator.share) {
      navigator.share({ title: tenant.name, url }).catch(() => {})
      return
    }
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Horario de hoy, para decir si está abierto ahora mismo.
  const today = new Date().getDay()
  const todaySchedule = tenant.schedule?.find((d) => d.day === today)
  const nowHM = new Date().toTimeString().slice(0, 5)
  const isOpen = todaySchedule ? nowHM >= todaySchedule.open && nowHM < todaySchedule.close : null

  return (
    <header>
      {/* Banner corto: el logo difuminado le da color propio a cada tienda. */}
      <div className="relative h-24 overflow-hidden sm:h-28">
        {tenant.logoUrl ? (
          <>
            <img
              src={tenant.logoUrl}
              alt=""
              aria-hidden
              className="size-full scale-150 object-cover blur-2xl"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-white/40 to-transparent" />
          </>
        ) : (
          <div className="size-full bg-gradient-to-br from-brand-500 via-brand-600 to-brand-800" />
        )}

        <button
          type="button"
          onClick={share}
          title="Compartir catálogo"
          aria-label="Compartir catálogo"
          className="absolute top-3 right-3 rounded-full bg-white/85 p-2 text-slate-600 shadow-sm backdrop-blur transition-colors hover:bg-white"
        >
          {copied ? <Check size={16} className="text-emerald-600" /> : <Share2 size={16} />}
        </button>
      </div>

      {/* Ficha del negocio: el logo monta sobre el banner. */}
      <div className="px-4 pb-4">
        <div className="-mt-9 flex items-end gap-3">
          {tenant.logoUrl ? (
            <img
              src={tenant.logoUrl}
              alt={tenant.name}
              className="size-18 shrink-0 rounded-2xl border-4 border-white bg-white object-cover shadow-md"
            />
          ) : (
            <div className="flex size-18 shrink-0 items-center justify-center rounded-2xl border-4 border-white bg-brand-100 text-2xl font-bold text-brand-700 shadow-md">
              {tenant.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <h1 className="mt-2.5 text-xl leading-tight font-bold text-slate-900">{tenant.name}</h1>

        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-slate-500">
          <span>
            {productCount === 0
              ? 'Catálogo en preparación'
              : `${productCount} ${productCount === 1 ? 'producto' : 'productos'}`}
          </span>
          {isOpen !== null && (
            <>
              <span className="text-slate-300">·</span>
              <span
                className={cn(
                  'inline-flex items-center gap-1 font-medium',
                  isOpen ? 'text-emerald-600' : 'text-slate-400',
                )}
              >
                <Clock size={11} />
                {isOpen ? 'Abierto ahora' : 'Cerrado'}
              </span>
            </>
          )}
        </div>

        {tenant.phone && (
          <a
            href={waLink(tenant.phone)}
            target="_blank"
            rel="noreferrer"
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 active:scale-[0.99]"
          >
            <MessageCircle size={15} />
            Escríbenos por WhatsApp
          </a>
        )}
      </div>
    </header>
  )
}

/* ═══════════════════════════ Campañas ═══════════════════════════ */

/**
 * La campaña no tiene foto propia: se arma un mosaico con las fotos de sus
 * productos. Sin fotos cae a un bloque con el color de la tienda.
 */
function CampaignThumb({ campaign }: { campaign: Campaign }) {
  const images = campaign.items.map((i) => i.imageUrl).filter(Boolean).slice(0, 4) as string[]

  if (images.length === 0) {
    return (
      <div className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700">
        <Zap size={22} className="text-white" />
      </div>
    )
  }

  if (images.length === 1) {
    return (
      <img
        src={images[0]}
        alt=""
        loading="lazy"
        className="size-16 shrink-0 rounded-lg object-cover"
      />
    )
  }

  // Con 2 fotos van en dos filas; con 3 o más, mosaico de cuatro celdas.
  return (
    <div
      className={cn(
        'grid size-16 shrink-0 gap-px overflow-hidden rounded-lg bg-slate-200',
        images.length === 2 ? 'grid-rows-2' : 'grid-cols-2 grid-rows-2',
      )}
    >
      {images.slice(0, images.length === 2 ? 2 : 4).map((url, i) => (
        <img key={i} src={url} alt="" loading="lazy" className="size-full object-cover" />
      ))}
    </div>
  )
}

function CampaignStrip({ campaigns }: { campaigns: Campaign[] }) {
  return (
    <section className="border-b border-slate-200 bg-slate-50 py-3.5">
      <h2 className="mb-2.5 flex items-center gap-1.5 px-4 text-sm font-bold text-slate-900">
        <Zap size={14} className="text-amber-500" />
        Ventas especiales
      </h2>

      <div className="no-scrollbar flex gap-2.5 overflow-x-auto px-4">
        {campaigns.map((c) => {
          const isLive = c.status === 'active' && new Date(c.startDate) <= new Date()
          const isDraft = c.status === 'draft'
          const left = c.items.reduce((s, i) => s + (i.stock - i.sold), 0)
          const total = c.items.reduce((s, i) => s + i.stock, 0)
          const almostGone = total > 0 && left / total <= 0.25

          return (
            <a
              key={c._id}
              href={`/c/${c.token}`}
              className="group flex w-64 shrink-0 gap-3 rounded-xl bg-white p-2.5 shadow-sm ring-1 ring-slate-200 transition-colors hover:ring-brand-400"
            >
              <CampaignThumb campaign={c} />

              <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
                {isLive ? (
                  <span className="inline-flex w-fit items-center gap-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 uppercase">
                    <span className="size-1 animate-pulse rounded-full bg-emerald-500" />
                    En vivo
                  </span>
                ) : isDraft ? (
                  <span className="w-fit rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500 uppercase">
                    Pronto
                  </span>
                ) : (
                  <span className="w-fit rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold text-violet-700 uppercase">
                    Reserva ya
                  </span>
                )}

                <p className="line-clamp-1 text-sm leading-tight font-semibold text-slate-900">
                  {c.name}
                </p>
                <p
                  className={cn(
                    'text-[11px]',
                    almostGone && left > 0 ? 'font-semibold text-red-600' : 'text-slate-500',
                  )}
                >
                  {left > 0 ? `${left} disponibles` : 'Agotado'}
                </p>
              </div>

              <ChevronRight
                size={16}
                className="self-center text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-500"
              />
            </a>
          )
        })}
      </div>
    </section>
  )
}

/* ═══════════════════════════ Fila de producto ═══════════════════════════ */

function ProductRow({
  item,
  phone,
  onOpen,
}: {
  item: Product
  phone?: string
  onOpen: () => void
}) {
  const outOfStock = isOutOfStock(item)
  const isService = item.kind === 'service'

  return (
    <li>
      <div
        className={cn(
          'flex w-full items-center gap-3 px-4 py-3 transition-colors',
          outOfStock ? 'opacity-60' : 'hover:bg-slate-50',
        )}
      >
        {/* Foto */}
        <button
          type="button"
          onClick={onOpen}
          aria-label={`Ver ${item.name}`}
          className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-slate-100 focus:outline-none"
        >
          {item.images?.[0] ? (
            <img
              src={item.images[0]}
              alt={item.name}
              loading="lazy"
              className="size-full object-cover"
            />
          ) : (
            <span className="flex size-full items-center justify-center text-slate-300">
              {isService ? <Wrench size={22} /> : <Package size={22} />}
            </span>
          )}
          {outOfStock && (
            <span className="absolute inset-0 flex items-center justify-center bg-white/70">
              <span className="rounded bg-slate-900/85 px-1.5 py-0.5 text-[9px] font-bold text-white uppercase">
                Agotado
              </span>
            </span>
          )}
        </button>

        {/* Datos */}
        <button
          type="button"
          onClick={onOpen}
          className="min-w-0 flex-1 text-left focus:outline-none"
        >
          <p className="truncate font-semibold text-slate-900">{item.name}</p>
          {item.description && (
            <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-slate-500">
              {item.description}
            </p>
          )}
          <p className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-base font-bold text-slate-900">
              {formatCurrency(item.price)}
            </span>
            {item.pricingMode === 'quoted' && (
              <span className="text-[11px] font-medium text-amber-600">referencial</span>
            )}
            {isService && (
              <span className="text-[11px] text-slate-400">· servicio</span>
            )}
          </p>
        </button>

        {/* Acción */}
        {phone && (
          <a
            href={waLink(phone, item)}
            target="_blank"
            rel="noreferrer"
            aria-label={`Pedir ${item.name} por WhatsApp`}
            className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-90"
          >
            <MessageCircle size={17} />
          </a>
        )}
      </div>
    </li>
  )
}

/* ═══════════════════════════ Detalle ═══════════════════════════ */

function ProductDetail({
  item,
  phone,
  onClose,
  onZoom,
}: {
  item: Product | null
  phone?: string
  onClose: () => void
  onZoom: (images: string[], url: string) => void
}) {
  const [active, setActive] = useState(0)

  useEffect(() => setActive(0), [item])

  useEffect(() => {
    if (!item) return
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [item, onClose])

  // Con la hoja abierta el fondo no debe hacer scroll.
  useEffect(() => {
    if (!item) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [item])

  if (!item) return null

  const images = item.images ?? []
  const outOfStock = isOutOfStock(item)
  const isService = item.kind === 'service'

  return (
    <div
      className="animate-fade fixed inset-0 z-40 flex items-end justify-center bg-slate-900/50 sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={item.name}
        onClick={(e) => e.stopPropagation()}
        className="animate-sheet flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
      >
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="relative">
            {images[active] ? (
              <button
                type="button"
                onClick={() => onZoom(images, images[active])}
                className="block aspect-[4/3] w-full overflow-hidden bg-slate-100 focus:outline-none"
              >
                <img src={images[active]} alt={item.name} className="size-full object-cover" />
              </button>
            ) : (
              <div className="flex aspect-[4/3] w-full items-center justify-center bg-slate-50 text-slate-300">
                {isService ? <Wrench size={40} /> : <Package size={40} />}
              </div>
            )}

            <button
              type="button"
              aria-label="Cerrar"
              onClick={onClose}
              className="absolute top-3 right-3 rounded-full bg-white/90 p-2 text-slate-600 shadow-sm backdrop-blur transition-colors hover:bg-white hover:text-slate-900"
            >
              <X size={18} />
            </button>

            {outOfStock && (
              <span className="absolute bottom-3 left-3 rounded-full bg-slate-900/85 px-3 py-1 text-xs font-semibold text-white">
                Agotado
              </span>
            )}
          </div>

          {images.length > 1 && (
            <div className="no-scrollbar flex gap-2 overflow-x-auto border-b border-slate-100 p-3">
              {images.map((url, i) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => setActive(i)}
                  className={cn(
                    'size-14 shrink-0 overflow-hidden rounded-lg transition-all',
                    i === active ? 'ring-2 ring-brand-500' : 'opacity-60 hover:opacity-100',
                  )}
                >
                  <img src={url} alt="" className="size-full object-cover" />
                </button>
              ))}
            </div>
          )}

          <div className="p-5">
            <div className="mb-2 flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-medium tracking-wide text-slate-400 uppercase">
                {isService ? <Wrench size={11} /> : <Package size={11} />}
                {isService ? 'Servicio' : 'Producto'}
              </span>
              {item.category && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
                  {item.category}
                </span>
              )}
            </div>

            <h2 className="text-xl font-bold text-slate-900">{item.name}</h2>

            <p className="mt-2 text-2xl font-bold text-slate-900">{formatCurrency(item.price)}</p>
            {item.pricingMode === 'quoted' && (
              <p className="mt-0.5 text-xs text-amber-600">
                Precio referencial — el final se acuerda según el trabajo.
              </p>
            )}

            {item.description && (
              <p className="mt-4 text-sm leading-relaxed whitespace-pre-line text-slate-600">
                {item.description}
              </p>
            )}

            {item.variants && item.variants.length > 0 && (
              <div className="mt-4">
                <p className="mb-1.5 text-xs font-semibold tracking-wide text-slate-400 uppercase">
                  Variantes
                </p>
                <ul className="space-y-1">
                  {item.variants.map((v) => (
                    <li
                      key={v.name}
                      className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"
                    >
                      <span className="text-slate-700">{v.name}</span>
                      <span className="font-medium tabular-nums text-slate-900">
                        {formatCurrency(item.price + v.priceModifier)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Acción fija abajo de la hoja */}
        <div className="pb-safe shrink-0 border-t border-slate-100 p-4">
          {phone ? (
            <a
              href={waLink(phone, item)}
              target="_blank"
              rel="noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 active:scale-[0.99]"
            >
              <MessageCircle size={16} />
              {outOfStock ? 'Consultar disponibilidad' : 'Pedir por WhatsApp'}
            </a>
          ) : (
            <p className="rounded-xl bg-slate-50 px-4 py-3 text-center text-xs text-slate-500">
              Contacta al negocio para hacer tu pedido.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════ Auxiliares ═══════════════════════════ */

function Chip({
  active,
  tone = 'brand',
  onClick,
  children,
}: {
  active: boolean
  tone?: 'brand' | 'emerald'
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors',
        active
          ? tone === 'emerald'
            ? 'bg-emerald-600 text-white'
            : 'bg-brand-600 text-white'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
      )}
    >
      {children}
    </button>
  )
}

function EmptyState({
  title,
  hint,
  action,
}: {
  title: string
  hint: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-24 text-center">
      <PackageX size={32} className="text-slate-300" />
      <p className="font-medium text-slate-700">{title}</p>
      <p className="max-w-xs text-sm text-slate-400">{hint}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
