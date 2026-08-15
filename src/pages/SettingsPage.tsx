import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Copy, ExternalLink, Plus, X } from 'lucide-react'
import { updateTenantSettings } from '@/api/tenants'
import { createCategory, deleteCategory, listCategories } from '@/api/categories'
import { apiErrorMessage } from '@/api/client'
import { Alert, Button, Card, Field, IconButton, Input, PageHeader } from '@/components/ui'
import { ImageUploader } from '@/components/ImageUploader'
import { useAuthStore } from '@/stores/authStore'

export function SettingsPage() {
  const { activeTenant, setActiveTenant } = useAuthStore()
  const queryClient = useQueryClient()

  const [name, setName] = useState(activeTenant?.name ?? '')
  const [phone, setPhone] = useState(activeTenant?.phone ?? '')
  const [logoUrls, setLogoUrls] = useState<string[]>(
    activeTenant?.logoUrl ? [activeTenant.logoUrl] : [],
  )
  const [saved, setSaved] = useState(false)

  const mutation = useMutation({
    mutationFn: () =>
      updateTenantSettings({
        name: name.trim() || undefined,
        logoUrl: logoUrls[0] ?? null,
        phone: phone.replace(/\D/g, '') || null,
      }),
    onSuccess: (tenant) => {
      setActiveTenant({ ...activeTenant!, ...tenant })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    },
  })

  const storeUrl = `${window.location.origin}/store/${activeTenant?.slug}`
  const [copied, setCopied] = useState(false)
  function copyStoreUrl() {
    navigator.clipboard.writeText(storeUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: listCategories })
  const [newCatName, setNewCatName] = useState('')

  const addCatMutation = useMutation({
    mutationFn: () => createCategory(newCatName.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      setNewCatName('')
    },
  })

  const deleteCatMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  })

  const dirty =
    name.trim() !== (activeTenant?.name ?? '') ||
    (logoUrls[0] ?? null) !== (activeTenant?.logoUrl ?? null) ||
    phone.replace(/\D/g, '') !== (activeTenant?.phone ?? '')

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Ajustes" description="La identidad de tu negocio y su tienda pública." />

      <Card
        title="Identidad"
        description="Así te ven tus clientes en la tienda y en el seguimiento de sus pedidos."
      >
        <div className="space-y-5">
          <div>
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Logo</span>
            <ImageUploader max={1} folder="logos" value={logoUrls} onChange={setLogoUrls} />
            {logoUrls[0] && (
              <button
                type="button"
                onClick={() => setLogoUrls([])}
                className="mt-2 text-xs text-slate-400 transition-colors hover:text-red-600"
              >
                Quitar logo
              </button>
            )}
          </div>

          <Field label="Nombre del negocio" htmlFor="s-name">
            <Input
              id="s-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setSaved(false)
              }}
            />
          </Field>

          <Field label="WhatsApp del negocio" htmlFor="s-phone">
            <Input
              id="s-phone"
              type="tel"
              inputMode="tel"
              placeholder="51987654321"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value)
                setSaved(false)
              }}
            />
            <p className="mt-1.5 text-xs text-slate-500">
              Con código de país y sin espacios. Tus clientes lo usan para consultarte desde la
              tienda; si lo dejas vacío, el botón no aparece.
            </p>
          </Field>
        </div>
      </Card>

      <Card
        title="Tienda pública"
        description="Comparte este link para que tus clientes vean tu catálogo."
      >
        <div className="rounded-lg bg-slate-50 px-3 py-2.5 ring-1 ring-slate-200">
          <p className="font-mono text-xs break-all text-slate-600">{storeUrl}</p>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={copyStoreUrl}>
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? 'Copiado' : 'Copiar link'}
          </Button>
          <a href={storeUrl} target="_blank" rel="noreferrer">
            <Button variant="ghost">
              <ExternalLink size={15} />
              Ver tienda
            </Button>
          </a>
        </div>
      </Card>

      <Card
        title="Categorías del catálogo"
        description="Defínelas una vez y reutilízalas al crear o editar productos."
      >
        {categories && categories.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {categories.map((cat) => (
              <span
                key={cat._id}
                className="inline-flex items-center gap-1 rounded-full bg-slate-100 py-1 pr-1.5 pl-3 text-xs font-medium text-slate-700"
              >
                {cat.name}
                <button
                  type="button"
                  aria-label={`Eliminar ${cat.name}`}
                  onClick={() => deleteCatMutation.mutate(cat._id)}
                  className="rounded-full p-1 transition-colors hover:bg-slate-200 hover:text-red-600"
                >
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
        )}

        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (newCatName.trim()) addCatMutation.mutate()
          }}
        >
          <Input
            placeholder="Nueva categoría..."
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
          />
          <IconButton
            label="Agregar categoría"
            onClick={() => newCatName.trim() && addCatMutation.mutate()}
            className="ring-1 ring-slate-300 hover:bg-slate-50 hover:text-brand-600"
          >
            <Plus size={16} />
          </IconButton>
        </form>

        {addCatMutation.isError && (
          <p className="mt-2 text-xs text-red-600">{apiErrorMessage(addCatMutation.error)}</p>
        )}
      </Card>

      {mutation.isError && <Alert>{apiErrorMessage(mutation.error)}</Alert>}

      {/* Sticky en vez de fixed: así respeta el ancho del contenedor y no
          hay que replicar el ancho del sidebar, que puede estar contraído. */}
      {(dirty || saved) && (
        <div className="sticky bottom-4 z-20">
          <div className="flex items-center gap-3 rounded-xl bg-slate-900 px-4 py-3 shadow-lg shadow-slate-900/20">
            {saved && !dirty ? (
              <p className="flex items-center gap-2 text-sm font-medium text-emerald-400">
                <Check size={16} />
                Cambios guardados
              </p>
            ) : (
              <>
                <p className="min-w-0 flex-1 truncate text-sm text-slate-300">
                  Tienes cambios sin guardar
                </p>
                <Button
                  size="sm"
                  disabled={mutation.isPending}
                  onClick={() => mutation.mutate()}
                  className="shrink-0"
                >
                  {mutation.isPending ? 'Guardando...' : 'Guardar'}
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
