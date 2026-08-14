import { api } from './client'
import type { Tenant, Workflow } from '@/types'

export async function listMyTenants() {
  const { data } = await api.get<{ tenants: Tenant[] }>('/tenants')
  return data.tenants
}

export async function createTenant(payload: { name: string }) {
  const { data } = await api.post<{ tenant: Tenant }>('/tenants', payload)
  return data.tenant
}

export async function updateTenantSettings(payload: { name?: string; logoUrl?: string | null }) {
  const { data } = await api.patch<{ tenant: Tenant }>('/tenants/settings', payload)
  return data.tenant
}

export async function getWorkflow() {
  const { data } = await api.get<Workflow>('/tenants/workflow')
  return data
}
