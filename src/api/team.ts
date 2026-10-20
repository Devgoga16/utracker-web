import axios from 'axios'
import { api, API_BASE_URL } from './client'
import type { MembershipRole, PublicInvitation, Team, TeamMember, User, Tenant } from '@/types'

/* ─────────── Lado del negocio ─────────── */

export const getTeam = () => api.get<Team>('/team').then((r) => r.data)

export interface InviteResult {
  invitation: {
    _id: string
    email: string
    role: MembershipRole
    phone?: string
    expiresAt: string
    url: string
  }
  emailSent: boolean
  whatsappSent: boolean
  /** Siempre vuelve: si el correo no salió, es el plan B. */
  url: string
}

export const inviteMember = (data: { email: string; role: MembershipRole; phone?: string }) =>
  api.post<InviteResult>('/team/invitations', data).then((r) => r.data)

export const cancelInvitation = (id: string) =>
  api.delete<{ ok: boolean }>(`/team/invitations/${id}`).then((r) => r.data)

export const updateMember = (id: string, data: { role?: MembershipRole; isActive?: boolean }) =>
  api.patch<TeamMember>(`/team/members/${id}`, data).then((r) => r.data)

export const removeMember = (id: string) =>
  api.delete<{ ok: boolean }>(`/team/members/${id}`).then((r) => r.data)

/* ─────────── Lo que abre el invitado ─────────── */

// Público: sin auth ni cabecera de negocio. El token de la URL es la credencial.
const publicApi = axios.create({ baseURL: `${API_BASE_URL}/invitations` })

export const getPublicInvitation = (token: string) =>
  publicApi.get<PublicInvitation>(`/${token}`).then((r) => r.data)

export interface AcceptResult {
  user: User
  accessToken: string
  refreshToken: string
  tenant: Tenant | null
}

export const acceptInvitation = (token: string, data: { name?: string; password: string }) =>
  publicApi.post<AcceptResult>(`/${token}/accept`, data).then((r) => r.data)
