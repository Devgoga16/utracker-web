import { api } from './client'
import type { Plan, PlanFeatures, Subscription, SubscriptionStatus } from '@/types'

export interface SuperadminStats {
  totalTenants: number
  totalPlans: number
  ordersThisMonth: number
  subscriptions: { trial: number; active: number; suspended: number }
}

export interface TenantRow {
  _id: string
  name: string
  slug: string
  createdAt: string
  owner: { _id: string; name: string; email: string } | null
  subscription: Subscription | null
}

export const getSuperadminStats = () =>
  api.get<SuperadminStats>('/superadmin/stats').then((r) => r.data)

export const listSuperadminPlans = () =>
  api.get<Plan[]>('/superadmin/plans').then((r) => r.data)

export const createPlan = (data: {
  name: string
  description?: string
  price: number
  features: PlanFeatures
}) => api.post<Plan>('/superadmin/plans', data).then((r) => r.data)

export const updatePlan = (
  id: string,
  data: Partial<{ name: string; description: string; price: number; features: PlanFeatures; isActive: boolean }>
) => api.put<Plan>(`/superadmin/plans/${id}`, data).then((r) => r.data)

export const deletePlan = (id: string) =>
  api.delete(`/superadmin/plans/${id}`).then((r) => r.data)

export const listSuperadminTenants = () =>
  api.get<TenantRow[]>('/superadmin/tenants').then((r) => r.data)

export const assignSubscription = (
  tenantId: string,
  data: { planId: string; status: SubscriptionStatus; expiresAt?: string; notes?: string }
) => api.patch<Subscription>(`/superadmin/tenants/${tenantId}/subscription`, data).then((r) => r.data)

/** Qué se borró, para poder decírselo al superadmin después del hecho. */
export interface DeletedTenantSummary {
  orders: number
  products: number
  customers: number
  campaigns: number
  orderLinks: number
  stockMovements: number
  categories: number
  workflowStates: number
  bills: number
  subscriptions: number
  memberships: number
  images: number
}

/**
 * Borra el negocio y todo lo suyo. Irreversible.
 * `confirmName` debe ser el nombre exacto; el servidor lo verifica.
 */
export const deleteTenant = (tenantId: string, confirmName: string) =>
  api
    .delete<{ ok: boolean; deleted: DeletedTenantSummary }>(`/superadmin/tenants/${tenantId}`, {
      data: { confirmName },
    })
    .then((r) => r.data)
