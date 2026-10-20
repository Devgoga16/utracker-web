import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Menu, X } from 'lucide-react'
import { cn } from '@/lib/cn'

export interface NavSection {
  href: string
  label: string
}

/**
 * Barra flotante: una píldora separada del borde, no una franja pegada arriba.
 *
 * Arriba de todo es transparente y se funde con el hero; apenas se baja un poco
 * toma fondo y sombra, porque desde ahí pasa por encima de contenido y sin
 * fondo los enlaces se pierden contra lo que tienen detrás.
 */
export function Nav({ sections }: { sections: NavSection[] }) {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    // Solo cambia un booleano: el estado se toca dos veces en todo el scroll,
    // no en cada evento.
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Escape cierra el menú, como cualquier otro panel que se abre encima.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const solid = scrolled || open

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-6">
      <div
        className={cn(
          'mx-auto max-w-5xl rounded-[1.4rem] transition-[background-color,box-shadow] duration-300 ease-snappy',
          solid
            ? 'bg-white/90 shadow-float ring-1 ring-slate-900/[0.06] backdrop-blur-md'
            : 'bg-transparent',
        )}
      >
        <div className="flex items-center gap-2 py-2 pr-2 pl-3 sm:pl-4">
          <a href="#top" className="focus-ring flex items-center gap-2 rounded-lg">
            <img src="/uTrackerLogo.png" alt="" width={28} height={28} className="size-7" />
            <span className="text-[1.05rem] font-semibold tracking-tight text-slate-900">
              uTracker
            </span>
          </a>

          <nav aria-label="Secciones" className="mx-auto hidden items-center gap-1 md:flex">
            {sections.map((section) => (
              <a
                key={section.href}
                href={section.href}
                className="focus-ring rounded-full px-3 py-1.5 text-sm text-slate-600 transition-colors duration-150 hover:bg-slate-900/[0.05] hover:text-slate-900"
              >
                {section.label}
              </a>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1 md:ml-0">
            {/* Ingresar es para quien ya es cliente; el botón oscuro, para el que no. */}
            <Link
              to="/login"
              className="focus-ring rounded-full px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
            >
              Ingresar
            </Link>
            <a
              href="#crear-cuenta"
              className="focus-ring group hidden items-center gap-1.5 rounded-full bg-ink py-2 pr-3 pl-4 text-sm font-medium text-white transition-[background-color,transform] duration-150 ease-snappy hover:bg-slate-800 active:scale-[.97] sm:inline-flex"
            >
              Crear cuenta
              <ArrowRight
                size={14}
                className="transition-transform duration-200 ease-snappy group-hover:translate-x-0.5"
              />
            </a>
            <button
              type="button"
              aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={open}
              aria-controls="menu-movil"
              onClick={() => setOpen((v) => !v)}
              className="focus-ring flex size-10 items-center justify-center rounded-full text-slate-700 transition-transform duration-150 ease-snappy active:scale-90 md:hidden"
            >
              {/*
                El ícono nuevo entra con un leve desenfoque: sin él se ven dos
                íconos distintos turnándose en vez de uno que cambia.
              */}
              <span
                key={open ? 'cerrar' : 'abrir'}
                className="transition-[opacity,transform,filter] duration-150 ease-snappy starting:scale-75 starting:opacity-0 starting:blur-[2px]"
              >
                {open ? <X size={19} /> : <Menu size={19} />}
              </span>
            </button>
          </div>
        </div>

        {open && (
          <nav
            id="menu-movil"
            aria-label="Secciones"
            className="origin-top px-2 pb-2 transition-[opacity,transform] duration-200 ease-snappy starting:-translate-y-1 starting:opacity-0 md:hidden"
          >
            <div className="border-t border-slate-900/[0.06] pt-2">
              {sections.map((section) => (
                <a
                  key={section.href}
                  href={section.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-xl px-3 py-3 text-[0.95rem] text-slate-700 active:bg-slate-100"
                >
                  {section.label}
                </a>
              ))}
              <a
                href="#crear-cuenta"
                onClick={() => setOpen(false)}
                className="mt-1 flex items-center justify-center gap-2 rounded-xl bg-ink px-3 py-3 text-sm font-medium text-white active:bg-slate-800"
              >
                Crear cuenta gratis
                <ArrowRight size={15} />
              </a>
            </div>
          </nav>
        )}
      </div>
    </header>
  )
}
