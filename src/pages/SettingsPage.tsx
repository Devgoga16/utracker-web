import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { updateTenantSettings } from '@/api/tenants'
import { createCategory, deleteCategory, listCategories } from '@/api/categories'
import { apiErrorMessage } from '@/api/client'
import { Alert, Button, Card, Field, Input } from '@/components/ui'
import { ImageUploader } from '@/components/ImageUploader'
import { useAuthStore } from '@/stores/authStore'
import { X } from 'lucide-react'

export function SettingsPage() {
  const { activeTenant, setActiveTenant } = useAuthStore()
  const queryClient = useQueryClient()

  const [name, setName] = useState(activeTenant?.name ?? '')
  const [logoUrls, setLogoUrls] = useState<string[]>(
    activeTenant?.logoUrl ? [activeTenant.logoUrl] : [],
  )
  const [saved, setSaved] = useState(false)

  const mutation = useMutation({
    mutationFn: () =>
      updateTenantSettings({
        name: name.trim() || undefined,
        logoUrl: logoUrls[0] ?? null,
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
    (logoUrls[0] ?? null) !== (activeTenant?.logoUrl ?? null)

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-900">Ajustes del negocio</h1>

      <Card className="max-w-lg">
        <h2 className="mb-1 text-sm font-semibold text-slate-900">Link de tu tienda pública</h2>
        <p className="mb-3 text-xs text-slate-500">
          Compartí este link para que tus clientes vean tu catálogo.
        </p>
        <div className="mb-2 rounded-lg bg-slate-50 p-2.5">
          <p className="font-mono text-xs break-all text-slate-600">{storeUrl}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={copyStoreUrl}>
            {copied ? 'Copiado' : 'Copiar link'}
          </Button>
          <a href={storeUrl} target="_blank" rel="noreferrer">
            <Button variant="ghost">Ver tienda</Button>
          </a>
        </div>
      </Card>

      <Card className="max-w-lg">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Logo</h2>
        <ImageUploader
          max={1}
          folder="logos"
          value={logoUrls}
          onChange={setLogoUrls}
        />
        {logoUrls[0] && (
          <button
            type="button"
            onClick={() => setLogoUrls([])}
            className="mt-2 text-xs text-slate-400 hover:text-red-600"
          >
            Quitar logo
          </button>
        )}
      </Card>

      <Card className="max-w-lg">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Nombre del negocio</h2>
        <Field label="Nombre" htmlFor="s-name">
          <Input
            id="s-name"
            value={name}
            onChange={(e) => { setName(e.target.value); setSaved(false) }}
          />
        </Field>
      </Card>

      <Card className="max-w-lg">
        <h2 className="mb-1 text-sm font-semibold text-slate-900">Categorías del catálogo</h2>
        <p className="mb-4 text-xs text-slate-500">
          Definí las categorías una vez y reutilizalas al crear o editar productos.
        </p>

        {categories && categories.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {categories.map((cat) => (
              <span
                key={cat._id}
                className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 pl-3 pr-1.5 py-1 text-xs font-medium text-slate-700"
              >
                {cat.name}
                <button
                  type="button"
                  aria-label={`Eliminar ${cat.name}`}
                  onClick={() => deleteCatMutation.mutate(cat._id)}
                  className="rounded-full p-0.5 hover:bg-slate-200 hover:text-red-600"
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
          <Button type="submit" variant="secondary" disabled={!newCatName.trim() || addCatMutation.isPending}>
            Agregar
          </Button>
        </form>
        {addCatMutation.isError && (
          <p className="mt-2 text-xs text-red-600">{apiErrorMessage(addCatMutation.error)}</p>
        )}
      </Card>

      {mutation.isError && <Alert>{apiErrorMessage(mutation.error)}</Alert>}

      <div className="flex items-center gap-3">
        <Button
          disabled={!dirty || mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? 'Guardando...' : 'Guardar cambios'}
        </Button>
        {saved && <span className="text-sm text-emerald-600">Guardado</span>}
      </div>
    </div>
  )
}
