import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowDownUp,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Images,
  MessageCircle,
  Minus,
  Package,
  PackageX,
  Plus,
  Search,
  Share2,
  Wrench,
  X,
  Zap,
} from 'lucide-react'
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

/** Alto de la barra fija: las secciones frenan ahí al saltar desde un chip. */
const STICKY_OFFSET = 'scroll-mt-32'

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
  const [sort, setSort] = useState<SortKey>('default')
  const [onlyAvailable, setOnlyAvailable] = useState(false)
  const [showSortMenu, setShowSortMenu] = useState(false)
  const [facets, setFacets] = useState<ActiveFacets>({})
  /** Categoría visible ahora mismo. Solo resalta el chip; no filtra nada. */
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
   * Marca el chip de la categoría que se está viendo. Se observa una franja
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
      { rootMargin: '-140px 0px -70% 0px', threshold: 0 },
    )

    for (const el of sectionEls.current.values()) observer.observe(el)
    return () => observer.disconnect()
  }, [isFlat, categories])

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
    <div className="min-h-screen bg-white">
      <StoreHeader tenant={tenant} productCount={products.length} />

      {/* Barra fija: buscar, ordenar y saltar entre categorías. */}
      {products.length > 0 && (
        <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur-md">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex gap-2 pt-2.5">
              <div className="relative min-w-0 flex-1">
                <Search
                  size={16}
                  className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar en el catálogo"
                  className="w-full rounded-full border-0 bg-slate-100 py-2.5 pr-4 pl-10 text-base ring-1 ring-transparent transition outline-none placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-brand-500 sm:text-sm"
                />
              </div>

              <div className="relative shrink-0">
                <button
                  type="button"
                  aria-label="Ordenar"
                  onClick={() => setShowSortMenu((v) => !v)}
                  className={cn(
                    'flex size-full items-center gap-1.5 rounded-full px-4 text-xs font-semibold transition-colors',
                    sort !== 'default'
                      ? 'bg-brand-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                  )}
                >
                  <ArrowDownUp size={14} />
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
                    <div className="absolute top-full right-0 z-20 mt-2 w-56 overflow-hidden rounded-2xl bg-white py-1.5 shadow-xl ring-1 ring-slate-200">
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

            {/* Una sola fila: categorías (navegan), disponibilidad y filtros. */}
            {(categories.length > 0 || hasTrackedStock || storeFilters.length > 0) && (
              <div className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4 py-2.5 sm:-mx-6 sm:px-6">
                {!isFlat &&
                  categories.map((cat) => (
                    <Chip key={cat} active={currentCategory === cat} onClick={() => jumpTo(cat)}>
                      {cat}
                    </Chip>
                  ))}

                {hasTrackedStock && (
                  <Chip
                    active={onlyAvailable}
                    tone="emerald"
                    onClick={() => setOnlyAvailable((v) => !v)}
                  >
                    Solo disponibles
                  </Chip>
                )}

                {storeFilters.length > 0 &&
                  (categories.length > 0 || hasTrackedStock) && (
                    <span aria-hidden className="h-5 w-px shrink-0 bg-slate-200" />
                  )}

                {/* Filtros configurables del negocio: Talla, Sabor, Color… */}
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

            {activeFilters > 0 && (
              <div className="flex items-center gap-2 pb-2.5">
                <span className="text-xs text-slate-400">
                  {filtered.length} resultado{filtered.length !== 1 && 's'}
                </span>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs font-semibold text-brand-600 hover:underline"
                >
                  Limpiar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* La primera manda como banner; las demás van en tira. */}
        {campaigns.length > 0 && <CampaignHero campaign={campaigns[0]} />}
        {campaigns.length > 1 && <CampaignStrip campaigns={campaigns.slice(1)} />}

        <main className="pb-14">
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
            sections.map((section) => (
              <section
                key={section.label ?? '_flat'}
                data-category={section.label ?? ''}
                ref={(el) => {
                  if (section.label && el) sectionEls.current.set(section.label, el)
                }}
                className={cn('pt-7', STICKY_OFFSET)}
              >
                {section.label && (
                  <div className="mb-4 flex items-baseline gap-2.5">
                    <h2 className="text-xl font-bold tracking-tight text-slate-900">
                      {section.label}
                    </h2>
                    <span className="text-sm font-medium text-slate-400">
                      {section.items.length}
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-x-4 gap-y-7 md:grid-cols-3 lg:grid-cols-4">
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

      <StoreFooter tenant={tenant} />

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

/* ═══════════════════════════ Filtros ═══════════════════════════ */

/**
 * Un desplegable por filtro. Se despliega en vez de listar todos los valores
 * de golpe: con tres filtros de cinco valores la barra fija se comería media
 * pantalla en un celular.
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
  const [open, setOpen] = useState(false)

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          'flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors',
          chosen.length
            ? 'bg-brand-600 text-white'
            : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
        )}
      >
        {filter.name}
        {chosen.length > 0 && (
          <span className="rounded-full bg-white/25 px-1.5 text-[11px] font-bold">
            {chosen.length}
          </span>
        )}
        <ChevronDown size={13} className={cn('transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-10 cursor-default"
          />
          <div className="absolute top-full left-0 z-20 mt-2 min-w-44 overflow-hidden rounded-2xl bg-white p-1.5 shadow-xl ring-1 ring-slate-200">
            {filter.values.map((v) => {
              const on = chosen.includes(v)
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => onToggle(v)}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50"
                >
                  <span
                    className={cn(
                      'flex size-4 shrink-0 items-center justify-center rounded border transition-colors',
                      on ? 'border-brand-600 bg-brand-600' : 'border-slate-300',
                    )}
                  >
                    {on && <Check size={11} className="text-white" />}
                  </span>
                  <span className={on ? 'font-medium text-slate-900' : 'text-slate-700'}>{v}</span>
                </button>
              )
            })}
          </div>
        </>
      )}
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
    <header className="border-b border-slate-200 bg-white">
      {/* El color de marca como acento, no como muro: una franja basta para
          dar identidad sin empujar los productos fuera de pantalla. */}
      <div className="h-1.5 bg-gradient-to-r from-brand-400 via-brand-600 to-brand-700" />

      <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex items-center gap-3.5 sm:gap-4">
          {tenant.logoUrl ? (
            <img
              src={tenant.logoUrl}
              alt={tenant.name}
              className="size-14 shrink-0 rounded-2xl bg-white object-cover ring-1 ring-slate-200 sm:size-16"
            />
          ) : (
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-2xl font-bold text-brand-700 ring-1 ring-brand-200 sm:size-16">
              {tenant.name.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl leading-tight font-bold tracking-tight text-slate-900 sm:text-2xl">
              {tenant.name}
            </h1>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] text-slate-500 sm:text-sm">
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
                    <Clock size={12} />
                    {isOpen ? 'Abierto ahora' : 'Cerrado'}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={share}
              title="Compartir catálogo"
              aria-label="Compartir catálogo"
              className="rounded-full p-2.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              {copied ? <Check size={18} className="text-emerald-600" /> : <Share2 size={18} />}
            </button>

            {tenant.phone && (
              <a
                href={waLink(tenant.phone)}
                target="_blank"
                rel="noreferrer"
                className="hidden items-center gap-2 rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 sm:inline-flex"
              >
                <MessageCircle size={16} />
                Escríbenos
              </a>
            )}
          </div>
        </div>

        {/* En celular el botón va a lo ancho, pero sin robar media pantalla. */}
        {tenant.phone && (
          <a
            href={waLink(tenant.phone)}
            target="_blank"
            rel="noreferrer"
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 py-2.5 text-sm font-semibold text-white transition-colors active:scale-[0.99] sm:hidden"
          >
            <MessageCircle size={15} />
            Escríbenos por WhatsApp
          </a>
        )}
      </div>
    </header>
  )
}

/* ═══════════════════════════ Pie ═══════════════════════════ */

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

/**
 * Cierre con la información que una tienda de verdad muestra: cómo pedir y a
 * qué hora atienden. El horario ya se configuraba en Ajustes pero solo se
 * usaba para el "Abierto ahora"; acá se aprovecha completo.
 */
function StoreFooter({ tenant }: { tenant: Tenant }) {
  const today = new Date().getDay()
  const schedule = tenant.schedule ?? []
  // Lunes primero: el domingo al final se lee más natural que al principio.
  const ordered = schedule.length
    ? [1, 2, 3, 4, 5, 6, 0].map((day) => ({ day, slot: schedule.find((s) => s.day === day) }))
    : []

  return (
    <footer className="mt-4 border-t border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2">
          {/* Contacto */}
          <div>
            <h2 className="text-lg font-bold text-slate-900">¿Te interesó algo?</h2>
            <p className="mt-1 max-w-xs text-sm text-slate-500">
              Escríbenos y coordinamos tu pedido al toque.
            </p>

            {tenant.phone ? (
              <a
                href={waLink(tenant.phone)}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-700 active:scale-[0.98]"
              >
                <MessageCircle size={16} />
                Escríbenos por WhatsApp
              </a>
            ) : (
              <p className="mt-4 text-sm text-slate-400">
                Este negocio aún no publicó un medio de contacto.
              </p>
            )}
          </div>

          {/* Horario de atención */}
          {ordered.length > 0 && (
            <div>
              <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Clock size={15} className="text-slate-400" />
                Horario de atención
              </h2>
              <ul className="mt-3 space-y-1">
                {ordered.map(({ day, slot }) => {
                  const isToday = day === today
                  return (
                    <li
                      key={day}
                      className={cn(
                        'flex items-baseline justify-between gap-4 rounded-lg px-2.5 py-1.5 text-sm',
                        isToday ? 'bg-white font-semibold text-slate-900 ring-1 ring-slate-200' : '',
                      )}
                    >
                      <span className={isToday ? '' : 'text-slate-600'}>
                        {DAY_NAMES[day]}
                        {isToday && (
                          <span className="ml-1.5 text-[11px] font-medium text-brand-600">hoy</span>
                        )}
                      </span>
                      <span className={cn('tabular-nums', slot ? 'text-slate-700' : 'text-slate-400')}>
                        {slot ? `${slot.open} – ${slot.close}` : 'Cerrado'}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </div>

        <p className="mt-10 border-t border-slate-200 pt-6 text-center text-xs text-slate-400">
          {tenant.name} · hecho con <span className="font-medium text-slate-500">uTracker</span>
        </p>
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
  const images = campaign.items.map((i) => i.imageUrl).filter(Boolean).slice(0, 4) as string[]
  const box = large ? 'size-40' : 'size-20'
  const radius = large ? 'rounded-2xl' : 'rounded-xl'

  if (images.length === 0) {
    return (
      <div
        className={cn(
          'flex shrink-0 items-center justify-center bg-white/15 ring-1 ring-white/20',
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
        className={cn('shrink-0 object-cover', box, radius, large && 'ring-2 ring-white/25')}
      />
    )
  }

  return (
    <div
      className={cn(
        'grid shrink-0 gap-px overflow-hidden bg-white/20',
        box,
        radius,
        large && 'ring-2 ring-white/25',
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
      className="group relative mt-6 flex items-center gap-5 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-5 shadow-lg shadow-brand-900/15 transition-transform hover:-translate-y-0.5 sm:gap-7 sm:p-7"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 -right-10 size-56 rounded-full bg-white/10 blur-2xl"
      />

      <div className="relative min-w-0 flex-1">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold tracking-wide text-white uppercase ring-1 ring-white/25 backdrop-blur-sm">
          {isLive ? (
            <>
              <span className="size-1.5 animate-pulse rounded-full bg-emerald-300" />
              Venta en vivo
            </>
          ) : (
            <>
              <Zap size={11} />
              Reserva anticipada
            </>
          )}
        </span>

        <h2 className="mt-2.5 text-2xl leading-tight font-bold tracking-tight text-white sm:text-3xl">
          {campaign.name}
        </h2>
        {campaign.description && (
          <p className="mt-1.5 line-clamp-2 max-w-md text-sm text-white/70">
            {campaign.description}
          </p>
        )}

        {/* Prueba social: cuánto se lleva vendido. */}
        {total > 0 && (
          <div className="mt-4 max-w-xs">
            <div className="flex items-baseline justify-between text-xs text-white/70">
              <span>{sold > 0 ? `${sold} vendidos` : 'Sé el primero'}</span>
              <span>{left} disponibles</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-white transition-all duration-700"
                style={{ width: `${Math.max(pct, sold > 0 ? 4 : 0)}%` }}
              />
            </div>
          </div>
        )}

        <span className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-brand-700 transition-transform group-hover:gap-3">
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
    <section className="pt-6">
      <h2 className="mb-3 flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900">
        <span className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm shadow-orange-500/30">
          <Zap size={15} className="text-white" />
        </span>
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
              className="group flex w-72 shrink-0 items-center gap-3.5 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200 transition-all hover:-translate-y-0.5 hover:shadow-md hover:ring-brand-300"
            >
              <CampaignThumb campaign={c} />

              <div className="flex min-w-0 flex-1 flex-col gap-1">
                {isLive ? (
                  <span className="inline-flex w-fit items-center gap-1 rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 uppercase">
                    <span className="size-1 animate-pulse rounded-full bg-emerald-500" />
                    En vivo
                  </span>
                ) : isDraft ? (
                  <span className="w-fit rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500 uppercase">
                    Pronto
                  </span>
                ) : (
                  <span className="w-fit rounded-md bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold text-violet-700 uppercase">
                    Reserva ya
                  </span>
                )}

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
                className="shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-500"
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
  const photos = item.images?.length ?? 0
  const lowStock =
    !outOfStock && item.kind === 'product' && item.trackStock && (item.stock ?? 0) <= 3

  // Con variantes el precio base es un "desde": la más barata manda.
  const cheapestModifier = item.variants?.length
    ? Math.min(...item.variants.map((v) => v.priceModifier))
    : 0
  const fromPrice = item.price + Math.min(0, cheapestModifier)
  const showsRange = item.variants?.length > 0

  return (
    <article className="group flex flex-col">
      {/* La foto manda: es lo que antoja. */}
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Ver ${item.name}`}
        className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-900/5 focus:ring-2 focus:ring-brand-500 focus:outline-none"
      >
        {item.images?.[0] ? (
          <>
            <img
              src={item.images[0]}
              alt={item.name}
              loading="lazy"
              className={cn(
                'size-full object-cover transition-transform duration-700 group-hover:scale-105',
                outOfStock && 'grayscale',
              )}
            />
            {/* Truco clásico de e-commerce: la segunda foto aparece al pasar
                el mouse, así se ve el producto desde otro ángulo sin clic. */}
            {item.images[1] && !outOfStock && (
              <img
                src={item.images[1]}
                alt=""
                aria-hidden
                loading="lazy"
                className="absolute inset-0 size-full scale-105 object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              />
            )}
          </>
        ) : (
          <span className="flex size-full items-center justify-center bg-gradient-to-br from-slate-50 to-slate-200 text-slate-300">
            {isService ? <Wrench size={32} /> : <Package size={32} />}
          </span>
        )}

        {outOfStock && (
          <span className="absolute inset-0 flex items-center justify-center bg-white/55">
            <span className="rounded-full bg-slate-900/85 px-3 py-1 text-[11px] font-bold tracking-wide text-white uppercase">
              Agotado
            </span>
          </span>
        )}

        {/* Etiquetas: a la izquierda lo que urge, a la derecha lo informativo. */}
        <div className="absolute top-2.5 left-2.5 flex flex-col items-start gap-1.5">
          {lowStock && (
            <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white uppercase shadow-sm">
              Últimas {item.stock}
            </span>
          )}
          {isService && (
            <span className="rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-slate-700 uppercase backdrop-blur-sm">
              Servicio
            </span>
          )}
          {(item.preparationDays ?? 0) > 0 && !outOfStock && (
            <span className="flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-amber-700 backdrop-blur-sm">
              <Clock size={9} />
              {item.preparationDays}d de preparación
            </span>
          )}
        </div>

        {photos > 1 && (
          <span className="absolute top-2.5 right-2.5 flex items-center gap-1 rounded-full bg-black/45 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
            <Images size={11} />
            {photos}
          </span>
        )}

        {/* Acceso rápido al detalle, que en desktop no se descubre solo. */}
        <span className="pointer-events-none absolute inset-x-2.5 bottom-2.5 hidden translate-y-2 rounded-xl bg-white/95 py-2 text-center text-xs font-semibold text-slate-800 opacity-0 shadow-sm backdrop-blur transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 sm:block">
          Ver detalle
        </span>
      </button>

      {/* Datos: el precio es lo segundo que se mira. */}
      <div className="mt-3 flex min-w-0 flex-1 flex-col">
        <button
          type="button"
          onClick={onOpen}
          className="line-clamp-1 text-left font-semibold text-slate-900 transition-colors hover:text-brand-600 focus:outline-none"
        >
          {item.name}
        </button>

        {item.description && (
          <p className="mt-0.5 line-clamp-1 text-[13px] text-slate-500">{item.description}</p>
        )}

        <div className="mt-2 flex items-end justify-between gap-2">
          <div className="min-w-0">
            <p className="flex items-baseline gap-1 text-lg leading-none font-bold text-slate-900">
              {showsRange && (
                <span className="text-[11px] font-medium text-slate-400">desde</span>
              )}
              {formatCurrency(fromPrice)}
            </p>
            {item.pricingMode === 'quoted' && (
              <p className="mt-1 text-[11px] font-medium text-amber-600">referencial</p>
            )}
          </div>

          {/* Sin compra en línea se mantiene el camino por WhatsApp. */}
          {!canOrder && phone && (
            <a
              href={waLink(phone, item)}
              target="_blank"
              rel="noreferrer"
              aria-label={`Consultar ${item.name} por WhatsApp`}
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white transition-all hover:bg-emerald-700 active:scale-95"
            >
              <MessageCircle size={13} />
              {outOfStock ? 'Consultar' : 'Pedir'}
            </a>
          )}

          {canOrder &&
            (outOfStock ? (
              <span className="shrink-0 rounded-full bg-slate-100 px-3.5 py-2 text-xs font-semibold text-slate-400">
                Agotado
              </span>
            ) : inCart > 0 ? (
              <div className="flex shrink-0 items-center gap-0.5 rounded-full bg-brand-600 p-0.5">
                <button
                  type="button"
                  aria-label={`Quitar ${item.name}`}
                  onClick={() => onChangeQty(-1)}
                  className="flex size-7 items-center justify-center rounded-full text-white transition-colors hover:bg-white/20 active:scale-90"
                >
                  <Minus size={13} />
                </button>
                <span className="w-4 text-center text-xs font-bold tabular-nums text-white">
                  {inCart}
                </span>
                <button
                  type="button"
                  aria-label={`Agregar ${item.name}`}
                  disabled={item.trackStock && inCart >= (item.stock ?? 0)}
                  onClick={() => onChangeQty(1)}
                  className="flex size-7 items-center justify-center rounded-full text-white transition-colors hover:bg-white/20 active:scale-90 disabled:opacity-40"
                >
                  <Plus size={13} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                aria-label={`Agregar ${item.name} al pedido`}
                // Con variantes hay que elegir una antes: lo resuelve el detalle.
                onClick={() => (showsRange ? onOpen() : onAdd())}
                className="flex shrink-0 items-center gap-1.5 rounded-full bg-brand-600 px-3.5 py-2 text-xs font-semibold text-white transition-all hover:bg-brand-700 active:scale-95"
              >
                <Plus size={13} />
                Agregar
              </button>
            ))}
        </div>
      </div>
    </article>
  )
}

/* ═══════════════════════════ Detalle ═══════════════════════════ */

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
  // Con variantes el precio depende de cuál elija: no se puede agregar a ciegas.
  const needsVariant = (item.variants?.length ?? 0) > 0 && !variant

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
        className="animate-sheet flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
      >
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="relative">
            {images[active] ? (
              <button
                type="button"
                onClick={() => onZoom(images, images[active])}
                className="block aspect-square w-full overflow-hidden bg-slate-100 focus:outline-none"
              >
                <img src={images[active]} alt={item.name} className="size-full object-cover" />
              </button>
            ) : (
              <div className="flex aspect-square w-full items-center justify-center bg-gradient-to-br from-slate-50 to-slate-200 text-slate-300">
                {isService ? <Wrench size={44} /> : <Package size={44} />}
              </div>
            )}

            <button
              type="button"
              aria-label="Cerrar"
              onClick={onClose}
              className="absolute top-3.5 right-3.5 rounded-full bg-white/90 p-2 text-slate-600 shadow-sm backdrop-blur transition-colors hover:bg-white hover:text-slate-900"
            >
              <X size={18} />
            </button>

            {outOfStock && (
              <span className="absolute bottom-3.5 left-3.5 rounded-full bg-slate-900/85 px-3 py-1 text-xs font-semibold text-white">
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
                    'size-14 shrink-0 overflow-hidden rounded-xl transition-all',
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

            <h2 className="text-2xl font-bold tracking-tight text-slate-900">{item.name}</h2>

            <p className="mt-2 text-3xl font-bold text-slate-900">{formatCurrency(item.price)}</p>
            {item.pricingMode === 'quoted' && (
              <p className="mt-1 text-xs text-amber-600">
                Precio referencial — el final se acuerda según el trabajo.
              </p>
            )}

            {item.description && (
              <p className="mt-4 text-sm leading-relaxed whitespace-pre-line text-slate-600">
                {item.description}
              </p>
            )}

            {item.variants && item.variants.length > 0 && (
              <div className="mt-5">
                <p className="mb-1.5 text-xs font-semibold tracking-wide text-slate-400 uppercase">
                  {canOrder ? 'Elige una opción' : 'Variantes'}
                </p>
                <ul className="space-y-1.5">
                  {item.variants.map((v) => {
                    const selected = variant === v.name
                    return (
                      <li key={v.name}>
                        <button
                          type="button"
                          disabled={!canOrder}
                          aria-pressed={selected}
                          onClick={() => setVariant(selected ? undefined : v.name)}
                          className={cn(
                            'flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm transition-colors',
                            canOrder ? 'cursor-pointer' : 'cursor-default',
                            selected
                              ? 'bg-brand-50 ring-2 ring-brand-500'
                              : 'bg-slate-50 ring-1 ring-transparent hover:bg-slate-100',
                          )}
                        >
                          <span
                            className={cn(selected ? 'font-medium text-brand-800' : 'text-slate-700')}
                          >
                            {v.name}
                          </span>
                          <span className="font-semibold tabular-nums text-slate-900">
                            {formatCurrency(item.price + v.priceModifier)}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="pb-safe shrink-0 border-t border-slate-100 p-4">
          {canOrder && !outOfStock ? (
            <>
              <button
                type="button"
                disabled={needsVariant}
                onClick={() => onAdd(variant)}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-600 px-4 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 active:scale-[0.99] disabled:bg-slate-200 disabled:text-slate-400"
              >
                <Plus size={16} />
                {needsVariant ? 'Elige una opción' : 'Agregar al pedido'}
              </button>
              {phone && (
                <a
                  href={waLink(phone, item)}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 flex w-full items-center justify-center gap-1.5 py-2 text-xs font-medium text-slate-500 transition-colors hover:text-emerald-700"
                >
                  <MessageCircle size={13} />
                  O consúltanos por WhatsApp
                </a>
              )}
            </>
          ) : phone ? (
            <a
              href={waLink(phone, item)}
              target="_blank"
              rel="noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 active:scale-[0.99]"
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
        'shrink-0 rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors',
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

/** Mientras carga se dibuja la forma del catálogo, no un spinner suelto. */
function StoreSkeleton() {
  return (
    <div className="min-h-screen animate-pulse bg-white">
      <div className="h-1.5 bg-slate-200" />
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex items-center gap-4 py-5">
          <div className="size-14 shrink-0 rounded-2xl bg-slate-200 sm:size-16" />
          <div className="min-w-0 flex-1">
            <div className="h-6 w-44 rounded-lg bg-slate-200" />
            <div className="mt-2 h-3.5 w-28 rounded bg-slate-100" />
          </div>
        </div>
        <div className="h-10 w-full rounded-full bg-slate-100" />

        <div className="mt-7 grid grid-cols-2 gap-x-4 gap-y-7 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i}>
              <div className="aspect-[4/5] w-full rounded-2xl bg-slate-200" />
              <div className="mt-3 h-4 w-3/4 rounded bg-slate-200" />
              <div className="mt-2 h-3 w-1/2 rounded bg-slate-100" />
              <div className="mt-2.5 h-5 w-20 rounded bg-slate-200" />
            </div>
          ))}
        </div>
      </div>
    </div>
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
