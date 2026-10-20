import type { ReactNode } from 'react'
import {
  BarChart3,
  Bell,
  CalendarDays,
  Megaphone,
  PackageSearch,
  ShoppingBag,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Accent, Eyebrow, Headline, Lede, Reveal } from './primitives'

/**
 * Lo que va más allá del pedido, en una grilla de tarjetas de distinto tamaño.
 *
 * Cada tarjeta tiene un dibujito hecho con la misma UI del sistema —no un
 * ícono grande y nada más—, porque «inventario» no dice mucho y una barra de
 * stock que avisa que quedan 3 sí.
 */
export function Bento() {
  return (
    <section id="todo" className="scroll-mt-20 bg-paper py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal className="max-w-2xl">
          <Eyebrow>Y además</Eyebrow>
          <Headline className="mt-4 text-slate-900">
            Todo lo demás, <Accent className="text-brand-600">en el mismo lugar.</Accent>
          </Headline>
          <div className="mt-5">
            <Lede>Lo que hoy tienes repartido entre el chat, el cuaderno y una hoja de cálculo.</Lede>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <Card
            className="lg:col-span-4"
            delay={0}
            icon={ShoppingBag}
            title="Tienda online"
            body="Tu catálogo con carrito en un link propio. Lo pegas en la bio de Instagram y los pedidos te llegan ordenados, con adelanto."
          >
            <StoreArt />
          </Card>

          <Card
            className="lg:col-span-2"
            delay={70}
            icon={Bell}
            title="Avisos por WhatsApp"
            body="Cuando el pedido cambia de estado, le avisa a tu cliente por ti."
          >
            <NotifyArt />
          </Card>

          <Card
            className="lg:col-span-2"
            delay={0}
            icon={PackageSearch}
            title="Inventario"
            body="Stock y movimientos, con alerta cuando algo se está acabando."
          >
            <StockArt />
          </Card>

          <Card
            className="lg:col-span-2"
            delay={70}
            icon={CalendarDays}
            title="Calendario"
            body="Las entregas de la semana, por fecha. Sin sorpresas el sábado."
          >
            <CalendarArt />
          </Card>

          <Card
            className="lg:col-span-2"
            delay={140}
            icon={Users}
            title="Equipo"
            body="Invita a tu gente por correo. Cada uno con su rol y sus permisos."
          >
            <TeamArt />
          </Card>

          <Card
            className="lg:col-span-3"
            delay={0}
            icon={BarChart3}
            title="Finanzas"
            body="Cuánto vendiste, cuánto cobraste y cuánto te deben, por mes."
          >
            <FinanceArt />
          </Card>

          <Card
            className="sm:col-span-2 lg:col-span-3"
            delay={70}
            icon={Megaphone}
            title="Campañas"
            body="Ventas por tiempo limitado —el Día de la Madre, una preventa— con su propio stock y su link."
          >
            <CampaignArt />
          </Card>
        </div>

        <Reveal delay={120}>
          <p className="mt-8 text-sm text-slate-500">
            Algunas funciones dependen del plan.{' '}
            <a href="#precios" className="font-medium text-brand-600 hover:underline">
              Mira qué incluye cada uno
            </a>
            .
          </p>
        </Reveal>
      </div>
    </section>
  )
}

function Card({
  icon: Icon,
  title,
  body,
  children,
  className,
  delay,
}: {
  icon: LucideIcon
  title: string
  body: string
  children: ReactNode
  className?: string
  delay: number
}) {
  return (
    <Reveal delay={delay} className={cn('h-full', className)}>
      <article className="flex h-full flex-col overflow-hidden rounded-[1.5rem] bg-white ring-1 ring-slate-900/[0.07]">
        {/* El dibujo arriba, en una franja de altura fija: así las tarjetas de una fila alinean sus títulos. */}
        <div className="relative flex h-44 items-center justify-center overflow-hidden bg-gradient-to-b from-slate-50 to-white px-5">
          {children}
        </div>
        <div className="flex-1 border-t border-slate-100 p-5 sm:p-6">
          <p className="flex items-center gap-2 font-semibold text-slate-900">
            <Icon size={16} className="text-brand-600" />
            {title}
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{body}</p>
        </div>
      </article>
    </Reveal>
  )
}

/* ── Dibujos ── */

