import { api } from './client'
import type { Campaign, CampaignStatus, Tenant } from '@/types'

// ─── Owner ────────────────────────────────────────────────────────────────────

export async function listCampaigns() {
  const { data } = await api.get<{ campaigns: Campaign[] }>('/campaigns')
  return data.campaigns
}

export async function getCampaign(id: string) {
  const { data } = await api.get<{ campaign: Campaign }>(`/campaigns/${id}`)
  return data.campaign
}

export interface CampaignItemInput {
  productId: string
  stock: number
}

export interface CreateCampaignInput {
  name: string
  description?: string
  startDate: string
  endDate: string
  items: CampaignItemInput[]
  deliveryTypes: string[]
  schedule?: { franjas: string[] }
}

export async function createCampaign(payload: CreateCampaignInput) {
  const { data } = await api.post<{ campaign: Campaign }>('/campaigns', payload)
  return data.campaign
}

export async function deleteCampaign(id: string) {
  await api.delete(`/campaigns/${id}`)
}

export async function updateCampaign(
  id: string,
  payload: Partial<CreateCampaignInput> & { status?: CampaignStatus },
) {
  const { data } = await api.patch<{ campaign: Campaign }>(`/campaigns/${id}`, payload)
  return data.campaign
}

// ─── Public ───────────────────────────────────────────────────────────────────

/** La vista pública muestra la campaña con la identidad de la tienda. */
export interface PublicCampaignResponse {
  campaign: Campaign
  tenant: Pick<Tenant, '_id' | 'name' | 'slug' | 'logoUrl' | 'phone' | 'brandColor'> | null
}

export async function getPublicCampaign(token: string) {
  const { data } = await api.get<PublicCampaignResponse>(`/campaigns/public/${token}`)
  return data
}

export interface CampaignOrderInput {
  customer: { name: string; phone: string; email?: string }
  orderItems: { productId: string; quantity: number }[]
  type: string
  address?: string
  scheduledFor?: { date: string; franja: string }
}

export async function confirmCampaignOrder(token: string, payload: CampaignOrderInput) {
  const { data } = await api.post<{ order: any; trackingUrl: string }>(
    `/campaigns/public/${token}/order`,
    payload,
  )
  return data
}
