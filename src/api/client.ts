import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/stores/authStore'
import { recordFailure } from '@/lib/problemReport'

/**
 * Única fuente de verdad de a dónde vive la API.
 *
 * Se define con VITE_API_URL (solo el origen, sin `/api`). Todo lo demás
 * —cliente autenticado, refresh y endpoints públicos— cuelga de acá, así que
 * cambiar de entorno es cambiar esta variable y nada más.
 *
 * Ojo: Vite la resuelve al compilar, no al ejecutar. Si la cambias en Vercel
 * hay que volver a desplegar para que tome efecto.
 */
export const API_BASE_URL = `${(
  import.meta.env.VITE_API_URL ?? 'http://localhost:4000'
).replace(/\/$/, '')}/api`

export const api = axios.create({
  baseURL: API_BASE_URL,
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

  // axios pelado a propósito: no debe pasar por los interceptores de `api`.
  const { data } = await axios.post<{ accessToken: string }>(`${API_BASE_URL}/auth/refresh`, {
    refreshToken,
  })
  useAuthStore.getState().setAccessToken(data.accessToken)
  return data.accessToken
}

/**
 * Anota la falla para poder adjuntarla a un ticket después.
 *
 * Se registra todo lo que falló, no solo los 5xx: un 400 inesperado es
 * exactamente lo que el usuario describe como "no me deja guardar", y sin
 * registro queda su palabra contra la nuestra.
 */
function noteApiFailure(error: AxiosError) {
  const config = error.config
  // El propio reporte de errores no se reporta: sería un bucle.
  if (config?.url?.includes('/logs/client')) return

  const status = error.response?.status
  if (status === 401) return // Token vencido: lo resuelve el refresh, no es una falla.

  const method = config?.method?.toUpperCase() ?? 'GET'
  const path = config?.url ?? '?'
  const data = error.response?.data as { message?: string; ref?: string } | undefined

  recordFailure({
    label: status ? `${method} ${path} → ${status}` : `${method} ${path} → sin respuesta`,
    ref: data?.ref,
    detail: data?.message ?? (status ? undefined : 'Puede ser conexión o la API caída'),
  })
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    noteApiFailure(error)

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

/**
 * Si este error vale la pena reportar a soporte.
 *
 * Un 4xx es el sistema funcionando: una validación, un permiso, algo que el
 * usuario corrige solo. Ofrecer "reportar" ahí sería invitar a abrir tickets
 * por mensajes que ya dicen qué hacer. Los 5xx y las caídas de red, en cambio,
 * no son culpa de nadie del otro lado de la pantalla.
 */
export function isReportableError(error: unknown): boolean {
  if (error instanceof AxiosError) {
    const status = error.response?.status
    if (status === undefined) return true // Sin respuesta: red caída o API muerta.
    return status >= 500
  }
  // Lo que no es de axios es un error de la aplicación: siempre interesa.
  return error instanceof Error
}

/** El código con el que soporte encuentra este error exacto en los logs. */
export function apiErrorRef(error: unknown): string | undefined {
  if (error instanceof AxiosError) {
    return (error.response?.data as { ref?: string })?.ref
  }
  return undefined
}
