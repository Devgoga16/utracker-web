import { api } from './client'
import type { FinanceSummary, Order } from '@/types'

export interface FinanceFilters {
  from?: string
  to?: string
  fulfillmentStateId?: string
  paymentStateId?: string
  type?: string
  productId?: string
}

export async function getFinanceSummary(filters: FinanceFilters = {}) {
  const { data } = await api.get<FinanceSummary>('/finance/summary', { params: filters })
  return data
}

export async function getFinanceOrders(filters: FinanceFilters & { page?: number } = {}) {
  const { data } = await api.get<{ orders: Order[]; total: number; page: number; pages: number }>(
    '/finance/orders',
    { params: filters },
  )
  return data
}
