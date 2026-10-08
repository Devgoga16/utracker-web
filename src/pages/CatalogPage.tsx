import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ListFilter, Package, Pencil, Plus, Trash2, Wrench, X, ZoomIn } from 'lucide-react'
import {
  createProduct,
  deleteProduct,
  listProducts,
  updateProduct,
  type ProductInput,
} from '@/api/products'
import { createCategory, listCategories } from '@/api/categories'
import { listProductFilters } from '@/api/productFilters'
import {
  Alert,
  Badge,
  Button,
  Card,
  CheckboxField,
  Chip,
  ChipBar,
  EmptyState,
  Field,
  IconButton,
  Input,
  Lightbox,
  PageHeader,
  Select,
  Spinner,
} from '@/components/ui'
import { ImageUploader } from '@/components/ImageUploader'
import { formatCurrency } from '@/lib/cn'
import type { CatalogKind, Product } from '@/types'

const emptyForm: ProductInput = {
  kind: 'product',
  pricingMode: 'fixed',
  name: '',
  description: '',
  price: 0,
  category: '',
  images: [],
  attributes: [],
  trackStock: false,
  stock: 0,
  preparationDays: 0,
  requiresAdvance: false,
  advanceType: 'percent',
  advanceValue: 50,
}

function productToForm(p: Product): ProductInput {
  return {
    kind: p.kind,
    pricingMode: p.pricingMode,
    name: p.name,
    description: p.description ?? '',
    price: p.price,
    category: p.category ?? '',
    images: p.images ?? [],
    attributes: (p.attributes ?? []).map((a) => ({ filter: a.filter, values: a.values })),
    trackStock: p.trackStock,
    stock: p.stock ?? 0,
    variants: (p.variants ?? []).map((v) => ({ name: v.name, priceModifier: v.priceModifier })),
    variantFilter: p.variantFilter ?? null,
    lowStockThreshold: p.lowStockThreshold ?? null,
    preparationDays: p.preparationDays ?? 0,
    requiresAdvance: p.requiresAdvance ?? false,
    advanceType: p.advanceType ?? 'percent',
    advanceValue: p.advanceValue ?? 50,
  }
}

/**
 * Variantes del producto y, opcionalmente, a qué filtro corresponden.
 *
 * Al elegir el filtro, el servidor agrega esos nombres a sus valores y se los
 * asigna al producto: la lista se escribe una sola vez en vez de repetirla en
 * variantes y en filtros.
 */
