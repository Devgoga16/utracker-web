import { api } from './client'
import type { AdminReferral, ReferralSummary } from '@/types'

/** Público: quién invita con ese código. 404 si no existe. */
export async function lookupReferral(code: string) {
  const { data } = await api.get<{ name: string; logoUrl: string | null; promoMonths: number }>(
    `/referrals/lookup/${encodeURIComponent(code)}`,
  )
  return data
}

export async function getMyReferrals() {
  const { data } = await api.get<ReferralSummary>('/referrals/me')
  return data
}

// --- Superadmin ---

export async function listAllReferrals() {
  const { data } = await api.get<{ referrals: AdminReferral[] }>('/superadmin/referrals')
  return data.referrals
}

export async function setReferralRejected(tenantId: string, rejected: boolean) {
  const { data } = await api.patch<{ rejected: boolean }>(`/superadmin/referrals/${tenantId}`, {
    rejected,
  })
  return data
}
