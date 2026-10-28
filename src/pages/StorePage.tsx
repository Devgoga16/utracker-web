import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowDownUp,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  CreditCard,
  MapPin,
  MessageCircle,
  Minus,
  Package,
  PackageX,
  Plus,
  Search,
  Share2,
  ShieldCheck,
  Store,
  Truck,
  Wrench,
  X,
  Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { getStoreCatalog } from '@/api/store'
import { Lightbox } from '@/components/ui'
import { cn, formatCurrency } from '@/lib/cn'
import { applyBrandColor } from '@/lib/brandColor'
import { StoreCart, lineKey } from '@/components/StoreCart'
import type { CartLine } from '@/components/StoreCart'
import type { Campaign, Product, ProductFilter, Tenant } from '@/types'

/** Valores elegidos por filtro: { "<idFiltro>": Set("S","M") }. */
type ActiveFacets = Record<string, string[]>

function matchesFacets(product: Product, facets: ActiveFacets) {
  // Entre filtros distintos se exige que cumpla todos; dentro de uno, basta
  // con que coincida un valor ("Talla S o M", no "S y M a la vez").
  return Object.entries(facets).every(([filterId, chosen]) => {
    if (chosen.length === 0) return true
    const attr = product.attributes?.find((a) => a.filter === filterId)
    return Boolean(attr?.values.some((v) => chosen.includes(v)))
  })
}

type SortKey = 'default' | 'price_asc' | 'price_desc' | 'name_asc'

const SORT_LABELS: Record<SortKey, string> = {
  default: 'Más recientes',
  price_asc: 'Precio: menor a mayor',
  price_desc: 'Precio: mayor a menor',
  name_asc: 'Nombre A–Z',
}

const SIN_CATEGORIA = 'Otros'

/** Alto de la barra fija: las secciones frenan ahí al saltar desde una pestaña. */
const STICKY_OFFSET = 'scroll-mt-36'

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

/** Con variantes el precio de la tarjeta es un «desde»: la más barata manda. */
function fromPrice(item: Product) {
  const cheapest = item.variants?.length
    ? Math.min(...item.variants.map((v) => v.priceModifier))
    : 0
  return item.price + Math.min(0, cheapest)
}

/** Si atiende ahora según el horario de hoy. null = no publicó horario. */
function openNow(tenant: Tenant) {
  const today = tenant.schedule?.find((d) => d.day === new Date().getDay())
  if (!tenant.schedule?.length) return null
  if (!today) return false
  const nowHM = new Date().toTimeString().slice(0, 5)
  return nowHM >= today.open && nowHM < today.close
}

function deliveryLabel(tenant: Tenant) {
  const types = tenant.deliveryTypes ?? []
  if (types.includes('delivery_own') && types.includes('pickup'))
    return 'Delivery y recojo en tienda'
  if (types.includes('delivery_own')) return 'Delivery a domicilio'
  if (types.includes('pickup')) return 'Recojo en tienda'
  return null
}

/* ═══════════════════════════ Página ═══════════════════════════ */

