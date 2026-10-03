import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronLeft,
  Eye,
  ListFilter,
  Package,
  Plus,
  Search,
  Tag,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import {
  createProductFilter,
  deleteProductFilter,
  listProductFilters,
  updateProductFilter,
} from '@/api/productFilters'
import { listProducts, updateProduct } from '@/api/products'
import { apiErrorMessage } from '@/api/client'
import { Alert, Button, Card, IconButton, Input, PageHeader, Spinner } from '@/components/ui'
import { cn } from '@/lib/cn'
import type { Product, ProductFilter } from '@/types'

/**
 * Atajos para arrancar: el dueño rara vez sabe qué filtros necesita hasta que
 * ve un ejemplo de su propio rubro.
 */
const TEMPLATES: { label: string; icon: string; filters: { name: string; values: string[] }[] }[] = [
  {
    label: 'Ropa',
    icon: '👕',
    filters: [
      { name: 'Talla', values: ['XS', 'S', 'M', 'L', 'XL'] },
      { name: 'Color', values: ['Negro', 'Blanco', 'Azul', 'Rojo'] },
    ],
  },
  {
    label: 'Comida',
    icon: '🍰',
    filters: [
      { name: 'Sabor', values: ['Fresa', 'Chocolate', 'Vainilla'] },
      { name: 'Tamaño', values: ['Personal', 'Mediano', 'Familiar'] },
    ],
  },
  {
    label: 'Calzado',
    icon: '👟',
    filters: [
      { name: 'Talla', values: ['36', '37', '38', '39', '40', '41', '42'] },
      { name: 'Material', values: ['Cuero', 'Tela', 'Sintético'] },
    ],
  },
  {
    label: 'Accesorios',
    icon: '💍',
    filters: [
      { name: 'Material', values: ['Plata', 'Oro', 'Acero'] },
      { name: 'Ocasión', values: ['Diario', 'Fiesta', 'Regalo'] },
    ],
  },
]

/** Cuántos productos usan cada filtro y cada uno de sus valores. */
function useFilterUsage(products: Product[] | undefined) {
  return useMemo(() => {
    const byFilter = new Map<string, number>()
    const byValue = new Map<string, number>()

    for (const p of products ?? []) {
      for (const attr of p.attributes ?? []) {
        if (!attr.values.length) continue
        byFilter.set(attr.filter, (byFilter.get(attr.filter) ?? 0) + 1)
        for (const v of attr.values) {
          byValue.set(`${attr.filter}::${v}`, (byValue.get(`${attr.filter}::${v}`) ?? 0) + 1)
        }
      }
    }
    return { byFilter, byValue }
  }, [products])
}

/* ═══════════════ Vista previa de la tienda ═══════════════ */

/**
 * Réplica estática de la barra de filtros pública. El concepto es abstracto
 * hasta que el dueño ve el resultado; esto lo vuelve concreto sin que tenga
 * que abrir su tienda en otra pestaña.
 */
