import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BadgeCheck,
  Bell,
  Check,
  ChefHat,
  CircleCheck,
  Clock,
  CreditCard,
  GripVertical,
  Link2,
  Menu,
  Package,
  Palette,
  Receipt,
  Share2,
  Smartphone,
  Store,
  Truck,
  Users,
  Wallet,
  Wrench,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { cn, formatCurrency } from '@/lib/cn'

/* ────────────────────────────────────────────────────────────
   Aparición al hacer scroll
   ──────────────────────────────────────────────────────────── */

function Reveal({
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

    // Quien pidió menos movimiento ve todo quieto y ya visible.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(true)
      return
    }

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
        'transition-all duration-[900ms] ease-out',
        shown ? 'translate-y-0 opacity-100 blur-0' : 'translate-y-8 opacity-0 blur-[2px]',
        className,
      )}
    >
      {children}
    </div>
  )
}

/* ────────────────────────────────────────────────────────────
   Piezas de texto
   ──────────────────────────────────────────────────────────── */

function Eyebrow({ children, dark }: { children: ReactNode; dark?: boolean }) {
  return (
    <p
      className={cn(
        'text-sm font-semibold tracking-tight sm:text-base',
        dark ? 'text-brand-400' : 'text-brand-600',
      )}
    >
      {children}
    </p>
  )
}

function Headline({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h2
      className={cn(
        'text-[2.1rem] leading-[1.05] font-semibold tracking-tight sm:text-5xl lg:text-6xl',
        className,
      )}
    >
      {children}
    </h2>
  )
}

function Lede({ children, dark }: { children: ReactNode; dark?: boolean }) {
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

/* ────────────────────────────────────────────────────────────
   Maquetas del producto
   Son la UI real reconstruida a escala, no capturas: así siguen
   nítidas en cualquier pantalla y no hay imágenes que cargar.
   ──────────────────────────────────────────────────────────── */

function PhoneFrame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'relative mx-auto w-[268px] rounded-[2.6rem] bg-slate-900 p-2.5 shadow-2xl ring-1 ring-white/10 sm:w-[300px]',
        className,
      )}
    >
      <div className="relative overflow-hidden rounded-[2rem] bg-slate-50">
        {/* Isla */}
        <div className="absolute top-2 left-1/2 z-10 h-5 w-20 -translate-x-1/2 rounded-full bg-slate-900" />
        {children}
      </div>
    </div>
  )
}

const trackSteps = [
  { name: 'Recibido', color: '#64748b', done: true },
  { name: 'En preparación', color: '#f59e0b', done: true },
  { name: 'En camino', color: '#6366f1', current: true },
  { name: 'Entregado', color: '#10b981' },
]

