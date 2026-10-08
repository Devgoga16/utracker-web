import { api } from './client'
import type { Ticket, TicketCategory, TicketContext, TicketPriority } from '@/types'

/* ─────────── Lado del negocio ─────────── */

export const listMyTickets = () => api.get<Ticket[]>('/tickets').then((r) => r.data)

export const getMyTicket = (id: string) => api.get<Ticket>(`/tickets/${id}`).then((r) => r.data)

export const createTicket = (data: {
  subject: string
  body: string
  category?: TicketCategory
  priority?: TicketPriority
  context?: TicketContext
}) => api.post<Ticket>('/tickets', data).then((r) => r.data)

export const replyToTicket = (id: string, body: string) =>
  api.post<Ticket>(`/tickets/${id}/messages`, { body }).then((r) => r.data)

export const closeTicket = (id: string) =>
  api.patch<Ticket>(`/tickets/${id}/close`).then((r) => r.data)

/* ─────────── Reporte automático de errores del navegador ─────────── */

/**
 * Manda a los logs algo que se rompió en el navegador.
 *
 * Devuelve el `ref` para poder enlazar el ticket con el log exacto. No lanza:
 * fallar al reportar un error no debe convertirse en un segundo error.
 */
export async function reportClientError(data: {
  message: string
  stack?: string
  url?: string
  userAgent?: string
  action?: string
}): Promise<string | undefined> {
  try {
    const { data: res } = await api.post<{ ref: string }>('/logs/client', data)
    return res.ref
  } catch {
    return undefined
  }
}