function VariantEditor({
  variants,
  variantFilter,
  basePrice,
  onChange,
  onFilterChange,
}: {
  variants: NonNullable<ProductInput['variants']>
  variantFilter: string | null | undefined
  basePrice: number
  onChange: (next: NonNullable<ProductInput['variants']>) => void
  onFilterChange: (filterId: string | null) => void
}) {
  const { data: filters } = useQuery({
    queryKey: ['product-filters'],
    queryFn: listProductFilters,
  })

  function update(i: number, patch: Partial<{ name: string; priceModifier: number }>) {
    onChange(variants.map((v, j) => (j === i ? { ...v, ...patch } : v)))
  }

  return (
    <div className="space-y-3 rounded-xl bg-slate-50 p-3.5">
      <div>
        <span className="block text-sm font-medium text-slate-700">Opciones del producto</span>
        <p className="text-xs text-slate-500">
          Tallas, sabores, tamaños… El cliente elige una al pedir y el precio se ajusta.
        </p>
      </div>

      {variants.length > 0 && (
        <ul className="space-y-2">
          {variants.map((v, i) => (
            <li key={i} className="flex items-center gap-2">
              <Input
                aria-label="Nombre de la opción"
                placeholder="Mediano"
                value={v.name}
                onChange={(e) => update(i, { name: e.target.value })}
              />
              <div className="relative w-32 shrink-0">
                <Input
                  aria-label="Diferencia de precio"
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  placeholder="0"
                  value={v.priceModifier}
                  onChange={(e) => update(i, { priceModifier: Number(e.target.value) || 0 })}
                />
              </div>
              <span className="w-20 shrink-0 text-right text-xs tabular-nums text-slate-500">
                {formatCurrency(basePrice + (v.priceModifier || 0))}
              </span>
              <IconButton
                label={`Quitar ${v.name || 'opción'}`}
                onClick={() => onChange(variants.filter((_, j) => j !== i))}
                className="shrink-0 hover:bg-red-50 hover:text-red-600"
              >
                <X size={15} />
              </IconButton>
            </li>
          ))}
        </ul>
      )}

      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => onChange([...variants, { name: '', priceModifier: 0 }])}
      >
        <Plus size={15} />
        Agregar opción
      </Button>

      {/* El puente con los filtros: se escribe una vez, sirve en los dos lados. */}
      {variants.length > 0 && (filters?.length ?? 0) > 0 && (
        <div className="border-t border-slate-200 pt-3">
          <Field label="Estas opciones son de" htmlFor="p-variant-filter">
            <Select
              id="p-variant-filter"
              value={variantFilter ?? ''}
              onChange={(e) => onFilterChange(e.target.value || null)}
            >
              <option value="">No usarlas como filtro</option>
              {filters?.map((f) => (
                <option key={f._id} value={f._id}>
                  {f.name}
                </option>
              ))}
            </Select>
            <p className="mt-1.5 text-xs text-slate-500">
              {variantFilter
                ? 'Al guardar, estas opciones se agregan al filtro y quedan asignadas a este producto.'
                : 'Elige un filtro para que tus clientes puedan filtrar por estas opciones en la tienda.'}
            </p>
          </Field>
        </div>
      )}
    </div>
  )
}

/**
 * Elección de valores por filtro. Multi-valor a propósito: un mismo producto
 * puede venir en varias tallas y debe salir al filtrar por cualquiera.
 */
