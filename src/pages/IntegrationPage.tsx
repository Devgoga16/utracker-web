import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ban, Check, Code2, Copy, Plus, Trash2 } from 'lucide-react'
import {
  createStoreKey,
  deleteStoreKey,
  listStoreKeys,
  revokeStoreKey,
  type StoreApiKey,
} from '@/api/storefront'
import { API_BASE_URL, apiErrorMessage } from '@/api/client'
import {
  Alert,
  Button,
  IconButton,
  Input,
  PageHeader,
  SettingGroup,
  SettingRow,
  Spinner,
} from '@/components/ui'
import { cn } from '@/lib/cn'

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <IconButton
      label={label}
      onClick={() => {
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 1800)
      }}
    >
      {copied ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
    </IconButton>
  )
}

/* ─────────── Llaves ─────────── */

function KeyRow({ apiKey }: { apiKey: StoreApiKey }) {
  const qc = useQueryClient()
  const [confirming, setConfirming] = useState<'revoke' | 'delete' | null>(null)
  const invalidate = () => qc.invalidateQueries({ queryKey: ['store-keys'] })

  const revoke = useMutation({ mutationFn: () => revokeStoreKey(apiKey._id), onSuccess: invalidate })
  const remove = useMutation({ mutationFn: () => deleteStoreKey(apiKey._id), onSuccess: invalidate })

  const dead = Boolean(apiKey.revokedAt)

  return (
    <tr className={cn(dead && 'opacity-50')}>
      <td className="px-3 py-2.5">
        <p className="text-sm font-medium text-slate-900">{apiKey.name}</p>
        <p className="text-xs text-slate-400">
          {dead
            ? 'Revocada'
            : apiKey.lastUsedAt
              ? `Usada ${new Date(apiKey.lastUsedAt).toLocaleDateString('es-PE')}`
              : 'Sin usar todavía'}
        </p>
      </td>
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          <code className="min-w-0 flex-1 truncate rounded bg-slate-100 px-2 py-1 font-mono text-xs text-slate-600">
            {dead ? '—' : apiKey.key}
          </code>
          {!dead && <CopyButton text={apiKey.key} label="Copiar llave" />}
        </div>
      </td>
      <td className="px-3 py-2.5 text-xs text-slate-500">
        {apiKey.allowedOrigins.length ? apiKey.allowedOrigins.join(', ') : 'Cualquiera'}
      </td>
      <td className="pr-2">
        {confirming ? (
          <div className="flex items-center gap-1.5 rounded-lg bg-red-50 px-2 py-1 ring-1 ring-red-200">
            <button
              type="button"
              onClick={() => (confirming === 'revoke' ? revoke.mutate() : remove.mutate())}
              className="text-xs font-semibold text-red-600 hover:underline"
            >
              Sí
            </button>
            <button
              type="button"
              onClick={() => setConfirming(null)}
              className="text-xs text-slate-500 hover:underline"
            >
              No
            </button>
          </div>
        ) : (
          <div className="flex justify-end gap-0.5">
            {!dead && (
              <IconButton
                label="Revocar"
                onClick={() => setConfirming('revoke')}
                className="hover:bg-amber-50 hover:text-amber-600"
              >
                <Ban size={15} />
              </IconButton>
            )}
            <IconButton
              label="Eliminar"
              onClick={() => setConfirming('delete')}
              className="hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 size={15} />
            </IconButton>
          </div>
        )}
      </td>
    </tr>
  )
}

/* ─────────── Página ─────────── */