export function StorePage() {
  const { slug } = useParams<{ slug: string }>()

  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [lightboxImages, setLightboxImages] = useState<string[]>([])
  const [detail, setDetail] = useState<Product | null>(null)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortKey>('default')
  const [onlyAvailable, setOnlyAvailable] = useState(false)
  const [showSortMenu, setShowSortMenu] = useState(false)
  const [facets, setFacets] = useState<ActiveFacets>({})
  /** Categoría visible ahora mismo. Solo resalta la pestaña; no filtra nada. */
  const [currentCategory, setCurrentCategory] = useState<string | null>(null)
  /** Carrito, indexado por producto+variante. */
  const [cart, setCart] = useState<Record<string, CartLine>>({})

  const { data, isLoading, isError } = useQuery({
    queryKey: ['store', slug],
    queryFn: () => getStoreCatalog(slug!),
    enabled: Boolean(slug),
  })

  // El color del negocio tiñe toda la tienda; al salir vuelve el índigo.
  useEffect(() => applyBrandColor(data?.tenant?.brandColor), [data?.tenant?.brandColor])

  const products = useMemo(() => data?.products ?? [], [data?.products])
  const campaigns = (data?.campaigns ?? []).filter(
    (c) => new Date(c.endDate) > new Date() && c.status !== 'cancelled',
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
    if (onlyAvailable) list = list.filter((p) => !isOutOfStock(p))
    list = list.filter((p) => matchesFacets(p, facets))

    if (sort === 'price_asc') list.sort((a, b) => a.price - b.price)
    else if (sort === 'price_desc') list.sort((a, b) => b.price - a.price)
    else if (sort === 'name_asc') list.sort((a, b) => a.name.localeCompare(b.name))

    return list
  }, [products, search, sort, onlyAvailable, facets])

  /**
   * Buscando o reordenando, las secciones estorban: el resultado va en una
   * grilla plana. Navegando normal se muestra el catálogo por categorías.
   */
  const isFlat = Boolean(search.trim()) || sort !== 'default'

  const sections = useMemo(() => {
    if (isFlat) return [{ label: null as string | null, items: filtered }]

    const map = new Map<string, Product[]>()
    for (const p of filtered) {
      const key = p.category || SIN_CATEGORIA
      const bucket = map.get(key)
      if (bucket) bucket.push(p)
      else map.set(key, [p])
    }
    return Array.from(map.entries())
      .sort((a, b) =>
        a[0] === SIN_CATEGORIA ? 1 : b[0] === SIN_CATEGORIA ? -1 : a[0].localeCompare(b[0]),
      )
      .map(([label, items]) => ({ label, items }))
  }, [filtered, isFlat])

  const categories = useMemo(
    () => sections.map((s) => s.label).filter((l): l is string => Boolean(l)),
    [sections],
  )

  /**
   * Marca la pestaña de la categoría que se está viendo. Se observa una franja
   * angosta bajo la barra fija para que cambie justo cuando toca.
   */
  const sectionEls = useRef(new Map<string, HTMLElement>())
  useEffect(() => {
    if (isFlat || categories.length === 0) {
      setCurrentCategory(null)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (visible) setCurrentCategory(visible.target.getAttribute('data-category'))
      },
      { rootMargin: '-150px 0px -70% 0px', threshold: 0 },
    )

    for (const el of sectionEls.current.values()) observer.observe(el)
    return () => observer.disconnect()
  }, [isFlat, categories])

  const catalogRef = useRef<HTMLDivElement>(null)

  function jumpTo(category: string) {
    sectionEls.current.get(category)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function clearFilters() {
    setSearch('')
    setSort('default')
    setOnlyAvailable(false)
    setFacets({})
  }

  function toggleFacet(filterId: string, value: string) {
    setFacets((prev) => {
      const current = prev[filterId] ?? []
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value]
      const copy = { ...prev }
      if (next.length) copy[filterId] = next
      else delete copy[filterId]
      return copy
    })
  }

  const facetCount = Object.values(facets).reduce((n, v) => n + v.length, 0)

  /** Suma al carrito respetando el stock cuando el producto lo controla. */
  function addToCart(product: Product, variant?: string) {
    const key = lineKey(product._id, variant)
    setCart((prev) => {
      const current = prev[key]?.quantity ?? 0
      const max = product.trackStock ? (product.stock ?? 0) : Infinity
      if (current >= max) return prev
      return { ...prev, [key]: { product, variant, quantity: current + 1 } }
    })
  }

  function changeQty(key: string, delta: number) {
    setCart((prev) => {
      const line = prev[key]
      if (!line) return prev
      const max = line.product.trackStock ? (line.product.stock ?? 0) : Infinity
      const next = Math.min(max, line.quantity + delta)
      if (next <= 0) {
        const copy = { ...prev }
        delete copy[key]
        return copy
      }
      return { ...prev, [key]: { ...line, quantity: next } }
    })
  }

  const cartLines = Object.values(cart)

  if (isLoading) return <StoreSkeleton />

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
  const storeFilters = data.filters ?? []
  /** Sin formas de entrega configuradas, el catálogo es solo vitrina. */
  const canOrderOnline = (tenant.deliveryTypes?.length ?? 0) > 0
  const activeFilters =
    (onlyAvailable ? 1 : 0) + (sort !== 'default' ? 1 : 0) + (search ? 1 : 0) + facetCount

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <AnnouncementBar tenant={tenant} canOrder={canOrderOnline} />
      <StoreNav tenant={tenant} />
      <StoreHero
        tenant={tenant}
        products={products}
        canOrder={canOrderOnline}
        onBrowse={() =>
          catalogRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          })
        }
      />
      <TrustStrip tenant={tenant} canOrder={canOrderOnline} />

      {campaigns.length > 0 && (
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          {/* La primera manda como banner; las demás van en tira. */}
          <CampaignHero campaign={campaigns[0]} />
          {campaigns.length > 1 && <CampaignStrip campaigns={campaigns.slice(1)} />}
        </div>
      )}

      <div ref={catalogRef} className="scroll-mt-0" />

      {/* Barra fija: buscar, ordenar, filtrar y saltar entre categorías. */}
      {products.length > 0 && (
        <div className="sticky top-0 z-20 mt-8 border-y border-slate-200 bg-white/95 backdrop-blur-md">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex items-center gap-2 py-3">
              <div className="relative min-w-0 flex-1 sm:max-w-sm">
                <Search
                  size={16}
                  className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar productos"
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white pr-3 pl-9 text-base transition outline-none placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 sm:text-sm"
                />
              </div>

              {/* Filtros en la misma línea, en pantallas anchas. */}
              <div className="hidden min-w-0 flex-1 items-center gap-2 sm:flex">
                {storeFilters.map((f) => (
                  <FacetDropdown
                    key={f._id}
                    filter={f}
                    chosen={facets[f._id] ?? []}
                    onToggle={(v) => toggleFacet(f._id, v)}
                  />
                ))}
                {hasTrackedStock && (
                  <ToggleButton active={onlyAvailable} onClick={() => setOnlyAvailable((v) => !v)}>
                    Solo disponibles
                  </ToggleButton>
                )}
              </div>

              <SortMenu
                sort={sort}
                open={showSortMenu}
                onOpenChange={setShowSortMenu}
                onChange={setSort}
              />
            </div>

            {/* Filtros en celular: una fila que se desliza. */}
            {(storeFilters.length > 0 || hasTrackedStock) && (
              <div className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-3 sm:hidden">
                {hasTrackedStock && (
                  <ToggleButton active={onlyAvailable} onClick={() => setOnlyAvailable((v) => !v)}>
                    Solo disponibles
                  </ToggleButton>
                )}
                {storeFilters.map((f) => (
                  <FacetDropdown
                    key={f._id}
                    filter={f}
                    chosen={facets[f._id] ?? []}
                    onToggle={(v) => toggleFacet(f._id, v)}
                  />
                ))}
              </div>
            )}

            {/* Categorías como pestañas: navegan a su sección, no filtran. */}
            {!isFlat && categories.length > 1 && (
              <nav
                aria-label="Categorías"
                className="no-scrollbar -mx-4 -mb-px flex gap-6 overflow-x-auto px-4 sm:-mx-6 sm:px-6"
              >
                {categories.map((cat) => {
                  const active = currentCategory === cat
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => jumpTo(cat)}
                      className={cn(
                        'shrink-0 border-b-2 pb-2.5 text-sm whitespace-nowrap transition-colors',
                        active
                          ? 'border-brand-600 font-semibold text-slate-900'
                          : 'border-transparent text-slate-500 hover:text-slate-900',
                      )}
                    >
                      {cat}
                    </button>
                  )
                })}
              </nav>
            )}

            {activeFilters > 0 && (
              <div className="flex items-center gap-3 border-t border-slate-100 py-2">
                <span className="text-xs text-slate-500">
                  {filtered.length} resultado{filtered.length !== 1 && 's'}
                </span>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs font-semibold text-brand-700 hover:underline"
                >
                  Limpiar filtros
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <main className="pb-20">
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
                  className="text-sm font-semibold text-brand-700 hover:underline"
                >
                  Limpiar filtros
                </button>
              }
            />
          ) : (
            sections.map((section) => (
              <section
                key={section.label ?? '_flat'}
                data-category={section.label ?? ''}
                ref={(el) => {
                  if (section.label && el) sectionEls.current.set(section.label, el)
                }}
                className={cn('pt-10', STICKY_OFFSET)}
              >
                {section.label && (
                  <div className="mb-5 flex items-end justify-between gap-4 border-b border-slate-200 pb-3">
                    <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                      {section.label}
                    </h2>
                    <span className="text-sm text-slate-500">
                      {section.items.length} {section.items.length === 1 ? 'producto' : 'productos'}
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 md:grid-cols-3 lg:grid-cols-4">
                  {section.items.map((item) => (
                    <ProductCard
                      key={item._id}
                      item={item}
                      phone={tenant.phone}
                      canOrder={canOrderOnline}
                      inCart={cart[lineKey(item._id)]?.quantity ?? 0}
                      onOpen={() => setDetail(item)}
                      onAdd={() => addToCart(item)}
                      onChangeQty={(d) => changeQty(lineKey(item._id), d)}
                    />
                  ))}
                </div>
              </section>
            ))
          )}
        </main>
      </div>

      <StoreFooter tenant={tenant} canOrder={canOrderOnline} />

      <ProductDetail
        item={detail}
        phone={tenant.phone}
        canOrder={canOrderOnline}
        onAdd={(variant) => {
          if (detail) addToCart(detail, variant)
          setDetail(null)
        }}
        onClose={() => setDetail(null)}
        onZoom={(images, url) => {
          setLightboxImages(images)
          setLightboxUrl(url)
        }}
      />

      <Lightbox url={lightboxUrl} images={lightboxImages} onClose={() => setLightboxUrl(null)} />

      {canOrderOnline && (
        <StoreCart
          tenant={tenant}
          lines={cartLines}
          onChangeQty={changeQty}
          onDone={() => setCart({})}
        />
      )}
    </div>
  )
}

