import { App } from '@capacitor/app'
import { isNativeApp } from '@/lib/platform'

/**
 * Pantallas a las que se puede entrar directo desde afuera de la app: los
 * atajos del ícono (mantener presionado) y los links `utracker://app/...`.
 *
 * Es una lista cerrada a propósito: un link de afuera no debería poder llevar
 * a cualquier ruta del panel.
 */
const DEEP_LINKS: Record<string, string> = {
  '/pos': '/pos',
  '/orders/new': '/orders/new',
  '/orders': '/orders',
  '/today': '/today',
}

function pathFromAppUrl(url: string): string | null {
  const match = /^utracker:\/\/app(\/[a-z/]*)?/i.exec(url)
  if (!match) return null
  return DEEP_LINKS[(match[1] ?? '/today').replace(/\/$/, '') || '/today'] ?? null
}

/** Engancha la web con Android: atajos del ícono y links directos. */
export function initNativeShell(navigate: (path: string) => void) {
  if (!isNativeApp) return

  const open = (url: string | undefined) => {
    const path = url ? pathFromAppUrl(url) : null
    if (path) navigate(path)
  }

  // Con la app abierta o en segundo plano.
  void App.addListener('appUrlOpen', ({ url }) => open(url))
  // Con la app cerrada: el atajo la abre y hay que llevarla a la pantalla.
  void App.getLaunchUrl().then((launch) => open(launch?.url))
}
