import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Check, Infinity as InfinityIcon } from 'lucide-react'
import { getFeatureCatalog, listPublicPlans } from '@/api/plans'
import { cn, formatCurrency } from '@/lib/cn'
import { Accent, Eyebrow, Headline, Lede, Reveal } from './primitives'
import type { FeatureDefinition, Plan } from '@/types'

/**
 * Precios, armados con los planes que hay en la base.
 *
 * Nada de esto está escrito aquí: los planes salen de `GET /api/plans` y las
 * etiquetas de cada funcionalidad del catálogo. Cambiar un precio o activar
 * una funcionalidad desde el panel se ve en la landing sin desplegar nada —
 * que es justamente para lo que se hizo dinámico el sistema de planes.
 */
export function PricingSection() {
  const [yearly, setYearly] = useState(false)

  const { data: plans, isLoading } = useQuery({
    queryKey: ['public-plans'],
    queryFn: listPublicPlans,
    staleTime: 5 * 60 * 1000,
  })

  const { data: catalog } = useQuery({
    queryKey: ['feature-catalog'],
    queryFn: getFeatureCatalog,
    staleTime: Infinity,
  })

  /**
   * Sin planes públicos no se dibuja la sección.
   *
   * Es deliberado: una tabla de precios vacía ahuyenta más que no tener
   * precios, y en una instalación nueva puede no haber ninguno todavía.
   */
  if (isLoading || !plans?.length) return null

  const features = catalog?.groups.flatMap((g) => g.features) ?? []
  const anyYearly = plans.some((p) => p.priceYearly && p.priceYearly > 0)

  // El del medio es el que se recomienda; con dos, el más caro.
  const highlightIndex = plans.length >= 3 ? Math.floor(plans.length / 2) : plans.length - 1

  return (
    <section id="precios" className="scroll-mt-20 bg-paper py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Eyebrow>Precios</Eyebrow>
          <Headline className="mt-4 text-slate-900">
            Un precio claro, <Accent className="text-brand-600">sin sorpresas.</Accent>
          </Headline>
          <div className="mt-5">
            <Lede>
              Sin comisión por venta y sin contrato. Empiezas con el plan que te sirve hoy y lo
              cambias cuando el negocio crezca.
            </Lede>
          </div>
        </Reveal>

        {anyYearly && (
          <Reveal delay={80} className="mt-8 flex justify-center">
            {/*
              Las dos opciones miden lo mismo, así el fondo oscuro se desliza
              con un solo `transform`: animar su ancho haría recalcular la
              página en cada cuadro. Con movimiento reducido, salta sin moverse.
            */}
            <div className="relative inline-grid grid-cols-2 rounded-full bg-white p-1 ring-1 ring-slate-900/[0.07]">
              <span
                aria-hidden
                className="absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-ink transition-transform duration-300 ease-smooth motion-reduce:transition-none"
                style={{ transform: yearly ? 'translateX(100%)' : 'translateX(0)' }}
              />
              <PeriodButton active={!yearly} onClick={() => setYearly(false)}>
                Mensual
              </PeriodButton>
              <PeriodButton active={yearly} onClick={() => setYearly(true)}>
                Anual
                <span
                  className={cn(
                    'ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold transition-colors duration-200',
                    yearly ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700',
                  )}
                >
                  2 meses gratis
                </span>
              </PeriodButton>
            </div>
          </Reveal>
        )}

        <div
          className={cn(
            'mt-12 grid gap-5 sm:mt-14',
            plans.length === 2 && 'sm:grid-cols-2 lg:mx-auto lg:max-w-3xl',
            plans.length >= 3 && 'lg:grid-cols-3',
          )}
        >
          {plans.map((plan, i) => (
            <Reveal key={plan._id} delay={60 + i * 60}>
              <PlanCard
                plan={plan}
                features={features}
                yearly={yearly}
                highlighted={i === highlightIndex}
              />
            </Reveal>
          ))}
        </div>

        <Reveal delay={200}>
          <p className="mt-8 text-center text-sm text-slate-400">
            Los precios están en soles e incluyen todo. ¿Necesitas algo distinto?{' '}
            <a href="#crear-cuenta" className="font-medium text-brand-600 hover:underline">
              Escríbenos
            </a>
            .
          </p>
        </Reveal>
      </div>
    </section>
  )
}

function PeriodButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'focus-ring relative inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors duration-200',
        active ? 'text-white' : 'text-slate-600 hover:text-slate-900',
      )}
    >
      {children}
    </button>
  )
}

