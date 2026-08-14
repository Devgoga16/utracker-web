import { api } from './client'
import type { Category } from '@/types'

export async function listCategories() {
  const { data } = await api.get<{ categories: Category[] }>('/categories')
  return data.categories
}

export async function createCategory(name: string) {
  const { data } = await api.post<{ category: Category }>('/categories', { name })
  return data.category
}

export async function deleteCategory(id: string) {
  await api.delete(`/categories/${id}`)
}
