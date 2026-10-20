import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { Check, ClipboardList, Package, Smartphone, Wallet, Workflow } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Accent, Eyebrow, Headline, Lede, Reveal } from './primitives'
import { CatalogMock, OrdersMock, PaymentsMock, TrackingMock, WorkflowMock } from './mocks'

interface Feature {
  key: string
  tab: string
  icon: LucideIcon
  title: ReactNode
  body: string
  points: string[]
  mock: ReactNode
}

const FEATURES: Feature[] = [
  {
    key: 'pedidos',
    tab: 'Pedidos',
    icon: ClipboardList,
    title: (
      <>
        Todos tus pedidos, <Accent>de un vistazo.</Accent>
      </>
    ),
    body: 'Quién pidió, en qué estado está, cuánto debe y cuándo se entrega. Sin abrir uno por uno.',
    points: [
      'Filtra por estado con un toque.',
      'Adelanto, saldo o pendiente, en la misma fila.',
      'Productos, entrega, historial y pagos en el detalle.',
    ],
    mock: (
      <div className="w-full max-w-xl">
        <OrdersMock />
      </div>
    ),
  },
  {
    key: 'estados',
    tab: 'Estados',
    icon: Workflow,
    title: (
      <>
        Tus estados, <Accent>tus reglas.</Accent>
      </>
    ),
    body: 'Ningún negocio trabaja igual. Crea los estados que usas de verdad y arrástralos hasta que el orden sea el tuyo.',
    points: [
      'Nombre, color e ícono para cada estado.',
      'Decide qué roles pueden mover un pedido hasta ahí.',
      'Un estado puede avisarle al cliente cuando el pedido llega.',
      'Otro te pide el link del courier al pasar.',
    ],
    mock: (
      <div className="w-full max-w-sm">
        <WorkflowMock />
      </div>
    ),
  },
  {
    key: 'seguimiento',
    tab: 'Seguimiento',
    icon: Smartphone,
    title: (
      <>
        Tu cliente pregunta menos. <Accent>Porque ya sabe.</Accent>
      </>
    ),
    body: 'Cada pedido nace con su propio link. Se lo mandas por WhatsApp y ahí ve el estado, lo que pidió y cuánto le falta pagar.',
    points: [
      'Sin descargar nada y sin crear una cuenta.',
      'Se actualiza solo cada medio minuto.',
      'Si el envío tiene rastreo del courier, aparece como un botón.',
    ],
    mock: <TrackingMock />,
  },
  {
    key: 'pagos',
    tab: 'Pagos',
    icon: Wallet,
    title: (
      <>
        Adelanto, saldo <Accent>y comprobante.</Accent>
      </>
    ),
    body: 'Pide adelanto al armar el pedido. Tu cliente sube la foto del Yape, el Plin o el depósito, y tú lo validas.',
    points: [
      'El estado de pago se acomoda solo.',
      'La foto queda pegada al pago, con fecha y nota.',
      'Un pago mal cargado se borra y todo se recalcula.',
    ],
    mock: (
      <div className="w-full max-w-sm">
        <PaymentsMock />
      </div>
    ),
  },
  {
    key: 'catalogo',
    tab: 'Catálogo',
    icon: Package,
    title: (
      <>
        Productos y servicios, <Accent>en la misma vitrina.</Accent>
      </>
    ),
    body: 'Lo que vendes tal cual y lo que cotizas por trabajo conviven sin pelearse, con fotos y categorías.',
    points: [
      'Precio fijo o «a cotizar» para el trabajo a medida.',
      'Algo fuera del catálogo entra igual al pedido.',
      'Filtros propios para que tu tienda se recorra fácil.',
    ],
    mock: (
      <div className="w-full max-w-xl">
        <CatalogMock />
      </div>
    ),
  },
]

/**
 * El producto por partes, en pestañas.
 *
 * Antes eran cinco secciones seguidas, una por funcionalidad, y había que
 * bajar mucho para ver la última. En pestañas se ve todo sin salir de una
 * pantalla, y quien quiere ver solo pagos va directo a pagos.
 *
 * Los paneles están todos montados y superpuestos en la misma celda: el alto
 * no salta al cambiar de pestaña y el cambio es un fundido, que solo mueve
 * opacidad y posición. En el teléfono, donde apilados quedarían huecos
 * enormes, solo se muestra el activo.
 */