function PlanCard({
  plan,
  features,
  yearly,
  highlighted,
}: {
  plan: Plan
  features: FeatureDefinition[]
  yearly: boolean
  highlighted: boolean
}) {
  const showYearly = yearly && Boolean(plan.priceYearly)
  const amount = showYearly ? plan.priceYearly! : plan.price

  // Lo que el plan incluye, con las etiquetas del catálogo.
  const included = features.filter((f) => f.kind === 'flag' && plan.features[f.key])
  const limits = features.filter((f) => f.kind === 'limit' && f.key !== 'maxMembers')

  return (
    <div
      className={cn(
        'relative flex h-full flex-col rounded-[1.5rem] p-6 sm:p-7',
        highlighted
          ? 'bg-ink text-white shadow-float ring-1 ring-ink'
          : 'bg-white ring-1 ring-slate-900/[0.07]',
      )}
    >
      {highlighted && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-500 px-3 py-1 text-[11px] font-bold tracking-wide text-white uppercase">
          El más elegido
        </span>
      )}

      <div>
        <p className={cn('text-lg font-semibold', highlighted ? 'text-white' : 'text-slate-900')}>
          {plan.name}
        </p>
        {plan.description && (
          <p
            className={cn(
              'mt-1 text-sm leading-relaxed',
              highlighted ? 'text-slate-400' : 'text-slate-500',
            )}
          >
            {plan.description}
          </p>
        )}
      </div>

      <div className="mt-5">
        {/*
          La clave cambia con el período, así el precio nuevo se monta de cero y
          entra con un fundido breve. El desenfoque disimula el cruce: sin él se
          leen dos números distintos turnándose.
        */}
        <p
          key={showYearly ? 'anual' : 'mensual'}
          className="flex items-baseline gap-1.5 transition-[opacity,transform,filter] duration-200 ease-snappy starting:translate-y-1 starting:opacity-0 starting:blur-[2px]"
        >
          <span
            className={cn(
              'text-[2.6rem] leading-none font-semibold tracking-[-0.04em] tabular-nums',
              highlighted ? 'text-white' : 'text-slate-900',
            )}
          >
            {amount === 0 ? 'Gratis' : formatCurrency(amount)}
          </span>
          {amount > 0 && (
            <span className={cn('text-sm', highlighted ? 'text-slate-400' : 'text-slate-400')}>
              /{showYearly ? 'año' : 'mes'}
            </span>
          )}
        </p>

        {showYearly && plan.price > 0 && (
          <p className="mt-1 text-xs text-emerald-500">
            Te ahorras {formatCurrency(plan.price * 12 - plan.priceYearly!)} al año
          </p>
        )}
      </div>

      {/*
        Lleva al formulario de la misma página y no a /register?plan=…: hoy el
        plan lo asigna el superadmin después de crear el negocio, así que un
        parámetro que nadie lee solo prometería algo que no pasa.
      */}
      <a
        href="#crear-cuenta"
        className={cn(
          'focus-ring mt-6 inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition-[background-color,transform] duration-150 ease-snappy active:scale-[.97]',
          highlighted
            ? 'bg-white text-slate-900 hover:bg-slate-100'
            : 'bg-ink text-white hover:bg-slate-800',
        )}
      >
        Empezar con {plan.name}
        <ArrowRight size={15} />
      </a>

      {/* Los límites primero: es lo que la gente compara de verdad. */}
      <dl
        className={cn(
          'mt-6 space-y-1.5 border-t pt-5 text-sm',
          highlighted ? 'border-white/10' : 'border-slate-100',
        )}
      >
        {limits.map((f) => {
          const value = Number(plan.features[f.key] ?? 0)
          return (
            <div key={f.key} className="flex items-center justify-between gap-3">
              <dt className={highlighted ? 'text-slate-400' : 'text-slate-500'}>{f.label}</dt>
              <dd
                className={cn(
                  'shrink-0 font-semibold tabular-nums',
                  highlighted ? 'text-white' : 'text-slate-900',
                )}
              >
                {value === 0 ? (
                  <InfinityIcon size={16} className="inline" aria-label="sin límite" />
                ) : (
                  value.toLocaleString('es-PE')
                )}
              </dd>
            </div>
          )
        })}
      </dl>

      <ul
        className={cn(
          'mt-5 space-y-2 border-t pt-5 text-sm',
          highlighted ? 'border-white/10' : 'border-slate-100',
        )}
      >
        {included.map((f) => (
          <li key={f.key} className="flex items-start gap-2">
            <Check
              size={15}
              className={cn('mt-0.5 shrink-0', highlighted ? 'text-brand-400' : 'text-brand-600')}
            />
            <span className={highlighted ? 'text-slate-300' : 'text-slate-600'}>{f.label}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