function AttributePicker({
  value,
  onChange,
}: {
  value: ProductInput['attributes']
  onChange: (next: NonNullable<ProductInput['attributes']>) => void
}) {
  const { data: filters } = useQuery({
    queryKey: ['product-filters'],
    queryFn: listProductFilters,
  })

  const usable = filters?.filter((f) => f.values.length > 0) ?? []
  if (usable.length === 0) return null

  const selected = new Map((value ?? []).map((a) => [a.filter, a.values]))

  function toggle(filterId: string, val: string) {
    const current = selected.get(filterId) ?? []
    const next = current.includes(val)
      ? current.filter((v) => v !== val)
      : [...current, val]

    const others = (value ?? []).filter((a) => a.filter !== filterId)
    onChange(next.length ? [...others, { filter: filterId, values: next }] : others)
  }

  return (
    <div className="space-y-3">
      <div>
        <span className="block text-sm font-medium text-slate-700">Filtros</span>
        <p className="text-xs text-slate-500">
          Con esto tus clientes acotan la búsqueda en la tienda.
        </p>
      </div>

      {usable.map((f) => {
        const chosen = selected.get(f._id) ?? []
        return (
          <div key={f._id}>
            <p className="mb-1.5 text-xs font-semibold tracking-wide text-slate-500 uppercase">
              {f.name}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {f.values.map((v) => {
                const active = chosen.includes(v)
                return (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggle(f._id, v)}
                    className={
                      active
                        ? 'rounded-full bg-brand-600 px-3 py-1.5 text-xs font-medium text-white'
                        : 'rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-200'
                    }
                  >
                    {v}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

type Filter = 'all' | CatalogKind

export function CatalogPage() {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<ProductInput>(emptyForm)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  const { data: items, isLoading } = useQuery({ queryKey: ['products'], queryFn: listProducts })
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: listCategories })

  const [newCatName, setNewCatName] = useState('')
  const [showNewCat, setShowNewCat] = useState(false)
  const addCatMutation = useMutation({
    mutationFn: () => createCategory(newCatName.trim()),
    onSuccess: (cat) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      setForm((f) => ({ ...f, category: cat.name }))
      setNewCatName('')
      setShowNewCat(false)
    },
  })

  const createMutation = useMutation({
    mutationFn: () => createProduct(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      setForm(emptyForm)
      setShowForm(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: () => updateProduct(editingId!, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      setForm(emptyForm)
      setEditingId(null)
      setShowForm(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      setConfirmingId(null)
    },
  })

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm)
    setShowForm(true)
  }

  function openEdit(item: Product) {
    setEditingId(item._id)
    setForm(productToForm(item))
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(emptyForm)
  }

  const isService = form.kind === 'service'
  const isEditing = editingId !== null
  const activeMutation = isEditing ? updateMutation : createMutation
  const visible = filter === 'all' ? items : items?.filter((i) => i.kind === filter)
  const counts = {
    all: items?.length ?? 0,
    product: items?.filter((i) => i.kind === 'product').length ?? 0,
    service: items?.filter((i) => i.kind === 'service').length ?? 0,
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Catálogo"
        description="Los productos y servicios que ofreces."
        actions={
          !showForm && (
            <div className="flex items-center gap-2">
              <Link to="/catalog/filters">
                <Button variant="secondary">
                  <ListFilter size={15} />
                  <span className="hidden sm:inline">Filtros</span>
                </Button>
              </Link>
              <Button onClick={openCreate}>
                <Plus size={16} />
                Agregar
              </Button>
            </div>
          )
        }
      />

      {showForm && (
        <Card
          title={isEditing ? 'Editar ítem' : 'Nuevo ítem'}
          description={
            isEditing ? 'Los cambios no afectan a pedidos ya creados.' : undefined
          }
        >
          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault()
              activeMutation.mutate()
            }}
          >
            {activeMutation.isError && <Alert error={activeMutation.error} />}

            <div className="grid gap-2 sm:grid-cols-2">
              <KindOption
                label="Producto"
                hint="Algo que vendes tal cual"
                icon={<Package size={16} />}
                selected={!isService}
                onClick={() => setForm({ ...form, kind: 'product', pricingMode: 'fixed' })}
              />
              <KindOption
                label="Servicio"
                hint="Un trabajo que realizas"
                icon={<Wrench size={16} />}
                selected={isService}
                onClick={() =>
                  setForm({ ...form, kind: 'service', pricingMode: 'quoted', trackStock: false })
                }
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nombre" htmlFor="p-name">
                <Input
                  id="p-name"
                  required
                  autoFocus
                  placeholder={isService ? 'Ej. Cartel luminoso' : 'Ej. Pan de masa madre'}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </Field>

              <Field label="Categoría" htmlFor="p-category">
                {showNewCat ? (
                  <div className="flex gap-1">
                    <Input
                      autoFocus
                      placeholder="Nombre de la categoría"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          if (newCatName.trim()) addCatMutation.mutate()
                        }
                        if (e.key === 'Escape') {
                          setShowNewCat(false)
                          setNewCatName('')
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={!newCatName.trim() || addCatMutation.isPending}
                      onClick={() => addCatMutation.mutate()}
                    >
                      OK
                    </Button>
                    <IconButton
                      label="Cancelar"
                      onClick={() => {
                        setShowNewCat(false)
                        setNewCatName('')
                      }}
                    >
                      <X size={14} />
                    </IconButton>
                  </div>
                ) : (
                  <div className="flex gap-1">
                    <Select
                      id="p-category"
                      value={form.category ?? ''}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="flex-1"
                    >
                      <option value="">Sin categoría</option>
                      {categories?.map((cat) => (
                        <option key={cat._id} value={cat.name}>
                          {cat.name}
                        </option>
                      ))}
                    </Select>
                    <IconButton label="Nueva categoría" onClick={() => setShowNewCat(true)}>
                      <Plus size={15} />
                    </IconButton>
                  </div>
                )}
              </Field>

              <Field label="Cómo se cobra" htmlFor="p-pricing">
                <Select
                  id="p-pricing"
                  value={form.pricingMode}
                  onChange={(e) =>
                    setForm({ ...form, pricingMode: e.target.value as ProductInput['pricingMode'] })
                  }
                >
                  <option value="fixed">Precio fijo</option>
                  <option value="quoted">Se cotiza por trabajo</option>
                </Select>
              </Field>

              <Field
                label={form.pricingMode === 'quoted' ? 'Precio de referencia' : 'Precio'}
                htmlFor="p-price"
                hint={
                  form.pricingMode === 'quoted'
                    ? 'Orientativo. El precio real lo defines en cada pedido.'
                    : undefined
                }
              >
                <Input
                  id="p-price"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  required
                  value={form.price || ''}
                  onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                />
              </Field>

              <div className="sm:col-span-2">
                <Field label="Descripción" htmlFor="p-desc">
                  <Input
                    id="p-desc"
                    value={form.description ?? ''}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </Field>
              </div>

              {!isService && (
                <div className="space-y-3 rounded-xl bg-slate-50 p-3.5 sm:col-span-2">
                  <CheckboxField
                    label="Control de stock"
                    hint="lleva el conteo de unidades disponibles y aparece en Inventario"
                    checked={form.trackStock ?? false}
                    onChange={(checked) =>
                      setForm({ ...form, trackStock: checked, stock: checked ? form.stock ?? 0 : 0 })
                    }
                  />

                  {form.trackStock && (
                    <div className="flex flex-wrap gap-3">
                      <div className="w-36">
                        <Field label="Stock inicial" htmlFor="p-stock">
                          <Input
                            id="p-stock"
                            type="number"
                            inputMode="numeric"
                            min={0}
                            value={form.stock ?? 0}
                            onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
                          />
                        </Field>
                      </div>
                      <div className="w-44">
                        <Field label="Avisarme desde" htmlFor="p-low">
                          <Input
                            id="p-low"
                            type="number"
                            inputMode="numeric"
                            min={0}
                            placeholder="usa el del negocio"
                            value={form.lowStockThreshold ?? ''}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                lowStockThreshold:
                                  e.target.value === '' ? null : Number(e.target.value),
                              })
                            }
                          />
                        </Field>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Disponibilidad: fija la fecha más temprana que puede elegir el cliente. */}
              <div className="sm:col-span-2">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">
                  Disponibilidad
                </span>
                <div className="flex flex-wrap items-end gap-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, preparationDays: 0 })}
                      className={
                        (form.preparationDays ?? 0) === 0
                          ? 'rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white'
                          : 'rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-200'
                      }
                    >
                      Entrega inmediata
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          preparationDays: (form.preparationDays ?? 0) === 0 ? 1 : form.preparationDays,
                        })
                      }
                      className={
                        (form.preparationDays ?? 0) > 0
                          ? 'rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white'
                          : 'rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-200'
                      }
                    >
                      Necesita preparación
                    </button>
                  </div>

                  {(form.preparationDays ?? 0) > 0 && (
                    <div className="w-24">
                      <Field label="Días" htmlFor="p-prep">
                        <Input
                          id="p-prep"
                          type="number"
                          inputMode="numeric"
                          min={1}
                          value={form.preparationDays ?? 1}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              preparationDays: Math.max(1, Number(e.target.value) || 1),
                            })
                          }
                        />
                      </Field>
                    </div>
                  )}
                </div>
                <p className="mt-1.5 text-xs text-slate-500">
                  {(form.preparationDays ?? 0) === 0
                    ? 'El cliente puede recogerlo o recibirlo hoy mismo.'
                    : `El cliente solo podrá elegir fechas desde ${form.preparationDays} día(s) después de pedir.`}
                </p>
              </div>

              {/* Adelanto: el cliente lo paga y sube el comprobante al pedir. */}
              <div className="space-y-3 rounded-xl bg-slate-50 p-3.5 sm:col-span-2">
                <CheckboxField
                  label="Pedir adelanto"
                  hint="el cliente deberá pagar y subir su comprobante al hacer el pedido"
                  checked={form.requiresAdvance ?? false}
                  onChange={(checked) => setForm({ ...form, requiresAdvance: checked })}
                />

                {form.requiresAdvance && (
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="w-40">
                      <Field label="Cómo se calcula" htmlFor="p-adv-type">
                        <Select
                          id="p-adv-type"
                          value={form.advanceType ?? 'percent'}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              advanceType: e.target.value as 'fixed' | 'percent',
                            })
                          }
                        >
                          <option value="percent">Porcentaje</option>
                          <option value="fixed">Monto fijo</option>
                        </Select>
                      </Field>
                    </div>
                    <div className="w-28">
                      <Field
                        label={form.advanceType === 'fixed' ? 'Soles' : 'Porcentaje'}
                        htmlFor="p-adv-value"
                      >
                        <Input
                          id="p-adv-value"
                          type="number"
                          inputMode="decimal"
                          min={0}
                          max={form.advanceType === 'percent' ? 100 : undefined}
                          step={form.advanceType === 'percent' ? 5 : 0.5}
                          value={form.advanceValue ?? 0}
                          onChange={(e) =>
                            setForm({ ...form, advanceValue: Number(e.target.value) })
                          }
                        />
                      </Field>
                    </div>

                    <p className="pb-2.5 text-xs text-slate-500">
                      {form.advanceType === 'fixed'
                        ? `${formatCurrency(form.advanceValue ?? 0)} por unidad`
                        : `${form.advanceValue ?? 0}% del total · hoy serían ${formatCurrency(
                            ((form.price || 0) * (form.advanceValue ?? 0)) / 100,
                          )}`}
                    </p>
                  </div>
                )}
              </div>

              <div className="sm:col-span-2">
                <VariantEditor
                  variants={form.variants ?? []}
                  variantFilter={form.variantFilter}
                  basePrice={form.price || 0}
                  onChange={(variants) => setForm({ ...form, variants })}
                  onFilterChange={(variantFilter) => setForm({ ...form, variantFilter })}
                />
              </div>

              <div className="sm:col-span-2">
                <AttributePicker
                  value={form.attributes}
                  onChange={(attributes) => setForm({ ...form, attributes })}
                />
              </div>

              <div className="sm:col-span-2">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">Imágenes</span>
                <ImageUploader
                  max={5}
                  value={form.images ?? []}
                  onChange={(images) => setForm({ ...form, images })}
                />
              </div>
            </div>

            <div className="flex gap-2 border-t border-slate-100 pt-4">
              <Button type="submit" className="flex-1 sm:flex-none" disabled={activeMutation.isPending}>
                {activeMutation.isPending ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Guardar'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="flex-1 sm:flex-none"
                onClick={cancelForm}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </Card>
      )}

      <ChipBar>
        <Chip active={filter === 'all'} count={counts.all} onClick={() => setFilter('all')}>
          Todo
        </Chip>
        <Chip
          active={filter === 'product'}
          count={counts.product}
          onClick={() => setFilter('product')}
        >
          <Package size={14} />
          Productos
        </Chip>
        <Chip
          active={filter === 'service'}
          count={counts.service}
          onClick={() => setFilter('service')}
        >
          <Wrench size={14} />
          Servicios
        </Chip>
      </ChipBar>

      {isLoading ? (
        <Spinner />
      ) : !visible?.length ? (
        <EmptyState
          icon={Package}
          title="Nada por acá"
          description="Carga tus productos y servicios para poder armar pedidos."
          action={
            !showForm && (
              <Button onClick={openCreate}>
                <Plus size={16} />
                Agregar el primero
              </Button>
            )
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((item) => (
            <ProductCard
              key={item._id}
              item={item}
              editing={editingId === item._id}
              confirming={confirmingId === item._id}
              deleting={deleteMutation.isPending && confirmingId === item._id}
              onImageClick={setLightboxUrl}
              onEdit={() => openEdit(item)}
              onAskDelete={() => setConfirmingId(item._id)}
              onCancelDelete={() => setConfirmingId(null)}
              onConfirmDelete={() => deleteMutation.mutate(item._id)}
            />
          ))}
        </div>
      )}

      <Lightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
    </div>
  )
}

