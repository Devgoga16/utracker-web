import { Capacitor } from '@capacitor/core'

/**
 * Corre dentro de la app de Android, no en un navegador.
 *
 * La app empaqueta esta misma web y la sirve desde `https://app.utracker`, un
 * origen que no existe en internet. Por eso todo link que se comparte con un
 * cliente (tienda, seguimiento, campaña) tiene que armarse con la URL pública,
 * no con `window.location.origin`.
 */
export const isNativeApp = Capacitor.isNativePlatform()

const PUBLIC_WEB_URL = (
  import.meta.env.VITE_PUBLIC_WEB_URL ?? 'https://utracker.unify-tc.com'
).replace(/\/$/, '')

/** El origen de la web pública: el de la página en el navegador, el de producción en la app. */
export function publicOrigin(): string {
  return isNativeApp ? PUBLIC_WEB_URL : window.location.origin
}
