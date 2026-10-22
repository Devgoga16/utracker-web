import { api } from './client'
import type { User } from '@/types'

export interface SessionResponse {
  user: User
  accessToken: string
  refreshToken: string
}

export async function register(payload: { name: string; email: string; password: string }) {
  const { data } = await api.post<SessionResponse>('/auth/register', payload)
  return data
}

export async function login(payload: { email: string; password: string }) {
  const { data } = await api.post<SessionResponse>('/auth/login', payload)
  return data
}

/** Elegir contraseña nueva. Tras una temporal del superadmin no pide la actual. */
export async function changePassword(payload: { currentPassword?: string; newPassword: string }) {
  const { data } = await api.post<SessionResponse>('/auth/password', payload)
  return data
}
