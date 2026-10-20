import { ArrowRight, Check, CircleCheck, MessageCircle } from 'lucide-react'
import { Accent, CtaLink, Halo, Reveal } from './primitives'
import { OrdersMock, TrackingMock } from './mocks'

/**
 * Lo primero que se ve: qué es, para quién, y el producto funcionando.
 *
 * A la derecha no hay una captura sino la escena completa: el panel del dueño
 * atrás, el teléfono del cliente adelante, y entre los dos la conversación que
 * uTracker resuelve. Se entiende sin leer nada.
 */
export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden bg-paper pt-28 pb-16 sm:pt-36 sm:pb-24">
      {/*
        Cuadrícula tenue que se desvanece hacia abajo: da textura de papel
        cuadriculado —de cuaderno— sin competir con el contenido. Es una
        imagen de fondo estática; no cuesta nada al hacer scroll.
      */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgb(15 23 42 / 0.055) 1px, transparent 1px), linear-gradient(to bottom, rgb(15 23 42 / 0.055) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
          maskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, black 30%, transparent 75%)',
        }}
      />
      <Halo className="top-10 right-[-12rem] size-[44rem]" strength={22} />
      <Halo className="bottom-[-16rem] left-[-14rem] size-[36rem]" strength={14} color="#f59e0b" />

      <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-10">
        {/* ── Texto ── */}
        <div className="text-center lg:text-left">
          <Reveal>
            <p className="inline-flex items-center gap-2 rounded-full bg-white/80 py-1 pr-3.5 pl-1.5 text-[0.8rem] font-medium text-slate-600 shadow-card ring-1 ring-slate-900/[0.07]">
              <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[0.7rem] font-semibold text-white">
                Para ti
              </span>
              que vendes por WhatsApp e Instagram
            </p>

            <h1 className="mt-6 text-[3.3rem] leading-[0.95] font-semibold tracking-[-0.045em] text-slate-900 sm:text-7xl lg:text-[5.4rem]">
              Tu negocio,
              <br />
              <Accent className="text-brand-600">en orden.</Accent>
            </h1>

            <p className="mx-auto mt-6 max-w-lg text-lg leading-relaxed text-pretty text-slate-600 sm:text-xl lg:mx-0">
              Pedidos, adelantos y clientes en un solo lugar. Cada pedido con su link de
              seguimiento, para que tu cliente deje de preguntar «¿ya está?».
            </p>
          </Reveal>

          <Reveal delay={120}>
            <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <CtaLink href="#crear-cuenta">
                Crear mi cuenta gratis
                <ArrowRight
                  size={17}
                  className="transition-transform duration-200 ease-snappy group-hover:translate-x-0.5"
                />
              </CtaLink>
              <CtaLink href="#funciones" tone="quiet">
                Ver cómo funciona
              </CtaLink>
            </div>

            <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-slate-500 lg:justify-start">
              {['Sin tarjeta', 'Sin contrato', 'Listo en una tarde'].map((item) => (
                <li key={item} className="flex items-center gap-1.5">
                  <Check size={14} className="text-emerald-600" strokeWidth={2.6} />
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>

        {/* ── Escena ── */}
        <HeroScene />
      </div>

      <Proof />
    </section>
  )
}

/**
 * El panel atrás, el teléfono adelante y dos avisos flotando.
 *
 * Cada pieza entra por su cuenta y en orden de lectura —primero el sistema,
 * después lo que ve el cliente, al final lo que pasó—, así la escena se arma
 * delante de quien mira en vez de aparecer de golpe.
 */
function HeroScene() {
  return (
    <div className="relative mx-auto h-[560px] w-full max-w-[540px] sm:h-[620px]">
      {/* Panel del dueño: en un teléfono no entra junto al otro teléfono. */}
      <Reveal delay={150} className="absolute top-0 right-0 hidden w-[480px] sm:block">
        <div className="rotate-[1.5deg]">
          <OrdersMock />
        </div>
      </Reveal>

      {/* Lo que ve el cliente */}
      <Reveal delay={260} className="absolute inset-x-0 bottom-0 sm:right-auto sm:left-2">
        <TrackingMock />
      </Reveal>

      {/* La pregunta de siempre, y la respuesta que ya no hay que escribir */}
      <Reveal delay={560} className="absolute top-6 left-0 sm:top-auto sm:bottom-[18.5rem] sm:left-auto sm:right-2">
        <ChatCard />
      </Reveal>

      <Reveal delay={760} className="absolute right-0 bottom-20 sm:right-6 sm:bottom-14">
        <div className="flex items-center gap-2.5 rounded-2xl bg-white py-2.5 pr-4 pl-2.5 shadow-float ring-1 ring-slate-900/[0.06]">
          <span className="flex size-8 items-center justify-center rounded-xl bg-emerald-50">
            <CircleCheck size={17} className="text-emerald-600" />
          </span>
          <div className="leading-tight">
            <p className="text-[0.8rem] font-semibold text-slate-900">Adelanto validado</p>
            <p className="text-xs text-slate-500">S/ 50.00 · Yape</p>
          </div>
        </div>
      </Reveal>
    </div>
  )
}

function ChatCard() {
  return (
    <div className="w-[13.5rem] rounded-2xl bg-white p-3 shadow-float ring-1 ring-slate-900/[0.06]">
      <div className="mb-2 flex items-center gap-2">
        <span className="flex size-6 items-center justify-center rounded-full bg-rose-100 text-[0.65rem] font-bold text-rose-700">
          L
        </span>
        <p className="text-xs font-semibold text-slate-900">Lucía</p>
        <MessageCircle size={13} className="ml-auto text-slate-400" />
      </div>
      <p className="w-fit rounded-2xl rounded-tl-md bg-slate-100 px-3 py-1.5 text-[0.8rem] text-slate-700">
        ¿Ya está mi pedido?
      </p>
      <p className="mt-1.5 ml-auto w-fit rounded-2xl rounded-tr-md bg-brand-600 px-3 py-1.5 text-[0.8rem] text-white">
        Ya salió. Míralo aquí 👇
        <span className="mt-0.5 block truncate text-[0.7rem] text-brand-100 underline underline-offset-2">
          utracker.unify-tc.com/track/…
        </span>
      </p>
    </div>
  )
}

/**
 * Tres números que son ciertos para cualquier negocio, sin inventar clientes
 * ni porcentajes: es lo que el producto hace, dicho en cifras.
 */
function Proof() {
  const items = [
    { value: '1', label: 'link de seguimiento por pedido' },
    { value: '0', label: 'apps que tu cliente tiene que instalar' },
    { value: 'S/ 0', label: 'de comisión por cada venta' },
  ]

  return (
    <Reveal delay={200} className="relative mx-auto mt-16 max-w-6xl px-4 sm:mt-20 sm:px-6">
      <ul className="grid divide-y divide-slate-900/[0.08] rounded-3xl bg-white/70 ring-1 ring-slate-900/[0.07] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {items.map((item) => (
          <li key={item.label} className="flex items-baseline gap-3 px-6 py-5 sm:block sm:px-8 sm:py-7">
            <span className="font-display text-5xl leading-none text-slate-900 italic sm:block sm:text-6xl">
              {item.value}
            </span>
            <span className="text-sm text-slate-500 sm:mt-2 sm:block">{item.label}</span>
          </li>
        ))}
      </ul>
    </Reveal>
  )
}
