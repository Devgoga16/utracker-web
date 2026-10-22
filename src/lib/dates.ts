import type { Franja } from '@/types'

/**
 * Fechas del panel, en un solo lugar.
 *
 * Las fechas de entrega se guardan como texto "2026-10-20", sin hora ni zona.
 * Aquí se comparan como texto y "hoy" es el día local de quien mira, nunca
 * el UTC: desde las 7 p. m. en Lima, UTC ya es el día siguiente.
 */

const pad = (n: number) => String(n).padStart(2, '0')

/** "2026-10-20" de hoy, en la hora local. */
export function localToday(offsetDays = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function parse(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Días de `from` a `to` (positivo si `to` es posterior). */
export function daysBetween(from: string, to: string): number {
  return Math.round((parse(to).getTime() - parse(from).getTime()) / 86_400_000)
}

/** «lun 20 oct» */
export function shortDay(iso: string): string {
  return parse(iso).toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short' })
}

/** «Lunes 20 de octubre» */
export function longDay(iso: string): string {
  const label = parse(iso).toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

/**
 * Cómo está una fecha respecto de hoy, en palabras: «hoy», «mañana», «ayer»,
 * «hace 3 días», «en 5 días». Siempre acompaña a la fecha explícita, nunca la
 * reemplaza: «lun 18 oct · hace 2 días».
 */
export function relativeDay(iso: string, today = localToday()): string {
  const diff = daysBetween(today, iso)
  if (diff === 0) return 'hoy'
  if (diff === 1) return 'mañana'
  if (diff === -1) return 'ayer'
  return diff < 0 ? `hace ${-diff} días` : `en ${diff} días`
}

/**
 * Los turnos de entrega. Se dicen «Turno mañana» y no «Mañana» a secas: junto
 * a una fecha, «Mañana» se leía como «el día siguiente» y un pedido atrasado
 * parecía programado para mañana.
 */
export const FRANJA_LABELS: Record<Franja, string> = {
  morning: 'Turno mañana',
  afternoon: 'Turno tarde',
  evening: 'Turno noche',
}

/** Para elegir el turno, donde la pregunta ya dice «¿a qué hora?». */
export const FRANJA_SHORT: Record<Franja, string> = {
  morning: 'En la mañana',
  afternoon: 'En la tarde',
  evening: 'En la noche',
}

export const FRANJA_ORDER: Record<Franja, number> = { morning: 0, afternoon: 1, evening: 2 }
