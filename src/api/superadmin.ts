import { api } from './client'
import type { AdminUser, Subscription, SubscriptionStatus } from '@/types'

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
  /** Aparece como socio en el landing. */
  showcase?: boolean
}

export const getSuperadminStats = () =>
  api.get<SuperadminStats>('/superadmin/stats').then((r) => r.data)

export const listSuperadminTenants = () =>
  api.get<TenantRow[]>('/superadmin/tenants').then((r) => r.data)

export const assignSubscription = (
  tenantId: string,
  data: {
    planId: string
    status: SubscriptionStatus
    expiresAt?: string
    notes?: string
    /**
     * Excepciones solo para este negocio. Se mezclan con las que ya tenía;
     * mandar `null` en una clave la quita y vuelve a mandar el plan.
     */
    overrides?: Record<string, boolean | number | null>
  },
) => api.patch<Subscription>(`/superadmin/tenants/${tenantId}/subscription`, data).then((r) => r.data)

/** Muestra u oculta al negocio en la sección de socios del landing. */
export const setTenantShowcase = (tenantId: string, showcase: boolean) =>
  api
    .patch<{ showcase: boolean }>(`/superadmin/tenants/${tenantId}/showcase`, { showcase })
    .then((r) => r.data)

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

/* ─────────── Sesión de WhatsApp por negocio ─────────── */

export interface TenantWhatsapp {
  /** 'shared' = usa el bot de uTracker; 'own' = sesión propia del negocio. */
  mode: 'shared' | 'own'
  sendUrl: string | null
  /** Últimos 6 de la API key. La completa nunca vuelve del servidor. */
  keyHint: string | null
}

export const getTenantWhatsapp = (tenantId: string) =>
  api.get<TenantWhatsapp>(`/superadmin/tenants/${tenantId}/whatsapp`).then((r) => r.data)

export const setTenantWhatsapp = (
  tenantId: string,
  data: { sendUrl: string | null; apiKey: string | null },
) => api.patch<TenantWhatsapp>(`/superadmin/tenants/${tenantId}/whatsapp`, data).then((r) => r.data)

/** Prueba de envío. Con tenantId usa la sesión de ese negocio. */
export const sendWhatsappTest = (data: { to: string; message?: string; tenantId?: string }) =>
  api.post<{ ok: boolean; to: string }>('/superadmin/whatsapp/test', data).then((r) => r.data)

/* ── Cuentas de personas ── */

export const listAdminUsers = (q: string) =>
  api.get<{ users: AdminUser[] }>('/superadmin/users', { params: { q } }).then((r) => r.data.users)

export const changeUserEmail = (userId: string, email: string) =>
  api
    .patch<{ user: { _id: string; name: string; email: string } }>(`/superadmin/users/${userId}/email`, { email })
    .then((r) => r.data.user)

/** Devuelve la contraseña temporal: es la única vez que se puede ver. */
export const resetUserPassword = (userId: string) =>
  api
    .post<{ temporaryPassword: string; email: string; name: string }>(`/superadmin/users/${userId}/reset-password`)
    .then((r) => r.data)
