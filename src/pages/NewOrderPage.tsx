import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Check, Copy, Link2, Package, Plus, Trash2, Wrench } from 'lucide-react'
import { createOrder, createOrderLink } from '@/api/orders'
import { listProducts } from '@/api/products'
import { apiErrorMessage } from '@/api/client'
import {
  Alert,
  Badge,
  Button,
  Card,
  CheckboxField,
  Field,
  IconButton,
  Input,
  PageHeader,
  Select,
  Spinner,
} from '@/components/ui'
import { ImageUploader } from '@/components/ImageUploader'
import { formatCurrency, cn } from '@/lib/cn'
import { useAuthStore } from '@/stores/authStore'
import type { DaySchedule, Franja, OrderType } from '@/types'

const FRANJA_LABELS: Record<Franja, string> = {
  morning: 'Mañana',
  afternoon: 'Tarde',
  evening: 'Noche',
}
const ALL_FRANJAS: Franja[] = ['morning', 'afternoon', 'evening']

function getAvailableFranjas(schedule: DaySchedule[], dateStr: string): Franja[] {
  const day = new Date(dateStr + 'T12:00:00').getDay()
  const entry = schedule.find((d) => d.day === day)
  if (!entry) return []
  const openH = parseInt(entry.open.split(':')[0])
  const closeH = parseInt(entry.close.split(':')[0])
  const result: Franja[] = []
  if (openH < 12) result.push('morning')
  if (openH < 18 && closeH > 12) result.push('afternoon')
  if (closeH > 18) result.push('evening')
  return result
}

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
  const { activeTenant } = useAuthStore()
  const { data: catalog, isLoading } = useQuery({ queryKey: ['products'], queryFn: listProducts })

  const [lines, setLines] = useState<DraftLine[]>([])
  const [type, setType] = useState<OrderType>('pickup')
  const [customer, setCustomer] = useState({ name: '', phone: '', email: '', address: '' })
  const [notes, setNotes] = useState('')
  const [generatedLink, setGeneratedLink] = useState<{ url: string; expiresAt: string } | null>(null)
  const [hasAdvance, setHasAdvance] = useState(false)
  const [advance, setAdvance] = useState({ amount: 0, proofImageUrl: '' })
  const [copied, setCopied] = useState(false)
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledFranja, setScheduledFranja] = useState<Franja | null>(null)

  const tenantSchedule = activeTenant?.schedule ?? []
  const hasScheduleConfig = tenantSchedule.length > 0
  const availableFranjas = scheduledDate && hasScheduleConfig
    ? getAvailableFranjas(tenantSchedule, scheduledDate)
    : ALL_FRANJAS
  const isClosedDay = scheduledDate && hasScheduleConfig && availableFranjas.length === 0

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
        advance:
          hasAdvance && advance.amount > 0
            ? { amount: advance.amount, proofImageUrl: advance.proofImageUrl || undefined }
            : undefined,
        scheduledFor:
          scheduledDate && scheduledFranja
            ? { date: scheduledDate, franja: scheduledFranja }
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
      {
        key: nextKey(),
        name: '',
        unitPrice: 0,
        quantity: 1,
        specs: '',
        isService: true,
        isQuoted: false,
      },
    ])
  }

  function update(key: string, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)))
  }

  function copyLink() {
    if (!generatedLink) return
    navigator.clipboard.writeText(generatedLink.url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const missingAdHocName = lines.some((l) => !l.productId && !l.name.trim())
  const canCreate = lines.length > 0 && !!customer.name && !!customer.phone && !missingAdHocName

  if (isLoading) return <Spinner />

  return (
    <div className="space-y-6">
      <PageHeader backTo="/orders" backLabel="Volver a pedidos" title="Nuevo pedido" />

      {(orderMutation.isError || linkMutation.isError) && (
        <Alert>{apiErrorMessage(orderMutation.error ?? linkMutation.error)}</Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Qué incluye el pedido">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Select className="sm:flex-1" value="" onChange={(e) => addFromCatalog(e.target.value)}>
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
              <Button type="button" variant="secondary" className="shrink-0" onClick={addAdHoc}>
                <Plus size={15} />
                Línea libre
              </Button>
            </div>

            {lines.length === 0 ? (
              <div className="mt-4 rounded-xl border-2 border-dashed border-slate-200 px-4 py-8 text-center">
                <span className="mx-auto mb-2 flex size-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <Package size={18} />
                </span>
                <p className="text-sm text-slate-500">
                  Elige del catálogo o agrega una línea libre para empezar.
                </p>
              </div>
            ) : (
              <ul className="mt-4 space-y-3">
                {lines.map((line) => (
                  <li key={line.key} className="rounded-xl bg-slate-50 p-3">
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
                            Se cotiza por trabajo — indica el precio acordado
                          </p>
                        )}
                      </div>

                      <IconButton
                        label={`Quitar ${line.name || 'línea'}`}
                        tone="danger"
                        onClick={() => setLines((prev) => prev.filter((l) => l.key !== line.key))}
                        className="hover:bg-white"
                      >
                        <Trash2 size={14} />
                      </IconButton>
                    </div>

                    {/* En mobile cantidad y precio comparten fila y el subtotal
                        baja a la suya; desde sm entran los tres juntos. */}
                    <div className="mt-2 grid grid-cols-2 items-end gap-2 sm:grid-cols-[5rem_1fr_auto]">
                      <Field label="Cant." htmlFor={`q-${line.key}`}>
                        <Input
                          id={`q-${line.key}`}
                          type="number"
                          inputMode="numeric"
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
                          inputMode="decimal"
                          min={0}
                          step="0.01"
                          value={line.unitPrice || ''}
                          onChange={(e) => update(line.key, { unitPrice: Number(e.target.value) })}
                        />
                      </Field>
                      <p className="col-span-2 border-t border-slate-200 pt-2 text-right font-semibold tabular-nums whitespace-nowrap sm:col-span-1 sm:border-0 sm:pt-0 sm:pb-2">
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
              <div className="mt-4 flex items-center justify-between border-t-2 border-slate-100 pt-3">
                <span className="font-semibold">Total</span>
                <span className="text-lg font-bold tabular-nums">{formatCurrency(total)}</span>
              </div>
            )}
          </Card>

          <Card title="Cliente">
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
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
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
                <Field label="Fecha y franja de entrega (opcional)" htmlFor="sched-date">
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      id="sched-date"
                      type="date"
                      className="w-auto"
                      value={scheduledDate}
                      min={new Date().toISOString().slice(0, 10)}
                      onChange={(e) => {
                        setScheduledDate(e.target.value)
                        setScheduledFranja(null)
                      }}
                    />
                    {scheduledDate && availableFranjas.map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setScheduledFranja(scheduledFranja === f ? null : f)}
                        className={cn(
                          'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                          scheduledFranja === f
                            ? 'bg-brand-600 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
                        )}
                      >
                        {FRANJA_LABELS[f]}
                      </button>
                    ))}
                    {scheduledDate && (
                      <button
                        type="button"
                        onClick={() => { setScheduledDate(''); setScheduledFranja(null) }}
                        className="text-xs text-slate-400 hover:text-red-500"
                      >
                        Limpiar
                      </button>
                    )}
                  </div>
                  {isClosedDay && (
                    <p className="mt-1.5 text-xs text-amber-600">
                      Este día no está en tu horario de atención configurado.
                    </p>
                  )}
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Notas internas (opcional)" htmlFor="o-notes">
                  <Input id="o-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
                </Field>
              </div>
            </div>
          </Card>

          <Card>
            <CheckboxField
              label="El cliente dejó un adelanto"
              hint="Puedes cargarlo ahora o registrarlo después desde el detalle del pedido."
              checked={hasAdvance}
              onChange={setHasAdvance}
            />

            {hasAdvance && (
              <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
                <div className="max-w-[14rem]">
                  <Field label="Monto del adelanto" htmlFor="adv-amount">
                    <Input
                      id="adv-amount"
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="0.01"
                      value={advance.amount || ''}
                      onChange={(e) => setAdvance({ ...advance, amount: Number(e.target.value) })}
                    />
                  </Field>
                </div>
                <div>
                  <p className="mb-1.5 text-sm font-medium text-slate-700">
                    Foto del comprobante (opcional)
                  </p>
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
          <Card title="Cargar ahora" description="Registras el pedido con los datos que ya tienes.">
            <Button
              className="w-full"
              disabled={!canCreate || orderMutation.isPending}
              onClick={() => orderMutation.mutate()}
            >
              {orderMutation.isPending ? 'Creando...' : 'Crear pedido'}
            </Button>

            {lines.length > 0 && !canCreate && (
              <p className="mt-2 text-xs text-slate-500">
                {missingAdHocName
                  ? 'Falta nombrar una línea libre.'
                  : 'Falta el nombre o el teléfono del cliente.'}
              </p>
            )}
          </Card>

          <Card
            title="Enviar link al cliente"
            description="El cliente completa sus datos. El link vence en 24 horas."
          >
            {generatedLink ? (
              <div className="space-y-3">
                <div className="rounded-lg bg-slate-50 px-3 py-2.5 ring-1 ring-slate-200">
                  <p className="font-mono text-xs break-all text-slate-600">{generatedLink.url}</p>
                </div>
                <Button variant="secondary" className="w-full" onClick={copyLink}>
                  {copied ? <Check size={15} /> : <Copy size={15} />}
                  {copied ? 'Copiado' : 'Copiar link'}
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
                  <Link2 size={15} />
                  {linkMutation.isPending ? 'Generando...' : 'Generar link'}
                </Button>

                {lines.length > 0 && !canSendLink && (
                  <div className="mt-2 space-y-1.5">
                    <Badge tone="amber">No se puede enviar por link</Badge>
                    <p className="text-xs text-slate-500">
                      {quotedLines > 0
                        ? 'Hay ítems que se cotizan por trabajo: el cliente vería un precio que no acordaron. Carga el pedido tú.'
                        : 'Hay líneas libres, que no existen en el catálogo. Carga el pedido tú.'}
                    </p>
                  </div>
                )}
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
