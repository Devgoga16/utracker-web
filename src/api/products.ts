import { api } from './client'
import type { CatalogKind, PricingMode, Product } from '@/types'

export interface ProductInput {
  kind: CatalogKind
  pricingMode: PricingMode
  name: string
  description?: string
  price: number
  category?: string
  images?: string[]
  /** Valores elegidos por filtro. El servidor descarta lo que no exista. */
  attributes?: { filter: string; values: string[] }[]
  stock?: number
  trackStock?: boolean
  lowStockThreshold?: number | null
  variants?: { name: string; priceModifier: number }[]
  /** Si está, las variantes pueblan y se asignan a ese filtro solas. */
  variantFilter?: string | null
  preparationDays?: number
  requiresAdvance?: boolean
  advanceType?: 'fixed' | 'percent'
  advanceValue?: number
}

export async function listProducts() {
  const { data } = await api.get<{ products: Product[] }>('/products')
  return data.products
}

export async function createProduct(payload: ProductInput) {
  const { data } = await api.post<{ product: Product }>('/products', payload)
  return data.product
}

export async function updateProduct(id: string, payload: Partial<ProductInput>) {
  const { data } = await api.patch<{ product: Product }>(`/products/${id}`, payload)
  return data.product
}

export async function deleteProduct(id: string) {
  await api.delete(`/products/${id}`)
}
