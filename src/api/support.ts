import { api } from './client'
import type {
  LogLevel,
  LogSource,
  MembershipRole,
  PaymentMethod,
  Subscription,
  SupportAccess,
  SystemLog,
  Ticket,
  TicketPriority,
  TicketStatus,
} from '@/types'

/* ─────────── Visor de logs ─────────── */

export interface LogListParams {
  level?: LogLevel
  source?: LogSource
  tenantId?: string
  q?: string
  ref?: string
  from?: string
  to?: string
  limit?: number
  skip?: number
}

export interface LogPage {
  logs: SystemLog[]
  total: number
  limit: number
  skip: number
  retentionDays: number
}

export const listLogs = (params: LogListParams = {}) =>
  api.get<LogPage>('/superadmin/logs', { params }).then((r) => r.data)

export interface LogStats {
  last24h: Record<LogLevel, number>
  errors7d: number
  top: { message: string; action?: string; count: number }[]
  retentionDays: number
}

export const getLogStats = () =>
  api.get<LogStats>('/superadmin/logs/stats').then((r) => r.data)

export const getLogByRef = (ref: string) =>
  api.get<SystemLog>(`/superadmin/logs/by-ref/${ref}`).then((r) => r.data)

/* ─────────── Ficha técnica del negocio ─────────── */

/** Un chequeo de configuración: lo que explica la mayoría de los "no me funciona". */
export interface HealthCheck {
  key: string
  label: string
  ok: boolean
  detail: string
}

export interface TenantDetail {
  tenant: {
    _id: string
    name: string
    slug: string
    logoUrl?: string
    phone?: string
    brandColor?: string
    deliveryTypes?: string[]
    deliveryFranjas?: string[]
    paymentMethods?: PaymentMethod[]
    lowStockThreshold?: number
    isActive: boolean
    createdAt: string
    whatsappMode: 'own' | 'shared'
  }
  subscription: Subscription | null
  members: {
    _id: string
    role: MembershipRole
    isActive: boolean
    user: { _id: string; name: string; email: string; isActive: boolean } | null
    createdAt: string
  }[]
  counts: {
    orders: number
    ordersThisMonth: number
    products: number
    activeProducts: number
    customers: number
    campaigns: number
    workflowStates: number
    openTickets: number
  }
  lastOrderAt: string | null
  health: HealthCheck[]
  recentErrors: {
    _id: string
    ref: string
    message: string
    action?: string
    statusCode?: number
    createdAt: string
  }[]
  supportAccesses: SupportAccess[]
}

export const getTenantDetail = (tenantId: string) =>
  api.get<TenantDetail>(`/superadmin/tenants/${tenantId}/detail`).then((r) => r.data)

/* ─────────── Accesos de soporte ─────────── */

export const grantSupportAccess = (
  tenantId: string,
  data: { reason: string; minutes: number; canWrite: boolean },
) =>
  api
    .post<SupportAccess>(`/superadmin/tenants/${tenantId}/support-access`, data)
    .then((r) => r.data)

export const listSupportAccesses = (params: { tenantId?: string; mine?: '1' } = {}) =>
  api.get<SupportAccess[]>('/superadmin/support-access', { params }).then((r) => r.data)

export const revokeSupportAccess = (id: string) =>
  api.delete<{ ok: boolean }>(`/superadmin/support-access/${id}`).then((r) => r.data)

/* ─────────── Bandeja de tickets ─────────── */

export interface TicketListParams {
  status?: TicketStatus
  priority?: TicketPriority
  category?: string
  tenantId?: string
  q?: string
  /** 'all' incluye resueltos y cerrados; por defecto solo lo pendiente. */
  scope?: 'all'
}

export const listAllTickets = (params: TicketListParams = {}) =>
  api.get<Ticket[]>('/superadmin/tickets', { params }).then((r) => r.data)

export interface TicketStats {
  byStatus: Record<TicketStatus, number>
  unread: number
  urgent: number
  open: number
}

export const getTicketStats = () =>
  api.get<TicketStats>('/superadmin/tickets/stats').then((r) => r.data)

export const getTicketAsSupport = (id: string) =>
  api.get<Ticket>(`/superadmin/tickets/${id}`).then((r) => r.data)

export const replyAsSupport = (
  id: string,
  data: { body: string; status?: TicketStatus; notify?: boolean },
) => api.post<Ticket>(`/superadmin/tickets/${id}/messages`, data).then((r) => r.data)

export const updateTicket = (
  id: string,
  data: { status?: TicketStatus; priority?: TicketPriority; assignToMe?: boolean },
) => api.patch<Ticket>(`/superadmin/tickets/${id}`, data).then((r) => r.data)
