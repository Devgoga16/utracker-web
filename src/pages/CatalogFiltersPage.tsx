import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ListFilter,
  Package,
  Plus,
  Search,
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

/** Juegos listos por rubro: solo se ofrecen cuando no hay ningún filtro. */
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

/* ═════════ Asignación masiva ═════════ */

/**
 * Asigna un filtro a todos los productos desde una sola pantalla: sin esto
 * habría que entrar a editar cada producto uno por uno.
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

  const assigned = products.filter((p) =>
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
                {assigned} de {products.length} productos · se guarda solo
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
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {visible.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-400">Ningún producto coincide.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {visible.map((p) => {
                const current = p.attributes?.find((a) => a.filter === filter._id)?.values ?? []
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
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
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
                                  values: on ? current.filter((x) => x !== v) : [...current, v],
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
              <Alert error={save.error} />
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

/* ═════════ Tarjeta de filtro ═════════ */

function FilterCard({
  filter,
  index,
  total,
  usage,
  hasProducts,
  onMove,
  onAssign,
}: {
  filter: ProductFilter
  index: number
  total: number
  usage: { byFilter: Map<string, number>; byValue: Map<string, number> }
  hasProducts: boolean
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
    if (!filter.values.some((v) => v.toLowerCase() === value.toLowerCase())) {
      save.mutate({ values: [...filter.values, value] })
    }
    setNewValue('')
  }

  const used = usage.byFilter.get(filter._id) ?? 0

  return (
    <Card>
      <div className="flex items-center gap-2">
        <Input
          aria-label="Nombre del filtro"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => {
            const next = name.trim()
            if (next && next !== filter.name) save.mutate({ name: next })
            else setName(filter.name)
          }}
          className="font-semibold"
        />

        <div className="flex shrink-0 flex-col">
          <button
            type="button"
            aria-label="Subir"
            disabled={index === 0}
            onClick={() => onMove(-1)}
            className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-25 disabled:hover:bg-transparent"
          >
            <ArrowUp size={13} />
          </button>
          <button
            type="button"
            aria-label="Bajar"
            disabled={index === total - 1}
            onClick={() => onMove(1)}
            className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-25 disabled:hover:bg-transparent"
          >
            <ArrowDown size={13} />
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
              {used > 0 ? `Quita de ${used}` : '¿Seguro?'}
            </span>
            <button
              type="button"
              onClick={() => remove.mutate()}
              disabled={remove.isPending}
              className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-50"
            >
              Sí
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
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {filter.values.map((v) => {
          const count = usage.byValue.get(`${filter._id}::${v}`) ?? 0
          return (
            <span
              key={v}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full py-1 pr-1.5 pl-3 text-xs font-medium ring-1',
                count > 0
                  ? 'bg-white text-slate-700 ring-slate-200'
                  : 'bg-slate-50 text-slate-400 ring-slate-200',
              )}
            >
              {v}
              {count > 0 && <span className="text-[10px] text-slate-400">{count}</span>}
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
          placeholder="+ valor"
          aria-label={`Nuevo valor para ${filter.name}`}
          className="w-24 rounded-full bg-slate-50 px-3 py-1.5 text-xs ring-1 ring-slate-200 outline-none placeholder:text-slate-400 focus:w-32 focus:bg-white focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {/* Una sola línea de estado, y solo cuando algo falta. */}
      <div className="mt-3 flex items-center gap-3">
        {filter.values.length > 0 && hasProducts && (
          <Button size="sm" variant="secondary" onClick={onAssign}>
            <Users size={14} />
            Asignar a productos
          </Button>
        )}
        <span className="text-xs text-slate-400">
          {filter.values.length === 0
            ? 'Agrega valores para que aparezca en tu tienda'
            : used === 0
              ? 'Sin asignar a ningún producto'
              : `En ${used} ${used === 1 ? 'producto' : 'productos'}`}
        </span>
      </div>

      {save.isError && <p className="mt-2 text-xs text-red-600">{apiErrorMessage(save.error)}</p>}
    </Card>
  )
}

/* ═════════ Página ═════════ */

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
      for (const f of tpl.filters) await createProductFilter(f)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['product-filters'] }),
  })

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

  return (
    <div className="space-y-5">
      <div>
        <Link
          to="/catalog"
          className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition-colors hover:text-slate-800"
        >
          <ChevronLeft size={15} />
          Catálogo
        </Link>
        <PageHeader
          title="Filtros"
          description="Con lo que tus clientes acotan la búsqueda en tu tienda: Talla, Sabor, Color…"
        />
      </div>

      {isLoading ? (
        <Spinner />
      ) : list.length === 0 ? (
        /* El único lugar donde explicar: cuando todavía no hay nada. */
        <Card>
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-slate-100">
              <ListFilter size={22} className="text-slate-400" />
            </span>

            <div className="max-w-sm">
              <p className="font-medium text-slate-700">Todavía no tienes filtros</p>
              <p className="mt-1 text-sm text-slate-500">
                Un filtro es un atributo que cruza tu catálogo. La categoría dice{' '}
                <em>dónde</em> está un producto; el filtro dice <em>cómo</em> es: un polo en
                «Ropa» con Talla M y Color azul.
              </p>
            </div>

            <div className="flex w-full max-w-sm gap-2">
              <Input
                placeholder="Talla, Sabor, Color..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && newName.trim() && add.mutate(newName.trim())}
              />
              <Button disabled={!newName.trim() || add.isPending} onClick={() => add.mutate(newName.trim())}>
                <Plus size={15} />
                Crear
              </Button>
            </div>

            <div className="flex flex-wrap justify-center gap-2">
              <span className="w-full text-xs text-slate-400">o empieza con uno listo:</span>
              {TEMPLATES.map((tpl) => (
                <button
                  key={tpl.label}
                  type="button"
                  disabled={applyTemplate.isPending}
                  onClick={() => applyTemplate.mutate(tpl)}
                  className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-200 transition-colors hover:bg-white hover:ring-brand-400 disabled:opacity-50"
                >
                  <span aria-hidden>{tpl.icon}</span>
                  {tpl.label}
                </button>
              ))}
            </div>

            {(add.isError || applyTemplate.isError) && (
              <Alert error={add.error ?? applyTemplate.error} />
            )}
          </div>
        </Card>
      ) : (
        <>
          <Card>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                if (newName.trim()) add.mutate(newName.trim())
              }}
            >
              <Input
                placeholder="Nuevo filtro: Talla, Sabor, Color..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <Button type="submit" disabled={!newName.trim() || add.isPending}>
                <Plus size={15} />
                Crear
              </Button>
            </form>
            {add.isError && (
              <p className="mt-2 text-xs text-red-600">{apiErrorMessage(add.error)}</p>
            )}
          </Card>

          <div className="space-y-3">
            {list.map((f, i) => (
              <FilterCard
                key={f._id}
                filter={f}
                index={i}
                total={list.length}
                usage={usage}
                hasProducts={(products?.length ?? 0) > 0}
                onMove={(dir) => reorder.mutate({ from: i, to: i + dir })}
                onAssign={() => setAssigning(f)}
              />
            ))}
          </div>
        </>
      )}

      {assigning && products && (
        <AssignDialog filter={assigning} products={products} onClose={() => setAssigning(null)} />
      )}
    </div>
  )
}
