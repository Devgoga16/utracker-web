import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

/**
 * Marco común de login y registro.
 *
 * Las dos pantallas eran una tarjeta suelta en el medio de un fondo gris, sin
 * salida: quien caía ahí por error no tenía cómo volver a la landing. Comparten
 * marco para que además no se vayan separando con el tiempo.
 */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className="relative flex min-h-full items-center justify-center overflow-hidden px-4 py-10 sm:px-6 sm:py-16">
      {/* Mismo halo del hero de la landing: se siente el mismo producto. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 size-[30rem] -translate-x-1/2 rounded-full bg-brand-500/15 blur-[110px]"
      />

      <div className="relative w-full max-w-sm">
        <Link
          to="/"
          className="focus-ring mb-6 inline-flex items-center gap-1.5 rounded-lg text-sm text-slate-500 transition-colors hover:text-slate-900"
        >
          <ArrowLeft size={15} />
          Volver al inicio
        </Link>

        <div className="rounded-2xl bg-white p-6 shadow-card ring-1 ring-slate-200 sm:p-7">
          <div className="flex items-center gap-2.5">
            <img src="/uTrackerLogo.png" alt="" className="size-9" />
            <span className="text-lg font-semibold tracking-tight text-slate-900">uTracker</span>
          </div>

          <h1 className="mt-5 text-xl font-bold tracking-tight text-slate-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}

          <div className="mt-6">{children}</div>
        </div>

        {footer && <div className="mt-5 text-center text-sm text-slate-500">{footer}</div>}
      </div>
    </div>
  )
}