/* ═══════════════════════════ Barra superior ═══════════════════════════ */

/** Una línea con lo que el cliente quiere saber antes de mirar nada. */
function AnnouncementBar({ tenant, canOrder }: { tenant: Tenant; canOrder: boolean }) {
  const isOpen = openNow(tenant)
  const delivery = deliveryLabel(tenant)
  const parts = [
    canOrder ? 'Pedidos en línea' : 'Pedidos por WhatsApp',
    delivery,
    tenant.paymentMethods?.length
      ? `Paga con ${tenant.paymentMethods
          .map((m) => m.name)
          .slice(0, 3)
          .join(', ')}`
      : null,
  ].filter(Boolean) as string[]

  return (
    <div className="bg-slate-900 text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-center gap-x-3 px-4 py-2 text-center text-xs sm:justify-between sm:px-6">
        <p className="truncate text-white/80">{parts.join('  ·  ')}</p>
        {isOpen !== null && (
          <span className="hidden shrink-0 items-center gap-1.5 font-medium sm:inline-flex">
            <span
              className={cn('size-1.5 rounded-full', isOpen ? 'bg-emerald-400' : 'bg-white/40')}
            />
            {isOpen ? 'Abierto ahora' : 'Cerrado ahora'}
          </span>
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════ Cabecera ═══════════════════════════ */

function StoreLogo({ tenant, size = 'md' }: { tenant: Tenant; size?: 'md' | 'lg' }) {
  const box = size === 'lg' ? 'size-12 text-xl' : 'size-9 text-base'
  return tenant.logoUrl ? (
    <img
      src={tenant.logoUrl}
      alt={tenant.name}
      className={cn('shrink-0 rounded-lg bg-white object-cover ring-1 ring-slate-200', box)}
    />
  ) : (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-lg bg-brand-600 font-semibold text-white',
        box,
      )}
    >
      {tenant.name.charAt(0).toUpperCase()}
    </span>
  )
}

function StoreNav({ tenant }: { tenant: Tenant }) {
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
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <StoreLogo tenant={tenant} />
        <p className="min-w-0 flex-1 truncate text-base font-semibold tracking-tight">
          {tenant.name}
        </p>

        <button
          type="button"
          onClick={share}
          title="Compartir tienda"
          aria-label="Compartir tienda"
          className="flex size-10 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          {copied ? <Check size={18} className="text-emerald-600" /> : <Share2 size={18} />}
        </button>

        {tenant.phone && (
          <a
            href={waLink(tenant.phone)}
            target="_blank"
            rel="noreferrer"
            aria-label="Escríbenos por WhatsApp"
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 sm:px-4"
          >
            <MessageCircle size={16} className="text-emerald-600" />
            <span className="hidden sm:inline">Escríbenos</span>
          </a>
        )}
      </div>
    </header>
  )
}

/**
 * La portada: el nombre en grande y, en pantallas anchas, un mosaico con las
 * fotos del propio catálogo. Sin una foto de portada cargada, lo más vistoso
 * que tiene un negocio son sus productos.
 */
function StoreHero({
  tenant,
  products,
  canOrder,
  onBrowse,
}: {
  tenant: Tenant
  products: Product[]
  canOrder: boolean
  onBrowse: () => void
}) {
  const photos = products
    .filter((p) => p.images?.[0] && !isOutOfStock(p))
    .slice(0, 3)
    .map((p) => p.images[0])
  const isOpen = openNow(tenant)

  return (
    <section className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-b from-brand-50/70 to-white">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[1.1fr_0.9fr] lg:py-16">
        <div>
          <div className="flex items-center gap-3">
            <StoreLogo tenant={tenant} size="lg" />
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
              <span className="rounded-full bg-white px-2.5 py-1 text-slate-600 ring-1 ring-slate-200">
                Tienda oficial
              </span>
              {isOpen !== null && (
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ring-1',
                    isOpen
                      ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                      : 'bg-white text-slate-500 ring-slate-200',
                  )}
                >
                  <Clock size={12} />
                  {isOpen ? 'Abierto ahora' : 'Cerrado ahora'}
                </span>
              )}
            </div>
          </div>

          <h1 className="mt-6 text-4xl leading-[1.05] font-semibold tracking-tight text-balance text-slate-900 sm:text-5xl">
            {tenant.name}
          </h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-slate-600 sm:text-lg">
            {canOrder
              ? 'Elige tus productos, haz tu pedido en línea y sigue su avance en tiempo real.'
              : 'Mira nuestro catálogo y haz tu pedido por WhatsApp.'}
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            {products.length > 0 && (
              <button
                type="button"
                onClick={onBrowse}
                className="inline-flex h-12 items-center gap-2 rounded-lg bg-slate-900 px-6 text-sm font-semibold text-white transition-colors hover:bg-slate-800 active:scale-[0.99]"
              >
                Ver catálogo
                <ArrowRight size={16} />
              </button>
            )}
            {tenant.phone && (
              <a
                href={waLink(tenant.phone)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-12 items-center gap-2 rounded-lg border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50"
              >
                <MessageCircle size={16} className="text-emerald-600" />
                Escríbenos
              </a>
            )}
          </div>
        </div>

        {photos.length >= 2 && (
          <div className="relative hidden h-[22rem] lg:block">
            <img
              src={photos[0]}
              alt=""
              className="absolute top-0 right-0 h-[85%] w-[62%] rounded-2xl object-cover shadow-xl ring-1 ring-black/5"
            />
            <img
              src={photos[1]}
              alt=""
              className="absolute bottom-0 left-0 h-[62%] w-[46%] rounded-2xl object-cover shadow-xl ring-4 ring-white"
            />
            {photos[2] && (
              <img
                src={photos[2]}
                alt=""
                className="absolute bottom-4 left-[50%] size-28 rounded-xl object-cover shadow-lg ring-4 ring-white"
              />
            )}
          </div>
        )}
      </div>
    </section>
  )
}