function StorePreview({ filters }: { filters: ProductFilter[] }) {
  const usable = filters.filter((f) => f.values.length > 0)

  return (
    <Card>
      <div className="mb-3 flex items-center gap-2">
        <Eye size={16} className="text-slate-400" />
        <h2 className="text-sm font-semibold text-slate-800">Así lo verán tus clientes</h2>
      </div>

      <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
        {usable.length === 0 ? (
          <p className="py-3 text-center text-sm text-slate-400">
            Agrega valores a tus filtros y aparecerán acá.
          </p>
        ) : (
          <>
            {/* Barra tal como sale en la tienda */}
            <div className="flex flex-wrap gap-2">
              {usable.map((f, i) => (
                <span
                  key={f._id}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[13px] font-medium',
                    i === 0 ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-600',
                  )}
                >
                  {f.name}
                  {i === 0 && (
                    <span className="rounded-full bg-white/25 px-1.5 text-[11px] font-bold">1</span>
                  )}
                  <ChevronDown size={13} />
                </span>
              ))}
            </div>

            {/* Despliegue del primero, para mostrar los valores */}
            {usable[0] && (
              <div className="mt-2.5 w-fit min-w-44 rounded-2xl bg-white p-1.5 shadow-lg ring-1 ring-slate-200">
                {usable[0].values.slice(0, 5).map((v, i) => (
                  <div
                    key={v}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm"
                  >
                    <span
                      className={cn(
                        'flex size-4 shrink-0 items-center justify-center rounded border',
                        i === 0 ? 'border-brand-600 bg-brand-600' : 'border-slate-300',
                      )}
                    >
                      {i === 0 && <Check size={11} className="text-white" />}
                    </span>
                    <span className={i === 0 ? 'font-medium text-slate-900' : 'text-slate-700'}>
                      {v}
                    </span>
                  </div>
                ))}
                {usable[0].values.length > 5 && (
                  <p className="px-3 py-1 text-xs text-slate-400">
                    +{usable[0].values.length - 5} más
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  )
}

/* ═══════════════ Asignación masiva ═══════════════ */

/**
 * Asigna un filtro a todos los productos desde una sola pantalla.
 *
 * Es la diferencia entre que esto sea útil o no: sin esto hay que entrar a
 * editar cada producto uno por uno para ponerle su talla.
 */
function AssignDialog({
  filter,
  products,
  onClose,
}: {
  filter: ProductFilter
  products: Product[]
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)

  const save = useMutation({
    mutationFn: async ({ product, values }: { product: Product; values: string[] }) => {
      // Se conservan los atributos de los otros filtros: acá solo toca el suyo.
      const others = (product.attributes ?? []).filter((a) => a.filter !== filter._id)
      const next = values.length ? [...others, { filter: filter._id, values }] : others
      return updateProduct(product._id, { attributes: next })
    },
    onMutate: ({ product }) => setSavingId(product._id),
    onSettled: () => setSavingId(null),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })

  const q = search.trim().toLowerCase()
  const visible = q
    ? products.filter(
        (p) => p.name.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q),
      )
    : products

  const assignedCount = products.filter((p) =>
    p.attributes?.some((a) => a.filter === filter._id && a.values.length),
  ).length

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 sm:items-center sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Asignar ${filter.name}`}
        className="flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
      >
        <div className="shrink-0 border-b border-slate-100 p-5">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="font-bold text-slate-900">Asignar «{filter.name}»</h2>
              <p className="mt-0.5 text-sm text-slate-500">
                Marca los valores que le corresponden a cada producto. Se guarda solo.
              </p>
            </div>
            <IconButton label="Cerrar" onClick={onClose} className="shrink-0">
              <X size={18} />
            </IconButton>
          </div>

          <div className="relative mt-3">
            <Search
              size={15}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar producto..."
              className="w-full rounded-lg bg-slate-100 py-2 pr-3 pl-9 text-sm outline-none placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <p className="mt-2.5 text-xs text-slate-500">
            {assignedCount} de {products.length} productos ya tienen {filter.name.toLowerCase()}
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {visible.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-400">Ningún producto coincide.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {visible.map((p) => {
                const current =
                  p.attributes?.find((a) => a.filter === filter._id)?.values ?? []
                const busy = savingId === p._id

                return (
                  <li key={p._id} className={cn('flex gap-3 p-4', busy && 'opacity-60')}>
                    {p.images?.[0] ? (
                      <img
                        src={p.images[0]}
                        alt=""
                        className="size-12 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-300">
                        <Package size={18} />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{p.name}</p>
                      {p.category && (
                        <p className="truncate text-xs text-slate-400">{p.category}</p>
                      )}

                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {filter.values.map((v) => {
                          const on = current.includes(v)
                          return (
                            <button
                              key={v}
                              type="button"
                              aria-pressed={on}
                              disabled={busy}
                              onClick={() =>
                                save.mutate({
                                  product: p,
                                  values: on
                                    ? current.filter((x) => x !== v)
                                    : [...current, v],
                                })
                              }
                              className={cn(
                                'rounded-full px-3 py-1 text-xs font-medium transition-colors disabled:cursor-wait',
                                on
                                  ? 'bg-brand-600 text-white'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                              )}
                            >
                              {v}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="shrink-0 border-t border-slate-100 p-4">
          {save.isError && (
            <div className="mb-3">
              <Alert>{apiErrorMessage(save.error)}</Alert>
            </div>
          )}
          <Button className="w-full" onClick={onClose}>
            Listo
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════ Tarjeta de un filtro ═══════════════ */

function FilterCard({
  filter,
  index,
  total,
  usage,
  productCount,
  onMove,
  onAssign,
}: {
  filter: ProductFilter
  index: number
  total: number
  usage: { byFilter: Map<string, number>; byValue: Map<string, number> }
  productCount: number
  onMove: (dir: -1 | 1) => void
  onAssign: () => void
}) {
  const qc = useQueryClient()
  const [name, setName] = useState(filter.name)
  const [newValue, setNewValue] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['product-filters'] })
    qc.invalidateQueries({ queryKey: ['products'] })
  }

  const save = useMutation({
    mutationFn: (payload: { name?: string; values?: string[] }) =>
      updateProductFilter(filter._id, payload),
    onSuccess: invalidate,
  })

  const remove = useMutation({
    mutationFn: () => deleteProductFilter(filter._id),
    onSuccess: invalidate,
  })

  function addValue() {
    const value = newValue.trim()
    if (!value) return
    if (filter.values.some((v) => v.toLowerCase() === value.toLowerCase())) {
      setNewValue('')
      return
    }
    save.mutate({ values: [...filter.values, value] })
    setNewValue('')
  }

  const used = usage.byFilter.get(filter._id) ?? 0
  const ready = filter.values.length > 0 && used > 0

  return (
    <Card>
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'mt-1 flex size-10 shrink-0 items-center justify-center rounded-xl',
            ready ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600',
          )}
        >
          {ready ? <Check size={18} /> : <ListFilter size={17} />}
        </span>

        <div className="min-w-0 flex-1">
          <Input
            aria-label="Nombre del filtro"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => {
              const next = name.trim()
              if (next && next !== filter.name) save.mutate({ name: next })
              else setName(filter.name)
            }}
            className="text-base font-semibold"
          />
          <p className="mt-1.5 text-xs text-slate-500">
            {filter.values.length} {filter.values.length === 1 ? 'valor' : 'valores'}
            {' · '}
            {used === 0 ? (
              <span className="font-medium text-amber-600">en ningún producto</span>
            ) : (
              <span className="font-medium text-emerald-600">
                en {used} {used === 1 ? 'producto' : 'productos'}
              </span>
            )}
          </p>
        </div>

        {/* Orden en que los ve el cliente */}
        <div className="flex shrink-0 flex-col">
          <button
            type="button"
            aria-label="Subir"
            disabled={index === 0}
            onClick={() => onMove(-1)}
            className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-25 disabled:hover:bg-transparent"
          >
            <ArrowUp size={14} />
          </button>
          <button
            type="button"
            aria-label="Bajar"
            disabled={index === total - 1}
            onClick={() => onMove(1)}
            className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-25 disabled:hover:bg-transparent"
          >
            <ArrowDown size={14} />
          </button>
        </div>

        {!confirmDelete ? (
          <IconButton
            label={`Eliminar ${filter.name}`}
            onClick={() => setConfirmDelete(true)}
            className="shrink-0 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 size={15} />
          </IconButton>
        ) : (
          <div className="flex shrink-0 items-center gap-1.5 rounded-lg bg-red-50 px-2.5 py-1.5 ring-1 ring-red-200">
            <span className="text-xs text-red-700">
              {used > 0 ? `Se quita de ${used} prod.` : '¿Seguro?'}
            </span>
            <button
              type="button"
              onClick={() => remove.mutate()}
              disabled={remove.isPending}
              className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-50"
            >
              {remove.isPending ? '...' : 'Sí'}
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="text-xs text-slate-500 hover:underline"
            >
              No
            </button>
          </div>
        )}
      </div>

      {/* Valores */}
      <div className="mt-4 border-t border-slate-100 pt-4">
        <p className="mb-2 text-xs font-semibold tracking-wide text-slate-400 uppercase">
          Valores que acepta
        </p>

        <div className="flex flex-wrap items-center gap-1.5">
          {filter.values.map((v) => {
            const count = usage.byValue.get(`${filter._id}::${v}`) ?? 0
            return (
              <span
                key={v}
                title={
                  count === 0
                    ? 'Ningún producto usa este valor'
                    : `${count} producto${count === 1 ? '' : 's'}`
                }
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full py-1 pr-1.5 pl-3 text-xs font-medium ring-1',
                  count > 0
                    ? 'bg-white text-slate-700 ring-slate-200'
                    : 'bg-slate-50 text-slate-400 ring-slate-200',
                )}
              >
                {v}
                {count > 0 && (
                  <span className="rounded-full bg-slate-100 px-1.5 text-[10px] font-bold text-slate-500">
                    {count}
                  </span>
                )}
                <button
                  type="button"
                  aria-label={`Quitar ${v}`}
                  onClick={() => save.mutate({ values: filter.values.filter((x) => x !== v) })}
                  className="rounded-full p-0.5 transition-colors hover:bg-slate-200 hover:text-red-600"
                >
                  <X size={11} />
                </button>
              </span>
            )
          })}

          <input
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addValue()
              }
            }}
            onBlur={addValue}
            placeholder="+ agregar valor"
            aria-label={`Nuevo valor para ${filter.name}`}
            className="w-32 rounded-full bg-slate-50 px-3 py-1.5 text-xs ring-1 ring-slate-200 outline-none placeholder:text-slate-400 focus:w-40 focus:bg-white focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {filter.values.length === 0 ? (
          <p className="mt-3 text-xs text-amber-600">
            Sin valores no aparece en tu tienda. Agrega al menos uno.
          </p>
        ) : (
          <div className="mt-3.5 flex items-center gap-3">
            <Button size="sm" variant="secondary" onClick={onAssign} disabled={productCount === 0}>
              <Users size={14} />
              Asignar a productos
            </Button>
            {used === 0 && productCount > 0 && (
              <span className="text-xs text-amber-600">
                Falta este paso para que aparezca en la tienda
              </span>
            )}
          </div>
        )}

        {save.isError && <p className="mt-2 text-xs text-red-600">{apiErrorMessage(save.error)}</p>}
        {remove.isError && (
          <p className="mt-2 text-xs text-red-600">{apiErrorMessage(remove.error)}</p>
        )}
      </div>
    </Card>
  )
}

/* ═══════════════ Página ═══════════════ */

export function CatalogFiltersPage() {
  const qc = useQueryClient()
  const { data: filters, isLoading } = useQuery({
    queryKey: ['product-filters'],
    queryFn: listProductFilters,
  })
  const { data: products } = useQuery({ queryKey: ['products'], queryFn: listProducts })
  const usage = useFilterUsage(products)

  const [newName, setNewName] = useState('')
  const [assigning, setAssigning] = useState<ProductFilter | null>(null)

  const add = useMutation({
    mutationFn: (name: string) => createProductFilter({ name, values: [] }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['product-filters'] })
      setNewName('')
    },
  })

  const applyTemplate = useMutation({
    mutationFn: async (tpl: (typeof TEMPLATES)[number]) => {
      const existing = new Set((filters ?? []).map((f) => f.name.toLowerCase()))
      for (const f of tpl.filters) {
        if (existing.has(f.name.toLowerCase())) continue
        await createProductFilter(f)
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['product-filters'] }),
  })

  // El orden se guarda como posición; mover es reescribir las de toda la lista.
  const reorder = useMutation({
    mutationFn: async ({ from, to }: { from: number; to: number }) => {
      const list = [...(filters ?? [])]
      const [moved] = list.splice(from, 1)
      list.splice(to, 0, moved)
      await Promise.all(list.map((f, i) => updateProductFilter(f._id, { position: i })))
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['product-filters'] }),
  })

  const list = filters ?? []
  const withValues = list.filter((f) => f.values.length > 0)
  const assigned = list.filter((f) => (usage.byFilter.get(f._id) ?? 0) > 0)
  const productCount = products?.length ?? 0

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/catalog"
          className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition-colors hover:text-slate-800"
        >
          <ChevronLeft size={15} />
          Catálogo
        </Link>
        <PageHeader
          title="Filtros del catálogo"
          description="Los atributos con los que tus clientes acotan la búsqueda en tu tienda: Talla, Sabor, Color… Tú defines cuáles existen y qué valores aceptan."
        />
      </div>

      {isLoading ? (
        <Spinner />
      ) : (
        <>
          {/* Los tres pasos, con el estado real de cada uno. */}
          {list.length > 0 && (
            <Steps
              created={list.length}
              withValues={withValues.length}
              assigned={assigned.length}
            />
          )}

          {/* Qué es esto, en una línea con ejemplo visual. */}
          <ConceptCard />

          {/* Crear */}
          <Card>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                if (newName.trim()) add.mutate(newName.trim())
              }}
            >
              <Input
                placeholder="Nombre del filtro: Talla, Sabor, Color..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <Button type="submit" disabled={!newName.trim() || add.isPending}>
                <Plus size={15} />
                {add.isPending ? 'Creando...' : 'Crear filtro'}
              </Button>
            </form>
            {add.isError && (
              <p className="mt-2 text-xs text-red-600">{apiErrorMessage(add.error)}</p>
            )}
          </Card>

          {/* Lista o vacío */}
          {list.length === 0 ? (
            <Card>
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <span className="flex size-12 items-center justify-center rounded-full bg-slate-100">
                  <ListFilter size={22} className="text-slate-400" />
                </span>
                <div>
                  <p className="font-medium text-slate-700">Todavía no tienes filtros</p>
                  <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
                    Créalos arriba, o empieza con un juego listo según tu rubro y edítalo a tu
                    gusto.
                  </p>
                </div>

                <div className="mt-2 flex flex-wrap justify-center gap-2">
                  {TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.label}
                      type="button"
                      disabled={applyTemplate.isPending}
                      onClick={() => applyTemplate.mutate(tpl)}
                      className="flex items-center gap-2 rounded-xl bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-700 ring-1 ring-slate-200 transition-colors hover:bg-white hover:ring-brand-400 disabled:opacity-50"
                    >
                      <span aria-hidden>{tpl.icon}</span>
                      {tpl.label}
                      <span className="text-xs font-normal text-slate-400">
                        {tpl.filters.map((f) => f.name).join(' · ')}
                      </span>
                    </button>
                  ))}
                </div>

                {applyTemplate.isError && <Alert>{apiErrorMessage(applyTemplate.error)}</Alert>}
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {list.map((f, i) => (
                <FilterCard
                  key={f._id}
                  filter={f}
                  index={i}
                  total={list.length}
                  usage={usage}
                  productCount={productCount}
                  onMove={(dir) => reorder.mutate({ from: i, to: i + dir })}
                  onAssign={() => setAssigning(f)}
                />
              ))}
            </div>
          )}

          {/* Vista previa */}
          {list.length > 0 && <StorePreview filters={list} />}
        </>
      )}

      {assigning && products && (
        <AssignDialog
          filter={assigning}
          products={products}
          onClose={() => setAssigning(null)}
        />
      )}
    </div>
  )
}

/* ═══════════════ Piezas de apoyo ═══════════════ */

/** Los tres pasos del flujo, cada uno con su estado real. */
function Steps({
  created,
  withValues,
  assigned,
}: {
  created: number
  withValues: number
  assigned: number
}) {
  const steps = [
    { n: 1, label: 'Crea los filtros', done: created > 0, detail: `${created} creados` },
    {
      n: 2,
      label: 'Dales valores',
      done: withValues === created && created > 0,
      detail: `${withValues} de ${created}`,
    },
    {
      n: 3,
      label: 'Asígnalos a productos',
      done: assigned === created && created > 0,
      detail: `${assigned} de ${created}`,
    },
  ]

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {steps.map((s) => (
        <div
          key={s.n}
          className={cn(
            'flex items-center gap-3 rounded-xl p-4 ring-1',
            s.done ? 'bg-emerald-50 ring-emerald-200' : 'bg-white ring-slate-200',
          )}
        >
          <span
            className={cn(
              'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
              s.done ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600',
            )}
          >
            {s.done ? <Check size={14} /> : s.n}
          </span>
          <div className="min-w-0">
            <p
              className={cn(
                'text-sm font-semibold',
                s.done ? 'text-emerald-900' : 'text-slate-800',
              )}
            >
              {s.label}
            </p>
            <p className={cn('text-xs', s.done ? 'text-emerald-700' : 'text-slate-500')}>
              {s.detail}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

/** Categoría vs filtro, mostrado en vez de explicado. */
function ConceptCard() {
  return (
    <Card>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Tag size={15} className="text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-800">Categoría</h3>
            <span className="text-xs text-slate-400">parte el catálogo</span>
          </div>
          <div className="space-y-1.5 rounded-xl bg-slate-50 p-3 text-xs ring-1 ring-slate-200">
            <p className="font-semibold text-slate-700">Ropa</p>
            <p className="pl-3 text-slate-500">· Polo básico</p>
            <p className="pl-3 text-slate-500">· Casaca jean</p>
            <p className="pt-1 font-semibold text-slate-700">Zapatos</p>
            <p className="pl-3 text-slate-500">· Zapatilla urbana</p>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Un producto está en <strong>una</strong> categoría. Arma las secciones de tu tienda.
          </p>
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2">
            <ListFilter size={15} className="text-brand-500" />
            <h3 className="text-sm font-semibold text-slate-800">Filtro</h3>
            <span className="text-xs text-slate-400">lo cruza</span>
          </div>
          <div className="space-y-2 rounded-xl bg-brand-50/60 p-3 text-xs ring-1 ring-brand-200">
            <p className="font-semibold text-slate-700">Polo básico</p>
            <div className="flex flex-wrap gap-1">
              <span className="rounded-full bg-white px-2 py-0.5 text-slate-600 ring-1 ring-slate-200">
                Talla: M
              </span>
              <span className="rounded-full bg-white px-2 py-0.5 text-slate-600 ring-1 ring-slate-200">
                Color: Azul
              </span>
            </div>
            <p className="pt-1 text-slate-500">
              El cliente pide «Talla M» y ve todo lo que haya en M, sin importar la sección.
            </p>
          </div>
          <p className="mt-2 flex items-center gap-1 text-xs text-slate-500">
            Un producto puede tener <strong>varios</strong> filtros
            <ArrowRight size={11} />
            <span>y varios valores en cada uno.</span>
          </p>
        </div>
      </div>
    </Card>
  )
}