function TrackingMock() {
  return (
    <PhoneFrame>
      <div className="space-y-3 px-3.5 pt-9 pb-5">
        {/* Cabecera */}
        <div className="text-center">
          <div className="mx-auto mb-1.5 flex size-8 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-700">
            P
          </div>
          <p className="text-[10px] text-slate-500">Panadería Rosa</p>
          <p className="text-sm font-bold text-slate-900">Tu pedido</p>
        </div>

        {/* Estado actual */}
        <div className="rounded-xl bg-white p-3 text-center ring-1 ring-slate-200">
          <p className="text-[8px] font-medium tracking-wide text-slate-400 uppercase">
            Estado actual
          </p>
          <div className="relative mx-auto mt-2 size-11">
            <span className="absolute inset-0 animate-ping rounded-full bg-brand-500 opacity-25" />
            <div className="relative flex size-11 items-center justify-center rounded-full bg-brand-500/15">
              <Truck size={20} className="text-brand-600" />
            </div>
          </div>
          <p className="mt-1.5 text-sm font-bold text-brand-600">En camino</p>
          <p className="text-[8px] text-slate-400 underline underline-offset-2">
            Tocá para ver qué pediste
          </p>
          <span className="mt-2 inline-block rounded-full bg-brand-600 px-3 py-1 text-[9px] font-medium text-white">
            Seguir mi pedido →
          </span>
        </div>

        {/* Línea de tiempo */}
        <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
          <p className="mb-2 text-[10px] font-semibold text-slate-900">Seguimiento</p>
          <ol>
            {trackSteps.map((step, i) => {
              const reached = step.done || step.current
              return (
                <li key={step.name} className="flex gap-2">
                  <div className="flex flex-col items-center">
                    <div
                      className="flex size-5 shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: reached ? `${step.color}26` : '#f1f5f9' }}
                    >
                      <div
                        className="size-1.5 rounded-full"
                        style={{ backgroundColor: reached ? step.color : '#cbd5e1' }}
                      />
                    </div>
                    {i < trackSteps.length - 1 && (
                      <div
                        className="my-0.5 w-0.5 flex-1"
                        style={{ backgroundColor: step.done ? step.color : '#e2e8f0' }}
                      />
                    )}
                  </div>
                  <p
                    className={cn(
                      'pb-2.5 text-[10px]',
                      step.current ? 'font-bold' : reached ? 'text-slate-600' : 'text-slate-400',
                    )}
                    style={step.current ? { color: step.color } : undefined}
                  >
                    {step.name}
                  </p>
                </li>
              )
            })}
          </ol>
        </div>

        {/* Resumen */}
        <div className="space-y-1.5 rounded-xl bg-white p-3 text-[10px] ring-1 ring-slate-200">
          <p className="mb-1 text-[10px] font-semibold text-slate-900">Resumen</p>
          <div className="flex justify-between">
            <span className="text-slate-500">Total del pedido</span>
            <span className="font-bold">{formatCurrency(145)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Adelanto</span>
            <span className="font-medium text-emerald-600">{formatCurrency(50)}</span>
          </div>
          <div className="flex justify-between rounded-md bg-amber-50 px-2 py-1">
            <span className="font-medium text-amber-700">Resta pagar</span>
            <span className="font-bold text-amber-700">{formatCurrency(95)}</span>
          </div>
        </div>
      </div>
    </PhoneFrame>
  )
}

function WindowFrame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-slate-900/10 sm:rounded-2xl',
        className,
      )}
    >
      <div className="flex items-center gap-1.5 border-b border-slate-200 bg-slate-100 px-3 py-2.5">
        <span className="size-2.5 rounded-full bg-red-400" />
        <span className="size-2.5 rounded-full bg-amber-400" />
        <span className="size-2.5 rounded-full bg-emerald-400" />
      </div>
      {children}
    </div>
  )
}

const mockOrders = [
  {
    name: 'Lucía Fernández',
    phone: '987 654 321',
    type: 'Delivery propio',
    state: { name: 'En camino', color: '#6366f1' },
    pay: { name: 'Adelanto', color: '#f59e0b' },
    total: 145,
  },
  {
    name: 'Carlos Medina',
    phone: '912 345 678',
    type: 'Recojo',
    state: { name: 'En preparación', color: '#f59e0b' },
    pay: { name: 'Pendiente', color: '#ef4444' },
    total: 320,
  },
  {
    name: 'Rosa Quispe',
    phone: '998 112 445',
    type: 'Delivery (courier)',
    state: { name: 'Entregado', color: '#10b981' },
    pay: { name: 'Pagado', color: '#10b981' },
    total: 89.5,
  },
  {
    name: 'Andrés Tapia',
    phone: '944 007 233',
    type: 'Recojo',
    state: { name: 'Recibido', color: '#64748b' },
    pay: { name: 'Pendiente', color: '#ef4444' },
    total: 210,
  },
]

function MiniBadge({ name, color }: { name: string; color: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap"
      style={{ backgroundColor: `${color}1a`, color }}
    >
      <span className="size-1.5 rounded-full" style={{ backgroundColor: color }} />
      {name}
    </span>
  )
}

