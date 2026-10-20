import type { CSSProperties, ReactNode } from 'react'
import {
  ChefHat,
  CircleCheck,
  ClipboardList,
  GripVertical,
  Package,
  Receipt,
  Truck,
  Wrench,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/cn'

/* ────────────────────────────────────────────────────────────
   Maquetas del producto
   Son la UI real reconstruida a escala, no capturas: así siguen
   nítidas en cualquier pantalla y no hay imágenes que cargar.

   Las usan el landing y el video de presentación (`/video`). Las
   props son todas opcionales y sus valores por defecto dibujan
   exactamente lo que muestra el landing: el video las anima desde
   afuera, cuadro por cuadro, sin que el landing note la diferencia.
   ──────────────────────────────────────────────────────────── */

export function PhoneFrame({ children, className }: { children: ReactNode; className?: string }) {
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

/**
 * Los pasos del seguimiento.
 *
 * `color` pinta la línea de tiempo; `ink` es el tono más oscuro con que se
 * escriben el ícono y la etiqueta del estado actual, porque un ámbar claro
 * sobre blanco no se lee.
 */
export const trackSteps: { name: string; color: string; ink: string; icon: LucideIcon }[] = [
  { name: 'Recibido', color: '#64748b', ink: '#475569', icon: ClipboardList },
  { name: 'En preparación', color: '#f59e0b', ink: '#d97706', icon: ChefHat },
  { name: 'En camino', color: '#6366f1', ink: '#4f46e5', icon: Truck },
  { name: 'Entregado', color: '#10b981', ink: '#059669', icon: CircleCheck },
]

export function TrackingMock({
  step = 2,
  ping,
}: {
  /** Índice del paso actual. Por defecto «En camino». */
  step?: number
  /**
   * Avance del latido, de 0 a 1, para animarlo por cuadro.
   *
   * Sin esto se usa `animate-ping` de CSS, que en el navegador está bien pero
   * en un render de video sale con parpadeo: cada cuadro se captura en un
   * momento distinto de la animación.
   */
  ping?: number
} = {}) {
  const current = trackSteps[Math.min(Math.max(step, 0), trackSteps.length - 1)]
  const Icon = current.icon

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
            {ping === undefined ? (
              <span
                className="absolute inset-0 animate-ping rounded-full opacity-25 motion-reduce:animate-none"
                style={{ backgroundColor: current.color }}
              />
            ) : (
              <span
                className="absolute inset-0 rounded-full"
                style={{
                  backgroundColor: current.color,
                  transform: `scale(${1 + ping})`,
                  opacity: 0.35 * (1 - ping),
                }}
              />
            )}
            <div
              className="relative flex size-11 items-center justify-center rounded-full"
              style={{ backgroundColor: `${current.color}26` }}
            >
              <Icon size={20} style={{ color: current.ink }} />
            </div>
          </div>
          <p className="mt-1.5 text-sm font-bold" style={{ color: current.ink }}>
            {current.name}
          </p>
          <p className="text-[8px] text-slate-400 underline underline-offset-2">
            Toca para ver qué pediste
          </p>
          <span className="mt-2 inline-block rounded-full bg-brand-600 px-3 py-1 text-[9px] font-medium text-white">
            Seguir mi pedido →
          </span>
        </div>

        {/* Línea de tiempo */}
        <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
          <p className="mb-2 text-[10px] font-semibold text-slate-900">Seguimiento</p>
          <ol>
            {trackSteps.map((s, i) => {
              const done = i < step
              const isCurrent = i === step
              const reached = done || isCurrent
              return (
                <li key={s.name} className="flex gap-2">
                  <div className="flex flex-col items-center">
                    <div
                      className="flex size-5 shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: reached ? `${s.color}26` : '#f1f5f9' }}
                    >
                      <div
                        className="size-1.5 rounded-full"
                        style={{ backgroundColor: reached ? s.color : '#cbd5e1' }}
                      />
                    </div>
                    {i < trackSteps.length - 1 && (
                      <div
                        className="my-0.5 w-0.5 flex-1"
                        style={{ backgroundColor: done ? s.color : '#e2e8f0' }}
                      />
                    )}
                  </div>
                  <p
                    className={cn(
                      'pb-2.5 text-[10px]',
                      isCurrent ? 'font-bold' : reached ? 'text-slate-600' : 'text-slate-400',
                    )}
                    style={isCurrent ? { color: s.color } : undefined}
                  >
                    {s.name}
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

export function WindowFrame({ children, className }: { children: ReactNode; className?: string }) {
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

export const mockOrders = [
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

export function MiniBadge({ name, color }: { name: string; color: string }) {
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

/** Entrada de una fila: 0 = oculta, 1 = en su lugar. */
function rowStyle(progress: number): CSSProperties {
  const t = Math.min(Math.max(progress, 0), 1)
  return { opacity: t, transform: `translateY(${(1 - t) * 12}px)` }
}

export function OrdersMock({
  reveal,
}: {
  /**
   * Cuántas filas se ven, con decimales: 2.5 deja la tercera a media entrada.
   * Sin esto se ven todas, como en el landing.
   */
  reveal?: number
} = {}) {
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
          {mockOrders.map((order, i) => (
            <div
              key={order.name}
              className="grid grid-cols-[1.4fr_1fr_1fr_0.7fr] items-center gap-2 border-b border-slate-100 px-3 py-2.5 last:border-0"
              style={reveal === undefined ? undefined : rowStyle(reveal - i)}
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

export interface MockState {
  name: string
  color: string
  tags: string[]
}

export const mockStates: MockState[] = [
  { name: 'Recibido', color: '#64748b', tags: ['inicial'] },
  { name: 'En preparación', color: '#f59e0b', tags: ['notifica'] },
  { name: 'Listo para envío', color: '#a855f7', tags: [] },
  { name: 'En camino', color: '#6366f1', tags: ['vibrante', 'link'] },
  { name: 'Entregado', color: '#10b981', tags: ['final'] },
]

export function WorkflowMock({
  states = mockStates,
  itemStyle,
}: {
  states?: MockState[]
  /** Estilo extra por estado, para animarlos desde afuera. */
  itemStyle?: (index: number) => CSSProperties | undefined
} = {}) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-2xl ring-1 ring-slate-900/10 sm:p-5">
      <p className="mb-3 text-xs font-semibold text-slate-900">Estados del pedido</p>
      <ul className="space-y-1.5">
        {states.map((state, i) => (
          <li
            key={state.name}
            className="flex items-center gap-2 rounded-lg px-2 py-2"
            style={{ backgroundColor: `${state.color}14`, ...itemStyle?.(i) }}
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

const ORDER_TOTAL = 145

export function PaymentsMock({
  paid = 50,
  status,
  proofStyle,
}: {
  /** Lo cobrado hasta ahora. Por defecto el adelanto ya registrado. */
  paid?: number
  /**
   * Estado del comprobante. Sin esto se muestra la nota del landing; con esto,
   * la etiqueta que ve el dueño en el panel.
   */
  status?: 'pending' | 'validated'
  /** Estilo extra de la miniatura del comprobante, para hacerla entrar. */
  proofStyle?: CSSProperties
} = {}) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-2xl ring-1 ring-slate-900/10 sm:p-5">
      <p className="mb-3 text-xs font-semibold text-slate-900">Pagos</p>

      <div className="mb-3 grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-2.5 text-center">
        <div>
          <p className="text-[9px] text-slate-500">Total</p>
          <p className="mt-0.5 text-[11px] font-semibold text-slate-900">
            {formatCurrency(ORDER_TOTAL)}
          </p>
        </div>
        <div>
          <p className="text-[9px] text-slate-500">Pagado</p>
          <p className="mt-0.5 text-[11px] font-semibold text-emerald-700">
            {formatCurrency(paid)}
          </p>
        </div>
        <div>
          <p className="text-[9px] text-slate-500">Saldo</p>
          <p className="mt-0.5 text-[11px] font-semibold text-amber-700">
            {formatCurrency(ORDER_TOTAL - paid)}
          </p>
        </div>
      </div>

      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium text-slate-900">
            Adelanto · <span className="text-emerald-700">{formatCurrency(50)}</span>
          </p>
          <p className="text-[9px] text-slate-400">14 ago 2026, 10:42</p>
          {status === undefined ? (
            <p className="mt-0.5 text-[9px] text-slate-500">Yape — confirmado por teléfono</p>
          ) : status === 'pending' ? (
            <span className="mt-1 inline-block rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-medium text-amber-700">
              Por validar
            </span>
          ) : (
            <span className="mt-1 inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-medium text-emerald-700">
              ✓ Validado
            </span>
          )}
        </div>
        {/* Comprobante */}
        <div
          className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-slate-200 to-slate-300 ring-1 ring-slate-200"
          style={proofStyle}
        >
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

export function CatalogMock() {
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
