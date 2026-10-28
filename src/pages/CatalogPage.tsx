import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ChevronDown,
  ListFilter,
  Package,
  Pencil,
  Plus,
  Trash2,
  Wrench,
  X,
  ZoomIn,
} from 'lucide-react'
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
  Tabs,
  EmptyState,
  Field,
  IconButton,
  Input,
  Lightbox,
  PageHeader,
  Select,
  Spinner,
  Textarea,
} from '@/components/ui'
import { ImageUploader } from '@/components/ImageUploader'
import { cn, formatCurrency } from '@/lib/cn'
import type { CatalogKind, Product } from '@/types'
import { useRole } from '@/hooks/useRole'

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
  bare,
}: {
  /** Dentro de una sección plegable: el título ya lo pone la sección. */
  bare?: boolean
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
    <div className={cn('space-y-3', !bare && 'rounded-xl bg-slate-50 p-3.5')}>
      <div>
        {!bare && (
          <span className="block text-sm font-medium text-slate-700">Opciones del producto</span>
        )}
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
                className="shrink-0 hover:bg-danger-50 hover:text-danger-600"
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
  bare,
}: {
  bare?: boolean
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
    const next = current.includes(val) ? current.filter((v) => v !== val) : [...current, val]

    const others = (value ?? []).filter((a) => a.filter !== filterId)
    onChange(next.length ? [...others, { filter: filterId, values: next }] : others)
  }

  return (
    <div className="space-y-3">
      {!bare && (
        <div>
          <span className="block text-sm font-medium text-slate-700">Filtros</span>
          <p className="text-xs text-slate-500">
            Con esto tus clientes acotan la búsqueda en la tienda.
          </p>
        </div>
      )}

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

/** Las partes opcionales del formulario, que van plegadas. */
type Section = 'variants' | 'stock' | 'preparation' | 'advance' | 'filters'

export function CatalogPage() {
  // El personal consulta el catálogo; cargarlo y editarlo es del dueño y el admin.
  const { isManager } = useRole()
  const queryClient = useQueryClient()
  const [form, setForm] = useState<ProductInput>(emptyForm)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  // Se guardan todas las fotos del producto para recorrerlas con las flechas.
  const [lightbox, setLightbox] = useState<{ url: string; images: string[] } | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  // Secciones opcionales del formulario que están desplegadas.
  const [openSections, setOpenSections] = useState<Set<Section>>(new Set())

  const { data: items, isLoading } = useQuery({ queryKey: ['products'], queryFn: listProducts })
  const { data: storeFilters } = useQuery({
    queryKey: ['product-filters'],
    queryFn: listProductFilters,
  })
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
    setOpenSections(new Set())
    setShowForm(true)
  }

  function openEdit(item: Product) {
    setEditingId(item._id)
    setForm(productToForm(item))
    setOpenSections(new Set())
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(emptyForm)
  }

  function toggleSection(key: Section) {
    setOpenSections((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const isService = form.kind === 'service'
  const isEditing = editingId !== null
  const hasStoreFilters = (storeFilters ?? []).some((f) => f.values.length > 0)

  // Lo que cada sección plegada dice de sí misma, para no tener que abrirla.
  const variantCount = form.variants?.length ?? 0
  const attributeCount = (form.attributes ?? []).reduce((n, a) => n + a.values.length, 0)
  const prepDays = form.preparationDays ?? 0
  const summaries: Record<Section, { text: string; active: boolean }> = {
    variants: variantCount
      ? {
          text: `${variantCount} ${variantCount === 1 ? 'opción' : 'opciones'}: ${(
            form.variants ?? []
          )
            .map((v) => v.name || 'sin nombre')
            .join(', ')}`,
          active: true,
        }
      : { text: 'Tallas, tamaños, sabores… cada una con su precio', active: false },
    stock: form.trackStock
      ? { text: `${form.stock ?? 0} unidades disponibles`, active: true }
      : { text: 'Sin control de stock', active: false },
    preparation: prepDays
      ? { text: `${prepDays} ${prepDays === 1 ? 'día' : 'días'} de preparación`, active: true }
      : { text: 'Entrega inmediata', active: false },
    advance: form.requiresAdvance
      ? {
          text:
            form.advanceType === 'fixed'
              ? `Pide ${formatCurrency(form.advanceValue ?? 0)} por unidad`
              : `Pide ${form.advanceValue ?? 0}% del total`,
          active: true,
        }
      : { text: 'No pide adelanto', active: false },
    filters: attributeCount
      ? {
          text: `${attributeCount} ${attributeCount === 1 ? 'valor asignado' : 'valores asignados'}`,
          active: true,
        }
      : { text: 'Para que el cliente lo encuentre al filtrar en la tienda', active: false },
  }
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
        count={counts.all}
        description="Los productos y servicios que ofreces."
        actions={
          !showForm &&
          isManager && (
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
          description={isEditing ? 'Los cambios no afectan a pedidos ya creados.' : undefined}
        >
          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault()
              activeMutation.mutate()
            }}
          >
            {activeMutation.isError && <Alert error={activeMutation.error} />}

            {/* Lo esencial: con esto ya se puede vender. */}
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="space-y-4">
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
                      setForm({
                        ...form,
                        kind: 'service',
                        pricingMode: 'quoted',
                        trackStock: false,
                      })
                    }
                  />
                </div>

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

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label={form.pricingMode === 'quoted' ? 'Precio de referencia' : 'Precio'}
                    htmlFor="p-price"
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
                </div>

                <CheckboxField
                  label="El precio se cotiza por trabajo"
                  hint="el precio de arriba es orientativo y el real lo defines en cada pedido"
                  checked={form.pricingMode === 'quoted'}
                  onChange={(checked) =>
                    setForm({ ...form, pricingMode: checked ? 'quoted' : 'fixed' })
                  }
                />

                <Field label="Descripción (opcional)" htmlFor="p-desc">
                  <Textarea
                    id="p-desc"
                    rows={3}
                    placeholder="Lo que el cliente debería saber: medidas, ingredientes, notas…"
                    value={form.description ?? ''}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </Field>
              </div>

              <div>
                <span className="block text-sm font-medium text-slate-700">Fotos</span>
                <p className="mb-2 text-xs text-slate-500">La primera es la portada. Hasta 5.</p>
                <ImageUploader
                  max={5}
                  value={form.images ?? []}
                  onChange={(images) => setForm({ ...form, images })}
                />
              </div>
            </div>

            {/* Lo opcional, plegado: cada fila dice qué tiene sin abrirla. */}
            <div>
              <p className="text-sm font-medium text-slate-900">Más opciones</p>
              <p className="text-xs text-slate-500">
                Todo esto es opcional. Ábrelo solo si lo necesitas.
              </p>

              <div className="mt-3 divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200">
                <FormSection
                  title="Opciones del producto"
                  summary={summaries.variants}
                  open={openSections.has('variants')}
                  onToggle={() => toggleSection('variants')}
                >
                  <VariantEditor
                    bare
                    variants={form.variants ?? []}
                    variantFilter={form.variantFilter}
                    basePrice={form.price || 0}
                    onChange={(variants) => setForm({ ...form, variants })}
                    onFilterChange={(variantFilter) => setForm({ ...form, variantFilter })}
                  />
                </FormSection>

                {!isService && (
                  <FormSection
                    title="Stock"
                    summary={summaries.stock}
                    open={openSections.has('stock')}
                    onToggle={() => toggleSection('stock')}
                  >
                    <div className="space-y-3">
                      <CheckboxField
                        label="Control de stock"
                        hint="lleva el conteo de unidades disponibles y aparece en Inventario"
                        checked={form.trackStock ?? false}
                        onChange={(checked) =>
                          setForm({
                            ...form,
                            trackStock: checked,
                            stock: checked ? (form.stock ?? 0) : 0,
                          })
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
                                onChange={(e) =>
                                  setForm({ ...form, stock: Number(e.target.value) })
                                }
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
                  </FormSection>
                )}

                <FormSection
                  title="Preparación"
                  summary={summaries.preparation}
                  open={openSections.has('preparation')}
                  onToggle={() => toggleSection('preparation')}
                >
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
                            preparationDays:
                              (form.preparationDays ?? 0) === 0 ? 1 : form.preparationDays,
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
                </FormSection>

                <FormSection
                  title="Adelanto"
                  summary={summaries.advance}
                  open={openSections.has('advance')}
                  onToggle={() => toggleSection('advance')}
                >
                  <div className="space-y-3">
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
                </FormSection>

                {hasStoreFilters && (
                  <FormSection
                    title="Filtros de la tienda"
                    summary={summaries.filters}
                    open={openSections.has('filters')}
                    onToggle={() => toggleSection('filters')}
                  >
                    <AttributePicker
                      bare
                      value={form.attributes}
                      onChange={(attributes) => setForm({ ...form, attributes })}
                    />
                  </FormSection>
                )}
              </div>
            </div>

            <div className="flex gap-2 border-t border-slate-100 pt-4">
              <Button
                type="submit"
                className="flex-1 sm:flex-none"
                disabled={activeMutation.isPending}
              >
                {activeMutation.isPending
                  ? 'Guardando...'
                  : isEditing
                    ? 'Guardar cambios'
                    : 'Guardar'}
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

      <Tabs
        value={filter}
        onChange={(key) => setFilter(key as typeof filter)}
        items={[
          { key: 'all', label: 'Todo', count: counts.all },
          { key: 'product', label: 'Productos', count: counts.product },
          { key: 'service', label: 'Servicios', count: counts.service },
        ]}
      />

      {isLoading ? (
        <Spinner />
      ) : !visible?.length ? (
        <EmptyState
          icon={Package}
          title="Nada por aquí"
          description="Carga tus productos y servicios para poder armar pedidos."
          action={
            !showForm &&
            isManager && (
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
              canEdit={isManager}
              item={item}
              editing={editingId === item._id}
              confirming={confirmingId === item._id}
              deleting={deleteMutation.isPending && confirmingId === item._id}
              onImageClick={(url) => setLightbox({ url, images: item.images ?? [] })}
              onEdit={() => openEdit(item)}
              onAskDelete={() => setConfirmingId(item._id)}
              onCancelDelete={() => setConfirmingId(null)}
              onConfirmDelete={() => deleteMutation.mutate(item._id)}
            />
          ))}
        </div>
      )}

      <Lightbox
        url={lightbox?.url ?? null}
        images={lightbox?.images}
        onClose={() => setLightbox(null)}
      />
    </div>
  )
}

function ProductCard({
  canEdit,
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
  canEdit: boolean
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
      className={`flex flex-col overflow-hidden rounded-xl bg-white ring-1 transition-shadow ${
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
            {item.images.length > 1 ? `Ver ${item.images.length} fotos` : 'Ver foto'}
          </span>
        </button>
      ) : (
        <div className="flex aspect-[4/3] w-full items-center justify-center bg-slate-50 text-slate-300">
          {item.kind === 'service' ? <Wrench size={28} /> : <Package size={28} />}
        </div>
      )}

      {/* Las demás fotos, para que se vea de un vistazo que hay más de una. */}
      {item.images?.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto border-b border-slate-100 px-3 py-2">
          {item.images.slice(1).map((url, i) => (
            <button
              key={url}
              type="button"
              onClick={() => onImageClick(url)}
              aria-label={`Ver foto ${i + 2}`}
              className="focus-ring size-11 shrink-0 overflow-hidden rounded-md bg-slate-100 ring-1 ring-slate-200 transition-opacity hover:opacity-80"
            >
              <img src={url} alt="" loading="lazy" className="size-full object-cover" />
            </button>
          ))}
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
              <p className="text-[11px] text-warning-600">a cotizar</p>
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
            canEdit && (
              <div className="flex items-center gap-1 border-t border-slate-100 pt-2">
                <IconButton label={`Editar ${item.name}`} onClick={onEdit}>
                  <Pencil size={14} />
                </IconButton>
                <IconButton label={`Eliminar ${item.name}`} tone="danger" onClick={onAskDelete}>
                  <Trash2 size={14} />
                </IconButton>
              </div>
            )
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

/**
 * Una parte opcional del formulario, plegada. Cerrada muestra un resumen de
 * lo que tiene, en color cuando hay algo configurado, para no tener que
 * abrirla para saberlo.
 */
function FormSection({
  title,
  summary,
  open,
  onToggle,
  children,
}: {
  title: string
  summary: { text: string; active: boolean }
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className={cn(open && 'bg-slate-50/60')}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50"
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-900">{title}</p>
          <p
            className={cn(
              'truncate text-xs',
              summary.active ? 'font-medium text-brand-700' : 'text-slate-500',
            )}
          >
            {summary.text}
          </p>
        </div>
        <ChevronDown
          size={16}
          className={cn('shrink-0 text-slate-400 transition-transform', open && 'rotate-180')}
        />
      </button>
      {open && <div className="px-4 pt-1 pb-4">{children}</div>}
    </div>
  )
}