function OrdersMock() {
  return (
    <WindowFrame>
      <div className="p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-bold text-slate-900">Pedidos</p>
          <span className="rounded-lg bg-brand-600 px-2.5 py-1.5 text-[10px] font-medium text-white">
            + Nuevo pedido
          </span>
        </div>

        <div className="mb-4 flex gap-1.5 overflow-hidden">
          {[
            ['Todos', 12],
            ['Recibido', 3],
            ['En preparación', 4],
            ['En camino', 2],
            ['Entregado', 3],
          ].map(([label, count], i) => (
            <span
              key={label as string}
              className={cn(
                'rounded-full px-2.5 py-1 text-[10px] font-medium whitespace-nowrap ring-1',
                i === 0
                  ? 'bg-slate-900 text-white ring-slate-900'
                  : 'bg-white text-slate-600 ring-slate-300',
              )}
            >
              {label} ({count})
            </span>
          ))}
        </div>

        <div className="overflow-hidden rounded-lg ring-1 ring-slate-200">
          <div className="grid grid-cols-[1.4fr_1fr_1fr_0.7fr] gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 text-[9px] font-medium tracking-wide text-slate-500 uppercase">
            <span>Cliente</span>
            <span>Estado</span>
            <span>Pago</span>
            <span className="text-right">Total</span>
          </div>
          {mockOrders.map((order) => (
            <div
              key={order.name}
              className="grid grid-cols-[1.4fr_1fr_1fr_0.7fr] items-center gap-2 border-b border-slate-100 px-3 py-2.5 last:border-0"
            >
              <div className="min-w-0">
                <p className="truncate text-[11px] font-medium text-brand-600">{order.name}</p>
                <p className="truncate text-[9px] text-slate-400">{order.type}</p>
              </div>
              <MiniBadge {...order.state} />
              <MiniBadge {...order.pay} />
              <p className="text-right text-[11px] font-semibold whitespace-nowrap text-slate-900">
                {formatCurrency(order.total)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </WindowFrame>
  )
}

const mockStates = [
  { name: 'Recibido', color: '#64748b', tags: ['inicial'] },
  { name: 'En preparación', color: '#f59e0b', tags: ['notifica'] },
  { name: 'Listo para envío', color: '#a855f7', tags: [] },
  { name: 'En camino', color: '#6366f1', tags: ['vibrante', 'link'] },
  { name: 'Entregado', color: '#10b981', tags: ['final'] },
]

function WorkflowMock() {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-2xl ring-1 ring-slate-900/10 sm:p-5">
      <p className="mb-3 text-xs font-semibold text-slate-900">Estados del pedido</p>
      <ul className="space-y-1.5">
        {mockStates.map((state) => (
          <li
            key={state.name}
            className="flex items-center gap-2 rounded-lg px-2 py-2"
            style={{ backgroundColor: `${state.color}14` }}
          >
            <GripVertical size={13} className="shrink-0 text-slate-400" />
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: state.color }}
            />
            <span
              className="min-w-0 flex-1 truncate text-[11px] font-medium"
              style={{ color: state.color }}
            >
              {state.name}
            </span>
            {state.tags.map((tag) => (
              <span
                key={tag}
                className="rounded bg-white px-1.5 py-0.5 text-[9px] whitespace-nowrap text-slate-500"
              >
                {tag}
              </span>
            ))}
          </li>
        ))}
      </ul>
      <div className="mt-2 rounded-lg border-2 border-dashed border-slate-300 py-2 text-center text-[10px] font-medium text-slate-400">
        + Agregar estado
      </div>
    </div>
  )
}

function PaymentsMock() {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-2xl ring-1 ring-slate-900/10 sm:p-5">
      <p className="mb-3 text-xs font-semibold text-slate-900">Pagos</p>

      <div className="mb-3 grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-2.5 text-center">
        <div>
          <p className="text-[9px] text-slate-500">Total</p>
          <p className="mt-0.5 text-[11px] font-semibold text-slate-900">{formatCurrency(145)}</p>
        </div>
        <div>
          <p className="text-[9px] text-slate-500">Pagado</p>
          <p className="mt-0.5 text-[11px] font-semibold text-emerald-700">{formatCurrency(50)}</p>
        </div>
        <div>
          <p className="text-[9px] text-slate-500">Saldo</p>
          <p className="mt-0.5 text-[11px] font-semibold text-amber-700">{formatCurrency(95)}</p>
        </div>
      </div>

      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium text-slate-900">
            Adelanto · <span className="text-emerald-700">{formatCurrency(50)}</span>
          </p>
          <p className="text-[9px] text-slate-400">14 ago 2026, 10:42</p>
          <p className="mt-0.5 text-[9px] text-slate-500">Yape — confirmado por teléfono</p>
        </div>
        {/* Comprobante */}
        <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-slate-200 to-slate-300 ring-1 ring-slate-200">
          <Receipt size={16} className="text-slate-500" />
        </div>
      </div>
    </div>
  )
}

const mockCatalog = [
  { name: 'Pan de masa madre', price: 18, kind: 'product' as const, from: 'from-amber-200', to: 'to-orange-300' },
  { name: 'Torta personalizada', price: 120, kind: 'service' as const, quoted: true, from: 'from-rose-200', to: 'to-pink-300' },
  { name: 'Empanadas x12', price: 42, kind: 'product' as const, from: 'from-yellow-200', to: 'to-amber-300' },
]