export function IntegrationPage() {
  const qc = useQueryClient()
  const { data: keys, isLoading } = useQuery({ queryKey: ['store-keys'], queryFn: listStoreKeys })

  const [name, setName] = useState('')
  const [origins, setOrigins] = useState('')

  const create = useMutation({
    mutationFn: () =>
      createStoreKey({
        name: name.trim(),
        allowedOrigins: origins
          .split(',')
          .map((o) => o.trim())
          .filter(Boolean),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['store-keys'] })
      setName('')
      setOrigins('')
    },
  })

  // Para los ejemplos: la primera llave viva, o un marcador.
  const sample = keys?.find((k) => !k.revokedAt)?.key ?? 'TU_LLAVE'

  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader
        title="Integración"
        description="Arma tu tienda en tu propia web usando el catálogo de uTracker."
      />

      <SettingGroup
        title="Llaves de tienda"
        description="Cada web que integres usa su propia llave. Puedes revocarlas sin tocar las demás."
      >
        <SettingRow label="Nueva llave" wide>
          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault()
              if (name.trim()) create.mutate()
            }}
          >
            <Input
              placeholder="Nombre: Mi web, Landing..."
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              placeholder="Dominios (opcional): https://mitienda.com"
              value={origins}
              onChange={(e) => setOrigins(e.target.value)}
            />
            <Button type="submit" disabled={!name.trim() || create.isPending} className="shrink-0">
              <Plus size={15} />
              Crear
            </Button>
          </form>
          <p className="mt-1.5 text-xs text-slate-500">
            Separa varios dominios con coma. Si lo dejas vacío, la llave funciona desde cualquier
            sitio.
          </p>
          {create.isError && (
            <p className="mt-1.5 text-xs text-red-600">{apiErrorMessage(create.error)}</p>
          )}
        </SettingRow>

        <div className="px-4 py-3 sm:px-5">
          {isLoading ? (
            <Spinner />
          ) : !keys?.length ? (
            <p className="py-6 text-center text-sm text-slate-400">
              Todavía no tienes llaves. Crea una arriba para empezar.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg ring-1 ring-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                  <tr>
                    <th className="px-3 py-2">Nombre</th>
                    <th className="px-3 py-2">Llave</th>
                    <th className="px-3 py-2">Dominios</th>
                    <th className="w-20" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {keys.map((k) => (
                    <KeyRow key={k._id} apiKey={k} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </SettingGroup>

      {/* Seguridad: qué puede y qué no puede hacer la llave. */}
      <Alert>
        Esta llave es <strong>publicable</strong>: va en el navegador de tus visitantes, como las
        de Stripe. Solo da acceso a tu catálogo —que ya es público— y a iniciar una compra. Nunca
        a tus pedidos, clientes ni ajustes.
      </Alert>

      <SettingGroup title="Endpoints" description="Todos requieren la cabecera X-Store-Key.">
        <div className="overflow-x-auto px-4 py-3 sm:px-5">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              {[
                ['GET', '/storefront/config', 'Datos de la tienda, filtros y horarios'],
                ['GET', '/storefront/products', 'Catálogo completo con precios y stock'],
                ['GET', '/storefront/campaigns', 'Ventas programadas activas'],
                ['POST', '/storefront/checkout', 'Crea la compra y devuelve su URL'],
              ].map(([method, path, desc]) => (
                <tr key={path}>
                  <td className="py-2 pr-3 align-top">
                    <span
                      className={cn(
                        'rounded px-1.5 py-0.5 font-mono text-[10px] font-bold',
                        method === 'GET'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-brand-100 text-brand-700',
                      )}
                    >
                      {method}
                    </span>
                  </td>
                  <td className="py-2 pr-3 font-mono text-xs text-slate-700">{path}</td>
                  <td className="py-2 text-xs text-slate-500">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-slate-500">
            Base: <code className="font-mono text-slate-700">{API_BASE_URL}</code>
          </p>
        </div>
      </SettingGroup>

      <SettingGroup
        title="Cómo se usa"
        description="Tú armas la vitrina; el checkout lo hospedamos nosotros."
      >
        <div className="space-y-4 px-4 py-4 sm:px-5">
          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-800">
              <Code2 size={15} className="text-slate-400" />
              1 · Trae el catálogo
            </p>
            <CodeBlock
              code={`const res = await fetch('${API_BASE_URL}/storefront/products', {
  headers: { 'X-Store-Key': '${sample}' }
})
const { products } = await res.json()`}
            />
          </div>

          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-800">
              <Code2 size={15} className="text-slate-400" />
              2 · Manda el carrito a cobrar
            </p>
            <CodeBlock
              code={`const res = await fetch('${API_BASE_URL}/storefront/checkout', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Store-Key': '${sample}'
  },
  body: JSON.stringify({
    items: [{ productId: '...', quantity: 2, variant: 'M' }],
    returnUrl: 'https://mitienda.com/gracias'
  })
})
const { checkoutUrl } = await res.json()

// Se abre tu pantalla de checkout en una ventana aparte
window.open(checkoutUrl, 'utracker', 'width=520,height=760')`}
            />
          </div>

          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-800">
              <Code2 size={15} className="text-slate-400" />
              3 · Entérate cuando termine
            </p>
            <CodeBlock
              code={`window.addEventListener('message', (e) => {
  if (e.data?.source !== 'utracker') return
  if (e.data.type === 'checkout:completed') {
    vaciarCarrito()
    console.log('Seguimiento:', e.data.trackingUrl)
  }
})`}
            />
          </div>
        </div>
      </SettingGroup>
    </div>
  )
}

function CodeBlock({ code }: { code: string }) {
  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-xl bg-slate-900 p-3.5 pr-12 text-xs leading-relaxed text-slate-100">
        <code>{code}</code>
      </pre>
      <div className="absolute top-2 right-2">
        <CopyButton text={code} label="Copiar código" />
      </div>
    </div>
  )
}
