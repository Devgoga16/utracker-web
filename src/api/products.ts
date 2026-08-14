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
  stock?: number
  trackStock?: boolean
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
