import axios from 'axios'
import { API_BASE_URL } from './client'
import { api } from './client'
import type { FeatureCatalog, FeatureMap, Plan } from '@/types'

// Públicos: sin auth ni cabecera de negocio. Axios pelado a propósito.
const publicApi = axios.create({ baseURL: `${API_BASE_URL}/plans` })

/** Los planes de la página de precios. */
export const listPublicPlans = () => publicApi.get<Plan[]>('/').then((r) => r.data)

/**
 * El catálogo de funcionalidades, con etiquetas y agrupación.
 *
 * Es lo que dibuja el formulario de planes: así una funcionalidad nueva en la
 * API aparece sola en el panel, sin tocar el front.
 */
export const getFeatureCatalog = () =>
  publicApi.get<FeatureCatalog>('/features').then((r) => r.data)

/* ─────────── Superadmin ─────────── */

export interface PlanInput {
  code?: string
  name: string
  description?: string
  price: number
  priceYearly?: number | null
  features: FeatureMap
  isPublic: boolean
  isActive: boolean
  sortOrder: number
}

export const listPlansAdmin = () => api.get<Plan[]>('/superadmin/plans').then((r) => r.data)

export const createPlan = (data: PlanInput) =>
  api.post<Plan>('/superadmin/plans', data).then((r) => r.data)

export const updatePlan = (id: string, data: Partial<PlanInput>) =>
  api.put<Plan>(`/superadmin/plans/${id}`, data).then((r) => r.data)

/** Si el plan está en uso no se borra: queda retirado. La respuesta lo dice. */
export const deletePlan = (id: string) =>
  api
    .delete<{ retired: boolean; deleted?: boolean; tenantCount?: number; message?: string }>(
      `/superadmin/plans/${id}`,
    )
    .then((r) => r.data)
