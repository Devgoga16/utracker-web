import { api } from './client'

export interface SharedBotConfig {
  /** Si el servidor tiene URL y llave del bot compartido. */
  configured: boolean
  /** Lleva la sesión incluida; no es secreta. */
  sendUrl: string | null
  hasKey: boolean
}

/**
 * No consulta al bot: su API no expone estado ni QR porque la sesión se
 * administra por fuera de uTracker. Solo dice si tenemos credenciales.
 */
export async function getSharedBotConfig() {
  const { data } = await api.get<SharedBotConfig>('/superadmin/whatsapp/config')
  return data
}

/** Prueba de envío real. Sin `tenantId` usa el bot compartido. */
export async function sendWaTest(to: string, message?: string, tenantId?: string) {
  const { data } = await api.post<{ ok: boolean; to: string }>('/superadmin/whatsapp/test', {
    to,
    message,
    tenantId,
  })
  return data
}