function CatalogMock() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {mockCatalog.map((item, i) => (
        <div
          key={item.name}
          className={cn(
            'overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-slate-900/10',
            i === 2 && 'hidden sm:block',
          )}
        >
          <div className={cn('h-20 bg-gradient-to-br sm:h-24', item.from, item.to)} />
          <div className="p-3">
            <div className="flex items-center gap-1 text-slate-400">
              {item.kind === 'service' ? <Wrench size={10} /> : <Package size={10} />}
              <span className="text-[9px]">{item.kind === 'service' ? 'Servicio' : 'Producto'}</span>
            </div>
            <p className="mt-0.5 truncate text-[11px] font-medium text-slate-900">{item.name}</p>
            <p className="mt-1 text-[11px] font-semibold text-slate-900">
              {formatCurrency(item.price)}
            </p>
            {item.quoted && <p className="text-[9px] text-amber-600">a cotizar</p>}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ────────────────────────────────────────────────────────────
   Landing
   ──────────────────────────────────────────────────────────── */

const navSections = [
  { href: '#pedidos', label: 'Pedidos' },
  { href: '#workflow', label: 'Workflow' },
  { href: '#seguimiento', label: 'Seguimiento' },
  { href: '#catalogo', label: 'Catálogo' },
]

const catalogHighlights: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: ChefHat,
    title: 'Precio a cotizar',
    body: 'Para el trabajo a medida: el precio real lo ponés en cada pedido.',
  },
  {
    icon: Package,
    title: 'Líneas libres',
    body: 'Algo que no está en el catálogo entra igual, sin ensuciarlo.',
  },
  {
    icon: Store,
    title: 'Tienda pública',
    body: 'Compartí tu catálogo en un link propio para tus redes.',
  },
]

const mobilePoints: { icon: LucideIcon; label: string }[] = [
  { icon: CircleCheck, label: 'Barra inferior siempre a mano' },
  { icon: Smartphone, label: 'Botones pensados para el dedo' },
  { icon: Receipt, label: 'Comprobantes desde la cámara' },
]

const capabilities: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Bell,
    title: 'Estados que avisan',
    body: 'Marcá un estado como “notifica” y dejá de contestar el mismo mensaje diez veces al día.',
  },
  {
    icon: Users,
    title: 'Permisos por rol',
    body: 'Definí quién puede mover un pedido a cada estado: dueño, admin, staff o repartidor.',
  },
  {
    icon: Link2,
    title: 'Link con vencimiento',
    body: 'Mandá un link para que el cliente complete sus datos. Vence solo a las 24 horas.',
  },
  {
    icon: Store,
    title: 'Tienda pública',
    body: 'Tu catálogo en una dirección propia, lista para pegar en la bio de tus redes.',
  },
  {
    icon: Wallet,
    title: 'Estado de pago automático',
    body: 'Registrás el adelanto y el saldo; el estado de pago se acomoda solo.',
  },
  {
    icon: BadgeCheck,
    title: 'Historial que no miente',
    body: 'Cada cambio queda congelado con su nombre, color e ícono del momento.',
  },
  {
    icon: Palette,
    title: 'Íconos y colores',
    body: 'Más de sesenta íconos y una paleta para que el tablero se lea de un vistazo.',
  },
  {
    icon: Smartphone,
    title: 'Un negocio o varios',
    body: 'Una sola cuenta, todos tus negocios. Cambiás de uno a otro en dos toques.',
  },
]

