import { api } from './client'
import type { ProductFilter } from '@/types'

export async function listProductFilters() {
  const { data } = await api.get<{ filters: ProductFilter[] }>('/product-filters')
  return data.filters
}

export async function createProductFilter(payload: { name: string; values: string[] }) {
  const { data } = await api.post<{ filter: ProductFilter }>('/product-filters', payload)
  return data.filter
}

export async function updateProductFilter(
  id: string,
  payload: { name?: string; values?: string[]; position?: number },
) {
  const { data } = await api.patch<{ filter: ProductFilter }>(`/product-filters/${id}`, payload)
  return data.filter
}

export async function deleteProductFilter(id: string) {
  await api.delete(`/product-filters/${id}`)
}
