import type { TicketCategory, TicketPriority, TicketStatus } from '@/types'

/** Etiquetas y tonos compartidos entre el portal del negocio y la bandeja de soporte. */

type Tone = 'brand' | 'green' | 'amber' | 'red' | 'slate'

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Abierto',
  in_progress: 'En revisión',
  waiting_customer: 'Esperando tu respuesta',
  resolved: 'Resuelto',
  closed: 'Cerrado',
}

/** Lo mismo, pero visto desde soporte: quien espera es el negocio, no "vos". */
export const TICKET_STATUS_LABELS_SUPPORT: Record<TicketStatus, string> = {
  ...TICKET_STATUS_LABELS,
  waiting_customer: 'Esperando al negocio',
}

export const TICKET_STATUS_TONES: Record<TicketStatus, Tone> = {
  open: 'red',
  in_progress: 'amber',
  waiting_customer: 'brand',
  resolved: 'green',
  closed: 'slate',
}

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: 'Baja',
  normal: 'Normal',
  high: 'Alta',
  urgent: 'Urgente',
}

export const TICKET_PRIORITY_TONES: Record<TicketPriority, Tone> = {
  low: 'slate',
  normal: 'slate',
  high: 'amber',
  urgent: 'red',
}

export const TICKET_CATEGORY_LABELS: Record<TicketCategory, string> = {
  error: 'Error',
  question: 'Duda',
  billing: 'Suscripción',
  feature: 'Mejora',
  other: 'Otro',
}

/** "hace 5 min", "hace 3 h", "hace 2 d". Para listas donde la fecha exacta estorba. */
export function timeAgo(value: string | Date): string {
  const diff = Date.now() - new Date(value).getTime()
  const minutes = Math.round(diff / 60000)

  if (minutes < 1) return 'ahora'
  if (minutes < 60) return `hace ${minutes} min`

  const hours = Math.round(minutes / 60)
  if (hours < 24) return `hace ${hours} h`

  const days = Math.round(hours / 24)
  if (days < 30) return `hace ${days} d`

  return new Date(value).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })
}