export function LandingPage() {
  const { accessToken, activeTenant } = useAuthStore()
  const [menuOpen, setMenuOpen] = useState(false)

  const loggedIn = Boolean(accessToken)
  const ctaTo = loggedIn ? (activeTenant ? '/orders' : '/tenants') : '/login'
  const ctaLabel = loggedIn ? 'Ir al panel' : 'Ingresar'

  return (
    <div className="bg-white">
      {/* ── Navbar ── */}
      <header className="sticky top-0 z-50 border-b border-slate-900/10 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3 sm:px-6">
          <a href="#top" className="text-lg font-semibold tracking-tight text-slate-900">
            uTracker
          </a>

          <nav className="hidden gap-6 md:flex">
            {navSections.map((section) => (
              <a
                key={section.href}
                href={section.href}
                className="text-sm text-slate-500 transition-colors hover:text-slate-900"
              >
                {section.label}
              </a>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <Link
              to={ctaTo}
              className="rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
            >
              {ctaLabel}
            </Link>
            <button
              type="button"
              aria-label="Menú"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
              className="flex size-9 items-center justify-center rounded-full text-slate-600 active:bg-slate-100 md:hidden"
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav className="border-t border-slate-900/10 bg-white px-4 py-2 md:hidden">
            {navSections.map((section) => (
              <a
                key={section.href}
                href={section.href}
                onClick={() => setMenuOpen(false)}
                className="block rounded-lg px-2 py-3 text-sm text-slate-600 active:bg-slate-100"
              >
                {section.label}
              </a>
            ))}
          </nav>
        )}
      </header>

      {/* ── Hero ── */}
      <section id="top" className="relative overflow-hidden bg-white">
        {/* Halo de color detrás del teléfono */}
        <div
          aria-hidden
          className="pointer-events-none absolute top-40 left-1/2 size-[34rem] -translate-x-1/2 rounded-full bg-brand-500/20 blur-[110px]"
        />

        <div className="relative mx-auto max-w-4xl px-4 pt-16 pb-10 text-center sm:px-6 sm:pt-24">
          <Reveal>
            <p className="text-sm font-semibold text-brand-600 sm:text-base">
              Gestor de pedidos para negocios que crecen
            </p>
            <h1 className="mt-3 text-[2.6rem] leading-[1.02] font-semibold tracking-tight text-slate-900 sm:text-7xl">
              Tu negocio.
              <br />
              <span className="bg-gradient-to-br from-brand-600 to-brand-500 bg-clip-text text-transparent">
                En orden.
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-slate-500 sm:text-xl">
              Pedidos, pagos y clientes en un solo lugar. Con un flujo de trabajo que armás vos, y
              un link de seguimiento que le contesta al cliente por vos.
            </p>
          </Reveal>

          <Reveal delay={120}>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to={ctaTo}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-600 px-7 py-3.5 text-base font-medium text-white transition-colors hover:bg-brand-700 sm:w-auto"
              >
                {loggedIn ? 'Ir al panel' : 'Empezar ahora'}
                <ArrowRight size={17} />
              </Link>
              <a
                href="#pedidos"
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-full px-7 py-3.5 text-base font-medium text-brand-600 transition-colors hover:bg-brand-50 sm:w-auto"
              >
                Ver cómo funciona
                <ArrowRight size={17} className="rotate-90" />
              </a>
            </div>
          </Reveal>
        </div>

        <Reveal delay={220} className="relative px-4 pb-16 sm:pb-24">
          <TrackingMock />
          <p className="mx-auto mt-6 max-w-xs text-center text-sm text-slate-400">
            Lo que ve tu cliente. Sin instalar nada, sin crear una cuenta.
          </p>
        </Reveal>
      </section>

      {/* ── Pedidos ── */}
      <section id="pedidos" className="scroll-mt-16 bg-slate-950 py-20 text-white sm:py-32">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal className="mx-auto max-w-2xl text-center">
            <Eyebrow dark>Pedidos</Eyebrow>
            <Headline className="mt-3">
              Todos tus pedidos.
              <br />
              De un vistazo.
            </Headline>
            <div className="mt-5">
              <Lede dark>
                Quién pidió, en qué estado está, cuánto debe y cuándo entró. Filtrá por estado y
                mirá el tablero completo sin abrir un solo pedido.
              </Lede>
            </div>
          </Reveal>

          <Reveal delay={150} className="mt-12 sm:mt-16">
            <div className="mx-auto max-w-3xl">
              <OrdersMock />
            </div>
          </Reveal>

          <div className="mx-auto mt-12 grid max-w-3xl gap-8 sm:grid-cols-3 sm:mt-16">
            {[
              ['Filtros por estado', 'Un toque y ves sólo lo que está en preparación.'],
              ['Pago siempre visible', 'Adelanto, saldo o pendiente, en la misma fila.'],
              ['Todo el detalle', 'Items, especificaciones, entrega, historial y pagos.'],
            ].map(([title, body], i) => (
              <Reveal key={title} delay={200 + i * 80}>
                <p className="font-semibold text-white">{title}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Workflow ── */}
      <section id="workflow" className="scroll-mt-16 bg-white py-20 sm:py-32">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-20">
          <Reveal>
            <Eyebrow>Workflow</Eyebrow>
            <Headline className="mt-3 text-slate-900">
              Tus estados.
              <br />
              Tus reglas.
            </Headline>
            <div className="mt-5">
              <Lede>
                Ningún negocio trabaja igual. Creá los estados que usás de verdad, ponéles nombre,
                color e ícono, y arrastralos hasta que el orden sea el tuyo.
              </Lede>
            </div>

            <ul className="mt-8 space-y-4">
              {[
                'Arrastrá para reordenar; los pedidos en curso se acomodan solos.',
                'Marcá un estado como inicial, final o de cancelación.',
                'Elegí qué roles pueden mover un pedido hasta ahí.',
                'Un estado “vibrante” late en la pantalla del cliente para llamar la atención.',
                'Un estado con “link necesario” te pide la URL del courier al pasar.',
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-50">
                    <Check size={12} className="text-brand-600" strokeWidth={3} />
                  </span>
                  <span className="text-slate-600">{item}</span>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={150}>
            <WorkflowMock />
          </Reveal>
        </div>
      </section>

      {/* ── Seguimiento ── */}
      <section id="seguimiento" className="scroll-mt-16 bg-slate-950 py-20 text-white sm:py-32">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal className="mx-auto max-w-2xl text-center">
            <Eyebrow dark>Seguimiento</Eyebrow>
            <Headline className="mt-3">
              Tu cliente pregunta menos.
              <br />
              Porque ya sabe.
            </Headline>
            <div className="mt-5">
              <Lede dark>
                Cada pedido nace con su propio link. Se lo mandás por WhatsApp y ahí ve el estado,
                la línea de tiempo, lo que pidió con fotos, cuánto adelantó y cuánto resta.
              </Lede>
            </div>
          </Reveal>

          <div className="mt-14 grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
            <Reveal delay={120} className="order-2 lg:order-1">
              <div className="space-y-8">
                {[
                  {
                    icon: Share2,
                    title: 'Un link y listo',
                    body: 'Sin cuenta, sin app, sin contraseña. Funciona en cualquier teléfono.',
                  },
                  {
                    icon: Clock,
                    title: 'Se actualiza solo',
                    body: 'La página se refresca sola cada medio minuto. No tenés que avisar nada.',
                  },
                  {
                    icon: CreditCard,
                    title: 'Cuentas claras',
                    body: 'Total, adelanto, saldo pagado y lo que falta. Sin malentendidos.',
                  },
                  {
                    icon: Truck,
                    title: 'Seguimiento del courier',
                    body: 'Si el envío tiene link de rastreo, aparece como un botón en su pantalla.',
                  },
                ].map((feature, i) => (
                  <Reveal key={feature.title} delay={160 + i * 70}>
                    <div className="flex gap-4">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                        <feature.icon size={18} className="text-brand-400" />
                      </span>
                      <div>
                        <p className="font-semibold text-white">{feature.title}</p>
                        <p className="mt-1 text-sm leading-relaxed text-slate-400">{feature.body}</p>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            </Reveal>

            <Reveal delay={150} className="order-1 lg:order-2">
              <TrackingMock />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Pagos ── */}
      <section className="bg-white py-20 sm:py-32">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-20">
          <Reveal delay={150} className="order-2 lg:order-1">
            <PaymentsMock />
          </Reveal>

          <Reveal className="order-1 lg:order-2">
            <Eyebrow>Pagos</Eyebrow>
            <Headline className="mt-3 text-slate-900">
              Adelanto, saldo
              <br />y comprobante.
            </Headline>
            <div className="mt-5">
              <Lede>
                Cargá el adelanto cuando armás el pedido o registralo después. Subí la foto del
                Yape, del Plin o del depósito y quedá con el respaldo guardado.
              </Lede>
            </div>

            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              {[
                ['El estado se acomoda solo', 'Pendiente, adelanto o pagado: no lo tocás vos.'],
                ['Foto del comprobante', 'Queda pegada al pago, con fecha y nota.'],
                ['Saldo siempre a la vista', 'En el pedido y en el link del cliente.'],
                ['Se puede corregir', 'Eliminá un pago mal cargado y todo se recalcula.'],
              ].map(([title, body]) => (
                <div key={title}>
                  <p className="text-sm font-semibold text-slate-900">{title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-500">{body}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Catálogo ── */}
      <section id="catalogo" className="scroll-mt-16 bg-slate-50 py-20 sm:py-32">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal className="mx-auto max-w-2xl text-center">
            <Eyebrow>Catálogo</Eyebrow>
            <Headline className="mt-3 text-slate-900">
              Productos y servicios.
              <br />
              En la misma vitrina.
            </Headline>
            <div className="mt-5">
              <Lede>
                Lo que vendés tal cual y lo que cotizás por trabajo conviven sin pelearse. Con
                fotos, categorías y precio fijo o de referencia.
              </Lede>
            </div>
          </Reveal>

          <Reveal delay={150} className="mx-auto mt-12 max-w-2xl sm:mt-16">
            <CatalogMock />
          </Reveal>

          <div className="mx-auto mt-12 grid max-w-4xl gap-8 sm:grid-cols-3 sm:mt-16">
            {catalogHighlights.map((item, i) => (
              <Reveal key={item.title} delay={200 + i * 80}>
                <span className="flex size-10 items-center justify-center rounded-xl bg-white ring-1 ring-slate-200">
                  <item.icon size={18} className="text-brand-600" />
                </span>
                <p className="mt-3 font-semibold text-slate-900">{item.title}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{item.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Y además ── */}
      <section className="bg-white py-20 sm:py-32">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal className="mx-auto max-w-2xl text-center">
            <Eyebrow>Y además</Eyebrow>
            <Headline className="mt-3 text-slate-900">Los detalles que se notan.</Headline>
          </Reveal>

          <div className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 sm:mt-16 lg:grid-cols-4">
            {capabilities.map((cap, i) => (
              <Reveal key={cap.title} delay={80 + (i % 4) * 70}>
                <span className="flex size-10 items-center justify-center rounded-xl bg-brand-50">
                  <cap.icon size={18} className="text-brand-600" />
                </span>
                <p className="mt-3 font-semibold text-slate-900">{cap.title}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{cap.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Mobile ── */}
      <section className="bg-slate-950 py-20 text-white sm:py-32">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <Reveal>
            <Eyebrow dark>En el bolsillo</Eyebrow>
            <Headline className="mt-3">Hecho para el teléfono.</Headline>
            <div className="mt-5">
              <Lede dark>
                Movés un pedido de estado mientras cerrás la tienda, cargás un adelanto en la
                vereda y mandás el link de seguimiento sin sentarte a una computadora.
              </Lede>
            </div>
          </Reveal>

          <Reveal delay={150}>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              {mobilePoints.map((point) => (
                <span
                  key={point.label}
                  className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-slate-200"
                >
                  <point.icon size={15} className="text-brand-400" />
                  {point.label}
                </span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── CTA final ── */}
      <section className="relative overflow-hidden bg-white py-20 sm:py-32">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 mx-auto size-[28rem] rounded-full bg-brand-500/15 blur-[110px]"
        />
        <div className="relative mx-auto max-w-2xl px-4 text-center sm:px-6">
          <Reveal>
            <Headline className="text-slate-900">Empezá hoy.</Headline>
            <div className="mt-5">
              <Lede>
                Creá tu negocio, cargá tu catálogo y mandá el primer link de seguimiento en la misma
                tarde.
              </Lede>
            </div>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to={ctaTo}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-600 px-7 py-3.5 text-base font-medium text-white transition-colors hover:bg-brand-700 sm:w-auto"
              >
                {loggedIn ? 'Ir al panel' : 'Crear mi cuenta'}
                <ArrowRight size={17} />
              </Link>
              {!loggedIn && (
                <Link
                  to="/login"
                  className="inline-flex w-full items-center justify-center rounded-full px-7 py-3.5 text-base font-medium text-brand-600 transition-colors hover:bg-brand-50 sm:w-auto"
                >
                  Ya tengo cuenta
                </Link>
              )}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-200 bg-slate-50 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 text-center sm:flex-row sm:justify-between sm:px-6 sm:text-left">
          <div>
            <p className="font-semibold tracking-tight text-slate-900">uTracker</p>
            <p className="text-sm text-slate-500">Gestor de pedidos</p>
          </div>
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            {navSections.map((section) => (
              <a
                key={section.href}
                href={section.href}
                className="text-sm text-slate-500 transition-colors hover:text-slate-900"
              >
                {section.label}
              </a>
            ))}
            <Link to={ctaTo} className="text-sm font-medium text-brand-600 hover:underline">
              {ctaLabel}
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
