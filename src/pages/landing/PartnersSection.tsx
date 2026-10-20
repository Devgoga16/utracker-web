import { useQuery } from '@tanstack/react-query'
import { listPartners, type Partner } from '@/api/showcase'
import { cn } from '@/lib/cn'
import { Reveal, usePrefersReducedMotion } from './primitives'

/** Desde cuántos negocios la fila se mueve; con menos, una fila quieta luce mejor. */
const MARQUEE_FROM = 6

/** Segundos por negocio: así la velocidad es la misma tenga 6 o 40. */
const SECONDS_PER_PARTNER = 3.5

/**
 * Los negocios que ya trabajan con uTracker.
 *
 * Salen de la base, y solo los que aceptaron aparecer: es su marca la que se
 * usa para promocionarnos. Sin ninguno, la sección no se dibuja — una fila
 * vacía de «socios» espanta más que no tenerla.
 *
 * No muestra cuántos son a propósito: la lista es de los que dieron permiso,
 * no de todos los clientes, y un número parcial diría algo que no es cierto.
 */
export function PartnersSection() {
  const reduced = usePrefersReducedMotion()

  const { data: partners } = useQuery({
    queryKey: ['partners'],
    queryFn: listPartners,
    staleTime: 5 * 60 * 1000,
  })

  if (!partners?.length) return null

  const moving = partners.length >= MARQUEE_FROM && !reduced

  return (
    <section
      aria-labelledby="socios-titulo"
      className="bg-paper pb-16 sm:pb-24"
    >
      <Reveal className="mx-auto max-w-6xl px-4 text-center sm:px-6">
        <p id="socios-titulo" className="text-xs font-semibold tracking-[0.14em] text-slate-500 uppercase">
          Negocios que ya trabajan con uTracker
        </p>
      </Reveal>

      {moving ? <Marquee partners={partners} /> : <Row partners={partners} />}
    </section>
  )
}

/** Pocos negocios, o movimiento reducido: una fila quieta que se envuelve. */
function Row({ partners }: { partners: Partner[] }) {
  return (
    <ul className="mx-auto mt-8 flex max-w-5xl flex-wrap justify-center gap-3 px-4 sm:px-6">
      {partners.map((partner, i) => (
        <li key={partner.slug}>
          {/* 50 ms entre uno y otro: se lee como una cascada sin hacer esperar. */}
          <Reveal delay={Math.min(i, 8) * 50}>
            <PartnerChip partner={partner} />
          </Reveal>
        </li>
      ))}
    </ul>
  )
}

/**
 * Muchos negocios: una cinta que corre sola.
 *
 * Son dos copias seguidas de la lista y se desplaza exactamente una copia, así
 * el salto al reiniciar no se ve. Se detiene al pasar el mouse y cuando algo
 * adentro recibe el foco: un link que se escapa no se puede tocar ni leer.
 * La copia es invisible para lectores de pantalla y para el tabulador, que si
 * no recorrerían cada negocio dos veces.
 */
function Marquee({ partners }: { partners: Partner[] }) {
  return (
    <Reveal className="mt-8">
      <div
        className="overflow-hidden"
        // Los bordes se desvanecen: la cinta entra y sale en vez de cortarse.
        style={{
          maskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
        }}
      >
        <div
          className="flex w-max animate-marquee hover:[animation-play-state:paused] focus-within:[animation-play-state:paused]"
          style={{ animationDuration: `${partners.length * SECONDS_PER_PARTNER}s` }}
        >
          {[0, 1].map((copy) => (
            <ul
              key={copy}
              aria-hidden={copy === 1 || undefined}
              className="flex shrink-0 gap-3 pr-3"
            >
              {partners.map((partner) => (
                <li key={partner.slug}>
                  <PartnerChip partner={partner} focusable={copy === 0} />
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </Reveal>
  )
}

function PartnerChip({ partner, focusable = true }: { partner: Partner; focusable?: boolean }) {
  const body = (
    <>
      <PartnerLogo partner={partner} />
      <span className="truncate text-sm font-semibold text-slate-800">{partner.name}</span>
    </>
  )

  const base =
    'flex max-w-64 items-center gap-3 rounded-2xl bg-white py-2.5 pr-4 pl-2.5 ring-1 ring-slate-900/[0.07]'

  // Sin tienda no hay a dónde llevar: se muestra, pero no se finge un link.
  if (!partner.storeUrl) return <div className={base}>{body}</div>

  return (
    <a
      href={partner.storeUrl}
      tabIndex={focusable ? undefined : -1}
      className={cn(
        base,
        'focus-ring transition-[box-shadow,transform] duration-200 ease-snappy hover:shadow-card-hover hover:ring-slate-300 active:scale-[.97]',
      )}
    >
      {body}
    </a>
  )
}

function PartnerLogo({ partner }: { partner: Partner }) {
  // Tamaño fijo y declarado: el logo no empuja la fila cuando termina de cargar.
  if (partner.logoUrl) {
    return (
      <img
        src={partner.logoUrl}
        alt=""
        width={36}
        height={36}
        loading="lazy"
        decoding="async"
        className="size-9 shrink-0 rounded-xl object-cover ring-1 ring-slate-200"
      />
    )
  }

  const color = partner.brandColor ?? '#64748b'
  return (
    <span
      className="flex size-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold"
      style={{ backgroundColor: `${color}1f`, color }}
    >
      {partner.name.charAt(0).toUpperCase()}
    </span>
  )
}
