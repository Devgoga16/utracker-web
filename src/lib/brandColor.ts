/**
 * El dueño elige un solo color; acá se deriva la escala completa (50–900) que
 * usan las páginas públicas.
 *
 * Se conserva el tono y la saturación de lo que eligió, pero la luminosidad
 * sigue una rampa fija. Así un amarillo pálido no termina produciendo botones
 * con texto blanco ilegible: el 600 siempre tiene contraste suficiente.
 */

export const DEFAULT_BRAND = '#4f46e5'

/** Paleta sugerida en ajustes. Tonos que funcionan bien sobre fondo claro. */
export const BRAND_PRESETS = [
  { name: 'Índigo', hex: '#4f46e5' },
  { name: 'Violeta', hex: '#7c3aed' },
  { name: 'Fucsia', hex: '#c026d3' },
  { name: 'Rosa', hex: '#e11d48' },
  { name: 'Rojo', hex: '#dc2626' },
  { name: 'Naranja', hex: '#ea580c' },
  { name: 'Ámbar', hex: '#d97706' },
  { name: 'Lima', hex: '#65a30d' },
  { name: 'Esmeralda', hex: '#059669' },
  { name: 'Teal', hex: '#0d9488' },
  { name: 'Cielo', hex: '#0284c7' },
  { name: 'Azul', hex: '#2563eb' },
  { name: 'Pizarra', hex: '#475569' },
] as const

const RAMP: Record<number, number> = {
  50: 0.97,
  100: 0.94,
  200: 0.87,
  300: 0.78,
  400: 0.68,
  500: 0.6,
  600: 0.53,
  700: 0.45,
  800: 0.37,
  900: 0.29,
}

const SHADES = Object.keys(RAMP).map(Number)

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

export function isValidHex(hex: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(hex.trim())
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min

  if (d === 0) return { h: 0, s: 0, l }

  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h: number
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
  else if (max === g) h = ((b - r) / d + 2) / 6
  else h = ((r - g) / d + 4) / 6

  return { h, s, l }
}

function hslToHex(h: number, s: number, l: number): string {
  const hue2rgb = (p: number, q: number, t: number) => {
    let x = t
    if (x < 0) x += 1
    if (x > 1) x -= 1
    if (x < 1 / 6) return p + (q - p) * 6 * x
    if (x < 1 / 2) return q
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6
    return p
  }

  let r: number, g: number, b: number
  if (s === 0) {
    r = g = b = l
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }

  const toHex = (v: number) =>
    Math.round(clamp(v, 0, 1) * 255)
      .toString(16)
      .padStart(2, '0')

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

/** Escala completa derivada de un hex: { 50: '#…', …, 900: '#…' }. */
export function buildBrandRamp(hex: string): Record<number, string> {
  const base = isValidHex(hex) ? hex.trim() : DEFAULT_BRAND
  const { h, s } = hexToHsl(base)
  // Un gris puro no da una rampa útil; se le deja algo de color.
  const sat = clamp(s, 0.18, 0.95)

  const ramp: Record<number, string> = {}
  for (const shade of SHADES) ramp[shade] = hslToHex(h, sat, RAMP[shade])
  return ramp
}

/**
 * Pinta la escala en el documento. Las variables inline ganan sobre las que
 * define `@theme`, así que toda clase `*-brand-*` cambia de color.
 * Devuelve la función que restaura el índigo por defecto.
 */
export function applyBrandColor(hex: string | undefined | null): () => void {
  const root = document.documentElement
  const ramp = buildBrandRamp(hex ?? DEFAULT_BRAND)

  for (const [shade, value] of Object.entries(ramp)) {
    root.style.setProperty(`--color-brand-${shade}`, value)
  }

  return () => {
    for (const shade of SHADES) root.style.removeProperty(`--color-brand-${shade}`)
  }
}
