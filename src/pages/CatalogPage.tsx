import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Package, Pencil, Plus, Wrench, X } from 'lucide-react'
import { createProduct, deleteProduct, listProducts, updateProduct, type ProductInput } from '@/api/products'
import { createCategory, listCategories } from '@/api/categories'
import { apiErrorMessage } from '@/api/client'
import { Alert, Button, Card, EmptyState, Field, Input, Select, Spinner } from '@/components/ui'
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

  useEffect(() => {
    if (!lightboxUrl) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setLightboxUrl(null) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lightboxUrl])

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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
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
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Catálogo</h1>
        {!showForm && <Button onClick={openCreate}>+ Agregar</Button>}
      </div>

      {showForm && (
        <Card>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              activeMutation.mutate()
            }}
          >
            <p className="text-sm font-semibold text-slate-700">
              {isEditing ? 'Editar ítem' : 'Nuevo ítem'}
            </p>

            {activeMutation.isError && <Alert>{apiErrorMessage(activeMutation.error)}</Alert>}

            <div className="flex gap-2">
              <KindOption
                label="Producto"
                hint="Algo que vendés tal cual"
                icon={<Package size={16} />}
                selected={!isService}
                onClick={() => setForm({ ...form, kind: 'product', pricingMode: 'fixed' })}
              />
              <KindOption
                label="Servicio"
                hint="Un trabajo que realizás"
                icon={<Wrench size={16} />}
                selected={isService}
                onClick={() => setForm({ ...form, kind: 'service', pricingMode: 'quoted' })}
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
                        if (e.key === 'Enter') { e.preventDefault(); if (newCatName.trim()) addCatMutation.mutate() }
                        if (e.key === 'Escape') { setShowNewCat(false); setNewCatName('') }
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
                    <Button type="button" variant="ghost" onClick={() => { setShowNewCat(false); setNewCatName('') }}>
                      <X size={14} />
                    </Button>
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
                        <option key={cat._id} value={cat.name}>{cat.name}</option>
                      ))}
                    </Select>
                    <button
                      type="button"
                      title="Nueva categoría"
                      onClick={() => setShowNewCat(true)}
                      className="flex items-center justify-center rounded-lg px-2 text-slate-400 ring-1 ring-slate-300 hover:text-brand-600 hover:ring-brand-400"
                    >
                      <Plus size={15} />
                    </button>
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
                    ? 'Orientativo. El precio real lo definís en cada pedido.'
                    : undefined
                }
              >
                <Input
                  id="p-price"
                  type="number"
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

              <div className="sm:col-span-2">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">Imágenes</span>
                <ImageUploader
                  max={5}
                  value={form.images ?? []}
                  onChange={(images) => setForm({ ...form, images })}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={activeMutation.isPending}>
                {activeMutation.isPending ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Guardar'}
              </Button>
              <Button type="button" variant="secondary" onClick={cancelForm}>
                Cancelar
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="flex gap-2">
        {([
          ['all', `Todo (${counts.all})`],
          ['product', `Productos (${counts.product})`],
          ['service', `Servicios (${counts.service})`],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={`rounded-full px-3 py-1 text-xs font-medium ring-1 transition-colors ${
              filter === value
                ? 'bg-slate-900 text-white ring-slate-900'
                : 'bg-white text-slate-600 ring-slate-300 hover:bg-slate-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <Spinner />
      ) : !visible?.length ? (
        <EmptyState
          title="Nada por acá"
          description="Cargá tus productos y servicios para poder armar pedidos."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((item) => (
            <Card
              key={item._id}
              className={`flex flex-col transition-shadow ${editingId === item._id ? 'ring-2 ring-brand-500' : ''}`}
            >
              {item.images?.[0] && (
                <div className="mb-3">
                  <button
                    type="button"
                    onClick={() => setLightboxUrl(item.images[0])}
                    className="block w-full overflow-hidden rounded-lg ring-1 ring-slate-200 focus:outline-none"
                  >
                    <img
                      src={item.images[0]}
                      alt=""
                      className="h-36 w-full object-cover transition-transform hover:scale-105"
                    />
                  </button>
                  {item.images.length > 1 && (
                    <div className="mt-1.5 flex gap-1.5">
                      {item.images.slice(1).map((url) => (
                        <button
                          key={url}
                          type="button"
                          onClick={() => setLightboxUrl(url)}
                          className="overflow-hidden rounded-md ring-1 ring-slate-200 focus:outline-none"
                        >
                          <img src={url} alt="" className="size-12 object-cover transition-transform hover:scale-110" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    {item.kind === 'service' ? <Wrench size={13} /> : <Package size={13} />}
                    <span className="text-xs">
                      {item.kind === 'service' ? 'Servicio' : 'Producto'}
                    </span>
                  </div>
                  <p className="mt-0.5 font-medium text-slate-900">{item.name}</p>
                  {item.category && (
                    <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                      {item.category}
                    </span>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-semibold text-slate-900">{formatCurrency(item.price)}</p>
                  {item.pricingMode === 'quoted' && (
                    <p className="text-xs text-amber-600">a cotizar</p>
                  )}
                </div>
              </div>

              {item.description && (
                <p className="mt-2 text-sm text-slate-500">{item.description}</p>
              )}

              <div className="mt-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => openEdit(item)}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-brand-600"
                >
                  <Pencil size={12} />
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate(item._id)}
                  className="text-xs text-slate-400 hover:text-red-600"
                >
                  Eliminar
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            type="button"
            aria-label="Cerrar"
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
          >
            <X size={20} />
          </button>
          <img
            src={lightboxUrl}
            alt=""
            className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
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
      className={`flex-1 rounded-lg px-4 py-3 text-left ring-1 transition-colors ${
        selected ? 'bg-brand-50 ring-2 ring-brand-500' : 'bg-white ring-slate-300 hover:bg-slate-50'
      }`}
    >
      <span
        className={`flex items-center gap-1.5 font-medium ${selected ? 'text-brand-700' : 'text-slate-700'}`}
      >
        {icon}
        {label}
      </span>
      <span className="mt-0.5 block text-xs text-slate-500">{hint}</span>
    </button>
  )
}
