import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'
import { Spinner } from '@/components/ui'
import { formatCurrency } from '@/lib/cn'
import { Package, Wrench } from 'lucide-react'
import type { Product, Tenant } from '@/types'

async function getStoreCatalog(slug: string) {
  const { data } = await api.get<{ tenant: Tenant; products: Product[] }>(`/store/${slug}`)
  return data
}

export function StorePage() {
  const { slug } = useParams<{ slug: string }>()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['store', slug],
    queryFn: () => getStoreCatalog(slug!),
    enabled: Boolean(slug),
  })

  if (isLoading) return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner />
    </div>
  )

  if (isError || !data) return (
    <div className="flex min-h-screen items-center justify-center text-slate-500">
      Negocio no encontrado.
    </div>
  )

  const { tenant, products } = data

  const categories = Array.from(
    new Set(products.map((p) => p.category ?? '').filter(Boolean))
  )
  const uncategorized = products.filter((p) => !p.category)

  const groups: { label: string; items: Product[] }[] = [
    ...categories.map((cat) => ({ label: cat, items: products.filter((p) => p.category === cat) })),
    ...(uncategorized.length ? [{ label: '', items: uncategorized }] : []),
  ]
  if (groups.length === 0) groups.push({ label: '', items: products })

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-4 sm:gap-4 sm:px-6 sm:py-5">
          {tenant.logoUrl ? (
            <img
              src={tenant.logoUrl}
              alt={tenant.name}
              className="size-12 rounded-full object-cover ring-1 ring-slate-200"
            />
          ) : (
            <div className="flex size-12 items-center justify-center rounded-full bg-brand-100 text-xl font-bold text-brand-600">
              {tenant.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold text-slate-900 sm:text-xl">{tenant.name}</h1>
            <p className="text-xs text-slate-400">Catálogo de productos y servicios</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-10 px-4 py-8 sm:px-6 sm:py-10">
        {products.length === 0 ? (
          <p className="text-center text-slate-400 py-20">Este negocio todavía no tiene productos publicados.</p>
        ) : (
          groups.map((group) => (
            <section key={group.label}>
              {group.label && (
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
                  {group.label}
                </h2>
              )}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {group.items.map((item) => (
                  <div
                    key={item._id}
                    className="flex flex-col rounded-xl bg-white ring-1 ring-slate-200 overflow-hidden"
                  >
                    {item.images?.[0] && (
                      <div>
                        <img
                          src={item.images[0]}
                          alt={item.name}
                          className="h-44 w-full object-cover"
                        />
                        {item.images.length > 1 && (
                          <div className="flex gap-1 border-t border-slate-100 bg-slate-50 p-1.5">
                            {item.images.slice(1).map((url) => (
                              <img
                                key={url}
                                src={url}
                                alt=""
                                className="size-12 rounded object-cover ring-1 ring-slate-200"
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="flex flex-1 flex-col p-4">
                      <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                        {item.kind === 'service' ? <Wrench size={12} /> : <Package size={12} />}
                        <span className="text-xs">
                          {item.kind === 'service' ? 'Servicio' : 'Producto'}
                        </span>
                      </div>
                      <p className="font-semibold text-slate-900">{item.name}</p>
                      {item.description && (
                        <p className="mt-1 text-sm text-slate-500 flex-1">{item.description}</p>
                      )}
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900">{formatCurrency(item.price)}</p>
                          {item.pricingMode === 'quoted' && (
                            <p className="text-xs text-amber-600">precio de referencia · se cotiza</p>
                          )}
                        </div>
                        <button
                          type="button"
                          disabled
                          className="shrink-0 cursor-not-allowed rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold whitespace-nowrap text-white opacity-40"
                          title="Próximamente"
                        >
                          Hacer pedido
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))
        )}
      </main>

      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        Powered by uTracker
      </footer>
    </div>
  )
}
