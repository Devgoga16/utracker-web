import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Tenant, User } from '@/types'

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  activeTenant: Tenant | null
  setSession: (session: { user: User; accessToken: string; refreshToken: string }) => void
  setAccessToken: (token: string) => void
  setActiveTenant: (tenant: Tenant | null) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      activeTenant: null,

      setSession: ({ user, accessToken, refreshToken }) => set({ user, accessToken, refreshToken }),

      setAccessToken: (accessToken) => set({ accessToken }),

      setActiveTenant: (activeTenant) => set({ activeTenant }),

      logout: () => set({ user: null, accessToken: null, refreshToken: null, activeTenant: null }),
    }),
    { name: 'utracker-auth' },
  ),
)
