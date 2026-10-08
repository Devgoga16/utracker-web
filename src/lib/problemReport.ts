/**
 * Memoria corta de lo que se rompió en esta sesión.
 *
 * Cuando alguien reporta un problema casi nunca puede decir qué falló
 * exactamente: dice "no me deja guardar". Este búfer guarda las últimas
 * fallas reales —qué request, qué código, qué referencia del servidor— para
 * adjuntarlas al ticket sin pedirle nada al usuario.
 *
 * Vive en memoria a propósito: son pistas de este rato, no historial.
 */

export interface FailureEntry {
  at: Date
  /** "POST /orders → 500" */
  label: string
  /** Código del log del servidor, cuando vino. */
  ref?: string
  detail?: string
}

const MAX_ENTRIES = 8
const entries: FailureEntry[] = []

export function recordFailure(entry: Omit<FailureEntry, 'at'>) {
  entries.unshift({ ...entry, at: new Date() })
  if (entries.length > MAX_ENTRIES) entries.length = MAX_ENTRIES
}

export function recentFailures(): FailureEntry[] {
  return [...entries]
}

export function lastFailure(): FailureEntry | undefined {
  return entries[0]
}

/** El `ref` más reciente que el servidor haya devuelto, para enlazar el log. */
export function lastLogRef(): string | undefined {
  return entries.find((e) => e.ref)?.ref
}

export function clearFailures() {
  entries.length = 0
}

function hhmm(date: Date): string {
  return date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
}

/** Las fallas en texto plano, listas para pegarse en el cuerpo de un ticket. */
export function describeFailures(): string[] {
  return entries.map((e) => {
    const parts = [`${hhmm(e.at)} · ${e.label}`]
    if (e.ref) parts.push(`(ref ${e.ref})`)
    if (e.detail) parts.push(`— ${e.detail}`)
    return parts.join(' ')
  })
}

/** Lo que el navegador puede contar de sí mismo, sin tocar nada personal. */
export function browserContext() {
  return {
    url: window.location.href,
    userAgent: navigator.userAgent,
    appVersion: import.meta.env.VITE_APP_VERSION ?? 'dev',
  }
}
