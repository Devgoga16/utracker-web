const WA_BASE = import.meta.env.VITE_WHATSAPP_API_URL as string
const WA_KEY = import.meta.env.VITE_WHATSAPP_API_KEY as string

function waFetch(path: string, init?: RequestInit) {
  return fetch(`${WA_BASE}${path}`, {
    ...init,
    headers: {
      'accept': 'application/json',
      'x-api-key': WA_KEY,
      ...init?.headers,
    },
  }).then(async (r) => {
    const json = await r.json()
    if (!r.ok) throw new Error(json?.message ?? 'Error en WhatsApp API')
    return json
  })
}

export type WaStatus = 'connected' | 'open' | 'connecting' | 'reconnecting' | 'close' | 'qr'

export interface WaStatusResponse {
  status: WaStatus
  connected: boolean
  qr?: string | null
  phone?: { number: string; name: string }
}

export async function getWaStatus(): Promise<WaStatusResponse> {
  const json = await waFetch('/api/whatsapp/status')
  return json.data as WaStatusResponse
}