/** Las respuestas a «¿cómo compro aquí?», antes de que nadie las pregunte. */
function TrustStrip({ tenant, canOrder }: { tenant: Tenant; canOrder: boolean }) {
  const delivery = deliveryLabel(tenant)
  const payments = tenant.paymentMethods?.map((m) => m.name) ?? []

  const items: { icon: LucideIcon; title: string; hint: string }[] = [
    delivery && {
      icon: tenant.deliveryTypes?.includes('delivery_own') ? Truck : Store,
      title: delivery,
      hint: 'Eliges fecha y turno al pedir',
    },
    payments.length > 0 && {
      icon: CreditCard,
      title: 'Medios de pago',
      hint: payments.slice(0, 3).join(' · '),
    },
    canOrder && {
      icon: ShieldCheck,
      title: 'Seguimiento en línea',
      hint: 'Ves cómo avanza tu pedido',
    },
    tenant.phone && {
      icon: MessageCircle,
      title: 'Atención por WhatsApp',
      hint: 'Te respondemos tus dudas',
    },
  ].filter(Boolean) as { icon: LucideIcon; title: string; hint: string }[]

  if (items.length === 0) return null

  return (
    <div className="border-b border-slate-200">
      <div
        className={cn(
          'mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-5 px-4 py-6 sm:px-6',
          items.length >= 4 ? 'lg:grid-cols-4' : items.length === 3 ? 'lg:grid-cols-3' : '',
        )}
      >
        {items.map((it) => (
          <div key={it.title} className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
              <it.icon size={17} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">{it.title}</p>
              <p className="truncate text-xs text-slate-500">{it.hint}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ═══════════════════════════ Filtros ═══════════════════════════ */

function ToggleButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg border px-3.5 text-sm whitespace-nowrap transition-colors',
        active
          ? 'border-slate-900 bg-slate-900 font-medium text-white'
          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300',
      )}
    >
      {active && <Check size={14} />}
      {children}
    </button>
  )
}

function SortMenu({
  sort,
  open,
  onOpenChange,
  onChange,
}: {
  sort: SortKey
  open: boolean
  onOpenChange: (open: boolean) => void
  onChange: (sort: SortKey) => void
}) {
  return (
    <div className="relative shrink-0">
      <button
        type="button"
        aria-label="Ordenar"
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
        className={cn(
          'inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm transition-colors',
          sort !== 'default'
            ? 'border-slate-900 bg-slate-900 font-medium text-white'
            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300',
        )}
      >
        <ArrowDownUp size={15} />
        <span className="hidden sm:inline">
          {sort === 'default' ? 'Ordenar' : SORT_LABELS[sort]}
        </span>
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={() => onOpenChange(false)}
            className="fixed inset-0 z-10 cursor-default"
          />
          <div className="absolute top-full right-0 z-20 mt-2 w-56 overflow-hidden rounded-xl bg-white py-1.5 shadow-xl ring-1 ring-slate-200">
            {(Object.entries(SORT_LABELS) as [SortKey, string][]).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  onChange(key)
                  onOpenChange(false)
                }}
                className={cn(
                  'flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors hover:bg-slate-50',
                  sort === key ? 'font-semibold text-slate-900' : 'text-slate-700',
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
  )
}

/**
 * Un desplegable por filtro. Se despliega en vez de listar todos los valores
 * de golpe: con tres filtros de cinco valores la barra fija se comería media
 * pantalla en un celular.
 *
 * La lista se dibuja fuera de la barra, fija sobre la página: en celular los
 * filtros van en una fila que se desliza de lado, y esa fila recorta todo lo
 * que sobresale hacia abajo. Dentro de ella, la lista quedaba cortada.
 */
function FacetDropdown({
  filter,
  chosen,
  onToggle,
}: {
  filter: ProductFilter
  chosen: string[]
  onToggle: (value: string) => void
}) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const open = pos !== null

  function toggle() {
    if (open) return setPos(null)
    const rect = buttonRef.current?.getBoundingClientRect()
    if (!rect) return
    // Que no se salga por la derecha en pantallas angostas.
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - 208))
    setPos({ top: rect.bottom + 8, left })
  }

  // Fija sobre la página, no sigue al botón: al deslizar se cierra.
  useEffect(() => {
    if (!open) return
    const close = () => setPos(null)
    // Deslizar la propia lista, cuando es larga, no la cierra.
    const onScroll = (e: Event) => {
      if (e.target instanceof Node && menuRef.current?.contains(e.target)) return
      close()
    }
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', close)
    }
  }, [open])

  return (
    <div className="shrink-0">
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className={cn(
          'inline-flex h-10 items-center gap-1.5 rounded-lg border px-3.5 text-sm transition-colors',
          chosen.length
            ? 'border-slate-900 bg-slate-900 font-medium text-white'
            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300',
        )}
      >
        {filter.name}
        {chosen.length > 0 && (
          <span className="rounded bg-white/20 px-1.5 text-[11px] font-semibold">
            {chosen.length}
          </span>
        )}
        <ChevronDown size={14} className={cn('transition-transform', open && 'rotate-180')} />
      </button>

      {pos &&
        createPortal(
          <>
            <button
              type="button"
              aria-label="Cerrar"
              onClick={() => setPos(null)}
              className="fixed inset-0 z-40 cursor-default"
            />
            <div
              ref={menuRef}
              style={{ top: pos.top, left: pos.left }}
              className="fixed z-50 max-h-[60vh] min-w-48 overflow-y-auto rounded-xl bg-white p-1.5 shadow-xl ring-1 ring-slate-200"
            >
              {filter.values.map((v) => {
                const on = chosen.includes(v)
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => onToggle(v)}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50"
                  >
                    <span
                      className={cn(
                        'flex size-4 shrink-0 items-center justify-center rounded border transition-colors',
                        on ? 'border-slate-900 bg-slate-900' : 'border-slate-300',
                      )}
                    >
                      {on && <Check size={11} className="text-white" />}
                    </span>
                    <span className={on ? 'font-medium text-slate-900' : 'text-slate-700'}>
                      {v}
                    </span>
                  </button>
                )
              })}
            </div>
          </>,
          document.body,
        )}
    </div>
  )
}