export function FeatureTabs() {
  const [active, setActive] = useState(0)
  const tabs = useRef<(HTMLButtonElement | null)[]>([])

  // Flechas, Inicio y Fin, como cualquier grupo de pestañas.
  const onKeyDown = (e: KeyboardEvent) => {
    const last = FEATURES.length - 1
    const next =
      e.key === 'ArrowRight' ? (active === last ? 0 : active + 1)
      : e.key === 'ArrowLeft' ? (active === 0 ? last : active - 1)
      : e.key === 'Home' ? 0
      : e.key === 'End' ? last
      : null
    if (next === null) return
    e.preventDefault()
    setActive(next)
    tabs.current[next]?.focus()
  }

  return (
    <section id="funciones" className="relative scroll-mt-20 overflow-hidden bg-ink py-20 text-white sm:py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"
      />

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Eyebrow dark>Cómo funciona</Eyebrow>
          <Headline className="mt-4">
            Todo el pedido, <Accent className="text-brand-300">de principio a fin.</Accent>
          </Headline>
          <div className="mt-5">
            <Lede dark>Desde que tu cliente te escribe hasta que lo recibe y termina de pagar.</Lede>
          </div>
        </Reveal>

        <Reveal delay={100} className="mt-10 flex justify-center">
          <div
            role="tablist"
            aria-label="Funciones de uTracker"
            onKeyDown={onKeyDown}
            className="no-scrollbar -mx-4 flex max-w-[calc(100%+2rem)] gap-1 overflow-x-auto px-4 sm:mx-0 sm:max-w-full sm:rounded-full sm:bg-white/[0.06] sm:p-1 sm:ring-1 sm:ring-white/10"
          >
            {FEATURES.map((feature, i) => {
              const selected = i === active
              return (
                <button
                  key={feature.key}
                  ref={(el) => {
                    tabs.current[i] = el
                  }}
                  type="button"
                  role="tab"
                  id={`tab-${feature.key}`}
                  aria-selected={selected}
                  aria-controls={`panel-${feature.key}`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setActive(i)}
                  className={cn(
                    'focus-ring flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-[background-color,color,transform] duration-200 ease-snappy active:scale-[.97]',
                    selected
                      ? 'bg-white text-slate-900'
                      : 'bg-white/[0.06] text-slate-300 hover:text-white sm:bg-transparent',
                  )}
                >
                  <feature.icon size={15} />
                  {feature.tab}
                </button>
              )
            })}
          </div>
        </Reveal>

        <Reveal delay={160} className="mt-10 grid sm:mt-14">
          {FEATURES.map((feature, i) => {
            const selected = i === active
            return (
              <div
                key={feature.key}
                id={`panel-${feature.key}`}
                role="tabpanel"
                aria-labelledby={`tab-${feature.key}`}
                inert={!selected}
                className={cn(
                  'grid items-center gap-10 [grid-area:1/1] lg:grid-cols-[0.9fr_1.1fr] lg:gap-16',
                  'transition-[opacity,transform] ease-snappy motion-reduce:translate-y-0',
                  selected
                    ? 'translate-y-0 opacity-100 duration-500 starting:translate-y-3 starting:opacity-0'
                    : 'pointer-events-none translate-y-3 opacity-0 duration-200 max-lg:hidden',
                )}
              >
                <div>
                  <h3 className="text-3xl leading-[1.05] font-semibold tracking-[-0.03em] text-balance sm:text-4xl">
                    {feature.title}
                  </h3>
                  <p className="mt-4 text-lg leading-relaxed text-slate-400">{feature.body}</p>
                  <ul className="mt-7 space-y-3.5">
                    {feature.points.map((point) => (
                      <li key={point} className="flex gap-3 text-slate-300">
                        <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-500/20">
                          <Check size={11} className="text-brand-300" strokeWidth={3} />
                        </span>
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="relative flex min-h-[22rem] items-center justify-center rounded-[1.75rem] bg-gradient-to-b from-white/[0.07] to-white/[0.02] p-4 ring-1 ring-white/10 sm:p-10">
                  {feature.mock}
                </div>
              </div>
            )
          })}
        </Reveal>
      </div>
    </section>
  )
}
