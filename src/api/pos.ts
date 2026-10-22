import { api } from './client'
import type { CashSession, CashSummary, Order, PaymentMethodKind, PosSale } from '@/types'

export interface SaleItemInput {
  /** Sin esto es un ítem libre: entonces van `name` y `unitPrice`. */
  productId?: string
  name?: string
  unitPrice?: number
  quantity: number
  variant?: string
}

export interface CreateSaleInput {
  items: SaleItemInput[]
  method: PaymentMethodKind
  /** Solo en efectivo: con cuánto pagó. */
  received?: number
  customer?: { name?: string; phone?: string }
  note?: string
}

export interface SessionView {
  session: CashSession | null
  summary: CashSummary | null
  sales: PosSale[]
}

export async function getCurrentSession() {
  const { data } = await api.get<SessionView>('/pos/session')
  return data
}

export async function openSession(openingAmount: number) {
  const { data } = await api.post<{ session: CashSession }>('/pos/session', { openingAmount })
  return data.session
}

export async function addMovement(payload: { type: 'in' | 'out'; amount: number; note?: string }) {
  const { data } = await api.post<{ session: CashSession; summary: CashSummary }>(
    '/pos/session/movements',
    payload,
  )
  return data
}

export async function closeSession(payload: { countedCash: number; note?: string }) {
  const { data } = await api.post<{ session: CashSession }>('/pos/session/close', payload)
  return data.session
}

export async function createSale(payload: CreateSaleInput) {
  const { data } = await api.post<{ order: Order; change: number }>('/pos/sales', payload)
  return data
}

export async function voidSale(id: string) {
  const { data } = await api.post<{ order: Order; summary: CashSummary }>(`/pos/sales/${id}/void`)
  return data
}

export async function listSessions() {
  const { data } = await api.get<{ sessions: CashSession[] }>('/pos/sessions')
  return data.sessions
}

export async function getSession(id: string) {
  const { data } = await api.get<{ session: CashSession; summary: CashSummary; sales: PosSale[] }>(
    `/pos/sessions/${id}`,
  )
  return data
}
