import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, CornerDownLeft, Search } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

export interface PaletteItem {
  to: string
  label: string
  icon: LucideIcon
  /** Palabras extra con las que también se encuentra. */
  keywords?: string
}

/**
 * Buscador de todo el panel. Se abre con «/» o Ctrl+K desde cualquier pantalla.
 *
 * Lleva a cualquier sección escribiendo un pedazo de su nombre, y si lo escrito
 * parece un pedido —un código, un nombre, un producto— ofrece buscarlo en
 * Pedidos. Es lo que hace que moverse por el sistema no dependa del menú.
 */
export function CommandPalette({
  open,
  onClose,
  items,
}: {
  open: boolean
  onClose: () => void
  items: PaletteItem[]
}) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setQuery('')
    setActive(0)
    requestAnimationFrame(() => input.current?.focus())
  }, [open])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    const pages = items
      .filter((i) => !q || `${i.label} ${i.keywords ?? ''}`.toLowerCase().includes(q))
      .map((i) => ({ ...i, kind: 'page' as const }))
    if (!q) return pages
    return [
      { to: `/orders?q=${encodeURIComponent(query.trim())}`, label: `Buscar «${query.trim()}» en pedidos`, icon: Search, kind: 'search' as const },
      ...pages,
    ]
  }, [items, query])

  if (!open) return null

  const go = (to: string) => {
    onClose()
    navigate(to)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-slate-950/30 px-4 pt-[12vh]">
      <button type="button" aria-label="Cerrar" onClick={onClose} className="absolute inset-0 cursor-default" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Buscar"
        className="relative w-full max-w-lg overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_24px_48px_-12px_rgb(24_24_27/0.3)] transition-[opacity,transform] duration-150 ease-snappy starting:scale-[.98] starting:opacity-0"
      >
        <div className="flex items-center gap-2.5 border-b border-slate-200 px-4">
          <Search size={16} className="shrink-0 text-slate-400" />
          <input
            ref={input}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setActive(0)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose()
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setActive((i) => Math.min(i + 1, results.length - 1))
              }
              if (e.key === 'ArrowUp') {
                e.preventDefault()
                setActive((i) => Math.max(i - 1, 0))
              }
              if (e.key === 'Enter' && results[active]) go(results[active].to)
            }}
            placeholder="Busca un pedido o ve a una sección…"
            aria-label="Buscar"
            className="h-12 w-full bg-transparent text-[15px] text-slate-900 outline-none placeholder:text-slate-400"
          />
        </div>
        <ul className="max-h-80 overflow-y-auto p-1.5">
          {results.map((r, i) => (
            <li key={r.to}>
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => go(r.to)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[13px]',
                  i === active ? 'bg-slate-100 text-slate-900' : 'text-slate-600',
                )}
              >
                <r.icon size={15} className={r.kind === 'search' ? 'text-brand-500' : 'text-slate-400'} />
                <span className="min-w-0 flex-1 truncate">{r.label}</span>
                {i === active && <CornerDownLeft size={13} className="text-slate-400" />}
              </button>
            </li>
          ))}
          {!results.length && (
            <li className="flex items-center gap-2 px-3 py-6 text-[13px] text-slate-500">
              <ArrowRight size={14} />
              Nada coincide con lo que escribiste.
            </li>
          )}
        </ul>
      </div>
    </div>
  )
}
