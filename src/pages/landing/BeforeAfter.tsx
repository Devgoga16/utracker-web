import { Check, Link2, NotebookPen } from 'lucide-react'
import { Accent, Eyebrow, Headline, Lede, Reveal } from './primitives'
import { MiniBadge, mockOrders } from './mocks'

/** Lo que llega al chat de un negocio un sábado cualquiera. */
const MESSAGES = [
  { who: 'Lucía', initial: 'L', tint: 'bg-rose-100 text-rose-700', text: '¿Ya está mi pedido?', at: '10:02' },
  { who: 'Carlos', initial: 'C', tint: 'bg-sky-100 text-sky-700', text: '¿A qué hora llega?', at: '10:15' },
  { who: 'Rosa', initial: 'R', tint: 'bg-amber-100 text-amber-700', text: '¿Te llegó mi Yape?', at: '10:31' },
  { who: 'Andrés', initial: 'A', tint: 'bg-emerald-100 text-emerald-700', text: '¿Ya está mi pedido?', at: '11:04' },
]

/**
 * El antes y el después, lado a lado.
 *
 * Es el mismo argumento del video: el negocio no tiene un problema de
 * software, tiene un chat lleno de la misma pregunta y un cuaderno. Con los
 * mismos cuatro clientes en las dos tarjetas, la diferencia se ve sola.
 */
export function BeforeAfter() {
  return (
    <section className="bg-paper py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal className="max-w-2xl">
          <Eyebrow>Lo que cambia</Eyebrow>
          <Headline className="mt-4 text-slate-900">
            Del cuaderno <Accent className="text-brand-600">al tablero.</Accent>
          </Headline>
          <div className="mt-5">
            <Lede>
              Si tienes un negocio, contestas lo mismo todo el día. Con uTracker cada cliente
              tiene su link, y la pregunta se contesta sola.
            </Lede>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-5 lg:grid-cols-2">
          {/* ── Hoy ── */}
          <Reveal delay={100} className="h-full">
            <article className="flex h-full flex-col rounded-[1.75rem] bg-[#ebe7de] p-5 sm:p-7">
              <header className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-700">Hoy, sin uTracker</p>
                <span className="rounded-full bg-rose-500 px-2.5 py-0.5 text-xs font-semibold text-white tabular-nums">
                  4 sin leer
                </span>
              </header>

              <ul className="mt-5 space-y-2.5">
                {MESSAGES.map((m, i) => (
                  <li key={i} className="flex items-end gap-2.5">
                    <span
                      className={`flex size-7 shrink-0 items-center justify-center rounded-full text-[0.7rem] font-bold ${m.tint}`}
                    >
                      {m.initial}
                    </span>
                    <p className="rounded-2xl rounded-bl-md bg-white px-3.5 py-2 text-sm text-slate-700 shadow-card">
                      <span className="block text-[0.7rem] font-semibold text-slate-400">{m.who}</span>
                      {m.text}
                      <span className="ml-2 text-[0.65rem] text-slate-400 tabular-nums">{m.at}</span>
                    </p>
                  </li>
                ))}
              </ul>

              {/* El cuaderno: renglones de verdad, con la línea roja del margen. */}
              <div
                className="relative mt-6 rounded-xl bg-[#fffdf6] py-3 pr-4 pl-10 shadow-card"
                style={{
                  backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0 27px, #dbe4f0 27px 28px)',
                  backgroundPosition: '0 12px',
                }}
              >
                <span aria-hidden className="absolute inset-y-0 left-7 w-px bg-rose-300" />
                <NotebookPen size={14} className="absolute top-3.5 left-2.5 text-slate-400" />
                {[
                  ['Lucía — torta 3 pisos — sáb.', true],
                  ['Carlos — empanadas x24 — ¿adelanto?', false],
                  ['Rosa — pan masa madre x6 — ¿pagó?', false],
                ].map(([line, struck]) => (
                  <p
                    key={line as string}
                    className={`font-display text-[1.05rem] leading-7 text-slate-700 italic ${struck ? 'line-through decoration-rose-400' : ''}`}
                  >
                    {line}
                  </p>
                ))}
              </div>

              <p className="mt-auto pt-6 text-sm leading-relaxed text-slate-600">
                Contestas uno por uno, buscas en el cuaderno y cruzas los dedos para que nadie se
                haya quedado sin anotar.
              </p>
            </article>
          </Reveal>

          {/* ── Con uTracker ── */}
          <Reveal delay={180} className="h-full">
            <article className="flex h-full flex-col rounded-[1.75rem] bg-white p-5 shadow-float ring-1 ring-slate-900/[0.06] sm:p-7">
              <header className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-700">Con uTracker</p>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                  <Check size={12} strokeWidth={3} />
                  Al día
                </span>
              </header>

              <ul className="mt-5 divide-y divide-slate-100 rounded-2xl ring-1 ring-slate-200">
                {mockOrders.map((order) => (
                  <li key={order.name} className="flex items-center gap-3 px-3.5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{order.name}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                        <Link2 size={11} />
                        Link enviado
                      </p>
                    </div>
                    <MiniBadge {...order.state} />
                  </li>
                ))}
              </ul>

              <ul className="mt-6 space-y-3">
                {[
                  'Cada pedido nace con su link: el cliente ve en qué va sin escribirte.',
                  'El adelanto y el saldo quedan en el pedido, con la foto del comprobante.',
                  'Tú y tu equipo ven lo mismo, desde el celular o la computadora.',
                ].map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-relaxed text-slate-600">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-50">
                      <Check size={11} className="text-brand-600" strokeWidth={3} />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
