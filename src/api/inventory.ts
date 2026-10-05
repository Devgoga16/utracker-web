import { api } from './client'
import type { Product, StockMovement } from '@/types'

/** Producto de inventario con su proyección de agotamiento. */
export interface InventoryRow extends Product {
  /** Umbral efectivo: el del producto, o el del negocio si no tiene propio. */
  threshold: number
  soldLastDays: number
  perDay: number
  /** Días hasta agotarse al ritmo actual. null si no hubo ventas que medir. */
  daysLeft: number | null
}

export async function listInventory() {
  const { data } = await api.get<{ products: InventoryRow[]; velocityDays: number }>('/inventory')
  return data
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
