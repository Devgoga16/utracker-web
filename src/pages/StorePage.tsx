import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowDownUp,
  Check,
  MessageCircle,
  Package,
  PackageX,
  Search,
  Share2,
  Wrench,
  X,
} from 'lucide-react'
import { api } from '@/api/client'
import { Lightbox, Spinner } from '@/components/ui'
import { cn, formatCurrency } from '@/lib/cn'
import type { Product, Tenant } from '@/types'

async function getStoreCatalog(slug: string) {
  const { data } = await api.get<{ tenant: Tenant; products: Product[] }>(`/store/${slug}`)
  return data
}

type SortKey = 'default' | 'price_asc' | 'price_desc' | 'name_asc'

const SORT_LABELS: Record<SortKey, string> = {
  default: 'Más recientes',
  price_asc: 'Precio: menor a mayor',
  price_desc: 'Precio: mayor a menor',
  name_asc: 'Nombre A–Z',
}

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

/* ─────────────────────────── Página ─────────────────────────── */

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

  const products = data?.products ?? []

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

  function openLightbox(images: string[], url: string) {
    setLightboxImages(images)
    setLightboxUrl(url)
  }

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
    (activeCategory ? 1 : 0) + (onlyAvailable ? 1 : 0) + (sort !== 'default' ? 1 : 0) + (search ? 1 : 0)

  return (
    <div className="min-h-screen bg-slate-50">
      <StoreHeader tenant={tenant} productCount={products.length} />

      {products.length > 0 && (
        <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="mx-auto max-w-5xl space-y-2 px-4 py-3 sm:px-6">
            {/* Buscador + orden */}
            <div className="flex gap-2">
              <div className="relative min-w-0 flex-1">
                <Search
                  size={15}
                  className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar en el catálogo..."
                  className="w-full rounded-full border-0 bg-slate-100 py-2 pr-3 pl-9 text-base ring-1 ring-transparent transition-shadow outline-none placeholder:text-slate-400 focus:bg-white focus:ring-brand-500 sm:text-sm"
                />
              </div>

              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setShowSortMenu((v) => !v)}
                  className={cn(
                    'flex h-full items-center gap-1.5 rounded-full px-3.5 text-xs font-medium transition-colors',
                    sort !== 'default'
                      ? 'bg-brand-50 text-brand-700 ring-1 ring-brand-200'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                  )}
                >
                  <ArrowDownUp size={13} />
                  <span className="hidden sm:inline">Ordenar</span>
                </button>

                {showSortMenu && (
                  <>
                    <button
                      type="button"
                      aria-label="Cerrar"
                      onClick={() => setShowSortMenu(false)}
                      className="fixed inset-0 z-10 cursor-default"
                    />
                    <div className="absolute top-full right-0 z-20 mt-1.5 w-52 overflow-hidden rounded-xl bg-white py-1 shadow-lg ring-1 ring-slate-200">
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
              <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
                <Chip active={activeCategory === null} onClick={() => setActiveCategory(null)}>
                  Todo
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
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400">
                  {filtered.length} resultado{filtered.length !== 1 && 's'}
                </span>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-[11px] font-medium text-brand-600 hover:underline"
                >
                  Limpiar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
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
                className="text-sm font-medium text-brand-600 hover:underline"
              >
                Limpiar filtros
              </button>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((item) => (
              <ProductCard
                key={item._id}
                item={item}
                phone={tenant.phone}
                onOpen={() => setDetail(item)}
              />
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white py-8 text-center">
        {tenant.phone && (
          <a
            href={waLink(tenant.phone)}
            target="_blank"
            rel="noreferrer"
            className="mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
          >
            <MessageCircle size={16} />
            Escríbenos por WhatsApp
          </a>
        )}
        <p className="text-xs text-slate-400">
          Catálogo de {tenant.name} · hecho con{' '}
          <span className="font-medium text-slate-500">uTracker</span>
        </p>
      </footer>

      <ProductDetail
        item={detail}
        phone={tenant.phone}
        onClose={() => setDetail(null)}
        onZoom={openLightbox}
      />

      <Lightbox
        url={lightboxUrl}
        images={lightboxImages}
        onClose={() => setLightboxUrl(null)}
      />
    </div>
  )
}

/* ─────────────────────────── Header ─────────────────────────── */

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

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-5 sm:px-6 sm:py-6">
        {tenant.logoUrl ? (
          <img
            src={tenant.logoUrl}
            alt={tenant.name}
            className="size-14 shrink-0 rounded-2xl object-cover ring-1 ring-slate-200 sm:size-16"
          />
        ) : (
          <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-2xl font-bold text-brand-600 sm:size-16">
            {tenant.name.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold text-slate-900 sm:text-2xl">{tenant.name}</h1>
          <p className="mt-0.5 text-sm text-slate-400">
            {productCount === 0
              ? 'Catálogo en preparación'
              : `${productCount} ${productCount === 1 ? 'ítem disponible' : 'ítems disponibles'}`}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={share}
            title="Compartir catálogo"
            aria-label="Compartir catálogo"
            className="rounded-full p-2.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            {copied ? <Check size={18} className="text-emerald-600" /> : <Share2 size={18} />}
          </button>

          {tenant.phone && (
            <a
              href={waLink(tenant.phone)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 sm:px-4"
            >
              <MessageCircle size={15} />
              <span className="hidden sm:inline">WhatsApp</span>
            </a>
          )}
        </div>
      </div>
    </header>
  )
}

/* ─────────────────────────── Tarjeta ─────────────────────────── */

function ProductCard({
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
    <article
      className={cn(
        'group flex flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200 transition-all',
        outOfStock ? 'opacity-70' : 'hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-900/5',
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        className="relative block aspect-[4/3] w-full overflow-hidden bg-slate-100 text-left focus:outline-none"
      >
        {item.images?.[0] ? (
          <img
            src={item.images[0]}
            alt={item.name}
            loading="lazy"
            className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <span className="flex size-full items-center justify-center bg-slate-50 text-slate-300">
            {isService ? <Wrench size={30} /> : <Package size={30} />}
          </span>
        )}

        {outOfStock ? (
          <span className="absolute inset-0 flex items-center justify-center bg-white/60">
            <span className="rounded-full bg-slate-900/80 px-3 py-1 text-xs font-semibold text-white">
              Sin stock
            </span>
          </span>
        ) : (
          <span className="absolute inset-x-0 bottom-0 flex items-center justify-center bg-gradient-to-t from-black/60 to-transparent py-2 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
            Ver detalle
          </span>
        )}

        {item.images && item.images.length > 1 && (
          <span className="absolute top-2 right-2 rounded-full bg-black/50 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
            {item.images.length} fotos
          </span>
        )}
      </button>

      <div className="flex flex-1 flex-col p-4">
        <div className="mb-1.5 flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 text-[11px] font-medium tracking-wide text-slate-400 uppercase">
            {isService ? <Wrench size={11} /> : <Package size={11} />}
            {isService ? 'Servicio' : 'Producto'}
          </span>
          {item.category && (
            <span className="ml-auto truncate rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
              {item.category}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onOpen}
          className="text-left font-semibold text-slate-900 transition-colors hover:text-brand-600 focus:outline-none"
        >
          {item.name}
        </button>

        {item.description && (
          <p className="mt-1 line-clamp-2 flex-1 text-sm text-slate-500">{item.description}</p>
        )}

        <div className="mt-3 flex items-end justify-between gap-3">
          <div className="min-w-0">
            {item.pricingMode === 'quoted' ? (
              <>
                <p className="font-bold text-slate-900">{formatCurrency(item.price)}</p>
                <p className="text-[11px] text-amber-600">referencial · se cotiza</p>
              </>
            ) : (
              <p className="text-lg font-bold text-slate-900">{formatCurrency(item.price)}</p>
            )}
          </div>

          {phone && (
            <a
              href={waLink(phone, item)}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold whitespace-nowrap text-white transition-colors hover:bg-emerald-700"
            >
              <MessageCircle size={13} />
              {outOfStock ? 'Consultar' : 'Pedir'}
            </a>
          )}
        </div>
      </div>
    </article>
  )
}

/* ─────────────────────────── Detalle ─────────────────────────── */

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

  // Con el modal abierto el fondo no debe hacer scroll.
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
      className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/50 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={item.name}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
      >
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
            className="absolute top-3 right-3 rounded-full bg-white/90 p-2 text-slate-600 shadow-sm backdrop-blur-sm transition-colors hover:bg-white hover:text-slate-900"
          >
            <X size={18} />
          </button>

          {outOfStock && (
            <span className="absolute bottom-3 left-3 rounded-full bg-slate-900/80 px-3 py-1 text-xs font-semibold text-white">
              Sin stock
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

          <div className="mt-3">
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(item.price)}</p>
            {item.pricingMode === 'quoted' && (
              <p className="mt-0.5 text-xs text-amber-600">
                Precio referencial — el final se acuerda según el trabajo.
              </p>
            )}
          </div>

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

          {phone ? (
            <a
              href={waLink(phone, item)}
              target="_blank"
              rel="noreferrer"
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
            >
              <MessageCircle size={16} />
              {outOfStock ? 'Consultar disponibilidad' : 'Pedir por WhatsApp'}
            </a>
          ) : (
            <p className="mt-5 rounded-xl bg-slate-50 px-4 py-3 text-center text-xs text-slate-500">
              Contacta al negocio para hacer tu pedido.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────── Auxiliares ─────────────────────────── */

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
        'shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors',
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
    <div className="flex flex-col items-center gap-2 py-24 text-center">
      <PackageX size={32} className="text-slate-300" />
      <p className="font-medium text-slate-700">{title}</p>
      <p className="max-w-xs text-sm text-slate-400">{hint}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