function ProductCard({
  item,
  editing,
  confirming,
  deleting,
  onImageClick,
  onEdit,
  onAskDelete,
  onCancelDelete,
  onConfirmDelete,
}: {
  item: Product
  editing: boolean
  confirming: boolean
  deleting: boolean
  onImageClick: (url: string) => void
  onEdit: () => void
  onAskDelete: () => void
  onCancelDelete: () => void
  onConfirmDelete: () => void
}) {
  const stock = item.stock ?? 0
  const stockTone = stock <= 0 ? 'red' : stock <= 5 ? 'amber' : 'green'

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-xl bg-white shadow-sm shadow-slate-900/[0.03] ring-1 transition-shadow ${
        editing ? 'ring-2 ring-brand-500' : 'ring-slate-200'
      }`}
    >
      {item.images?.[0] ? (
        <button
          type="button"
          onClick={() => onImageClick(item.images[0])}
          className="group relative block aspect-[4/3] w-full overflow-hidden bg-slate-100 focus:outline-none"
        >
          <img
            src={item.images[0]}
            alt=""
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-black/40 px-2 py-1 text-[11px] font-medium text-white backdrop-blur-sm transition-opacity group-hover:opacity-0">
            <ZoomIn size={11} />
            Ver foto
          </span>
        </button>
      ) : (
        <div className="flex aspect-[4/3] w-full items-center justify-center bg-slate-50 text-slate-300">
          {item.kind === 'service' ? <Wrench size={28} /> : <Package size={28} />}
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-slate-400">
              {item.kind === 'service' ? <Wrench size={12} /> : <Package size={12} />}
              <span className="text-[11px] font-medium tracking-wide uppercase">
                {item.kind === 'service' ? 'Servicio' : 'Producto'}
              </span>
            </div>
            <p className="mt-1 font-semibold text-slate-900">{item.name}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-semibold tabular-nums text-slate-900">
              {formatCurrency(item.price)}
            </p>
            {item.pricingMode === 'quoted' && (
              <p className="text-[11px] text-amber-600">a cotizar</p>
            )}
          </div>
        </div>

        {item.description && (
          <p className="mt-2 line-clamp-2 text-sm text-slate-500">{item.description}</p>
        )}

        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {item.category && <Badge>{item.category}</Badge>}
          {item.trackStock && <Badge tone={stockTone}>{stock} u. en stock</Badge>}
        </div>

        {/* Empuja las acciones al pie para que todas las tarjetas se alineen. */}
        <div className="mt-auto pt-3">
          {confirming ? (
            <div className="flex items-center gap-2 border-t border-slate-100 pt-3">
              <span className="min-w-0 flex-1 text-xs text-slate-600">¿Eliminar?</span>
              <Button size="sm" variant="danger" disabled={deleting} onClick={onConfirmDelete}>
                {deleting ? 'Eliminando...' : 'Sí'}
              </Button>
              <Button size="sm" variant="secondary" onClick={onCancelDelete}>
                No
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1 border-t border-slate-100 pt-2">
              <IconButton label={`Editar ${item.name}`} onClick={onEdit}>
                <Pencil size={14} />
              </IconButton>
              <IconButton label={`Eliminar ${item.name}`} tone="danger" onClick={onAskDelete}>
                <Trash2 size={14} />
              </IconButton>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function KindOption({
  label,
  hint,
  icon,
  selected,
  onClick,
}: {
  label: string
  hint: string
  icon: React.ReactNode
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl px-4 py-3 text-left transition-colors ${
        selected
          ? 'bg-brand-50 ring-2 ring-brand-500'
          : 'bg-white ring-1 ring-slate-300 hover:bg-slate-50'
      }`}
    >
      <span
        className={`flex items-center gap-1.5 font-medium ${
          selected ? 'text-brand-700' : 'text-slate-700'
        }`}
      >
        {icon}
        {label}
      </span>
      <span className="mt-0.5 block text-xs text-slate-500">{hint}</span>
    </button>
  )
}
