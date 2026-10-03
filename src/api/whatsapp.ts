import { api } from './client'

export type WaStatus = 'connected' | 'open' | 'connecting' | 'reconnecting' | 'close' | 'qr'

export interface WaStatusResponse {
  status: WaStatus
  connected: boolean
  /** data:image/png;base64,… mientras el bot espera que escaneen el QR. */
  qr?: string | null
  phone?: { number: string; name: string }
  /** false cuando al servidor le faltan las variables del bot. */
  configured: boolean
}

/**
 * El estado se pide a nuestra propia API, no al bot.
 *
 * La API key vive solo en el servidor: si el navegador llamara al bot
 * directamente, la key quedaría dentro del bundle y a la vista de cualquiera.
 */
export async function getWaStatus(): Promise<WaStatusResponse> {
  const { data } = await api.get<{ data: WaStatusResponse }>('/superadmin/whatsapp/status')
  return data.data
}

/** Envía un mensaje real, para comprobar la cadena completa de punta a punta. */
export async function sendWaTest(to: string, message?: string) {
  const { data } = await api.post<{ ok: boolean; to: string }>('/superadmin/whatsapp/test', {
    to,
    message,
  })
  return data
}