/* ═══════════════════════════ Pie ═══════════════════════════ */

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

/**
 * Cierre con la información que una tienda de verdad muestra: cómo comprar,
 * cómo pagar y a qué hora atienden.
 */
function StoreFooter({ tenant, canOrder }: { tenant: Tenant; canOrder: boolean }) {
  const today = new Date().getDay()
  const schedule = tenant.schedule ?? []
  // Lunes primero: el domingo al final se lee más natural que al principio.
  const ordered = schedule.length
    ? [1, 2, 3, 4, 5, 6, 0].map((day) => ({
        day,
        slot: schedule.find((s) => s.day === day),
      }))
    : []
  const delivery = deliveryLabel(tenant)
  const payments = tenant.paymentMethods ?? []

  return (
    <footer className="bg-slate-900 text-slate-300">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <div className="flex items-center gap-3">
              <StoreLogo tenant={tenant} />
              <p className="text-base font-semibold text-white">{tenant.name}</p>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-400">
              {canOrder
                ? 'Haz tu pedido en línea y te avisamos cómo avanza.'
                : 'Escríbenos y coordinamos tu pedido.'}
            </p>
            {tenant.phone && (
              <a
                href={waLink(tenant.phone)}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex h-11 items-center gap-2 rounded-lg bg-white px-5 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100"
              >
                <MessageCircle size={16} className="text-emerald-600" />
                Escríbenos por WhatsApp
              </a>
            )}
          </div>

          {(delivery || payments.length > 0) && (
            <div>
              <h2 className="text-sm font-semibold text-white">Cómo comprar</h2>
              <ul className="mt-4 space-y-3 text-sm">
                {delivery && (
                  <li className="flex gap-2.5">
                    <MapPin size={16} className="mt-0.5 shrink-0 text-slate-500" />
                    <span>{delivery}</span>
                  </li>
                )}
                {payments.length > 0 && (
                  <li className="flex gap-2.5">
                    <CreditCard size={16} className="mt-0.5 shrink-0 text-slate-500" />
                    <span>Pagas con {payments.map((p) => p.name).join(', ')}</span>
                  </li>
                )}
                {canOrder && (
                  <li className="flex gap-2.5">
                    <ShieldCheck size={16} className="mt-0.5 shrink-0 text-slate-500" />
                    <span>Recibes un link para seguir tu pedido</span>
                  </li>
                )}
              </ul>
            </div>
          )}

          {ordered.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-white">Horario de atención</h2>
              <ul className="mt-4 space-y-1.5 text-sm">
                {ordered.map(({ day, slot }) => {
                  const isToday = day === today
                  return (
                    <li
                      key={day}
                      className={cn(
                        'flex items-baseline justify-between gap-4',
                        isToday && 'font-semibold text-white',
                      )}
                    >
                      <span>
                        {DAY_NAMES[day]}
                        {isToday && (
                          <span className="ml-1.5 text-xs font-medium text-brand-300">hoy</span>
                        )}
                      </span>
                      <span className={cn('tabular-nums', !slot && 'text-slate-500')}>
                        {slot ? `${slot.open} – ${slot.close}` : 'Cerrado'}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-slate-500 sm:flex-row sm:justify-between">
          <p>
            © {new Date().getFullYear()} {tenant.name}
          </p>
          <p>
            Tienda hecha con <span className="font-medium text-slate-400">uTracker</span>
          </p>
        </div>
      </div>
    </footer>
  )
}

/* ═══════════════════════════ Campañas ═══════════════════════════ */

/**
 * La campaña no tiene foto propia: se arma un mosaico con las fotos de sus
 * productos. Sin fotos cae a un bloque con el color de la tienda.
 */
function CampaignThumb({ campaign, large = false }: { campaign: Campaign; large?: boolean }) {
  const images = campaign.items
    .map((i) => i.imageUrl)
    .filter(Boolean)
    .slice(0, 4) as string[]
  const box = large ? 'size-40' : 'size-20'
  const radius = large ? 'rounded-xl' : 'rounded-lg'

  if (images.length === 0) {
    return (
      <div
        className={cn(
          'flex shrink-0 items-center justify-center bg-white/10 ring-1 ring-white/15',
          box,
          radius,
        )}
      >
        <Zap size={large ? 44 : 26} className="text-white/70" />
      </div>
    )
  }

  if (images.length === 1) {
    return (
      <img
        src={images[0]}
        alt=""
        loading="lazy"
        className={cn('shrink-0 object-cover', box, radius, large && 'ring-2 ring-white/20')}
      />
    )
  }

  return (
    <div
      className={cn(
        'grid shrink-0 gap-px overflow-hidden bg-white/20',
        box,
        radius,
        large && 'ring-2 ring-white/20',
        images.length === 2 ? 'grid-rows-2' : 'grid-cols-2 grid-rows-2',
      )}
    >
      {images.slice(0, images.length === 2 ? 2 : 4).map((url, i) => (
        <img key={i} src={url} alt="" loading="lazy" className="size-full object-cover" />
      ))}
    </div>
  )
}

/**
 * La campaña más próxima va como banner ancho: es lo que el negocio quiere
 * empujar, y una tarjetita en una tira horizontal no le da esa jerarquía.
 */
function CampaignHero({ campaign }: { campaign: Campaign }) {
  const isLive = campaign.status === 'active' && new Date(campaign.startDate) <= new Date()
  const left = campaign.items.reduce((s, i) => s + (i.stock - i.sold), 0)
  const total = campaign.items.reduce((s, i) => s + i.stock, 0)
  const sold = total - left
  const pct = total > 0 ? Math.round((sold / total) * 100) : 0

  return (
    <a
      href={`/c/${campaign.token}`}
      className="group relative mt-8 flex items-center gap-5 overflow-hidden rounded-2xl bg-slate-900 p-6 transition-transform hover:-translate-y-0.5 sm:gap-8 sm:p-8"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-brand-500/30 blur-3xl"
      />

      <div className="relative min-w-0 flex-1">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-white uppercase ring-1 ring-white/15">
          {isLive ? (
            <>
              <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
              Venta en vivo
            </>
          ) : (
            <>
              <Zap size={11} />
              Reserva anticipada
            </>
          )}
        </span>

        <h2 className="mt-3 text-2xl leading-tight font-semibold tracking-tight text-white sm:text-3xl">
          {campaign.name}
        </h2>
        {campaign.description && (
          <p className="mt-2 line-clamp-2 max-w-md text-sm text-white/65">{campaign.description}</p>
        )}

        {/* Prueba social: cuánto se lleva vendido. */}
        {total > 0 && (
          <div className="mt-5 max-w-xs">
            <div className="flex items-baseline justify-between text-xs text-white/65">
              <span>{sold > 0 ? `${sold} vendidos` : 'Sé el primero'}</span>
              <span>{left} disponibles</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-brand-400 transition-all duration-700"
                style={{ width: `${Math.max(pct, sold > 0 ? 4 : 0)}%` }}
              />
            </div>
          </div>
        )}

        <span className="mt-6 inline-flex h-11 items-center gap-2 rounded-lg bg-white px-5 text-sm font-semibold text-slate-900 transition-[gap] group-hover:gap-3">
          Ver la venta
          <ArrowRight size={15} />
        </span>
      </div>

      {/* Mosaico de los productos incluidos, solo en pantallas anchas. */}
      <div className="relative hidden shrink-0 sm:block">
        <CampaignThumb campaign={campaign} large />
      </div>
    </a>
  )
}

function CampaignStrip({ campaigns }: { campaigns: Campaign[] }) {
  return (
    <section className="pt-8">
      <h2 className="mb-4 text-lg font-semibold tracking-tight text-slate-900">
        Más ventas especiales
      </h2>

      <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6">
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
              className="group flex w-72 shrink-0 items-center gap-3.5 rounded-xl border border-slate-200 bg-white p-3 transition-colors hover:border-slate-300"
            >
              <span className="overflow-hidden rounded-lg bg-slate-900">
                <CampaignThumb campaign={c} />
              </span>

              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span
                  className={cn(
                    'w-fit rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase',
                    isLive
                      ? 'bg-emerald-50 text-emerald-700'
                      : isDraft
                        ? 'bg-slate-100 text-slate-500'
                        : 'bg-brand-50 text-brand-700',
                  )}
                >
                  {isLive ? 'En vivo' : isDraft ? 'Pronto' : 'Reserva ya'}
                </span>

                <p className="line-clamp-1 font-semibold text-slate-900">{c.name}</p>
                <p
                  className={cn(
                    'text-xs',
                    almostGone && left > 0 ? 'font-semibold text-red-600' : 'text-slate-500',
                  )}
                >
                  {left > 0 ? `${left} disponibles` : 'Agotado'}
                </p>
              </div>

              <ChevronRight
                size={18}
                className="shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-500"
              />
            </a>
          )
        })}
      </div>
    </section>
  )
}

/* ═══════════════════════════ Tarjeta ═══════════════════════════ */

function ProductCard({
  item,
  phone,
  canOrder,
  inCart,
  onOpen,
  onAdd,
  onChangeQty,
}: {
  item: Product
  phone?: string
  canOrder: boolean
  inCart: number
  onOpen: () => void
  onAdd: () => void
  onChangeQty: (delta: number) => void
}) {
  const outOfStock = isOutOfStock(item)
  const isService = item.kind === 'service'
  const lowStock =
    !outOfStock && item.kind === 'product' && item.trackStock && (item.stock ?? 0) <= 3
  const hasVariants = (item.variants?.length ?? 0) > 0
  const photos = item.images?.length ?? 0

  return (
    <article className="group flex flex-col">
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Ver ${item.name}`}
        className="relative aspect-square w-full overflow-hidden rounded-xl bg-slate-100 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none"
      >
        {item.images?.[0] ? (
          <>
            <img
              src={item.images[0]}
              alt={item.name}
              loading="lazy"
              className={cn(
                'size-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]',
                outOfStock && 'opacity-60 grayscale',
              )}
            />
            {/* La segunda foto aparece al pasar el mouse: otro ángulo sin clic. */}
            {item.images[1] && !outOfStock && (
              <img
                src={item.images[1]}
                alt=""
                aria-hidden
                loading="lazy"
                className="absolute inset-0 size-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              />
            )}
          </>
        ) : (
          <span className="flex size-full items-center justify-center text-slate-300">
            {isService ? <Wrench size={32} /> : <Package size={32} />}
          </span>
        )}

        {/* Etiquetas sobrias, arriba a la izquierda. */}
        <div className="absolute top-2.5 left-2.5 flex flex-col items-start gap-1">
          {outOfStock ? (
            <Tag tone="dark">Agotado</Tag>
          ) : lowStock ? (
            <Tag tone="danger">Últimas {item.stock}</Tag>
          ) : null}
          {(item.preparationDays ?? 0) > 0 && !outOfStock && (
            <Tag>
              <Clock size={10} />
              {item.preparationDays} {item.preparationDays === 1 ? 'día' : 'días'} de preparación
            </Tag>
          )}
        </div>

        {photos > 1 && (
          <span className="absolute right-2.5 bottom-2.5 flex gap-1" aria-hidden>
            {Array.from({ length: Math.min(photos, 4) }).map((_, i) => (
              <span
                key={i}
                className={cn('size-1.5 rounded-full', i === 0 ? 'bg-white' : 'bg-white/50')}
              />
            ))}
          </span>
        )}
      </button>

      <div className="mt-3 flex min-w-0 flex-1 flex-col">
        {item.category && (
          <p className="truncate text-[11px] font-medium tracking-wide text-slate-400 uppercase">
            {isService ? 'Servicio · ' : ''}
            {item.category}
          </p>
        )}
        <button
          type="button"
          onClick={onOpen}
          className="mt-0.5 line-clamp-2 text-left text-[15px] leading-snug font-medium text-slate-900 hover:underline focus:outline-none"
        >
          {item.name}
        </button>

        <p className="mt-1.5 flex items-baseline gap-1.5 text-base font-semibold text-slate-900 tabular-nums">
          {hasVariants && <span className="text-xs font-normal text-slate-500">Desde</span>}
          {formatCurrency(fromPrice(item))}
          {item.pricingMode === 'quoted' && (
            <span className="text-xs font-normal text-amber-700">referencial</span>
          )}
        </p>

        {/* La acción ocupa todo el ancho: se toca fácil con el pulgar. */}
        <div className="mt-3">
          {!canOrder ? (
            phone && (
              <a
                href={waLink(phone, item)}
                target="_blank"
                rel="noreferrer"
                aria-label={`Consultar ${item.name} por WhatsApp`}
                className="flex h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-800 transition-colors hover:border-slate-300 hover:bg-slate-50"
              >
                <MessageCircle size={15} className="text-emerald-600" />
                {outOfStock ? 'Consultar' : 'Pedir por WhatsApp'}
              </a>
            )
          ) : outOfStock ? (
            <span className="flex h-10 w-full items-center justify-center rounded-lg bg-slate-100 text-sm font-medium text-slate-400">
              Agotado
            </span>
          ) : inCart > 0 ? (
            <div className="flex h-10 w-full items-center justify-between rounded-lg bg-slate-900 px-1 text-white">
              <button
                type="button"
                aria-label={`Quitar ${item.name}`}
                onClick={() => onChangeQty(-1)}
                className="flex size-8 items-center justify-center rounded-md transition-colors hover:bg-white/15 active:scale-90"
              >
                <Minus size={15} />
              </button>
              <span className="text-sm font-semibold tabular-nums">{inCart} en tu pedido</span>
              <button
                type="button"
                aria-label={`Agregar ${item.name}`}
                disabled={item.trackStock && inCart >= (item.stock ?? 0)}
                onClick={() => onChangeQty(1)}
                className="flex size-8 items-center justify-center rounded-md transition-colors hover:bg-white/15 active:scale-90 disabled:opacity-40"
              >
                <Plus size={15} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              aria-label={`Agregar ${item.name} al pedido`}
              // Con variantes hay que elegir una antes: lo resuelve el detalle.
              onClick={() => (hasVariants ? onOpen() : onAdd())}
              className="flex h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-slate-900 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-900 hover:text-white active:scale-[0.99]"
            >
              {hasVariants ? 'Elegir opción' : 'Agregar'}
            </button>
          )}
        </div>
      </div>
    </article>
  )
}

function Tag({
  tone = 'light',
  children,
}: {
  tone?: 'light' | 'dark' | 'danger'
  children: ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold',
        tone === 'dark' && 'bg-slate-900 text-white',
        tone === 'danger' && 'bg-red-600 text-white',
        tone === 'light' && 'bg-white/95 text-slate-700 shadow-sm',
      )}
    >
      {children}
    </span>
  )
}

/* ═══════════════════════════ Detalle ═══════════════════════════ */

/**
 * Ficha del producto. En celular sube como hoja desde abajo; en pantallas
 * anchas es una ficha a dos columnas, fotos a la izquierda y compra a la
 * derecha, como en cualquier tienda en línea.
 */
function ProductDetail({
  item,
  phone,
  canOrder,
  onAdd,
  onClose,
  onZoom,
}: {
  item: Product | null
  phone?: string
  canOrder: boolean
  onAdd: (variant?: string) => void
  onClose: () => void
  onZoom: (images: string[], url: string) => void
}) {
  const [active, setActive] = useState(0)
  const [variant, setVariant] = useState<string | undefined>(undefined)

  useEffect(() => {
    setActive(0)
    setVariant(undefined)
  }, [item])

  useEffect(() => {
    if (!item) return
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [item, onClose])

  // Con la ficha abierta el fondo no debe hacer scroll.
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
  const variants = item.variants ?? []
  // Con variantes el precio depende de cuál elija: no se puede agregar a ciegas.
  const needsVariant = variants.length > 0 && !variant
  const chosen = variants.find((v) => v.name === variant)
  const price = chosen ? item.price + chosen.priceModifier : fromPrice(item)

  return (
    <div
      className="animate-fade fixed inset-0 z-40 flex items-end justify-center bg-slate-900/60 sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={item.name}
        onClick={(e) => e.stopPropagation()}
        className="animate-sheet relative flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl md:max-w-4xl md:flex-row"
      >
        <button
          type="button"
          aria-label="Cerrar"
          onClick={onClose}
          className="absolute top-3 right-3 z-10 flex size-9 items-center justify-center rounded-full bg-white/95 text-slate-600 shadow-sm ring-1 ring-slate-200 transition-colors hover:text-slate-900"
        >
          <X size={18} />
        </button>

        {/* Fotos */}
        <div className="shrink-0 bg-slate-50 md:w-1/2">
          {images[active] ? (
            <button
              type="button"
              onClick={() => onZoom(images, images[active])}
              className="block aspect-square w-full overflow-hidden focus:outline-none"
            >
              <img
                src={images[active]}
                alt={item.name}
                className={cn('size-full object-cover', outOfStock && 'opacity-60 grayscale')}
              />
            </button>
          ) : (
            <div className="flex aspect-square w-full items-center justify-center text-slate-300">
              {isService ? <Wrench size={44} /> : <Package size={44} />}
            </div>
          )}

          {images.length > 1 && (
            <div className="no-scrollbar flex gap-2 overflow-x-auto p-3">
              {images.map((url, i) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => setActive(i)}
                  aria-label={`Foto ${i + 1}`}
                  className={cn(
                    'size-14 shrink-0 overflow-hidden rounded-lg ring-2 transition-all',
                    i === active
                      ? 'ring-slate-900'
                      : 'ring-transparent opacity-60 hover:opacity-100',
                  )}
                >
                  <img src={url} alt="" className="size-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Información y compra */}
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-7">
            <p className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">
              {isService ? 'Servicio' : 'Producto'}
              {item.category && ` · ${item.category}`}
            </p>
            <h2 className="mt-1.5 pr-8 text-2xl leading-tight font-semibold tracking-tight text-slate-900">
              {item.name}
            </h2>

            <p className="mt-3 flex items-baseline gap-2 text-2xl font-semibold text-slate-900 tabular-nums">
              {needsVariant && <span className="text-sm font-normal text-slate-500">Desde</span>}
              {formatCurrency(price)}
            </p>
            {item.pricingMode === 'quoted' && (
              <p className="mt-1 text-xs text-amber-700">
                Precio referencial — el final se acuerda según el trabajo.
              </p>
            )}

            {(outOfStock || (item.preparationDays ?? 0) > 0) && (
              <div className="mt-4 flex flex-wrap gap-2">
                {outOfStock && (
                  <span className="rounded-md bg-slate-900 px-2 py-1 text-xs font-semibold text-white">
                    Agotado
                  </span>
                )}
                {(item.preparationDays ?? 0) > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800">
                    <Clock size={12} />
                    Pídelo con {item.preparationDays} {item.preparationDays === 1 ? 'día' : 'días'}{' '}
                    de anticipación
                  </span>
                )}
              </div>
            )}

            {variants.length > 0 && (
              <div className="mt-6">
                <p className="mb-2 text-sm font-medium text-slate-900">
                  {canOrder ? 'Elige una opción' : 'Opciones'}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {variants.map((v) => {
                    const selected = variant === v.name
                    return (
                      <button
                        key={v.name}
                        type="button"
                        disabled={!canOrder}
                        aria-pressed={selected}
                        onClick={() => setVariant(selected ? undefined : v.name)}
                        className={cn(
                          'flex flex-col items-start rounded-lg border px-3 py-2.5 text-left transition-colors',
                          canOrder ? 'cursor-pointer' : 'cursor-default',
                          selected
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-200 text-slate-800 hover:border-slate-400',
                        )}
                      >
                        <span className="text-sm font-medium">{v.name}</span>
                        <span
                          className={cn(
                            'text-xs tabular-nums',
                            selected ? 'text-white/75' : 'text-slate-500',
                          )}
                        >
                          {formatCurrency(item.price + v.priceModifier)}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {item.description && (
              <div className="mt-6 border-t border-slate-100 pt-5">
                <p className="mb-2 text-sm font-medium text-slate-900">Descripción</p>
                <p className="text-sm leading-relaxed whitespace-pre-line text-slate-600">
                  {item.description}
                </p>
              </div>
            )}
          </div>

          <div className="pb-safe shrink-0 border-t border-slate-100 p-4 sm:px-7">
            {canOrder && !outOfStock ? (
              <>
                <button
                  type="button"
                  disabled={needsVariant}
                  onClick={() => onAdd(variant)}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-slate-800 active:scale-[0.99] disabled:bg-slate-200 disabled:text-slate-400"
                >
                  {needsVariant
                    ? 'Elige una opción'
                    : `Agregar al pedido · ${formatCurrency(price)}`}
                </button>
                {phone && (
                  <a
                    href={waLink(phone, item)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 flex w-full items-center justify-center gap-1.5 py-2 text-xs font-medium text-slate-500 transition-colors hover:text-slate-900"
                  >
                    <MessageCircle size={13} />
                    ¿Dudas? Consúltanos por WhatsApp
                  </a>
                )}
              </>
            ) : phone ? (
              <a
                href={waLink(phone, item)}
                target="_blank"
                rel="noreferrer"
                className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 active:scale-[0.99]"
              >
                <MessageCircle size={16} />
                {outOfStock ? 'Consultar disponibilidad' : 'Pedir por WhatsApp'}
              </a>
            ) : (
              <p className="rounded-lg bg-slate-50 px-4 py-3 text-center text-xs text-slate-500">
                Contacta al negocio para hacer tu pedido.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════ Auxiliares ═══════════════════════════ */

/** Mientras carga se dibuja la forma de la tienda, no un spinner suelto. */
function StoreSkeleton() {
  return (
    <div className="min-h-screen animate-pulse bg-white">
      <div className="h-8 bg-slate-900" />
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <div className="size-9 rounded-lg bg-slate-200" />
        <div className="h-4 w-36 rounded bg-slate-200" />
      </div>
      <div className="border-y border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <div className="h-10 w-72 max-w-full rounded-lg bg-slate-200" />
          <div className="mt-4 h-4 w-96 max-w-full rounded bg-slate-200" />
          <div className="mt-8 h-12 w-40 rounded-lg bg-slate-200" />
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i}>
              <div className="aspect-square w-full rounded-xl bg-slate-200" />
              <div className="mt-3 h-3 w-1/3 rounded bg-slate-100" />
              <div className="mt-2 h-4 w-3/4 rounded bg-slate-200" />
              <div className="mt-2 h-4 w-20 rounded bg-slate-200" />
              <div className="mt-3 h-10 w-full rounded-lg bg-slate-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function EmptyState({ title, hint, action }: { title: string; hint: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-24 text-center">
      <PackageX size={32} className="text-slate-300" />
      <p className="font-medium text-slate-700">{title}</p>
      <p className="max-w-xs text-sm text-slate-400">{hint}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
