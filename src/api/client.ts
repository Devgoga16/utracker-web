import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/stores/authStore'

export const api = axios.create({
  baseURL: '/api',
})

api.interceptors.request.use((config) => {
  const { accessToken, activeTenant } = useAuthStore.getState()

  if (accessToken) {
    config.headers.set('Authorization', `Bearer ${accessToken}`)
  }
  if (activeTenant) {
    config.headers.set('X-Tenant-Id', activeTenant._id)
  }

  return config
})

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean }

// Single in-flight refresh shared by all concurrent 401s.
let refreshPromise: Promise<string> | null = null

async function refreshAccessToken(): Promise<string> {
  const { refreshToken } = useAuthStore.getState()
  if (!refreshToken) throw new Error('No refresh token')

  const { data } = await axios.post<{ accessToken: string }>('/api/auth/refresh', { refreshToken })
  useAuthStore.getState().setAccessToken(data.accessToken)
  return data.accessToken
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetriableConfig | undefined
    const isAuthRoute = config?.url?.includes('/auth/')

    if (error.response?.status !== 401 || !config || config._retried || isAuthRoute) {
      return Promise.reject(error)
    }

    config._retried = true

    try {
      refreshPromise ??= refreshAccessToken().finally(() => {
        refreshPromise = null
      })
      await refreshPromise
      return api(config)
    } catch {
      useAuthStore.getState().logout()
      return Promise.reject(error)
    }
  },
)

export function apiErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    return (error.response?.data as { message?: string })?.message ?? error.message
  }
  return error instanceof Error ? error.message : 'Error inesperado'
}
