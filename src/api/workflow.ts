import { api } from './client'
import type { MembershipRole, OrderType, WorkflowKind, WorkflowState } from '@/types'

export interface CreateStateInput {
  kind: WorkflowKind
  name: string
  color?: string
  icon?: string
  notifyCustomer?: boolean
  /** Tipos de entrega a los que aplica. Vacío o todos = sin restricción. */
  appliesTo?: OrderType[]
  allowedRoles?: MembershipRole[]
}

export interface UpdateStateInput {
  name?: string
  color?: string
  icon?: string
  isInitial?: boolean
  isFinal?: boolean
  notifyCustomer?: boolean
  vibrant?: boolean
  requiresLink?: boolean
  deductsStock?: boolean
  appliesTo?: OrderType[]
  allowedRoles?: MembershipRole[]
}

export async function createState(payload: CreateStateInput) {
  const { data } = await api.post<{ state: WorkflowState }>('/tenants/workflow/states', payload)
  return data.state
}

export async function updateState(id: string, payload: UpdateStateInput) {
  const { data } = await api.patch<{ state: WorkflowState }>(`/tenants/workflow/states/${id}`, payload)
  return data.state
}

export async function deleteState(id: string) {
  await api.delete(`/tenants/workflow/states/${id}`)
}

export async function reorderStates(kind: WorkflowKind, orderedIds: string[]) {
  const { data } = await api.patch<{ states: WorkflowState[] }>('/tenants/workflow/states/reorder', {
    kind,
    orderedIds,
  })
  return data.states
}
