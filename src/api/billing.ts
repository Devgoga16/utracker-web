import { api } from './client'
import type { Bill, BillStatus } from '@/types'

// --- Owner ---

export async function getMyBills() {
  const { data } = await api.get<{ bills: Bill[] }>('/billing/me')
  return data.bills
}

export async function uploadBillingProofFile(file: File): Promise<string> {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post<{ url: string }>('/billing/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data.url
}

export async function submitBillingProof(id: string, proofImageUrl: string) {
  const { data } = await api.patch<{ bill: Bill }>(`/billing/${id}/proof`, { proofImageUrl })
  return data.bill
}

// --- Superadmin ---

export async function listSuperadminBills(params?: { status?: BillStatus; period?: string }) {
  const { data } = await api.get<{ bills: Bill[]; total: number }>('/superadmin/bills', { params })
  return data
}

export async function generateBills(period?: string) {
  const { data } = await api.post<{ created: number; period: string }>('/superadmin/bills/generate', period ? { period } : {})
  return data
}

export async function updateSuperadminBill(id: string, payload: { status?: BillStatus; notes?: string }) {
  const { data } = await api.patch<{ bill: Bill }>(`/superadmin/bills/${id}`, payload)
  return data.bill
}

export async function toggleTenantSubscription(tenantId: string) {
  const { data } = await api.patch<{ status: string }>(`/superadmin/tenants/${tenantId}/toggle`)
  return data
}
