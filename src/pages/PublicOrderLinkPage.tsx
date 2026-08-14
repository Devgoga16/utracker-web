import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { CircleCheck, Clock } from 'lucide-react'
import { confirmPublicOrderLink, getPublicOrderLink } from '@/api/orderLinks'
import { apiErrorMessage } from '@/api/client'
import { Alert, Button, Card, Field, Input, Select, Spinner } from '@/components/ui'
import { formatCurrency } from '@/lib/cn'

type DeliveryChoice = 'pickup' | 'delivery_third_party' | 'delivery_own'

export function PublicOrderLinkPage() {
  const { token } = useParams<{ token: string }>()

  const { data: link, isLoading, isError, error } = useQuery({
    queryKey: ['order-link', token],
    queryFn: () => getPublicOrderLink(token!),
    enabled: Boolean(token),
    retry: false,
  })

  const [customer, setCustomer] = useState({ name: '', phone: '', email: '', address: '' })
  const [deliveryType, setDeliveryType] = useState<DeliveryChoice>('pickup')

  const confirmMutation = useMutation({
    mutationFn: () =>
      confirmPublicOrderLink(token!, {
        customer,
        deliveryType,
        delivery: deliveryType === 'pickup' ? undefined : { address: customer.address },
      }),
  })

  const total =
    link?.items.reduce((sum, item) => sum + item.product.price * item.quantity, 0) ?? 0

  if (isLoading) return <Spinner />

  if (isError) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 sm:px-6 sm:py-20">
        <Alert>{apiErrorMessage(error)}</Alert>
        <p className="mt-4 text-center text-sm text-slate-500">
          Pedile al negocio que te envíe un link nuevo.
        </p>
      </div>
    )
  }

  if (confirmMutation.isSuccess) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center sm:px-6 sm:py-20">
        <CircleCheck size={56} className="mx-auto text-emerald-600" strokeWidth={1.5} />
        <h1 className="mt-4 text-xl font-bold text-slate-900">¡Pedido confirmado!</h1>
        <p className="mt-2 text-sm text-slate-500">
          {link?.tenant.name} ya recibió tu pedido y va a empezar a prepararlo.
        </p>
        <a href={`/track/${confirmMutation.data.trackingToken}`}>
          <Button className="mt-6">Seguir mi pedido →</Button>
        </a>
        <p className="mt-3 text-xs text-slate-400">
          Guardá este enlace para consultar el estado cuando quieras.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md space-y-5 px-4 py-8 sm:px-6 sm:py-10">
      <div className="text-center">
        <h1 className="text-lg font-bold text-slate-900">{link?.tenant.name}</h1>
        <p className="text-sm text-slate-500">Confirmá tu pedido</p>
      </div>

      {link && <ExpiryCountdown expiresAt={link.expiresAt} />}

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Tu pedido</h2>
        <table className="w-full text-sm">
          <tbody className="divide-y divide-slate-100">
            {link?.items.map((item, i) => (
              <tr key={i}>
                <td className="w-full py-2.5 pr-2 break-words">
                  {item.product.name}
                  {item.variant && <span className="text-slate-500"> · {item.variant}</span>}
                </td>
                <td className="py-2.5 pr-2 text-center whitespace-nowrap text-slate-500">
                  ×{item.quantity}
                </td>
                <td className="py-2.5 text-right whitespace-nowrap">
                  {formatCurrency(item.product.price * item.quantity)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-slate-200">
            <tr>
              <td colSpan={2} className="py-3 font-semibold">
                Total
              </td>
              <td className="py-3 text-right text-base font-bold">{formatCurrency(total)}</td>
            </tr>
          </tfoot>
        </table>
      </Card>

      <Card>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            confirmMutation.mutate()
          }}
        >
          {confirmMutation.isError && <Alert>{apiErrorMessage(confirmMutation.error)}</Alert>}

          <Field label="Tu nombre" htmlFor="pc-name">
            <Input
              id="pc-name"
              required
              value={customer.name}
              onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
            />
          </Field>

          <Field label="Teléfono / WhatsApp" htmlFor="pc-phone">
            <Input
              id="pc-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              required
              value={customer.phone}
              onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
            />
          </Field>

          <Field label="Email (opcional)" htmlFor="pc-email">
            <Input
              id="pc-email"
              type="email"
              value={customer.email}
              onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
            />
          </Field>

          {link?.deliveryType === 'customer_choice' && (
            <Field label="¿Cómo lo querés recibir?" htmlFor="pc-delivery">
              <Select
                id="pc-delivery"
                value={deliveryType}
                onChange={(e) => setDeliveryType(e.target.value as DeliveryChoice)}
              >
                <option value="pickup">Lo recojo en tienda</option>
                <option value="delivery_own">Delivery a mi dirección</option>
              </Select>
            </Field>
          )}

          {deliveryType !== 'pickup' && (
            <Field label="Dirección de entrega" htmlFor="pc-address">
              <Input
                id="pc-address"
                required
                value={customer.address}
                onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
              />
            </Field>
          )}

          <Button type="submit" className="w-full" disabled={confirmMutation.isPending}>
            {confirmMutation.isPending ? 'Confirmando...' : 'Confirmar pedido →'}
          </Button>
        </form>
      </Card>
    </div>
  )
}

function ExpiryCountdown({ expiresAt }: { expiresAt: string }) {
  const [remaining, setRemaining] = useState(() => new Date(expiresAt).getTime() - Date.now())

  useEffect(() => {
    const timer = setInterval(() => {
      setRemaining(new Date(expiresAt).getTime() - Date.now())
    }, 1000)
    return () => clearInterval(timer)
  }, [expiresAt])

  if (remaining <= 0) {
    return <Alert>Este link expiró. Pedile al negocio que te envíe uno nuevo.</Alert>
  }

  const hours = Math.floor(remaining / 3_600_000)
  const minutes = Math.floor((remaining % 3_600_000) / 60_000)
  const seconds = Math.floor((remaining % 60_000) / 1000)

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 rounded-lg bg-amber-50 px-4 py-2.5 text-center text-sm text-amber-800 ring-1 ring-amber-200">
      <Clock size={15} className="shrink-0" />
      Este link vence en{' '}
      <span className="font-mono font-semibold">
        {hours}h {String(minutes).padStart(2, '0')}m {String(seconds).padStart(2, '0')}s
      </span>
    </div>
  )
}
