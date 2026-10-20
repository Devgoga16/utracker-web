import axios from 'axios'
import { API_BASE_URL } from './client'

/** Un negocio que aceptó aparecer como socio en la web de uTracker. */
export interface Partner {
  name: string
  slug: string
  logoUrl: string | null
  brandColor: string | null
  /** Solo si su tienda pública existe. */
  storeUrl: string | null
}

// Público: sin sesión ni cabecera de negocio.
const publicApi = axios.create({ baseURL: `${API_BASE_URL}/showcase` })

export const listPartners = () => publicApi.get<Partner[]>('/').then((r) => r.data)
