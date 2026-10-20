import { Link } from 'react-router-dom'
import type { NavSection } from './Nav'

/**
 * Cierre de la página, sobre la misma tinta que el registro de arriba: así el
 * formulario y el pie se leen como un solo final, no como dos bloques.
 */
export function Footer({ sections }: { sections: NavSection[] }) {
  return (
    <footer className="overflow-hidden bg-ink text-slate-400">
      <div className="mx-auto max-w-6xl px-4 pt-14 sm:px-6">
        <div className="flex flex-col gap-10 border-t border-white/10 pt-10 sm:flex-row sm:justify-between">
          <div className="max-w-xs">
            <div className="flex items-center gap-2.5">
              <img src="/uTrackerLogo.png" alt="" width={32} height={32} className="size-8" />
              <span className="text-lg font-semibold tracking-tight text-white">uTracker</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed">
              Pedidos, pagos y seguimiento para negocios que venden por WhatsApp e Instagram.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:gap-16">
            <nav aria-label="Producto">
              <p className="text-xs font-semibold tracking-[0.14em] text-slate-500 uppercase">
                Producto
              </p>
              <ul className="mt-4 space-y-2.5 text-sm">
                {sections.map((section) => (
                  <li key={section.href}>
                    <a href={section.href} className="transition-colors hover:text-white">
                      {section.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
            <nav aria-label="Cuenta">
              <p className="text-xs font-semibold tracking-[0.14em] text-slate-500 uppercase">
                Cuenta
              </p>
              <ul className="mt-4 space-y-2.5 text-sm">
                <li>
                  <a href="#crear-cuenta" className="transition-colors hover:text-white">
                    Crear cuenta
                  </a>
                </li>
                <li>
                  <Link to="/login" className="transition-colors hover:text-white">
                    Ingresar
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        </div>

        <p className="mt-12 text-xs text-slate-500">© {new Date().getFullYear()} uTracker</p>

        {/*
          La marca enorme, cortada por el borde inferior: es decorativa, por eso
          está escondida para lectores de pantalla (el nombre ya está arriba).
        */}
        <p
          aria-hidden
          className="mt-6 -mb-[0.22em] text-center text-[22vw] leading-none font-semibold tracking-[-0.06em] text-white/[0.06] select-none lg:text-[15rem]"
        >
          uTracker
        </p>
      </div>
    </footer>
  )
}