function StoreArt() {
  const items = [
    { name: 'Torta de chocolate', price: 'S/ 85', tint: 'from-amber-200 to-orange-300' },
    { name: 'Alfajores x12', price: 'S/ 24', tint: 'from-rose-200 to-pink-300' },
    { name: 'Pie de limón', price: 'S/ 45', tint: 'from-lime-200 to-emerald-300' },
  ]
  return (
    <div className="w-full max-w-md">
      <p className="mx-auto mb-3 w-fit max-w-full truncate rounded-full bg-white px-3 py-1 text-[0.7rem] text-slate-500 shadow-card ring-1 ring-slate-200">
        utracker.unify-tc.com/store/<span className="font-semibold text-slate-800">tu-negocio</span>
      </p>
      <div className="grid grid-cols-3 gap-2">
        {items.map((item) => (
          <div key={item.name} className="overflow-hidden rounded-xl bg-white shadow-card ring-1 ring-slate-200">
            <div className={cn('h-12 bg-gradient-to-br', item.tint)} />
            <div className="p-2">
              <p className="truncate text-[0.65rem] font-medium text-slate-800">{item.name}</p>
              <div className="mt-1 flex items-center justify-between gap-1">
                <span className="text-[0.65rem] font-semibold text-slate-900">{item.price}</span>
                <span className="rounded-md bg-brand-600 px-1.5 py-0.5 text-[0.55rem] font-semibold text-white">
                  +
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function NotifyArt() {
  return (
    <div className="w-full max-w-[15rem] rounded-2xl bg-white p-3 shadow-float ring-1 ring-slate-900/[0.06]">
      <div className="flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-500 text-white">
          <Bell size={13} />
        </span>
        <p className="text-[0.7rem] font-semibold text-slate-900">Panadería Rosa</p>
        <span className="ml-auto text-[0.6rem] text-slate-400">ahora</span>
      </div>
      <p className="mt-2 text-[0.72rem] leading-snug text-slate-600">
        Hola Lucía, tu pedido está <span className="font-semibold text-indigo-600">En camino</span>.
        Síguelo aquí 👉
      </p>
    </div>
  )
}

function StockArt() {
  const rows = [
    { name: 'Harina 1 kg', left: 24, max: 30, tone: 'bg-emerald-500' },
    { name: 'Manjar blanco', left: 3, max: 20, tone: 'bg-amber-500', low: true },
  ]
  return (
    <div className="w-full max-w-[15rem] space-y-3 rounded-2xl bg-white p-3.5 shadow-card ring-1 ring-slate-200">
      {rows.map((row) => (
        <div key={row.name}>
          <div className="flex items-center justify-between text-[0.7rem]">
            <span className="font-medium text-slate-700">{row.name}</span>
            <span className={row.low ? 'font-semibold text-amber-600' : 'text-slate-500'}>
              {row.low ? `Quedan ${row.left}` : row.left}
            </span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className={cn('h-full rounded-full', row.tone)} style={{ width: `${(row.left / row.max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function CalendarArt() {
  const days = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
  // Pedidos por día: el sábado es el que se llena.
  const load = [1, 0, 2, 1, 3, 5, 0]
  return (
    <div className="grid w-full max-w-[15rem] grid-cols-7 gap-1.5 rounded-2xl bg-white p-3 shadow-card ring-1 ring-slate-200">
      {days.map((day, i) => (
        <div key={i} className="flex flex-col items-center gap-1">
          <span className={cn('text-[0.6rem] font-semibold', i === 5 ? 'text-brand-600' : 'text-slate-400')}>
            {day}
          </span>
          <div
            className={cn(
              'flex h-16 w-full flex-col-reverse gap-0.5 rounded-md p-0.5',
              i === 5 ? 'bg-brand-50 ring-1 ring-brand-200' : 'bg-slate-50',
            )}
          >
            {Array.from({ length: load[i] }, (_, k) => (
              <span key={k} className={cn('h-1.5 rounded-sm', i === 5 ? 'bg-brand-500' : 'bg-slate-300')} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function TeamArt() {
  const people = [
    { initial: 'M', role: 'Dueña', tint: 'bg-brand-100 text-brand-700' },
    { initial: 'J', role: 'Admin', tint: 'bg-amber-100 text-amber-700' },
    { initial: 'K', role: 'Staff', tint: 'bg-rose-100 text-rose-700' },
    { initial: 'P', role: 'Reparto', tint: 'bg-emerald-100 text-emerald-700' },
  ]
  return (
    <ul className="grid w-full max-w-[15rem] grid-cols-2 gap-2">
      {people.map((p) => (
        <li key={p.role} className="flex items-center gap-2 rounded-xl bg-white p-2 shadow-card ring-1 ring-slate-200">
          <span className={cn('flex size-7 items-center justify-center rounded-full text-[0.7rem] font-bold', p.tint)}>
            {p.initial}
          </span>
          <span className="text-[0.7rem] font-medium text-slate-700">{p.role}</span>
        </li>
      ))}
    </ul>
  )
}

function FinanceArt() {
  const months = [38, 52, 46, 64, 58, 82]
  return (
    <div className="flex w-full max-w-sm items-end gap-4 rounded-2xl bg-white p-4 shadow-card ring-1 ring-slate-200">
      <div className="shrink-0">
        <p className="text-[0.65rem] text-slate-500">Cobrado este mes</p>
        <p className="text-xl font-semibold tracking-tight text-slate-900 tabular-nums">S/ 8 240</p>
        <p className="text-[0.65rem] font-medium text-amber-600">S/ 1 120 por cobrar</p>
      </div>
      <div className="flex h-20 flex-1 items-end gap-1.5">
        {months.map((h, i) => (
          <span
            key={i}
            className={cn('flex-1 rounded-t-md', i === months.length - 1 ? 'bg-brand-600' : 'bg-brand-100')}
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  )
}

function CampaignArt() {
  return (
    <div className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-card ring-1 ring-slate-200">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-900">Preventa Día de la Madre</p>
        <span className="shrink-0 rounded-full bg-rose-50 px-2 py-0.5 text-[0.65rem] font-semibold text-rose-600">
          Quedan 2 días
        </span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-rose-400 to-brand-500" />
      </div>
      <p className="mt-1.5 text-[0.7rem] text-slate-500">36 de 50 cajas vendidas</p>
    </div>
  )
}
