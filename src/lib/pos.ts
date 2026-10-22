import { Banknote, CreditCard, Landmark, Smartphone, Wallet } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { PaymentMethodKind } from '@/types'

/** Los medios de pago, en el orden en que más se usan en un mostrador. */
export const PAYMENT_METHODS: { key: PaymentMethodKind; label: string; icon: LucideIcon }[] = [
  { key: 'cash', label: 'Efectivo', icon: Banknote },
  { key: 'yape', label: 'Yape', icon: Smartphone },
  { key: 'plin', label: 'Plin', icon: Smartphone },
  { key: 'card', label: 'Tarjeta', icon: CreditCard },
  { key: 'transfer', label: 'Transferencia', icon: Landmark },
  { key: 'other', label: 'Otro', icon: Wallet },
]

export const PAYMENT_METHOD_LABELS = Object.fromEntries(
  PAYMENT_METHODS.map((m) => [m.key, m.label]),
) as Record<PaymentMethodKind, string>

/** El código corto de una venta o pedido, el mismo que ve el cliente. */
export function saleCode(trackingToken: string) {
  return trackingToken.slice(-6).toUpperCase()
}

/** Redondeo a céntimos: sumar precios en coma flotante deja colas como 0.30000000004. */
export function round2(n: number) {
  return Math.round(n * 100) / 100
}
