import { api } from './client'
import type { Product, StockMovement } from '@/types'

export async function listInventory() {
  const { data } = await api.get<{ products: Product[] }>('/inventory')
  return data.products
}

export async function adjustStock(productId: string, delta: number, note?: string) {
  const { data } = await api.patch<{ stock: number }>(`/inventory/${productId}/adjust`, { delta, note })
  return data.stock
}

export async function listMovements(productId: string, limit = 50) {
  const { data } = await api.get<{ movements: StockMovement[] }>(`/inventory/${productId}/movements`, {
    params: { limit },
  })
  return data.movements
}
