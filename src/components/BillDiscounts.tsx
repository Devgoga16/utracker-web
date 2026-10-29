import { Gift } from 'lucide-react'
import { formatCurrency } from '@/lib/cn'
import type { Bill } from '@/types'

/** El precio del plan y por qué se cobra menos. Nada si la cuenta no tiene descuentos. */
export function BillDiscounts({ bill }: { bill: Bill }) {
  if (!bill.discounts?.length) return null

  return (
    <ul className="mt-2 space-y-0.5 text-xs">
      {bill.baseAmount !== undefined && (
        <li className="flex justify-between gap-3 text-slate-500">
          <span>Plan {bill.planName}</span>
          <span className="tabular-nums">{formatCurrency(bill.baseAmount)}</span>
        </li>
      )}
      {bill.discounts.map((d, i) => (
        <li key={i} className="flex justify-between gap-3 text-success-700">
          <span className="flex min-w-0 items-center gap-1">
            <Gift size={11} className="shrink-0" />
            <span className="truncate">{d.label}</span>
          </span>
          <span className="shrink-0 tabular-nums">−{formatCurrency(d.amount)}</span>
        </li>
      ))}
    </ul>
  )
}
