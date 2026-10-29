/**
 * El código de quien invitó, mientras la persona se registra.
 *
 * Llega en el link (/register?ref=DOMINOR) pero el negocio se crea más tarde,
 * en otra pantalla y a veces otro día: por eso se guarda en el navegador hasta
 * que se crea el negocio.
 */
const KEY = 'utracker:ref'

export function savePendingReferral(code: string) {
  const clean = code.trim().toUpperCase()
  if (!/^[A-Z0-9]{2,16}$/.test(clean)) return
  try {
    localStorage.setItem(KEY, clean)
  } catch {
    /* sin almacenamiento, el código se pierde y listo */
  }
}

export function readPendingReferral(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function clearPendingReferral() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* nada que limpiar */
  }
}

export function referralLink(code: string) {
  return `${window.location.origin}/register?ref=${encodeURIComponent(code)}`
}
