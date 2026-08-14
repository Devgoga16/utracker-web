import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Trash2, Wrench } from 'lucide-react'
import { createOrder, createOrderLink } from '@/api/orders'
import { listProducts } from '@/api/products'
import { apiErrorMessage } from '@/api/client'
import { Alert, Button, Card, Field, Input, Select, Spinner } from '@/components/ui'
import { ImageUploader } from '@/components/ImageUploader'
import { formatCurrency } from '@/lib/cn'
import type { OrderType } from '@/types'

interface DraftLine {
  key: string
  productId?: string
  name: string
  unitPrice: number
  quantity: number
  specs: string
  isService: boolean
  isQuoted: boolean
}

let lineCounter = 0
const nextKey = () => `line-${lineCounter++}`

export function NewOrderPage() {
  const navigate = useNavigate()
  const { data: catalog, isLoading } = useQuery({ queryKey: ['products'], queryFn: listProducts })

  const [lines, setLines] = useState<DraftLine[]>([])
  const [type, setType] = useState<OrderType>('pickup')
  const [customer, setCustomer] = useState({ name: '', phone: '', email: '', address: '' })
  const [notes, setNotes] = useState('')
  const [generatedLink, setGeneratedLink] = useState<{ url: string; expiresAt: string } | null>(null)
  const [hasAdvance, setHasAdvance] = useState(false)
  const [advance, setAdvance] = useState({ amount: 0, proofImageUrl: '' })

  const total = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0)

  // Links can only carry catalog items at an already-known price.
  const adHocLines = lines.filter((l) => !l.productId).length
  const quotedLines = lines.filter((l) => l.isQuoted).length
  const canSendLink = lines.length > 0 && adHocLines === 0 && quotedLines === 0

  const orderMutation = useMutation({
    mutationFn: () =>
      createOrder({
        customer,
        items: lines.map((l) => ({
          productId: l.productId,
          name: l.productId ? undefined : l.name,
          unitPrice: l.unitPrice,
          quantity: l.quantity,
          specs: l.specs || undefined,
        })),
        type,
        delivery: type === 'pickup' ? undefined : { address: customer.address },
        notes: notes || undefined,
        advance: hasAdvance && advance.amount > 0
          ? { amount: advance.amount, proofImageUrl: advance.proofImageUrl || undefined }
          : undefined,
      }),
    onSuccess: (order) => navigate(`/orders/${order._id}`),
  })

  const linkMutation = useMutation({
    mutationFn: () =>
      createOrderLink({
        items: lines.map((l) => ({ productId: l.productId!, quantity: l.quantity })),
        deliveryType: 'customer_choice',
      }),
    onSuccess: (data) =>
      setGeneratedLink({
        url: `${window.location.origin}/order/${data.link.token}`,
        expiresAt: data.expiresAt,
      }),
  })

  function addFromCatalog(productId: string) {
    const item = catalog?.find((p) => p._id === productId)
    if (!item) return
    setLines((prev) => [
      ...prev,
      {
        key: nextKey(),
        productId: item._id,
        name: item.name,
        unitPrice: item.price,
        quantity: 1,
        specs: '',
        isService: item.kind === 'service',
        isQuoted: item.pricingMode === 'quoted',
      },
    ])
  }

  function addAdHoc() {
    setLines((prev) => [
      ...prev,
      { key: nextKey(), name: '', unitPrice: 0, quantity: 1, specs: '', isService: true, isQuoted: false },
    ])
  }

  function update(key: string, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)))
  }

  const missingAdHocName = lines.some((l) => !l.productId && !l.name.trim())
  const canCreate =
    lines.length > 0 && !!customer.name && !!customer.phone && !missingAdHocName

  if (isLoading) return <Spinner />

  return (
    <div className="space-y-6">
      <div>
        <Link to="/orders" className="text-sm text-slate-500 hover:text-brand-600">
          ← Volver a pedidos
        </Link>
        <h1 className="mt-2 text-xl font-bold text-slate-900">Nuevo pedido</h1>
      </div>

      {(orderMutation.isError || linkMutation.isError) && (
        <Alert>{apiErrorMessage(orderMutation.error ?? linkMutation.error)}</Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <h2 className="mb-4 text-sm font-semibold text-slate-900">Qué incluye el pedido</h2>

            <div className="flex flex-wrap gap-2">
              <Select
                className="flex-1"
                value=""
                onChange={(e) => addFromCatalog(e.target.value)}
              >
                <option value="" disabled>
                  Agregar del catálogo...
                </option>
                {catalog?.map((item) => (
                  <option key={item._id} value={item._id}>
                    {item.kind === 'service' ? '[Servicio] ' : ''}
                    {item.name}
                    {item.pricingMode === 'quoted'
                      ? ' — a cotizar'
                      : ` — ${formatCurrency(item.price)}`}
                  </option>
                ))}
              </Select>
              <Button type="button" variant="secondary" onClick={addAdHoc}>
                + Línea libre
              </Button>
            </div>

            {lines.length > 0 && (
              <ul className="mt-4 space-y-3">
                {lines.map((line) => (
                  <li key={line.key} className="rounded-lg bg-slate-50 p-3">
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        {line.productId ? (
                          <p className="flex items-center gap-1.5 font-medium text-slate-900">
                            {line.isService && <Wrench size={13} className="text-slate-400" />}
                            {line.name}
                          </p>
                        ) : (
                          <Input
                            placeholder="Descripción del trabajo"
                            value={line.name}
                            onChange={(e) => update(line.key, { name: e.target.value })}
                          />
                        )}
                        {line.isQuoted && (
                          <p className="mt-1 text-xs text-amber-600">
                            Se cotiza por trabajo — indicá el precio acordado
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        aria-label={`Quitar ${line.name || 'línea'}`}
                        onClick={() => setLines((prev) => prev.filter((l) => l.key !== line.key))}
                        className="rounded p-1.5 text-slate-400 hover:bg-white hover:text-red-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div className="mt-2 grid grid-cols-[5rem_1fr_auto] items-end gap-2">
                      <Field label="Cant." htmlFor={`q-${line.key}`}>
                        <Input
                          id={`q-${line.key}`}
                          type="number"
                          min={1}
                          value={line.quantity}
                          onChange={(e) =>
                            update(line.key, { quantity: Math.max(1, Number(e.target.value)) })
                          }
                        />
                      </Field>
                      <Field label="Precio unitario" htmlFor={`p-${line.key}`}>
                        <Input
                          id={`p-${line.key}`}
                          type="number"
                          min={0}
                          step="0.01"
                          value={line.unitPrice || ''}
                          onChange={(e) => update(line.key, { unitPrice: Number(e.target.value) })}
                        />
                      </Field>
                      <p className="pb-2 text-right font-semibold whitespace-nowrap">
                        {formatCurrency(line.unitPrice * line.quantity)}
                      </p>
                    </div>

                    <div className="mt-2">
                      <Field label="Especificaciones (opcional)" htmlFor={`s-${line.key}`}>
                        <Input
                          id={`s-${line.key}`}
                          placeholder="Ej. 2x3m, texto 'Panadería Rosa', LED azul"
                          value={line.specs}
                          onChange={(e) => update(line.key, { specs: e.target.value })}
                        />
                      </Field>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {lines.length > 0 && (
              <div className="mt-4 flex items-center justify-between border-t-2 border-slate-200 pt-3">
                <span className="font-semibold">Total</span>
                <span className="text-base font-bold">{formatCurrency(total)}</span>
              </div>
            )}
          </Card>

          <Card>
            <h2 className="mb-4 text-sm font-semibold text-slate-900">Cliente</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nombre" htmlFor="c-name">
                <Input
                  id="c-name"
                  value={customer.name}
                  onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                />
              </Field>
              <Field label="Teléfono" htmlFor="c-phone">
                <Input
                  id="c-phone"
                  value={customer.phone}
                  onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                />
              </Field>
              <Field label="Email (opcional)" htmlFor="c-email">
                <Input
                  id="c-email"
                  type="email"
                  value={customer.email}
                  onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                />
              </Field>
              <Field label="Tipo de entrega" htmlFor="o-type">
                <Select
                  id="o-type"
                  value={type}
                  onChange={(e) => setType(e.target.value as OrderType)}
                >
                  <option value="pickup">Recojo en tienda</option>
                  <option value="delivery_third_party">Delivery por courier</option>
                  <option value="delivery_own">Delivery propio</option>
                </Select>
              </Field>
              {type !== 'pickup' && (
                <div className="sm:col-span-2">
                  <Field label="Dirección de entrega" htmlFor="c-address">
                    <Input
                      id="c-address"
                      value={customer.address}
                      onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                    />
                  </Field>
                </div>
              )}
              <div className="sm:col-span-2">
                <Field label="Notas internas (opcional)" htmlFor="o-notes">
                  <Input id="o-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
                </Field>
              </div>
            </div>
          </Card>

          <Card>
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={hasAdvance}
                onChange={(e) => setHasAdvance(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              <div>
                <p className="text-sm font-semibold text-slate-900">El cliente dejó un adelanto</p>
                <p className="text-xs text-slate-500">Podés cargarlo ahora o registrarlo después desde el detalle del pedido.</p>
              </div>
            </label>

            {hasAdvance && (
              <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
                <Field label="Monto del adelanto" htmlFor="adv-amount">
                  <Input
                    id="adv-amount"
                    type="number"
                    min={0}
                    step="0.01"
                    value={advance.amount || ''}
                    onChange={(e) => setAdvance({ ...advance, amount: Number(e.target.value) })}
                  />
                </Field>
                <div>
                  <p className="mb-1.5 text-sm font-medium text-slate-700">Foto del comprobante (opcional)</p>
                  <ImageUploader
                    max={1}
                    folder="payments"
                    value={advance.proofImageUrl ? [advance.proofImageUrl] : []}
                    onChange={(urls) => setAdvance({ ...advance, proofImageUrl: urls[0] ?? '' })}
                  />
                </div>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <h2 className="mb-1 text-sm font-semibold text-slate-900">Cargar ahora</h2>
            <p className="mb-4 text-xs text-slate-500">
              Registrás el pedido con los datos que ya tenés.
            </p>
            <Button
              className="w-full"
              disabled={!canCreate || orderMutation.isPending}
              onClick={() => orderMutation.mutate()}
            >
              {orderMutation.isPending ? 'Creando...' : 'Crear pedido'}
            </Button>
          </Card>

          <Card>
            <h2 className="mb-1 text-sm font-semibold text-slate-900">Enviar link al cliente</h2>
            <p className="mb-4 text-xs text-slate-500">
              El cliente completa sus datos. El link vence en 24 horas.
            </p>

            {generatedLink ? (
              <div className="space-y-3">
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="font-mono text-xs break-all text-slate-700">{generatedLink.url}</p>
                </div>
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => navigator.clipboard.writeText(generatedLink.url)}
                >
                  Copiar link
                </Button>
                <Button variant="ghost" className="w-full" onClick={() => setGeneratedLink(null)}>
                  Generar otro
                </Button>
              </div>
            ) : (
              <>
                <Button
                  variant="secondary"
                  className="w-full"
                  disabled={!canSendLink || linkMutation.isPending}
                  onClick={() => linkMutation.mutate()}
                >
                  {linkMutation.isPending ? 'Generando...' : 'Generar link'}
                </Button>
                {lines.length > 0 && !canSendLink && (
                  <p className="mt-2 text-xs text-slate-500">
                    {quotedLines > 0
                      ? 'Hay ítems que se cotizan por trabajo: el cliente vería un precio que no acordaron. Cargá el pedido vos.'
                      : 'Hay líneas libres, que no existen en el catálogo. Cargá el pedido vos.'}
                  </p>
                )}
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
