import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

/**
 * Piezas compartidas de la landing.
 *
 * Vivían dentro de LandingPage.tsx, pero las secciones nuevas —precios y
 * registro— necesitan las mismas, y duplicarlas sería garantizar que con el
 * tiempo cada sección tenga su propio tamaño de título.
 */

/** Aparece cuando entra en pantalla. Respeta quien pidió menos movimiento. */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode
  delay?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true)
          observer.disconnect()
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn(
        /*
         * Solo opacidad y posición: son las dos propiedades que el navegador
         * anima sin recalcular la página. El desenfoque que había acá se
         * aplicaba a secciones enteras, maquetas incluidas, y costaba caro.
         *
         * Con movimiento reducido no se desplaza: solo aparece con un
         * fundido, que ayuda a leer el orden sin mover nada.
         */
        'transition-[opacity,transform] duration-700 ease-snappy',
        shown ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 motion-reduce:translate-y-0',
        className,
      )}
    >
      {children}
    </div>
  )
}

/** Etiqueta chica sobre un título: dice de qué trata la sección antes de leerla. */
export function Eyebrow({ children, dark }: { children: ReactNode; dark?: boolean }) {
  return (
    <p
      className={cn(
        'inline-flex items-center gap-2 text-xs font-semibold tracking-[0.14em] uppercase',
        dark ? 'text-brand-300' : 'text-brand-600',
      )}
    >
      <span aria-hidden className="h-px w-6 bg-current opacity-60" />
      {children}
    </p>
  )
}

export function Headline({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h2
      className={cn(
        'text-[2.25rem] leading-[1.02] font-semibold tracking-[-0.035em] text-balance sm:text-5xl lg:text-[3.6rem]',
        className,
      )}
    >
      {children}
    </h2>
  )
}

/**
 * La palabra que se destaca dentro de un título, en serif cursiva.
 *
 * Es lo que le da voz propia a la landing: el resto es una sans sobria, y el
 * contraste se nota justo donde está la idea. Un poco más grande, porque a
 * igual tamaño una serif se ve más chica que la sans de al lado.
 */
export function Accent({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'font-display text-[1.08em] font-normal tracking-[-0.01em] italic',
        className,
      )}
    >
      {children}
    </span>
  )
}

export function Lede({ children, dark }: { children: ReactNode; dark?: boolean }) {
  return (
    <p
      className={cn(
        'text-lg leading-relaxed sm:text-xl',
        dark ? 'text-slate-400' : 'text-slate-500',
      )}
    >
      {children}
    </p>
  )
}

/** Botón-enlace grande, el que se repite en los llamados a la acción. */
export function CtaLink({
  children,
  tone = 'solid',
  className,
  ...props
}: {
  children: ReactNode
  tone?: 'solid' | 'quiet' | 'light'
} & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  const tones = {
    solid: 'bg-ink text-white hover:bg-slate-800 shadow-float',
    quiet: 'text-slate-700 ring-1 ring-slate-900/10 hover:bg-white',
    light: 'bg-white text-slate-900 hover:bg-slate-100 shadow-card',
  } as const

  return (
    <a
      className={cn(
        'focus-ring group inline-flex w-full items-center justify-center gap-2 rounded-full px-7 py-3.5 text-base font-medium transition-[background-color,transform] duration-150 ease-snappy active:scale-[.97] sm:w-auto',
        tones[tone],
        className,
      )}
      {...props}
    >
      {children}
    </a>
  )
}

/**
 * Halo de color detrás de una sección.
 *
 * Es un degradado radial y no un círculo con `blur`: se ve igual, pero un
 * desenfoque de 110 px se recalcula en cada scroll y en Safari se nota.
 */
export function Halo({
  className,
  strength = 18,
  color = 'var(--color-brand-500)',
}: {
  className?: string
  /** Intensidad en el centro, en porcentaje. */
  strength?: number
  color?: string
}) {
  return (
    <div
      aria-hidden
      className={cn('pointer-events-none absolute rounded-full', className)}
      style={{
        background: `radial-gradient(closest-side, color-mix(in srgb, ${color} ${strength}%, transparent), transparent)`,
      }}
    />
  )
}

/** Si quien mira pidió menos movimiento al sistema. Se actualiza si lo cambia. */
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  return reduced
}
