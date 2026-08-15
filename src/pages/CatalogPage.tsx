import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Package, Pencil, Plus, Trash2, Wrench, X } from 'lucide-react'
import {
  createProduct,
  deleteProduct,
  listProducts,
  updateProduct,
  type ProductInput,
} from '@/api/products'
import { createCategory, listCategories } from '@/api/categories'
import { apiErrorMessage } from '@/api/client'
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
  trackStock: false,
  stock: 0,
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
    trackStock: p.trackStock,
    stock: p.stock ?? 0,
  }
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
            <Button onClick={openCreate}>
              <Plus size={16} />
              Agregar
            </Button>
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
            {activeMutation.isError && <Alert>{apiErrorMessage(activeMutation.error)}</Alert>}

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
                    <div className="max-w-[12rem]">
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
                  )}
                </div>
              )}

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
          className="group block aspect-[4/3] w-full overflow-hidden bg-slate-100 focus:outline-none"
        >
          <img
            src={item.images[0]}
            alt=""
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
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
