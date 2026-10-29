import { useEffect, useState } from 'react'
import type {
  ButtonHTMLAttributes,
  ComponentProps,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'
import { StateIcon } from '@/lib/icons'
import { apiErrorMessage, apiErrorRef, isReportableError } from '@/api/client'
import { useAuthStore } from '@/stores/authStore'
import { useSupportStore } from '@/stores/supportStore'

/* ─────────────────────────── Botones ─────────────────────────── */

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'soft' | 'dark'
type ButtonSize = 'sm' | 'md'

/**
 * 2.0: botones planos y bajos, como en las herramientas de trabajo de hoy.
 * - primary: la acción principal de la pantalla, en el ámbar del logo.
 * - soft: una acción de crear que no compite con la principal («+ Agregar»).
 * - dark: acciones sobre fondo oscuro o la barra flotante.
 */
const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-brand-500 text-white hover:bg-brand-600 shadow-[0_1px_2px_rgb(234_88_12/0.35),inset_0_1px_0_rgb(255_255_255/0.18)]',
  secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:text-slate-900 shadow-[0_1px_2px_rgb(24_24_27/0.04)]',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  soft: 'bg-brand-50 text-brand-700 border border-brand-200 hover:bg-brand-100',
  dark: 'bg-navy text-white hover:bg-slate-800',
}

const buttonSizes: Record<ButtonSize, string> = {
  // min-h-11 en mobile: 44px es el mínimo cómodo para el dedo.
  md: 'min-h-11 px-3.5 py-2 text-[13px] sm:min-h-9 sm:py-1.5',
  sm: 'min-h-9 px-2.5 py-1 text-xs sm:min-h-7',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Muestra un indicador y deshabilita el botón mientras dura la acción. */
  loading?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  loading,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        // active:scale-[.98]: confirma el toque en mobile, donde no hay hover.
        'focus-ring inline-flex items-center justify-center gap-1.5 rounded-lg font-medium whitespace-nowrap transition-[background-color,color,box-shadow,transform] duration-150 ease-snappy select-none active:scale-[.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100',
        buttonSizes[size],
        buttonVariants[variant],
        className,
      )}
      {...props}
    >
      {loading && (
        <span
          aria-hidden
          className="size-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent opacity-70"
        />
      )}
      {children}
    </button>
  )
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  tone?: 'default' | 'danger'
}

/** Botón solo-ícono con área táctil cómoda y etiqueta accesible. */
export function IconButton({ label, tone = 'default', className, children, ...props }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'focus-ring inline-flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors active:scale-95',
        tone === 'danger'
          ? 'text-slate-400 hover:bg-red-50 hover:text-red-600'
          : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

/* ─────────────────────────── Estructura ─────────────────────────── */

interface PageHeaderProps {
  title: string
  /** Un total que se muestra junto al título, en gris: «Pedidos 248». */
  count?: number
  description?: ReactNode
  actions?: ReactNode
  /** Muestra un enlace de retorno encima del título. */
  backTo?: string
  backLabel?: string
}

/**
 * La barra de título de cada pantalla. Ocupa todo el ancho del contenido, con
 * una línea abajo, como la cabecera de una ventana: el título a la izquierda,
 * las acciones a la derecha. Se apoya en el padding que define AppLayout.
 */
export function PageHeader({ title, count, description, actions, backTo, backLabel }: PageHeaderProps) {
  return (
    <div className="-mx-4 -mt-5 border-b border-slate-200 bg-white px-4 py-4 sm:-mx-6 sm:-mt-6 sm:px-6">
      {backTo && (
        <Link
          to={backTo}
          className="mb-1.5 inline-flex items-center gap-1 text-xs font-medium text-slate-500 transition-colors hover:text-slate-900"
        >
          <ArrowLeft size={13} />
          {backLabel ?? 'Volver'}
        </Link>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="flex items-baseline gap-2 text-xl font-semibold tracking-tight text-slate-900">
            <span className="truncate">{title}</span>
            {count !== undefined && (
              <span className="text-base font-normal text-slate-400 tabular-nums">{count}</span>
            )}
          </h1>
          {description && <p className="mt-0.5 text-[13px] text-slate-500">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  )
}

/** Rótulo de sección, mismo tratamiento que los grupos del sidebar. */
export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        'text-[11px] font-medium tracking-[0.08em] text-slate-400 uppercase',
        className,
      )}
    >
      {children}
    </p>
  )
}

interface CardProps {
  className?: string
  children: ReactNode
  title?: ReactNode
  description?: ReactNode
  actions?: ReactNode
  /** Sin padding en el cuerpo: para tablas y listas que llegan al borde. */
  flush?: boolean
}

export function Card({ className, children, title, description, actions, flush }: CardProps) {
  const hasHeader = Boolean(title || actions)

  return (
    <div
      className={cn(
        'rounded-xl border border-slate-200 bg-white',
        className,
      )}
    >
      {hasHeader && (
        <div
          className={cn(
            'flex flex-wrap items-start justify-between gap-3 px-4 pt-4 sm:px-5 sm:pt-5',
            !flush && 'pb-1',
          )}
        >
          <div className="min-w-0">
            {title && <h2 className="text-[13px] font-semibold text-slate-900">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
        </div>
      )}

      <div className={cn(!flush && (hasHeader ? 'px-4 pt-3 pb-4 sm:px-5 sm:pb-5' : 'p-4 sm:p-5'))}>
        {children}
      </div>
    </div>
  )
}

/* ─────────────────────────── Configuración ─────────────────────────── */

interface SettingRowProps {
  label: string
  hint?: string
  htmlFor?: string
  /** El control ocupa todo el ancho en vez de alinearse a la derecha. */
  wide?: boolean
  children: ReactNode
}

/**
 * Una fila de configuración: etiqueta a la izquierda, control a la derecha.
 *
 * Es el patrón de toda pantalla de ajustes seria. Cuando cada sección inventa
 * su propio layout —chips aquí, cajas allá— la página se vuelve ilegible aunque
 * cada pieza por separado se vea bien.
 *
 * En el celular se apila, porque a 375px no entran dos columnas útiles.
 */
export function SettingRow({ label, hint, htmlFor, wide, children }: SettingRowProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-2 px-4 py-3.5 sm:px-5',
        !wide && 'sm:flex-row sm:items-center sm:justify-between sm:gap-6',
      )}
    >
      <div className={cn('min-w-0', !wide && 'sm:max-w-xs')}>
        <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-800">
          {label}
        </label>
        {hint && <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{hint}</p>}
      </div>

      <div className={cn('min-w-0', wide ? 'w-full' : 'sm:w-64 sm:shrink-0')}>{children}</div>
    </div>
  )
}

/** Agrupa filas de configuración con divisores, como una tabla. */
export function SettingGroup({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <header className="border-b border-slate-200 px-4 py-3 sm:px-5">
        <h2 className="text-[13px] font-semibold text-slate-900">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
      </header>
      <div className="divide-y divide-slate-100">{children}</div>
    </section>
  )
}

/* ─────────────────────────── Formularios ─────────────────────────── */

interface FieldProps {
  label: string
  htmlFor?: string
  hint?: ReactNode
  children: ReactNode
  className?: string
}

export function Field({ label, htmlFor, hint, children, className }: FieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={htmlFor} className="block text-[13px] font-medium text-slate-700">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  )
}

// ComponentProps y no InputHTMLAttributes: incluye `ref`, para poder enfocar un campo desde afuera.
export function Input({ className, ...props }: ComponentProps<'input'>) {
  return (
    <input
      className={cn(
        // text-base en mobile: por debajo de 16px Safari hace zoom al enfocar.
        'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-base text-slate-900 shadow-[0_1px_2px_rgb(24_24_27/0.03)] transition-[border-color,box-shadow] placeholder:text-slate-400 hover:border-slate-300 focus:border-brand-400 focus:ring-3 focus:ring-brand-500/15 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 sm:py-1.5 sm:text-[13px]',
        className,
      )}
      {...props}
    />
  )
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'w-full cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-base text-slate-900 shadow-[0_1px_2px_rgb(24_24_27/0.03)] transition-[border-color,box-shadow] hover:border-slate-300 focus:border-brand-400 focus:ring-3 focus:ring-brand-500/15 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 sm:py-1.5 sm:text-[13px]',
        className,
      )}
      {...props}
    />
  )
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-base text-slate-900 shadow-[0_1px_2px_rgb(24_24_27/0.03)] transition-[border-color,box-shadow] placeholder:text-slate-400 hover:border-slate-300 focus:border-brand-400 focus:ring-3 focus:ring-brand-500/15 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-50 sm:py-1.5 sm:text-[13px]',
        className,
      )}
      {...props}
    />
  )
}

interface CheckboxFieldProps {
  label: string
  hint?: string
  checked: boolean
  onChange: (checked: boolean) => void
}

export function CheckboxField({ label, hint, checked, onChange }: CheckboxFieldProps) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 text-sm text-slate-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="focus-ring mt-0.5 size-4 shrink-0 cursor-pointer rounded border-slate-300 accent-brand-500"
      />
      <span className="min-w-0">
        {label}
        {hint && <span className="block text-xs text-slate-400">{hint}</span>}
      </span>
    </label>
  )
}

/* ─────────────────────────── Filtros ─────────────────────────── */

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean
  count?: number
}

export function Chip({ active, count, className, children, ...props }: ChipProps) {
  return (
    <button
      type="button"
      className={cn(
        'focus-ring inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors active:scale-95',
        active
          ? 'border-brand-200 bg-brand-50 text-brand-700'
          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900',
        className,
      )}
      {...props}
    >
      {children}
      {count !== undefined && (
        <span className={cn('tabular-nums', active ? 'text-brand-500' : 'text-slate-400')}>
          {count}
        </span>
      )}
    </button>
  )
}

/** Tira horizontal deslizable en mobile; se envuelve desde sm. */
export function ChipBar({ children }: { children: ReactNode }) {
  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
      {children}
    </div>
  )
}

/* ─────────────────────────── Datos ─────────────────────────── */

/**
 * Tonos. Los semánticos (neutral, success, warning, danger, info) son los que
 * hay que usar; los nombres por color quedan por compatibilidad con pantallas
 * que todavía los piden y se ven igual que su equivalente.
 */
export type Tone =
  | 'neutral'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'brand'
  | 'green'
  | 'amber'
  | 'red'
  | 'slate'

const toneStyles: Record<Tone, { chip: string; text: string; badge: string; dot?: string }> = {
  neutral: { chip: 'bg-slate-100 text-slate-500', text: 'text-slate-900', badge: 'border-slate-200 text-slate-600 bg-white', dot: 'bg-slate-400' },
  success: { chip: 'bg-success-50 text-success-600', text: 'text-success-700', badge: 'border-success-200 text-success-700 bg-success-50', dot: 'bg-success-500' },
  warning: { chip: 'bg-warning-50 text-warning-600', text: 'text-warning-700', badge: 'border-warning-200 text-warning-700 bg-warning-50', dot: 'bg-warning-500' },
  danger: { chip: 'bg-danger-50 text-danger-600', text: 'text-danger-700', badge: 'border-danger-200 text-danger-700 bg-danger-50', dot: 'bg-danger-500' },
  info: { chip: 'bg-info-50 text-info-600', text: 'text-info-700', badge: 'border-info-200 text-info-700 bg-info-50', dot: 'bg-info-500' },
  brand: { chip: 'bg-brand-50 text-brand-600', text: 'text-brand-600', badge: 'border-brand-200 text-brand-700 bg-brand-50/60' },
  green: { chip: 'bg-emerald-50 text-emerald-600', text: 'text-emerald-600', badge: 'border-emerald-200 text-emerald-700 bg-emerald-50/60' },
  amber: { chip: 'bg-amber-50 text-amber-600', text: 'text-amber-600', badge: 'border-amber-200 text-amber-700 bg-amber-50/60' },
  red: { chip: 'bg-red-50 text-red-600', text: 'text-red-600', badge: 'border-red-200 text-red-700 bg-red-50/60' },
  slate: { chip: 'bg-slate-100 text-slate-500', text: 'text-slate-900', badge: 'border-slate-200 text-slate-600 bg-white' },
}

interface StatCardProps {
  icon?: LucideIcon
  label: string
  value: string
  hint?: string
  tone?: Tone
}

export function StatCard({ icon: Icon, label, value, hint, tone = 'slate' }: StatCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2">
        {Icon && <Icon size={14} className={cn('shrink-0', tone === 'slate' ? 'text-slate-400' : toneStyles[tone].text)} />}
        <p className="min-w-0 truncate text-xs text-slate-500">{label}</p>
      </div>
      <p className={cn('mt-1.5 truncate text-2xl font-semibold tracking-tight tabular-nums', toneStyles[tone].text)}>
        {value}
      </p>
      {hint && <p className="mt-0.5 truncate text-xs text-slate-400">{hint}</p>}
    </div>
  )
}

export function Badge({
  children,
  tone = 'slate',
  dot,
  className,
}: {
  children: ReactNode
  tone?: Tone
  /** Un punto del color del tono antes del texto. */
  dot?: boolean
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-1.5 py-px text-[11px] font-medium whitespace-nowrap',
        toneStyles[tone].badge,
        className,
      )}
    >
      {dot && <span aria-hidden className={cn('size-1.5 shrink-0 rounded-full', toneStyles[tone].dot ?? 'bg-current')} />}
      {children}
    </span>
  )
}

/**
 * Un aviso de una línea o dos: información, advertencia, error o éxito.
 * Compacto y con su ícono, para que el tipo se entienda sin depender del color.
 */
export function Banner({
  tone = 'info',
  icon: Icon,
  title,
  children,
  action,
  className,
}: {
  tone?: 'info' | 'warning' | 'danger' | 'success'
  icon?: LucideIcon
  title?: ReactNode
  children?: ReactNode
  action?: ReactNode
  className?: string
}) {
  const styles = {
    info: 'border-info-200 bg-info-50 text-info-700',
    warning: 'border-warning-200 bg-warning-50 text-warning-700',
    danger: 'border-danger-200 bg-danger-50 text-danger-700',
    success: 'border-success-200 bg-success-50 text-success-700',
  }[tone]
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn('flex flex-wrap items-start gap-x-3 gap-y-2 rounded-lg border px-3.5 py-2.5 text-[13px]', styles, className)}
    >
      {Icon && <Icon size={15} className="mt-0.5 shrink-0" />}
      <div className="min-w-0 flex-1">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className={cn(Boolean(title) && 'mt-0.5 opacity-90')}>{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

export function StateBadge({
  name,
  color,
  icon,
}: {
  name: string
  color: string
  icon?: string
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md border px-1.5 py-px text-[11px] font-medium tracking-wide whitespace-nowrap uppercase"
      style={{ borderColor: `${color}55`, backgroundColor: `${color}0d`, color }}
    >
      <StateIcon name={icon} size={12} />
      {name}
    </span>
  )
}

/* ─────────────────────────── Estados ─────────────────────────── */

/**
 * Cartel de error, y la puerta a soporte desde cualquier pantalla.
 *
 * Si se le pasa el error en crudo (`error={mutation.error}`) y la falla es
 * reportable, aparece el botón para abrir un ticket ya armado con el contexto.
 * Está aquí, en el componente, y no en cada página: así cualquier error que el
 * sistema ya muestra queda reportable sin tener que acordarse de cablearlo.
 */
export function Alert({
  children,
  error,
}: {
  children?: ReactNode
  /** El error tal como lo atrapó la mutación o la query. */
  error?: unknown
}) {
  const openReporter = useSupportStore((s) => s.openReporter)
  const canReport = useAuthStore((s) => Boolean(s.accessToken && s.activeTenant))

  const message = error !== undefined ? apiErrorMessage(error) : children
  const ref = apiErrorRef(error)
  const showReport = canReport && error !== undefined && isReportableError(error)

  return (
    <div role="alert" className="rounded-lg border border-danger-200 bg-danger-50 px-3.5 py-2.5 text-[13px] text-danger-700">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {message}
          {ref && (
            <span className="mt-0.5 block font-mono text-xs text-red-500">Ref {ref}</span>
          )}
        </div>

        {showReport && (
          <button
            type="button"
            onClick={() =>
              openReporter({
                category: 'error',
                subject: typeof message === 'string' ? message.slice(0, 120) : undefined,
                logRef: ref,
              })
            }
            className="shrink-0 rounded-lg border border-danger-200 bg-white px-2.5 py-1 text-xs font-medium text-danger-700 transition-colors hover:bg-danger-100"
          >
            Reportar
          </button>
        )}
      </div>
    </div>
  )
}

interface EmptyStateProps {
  title: string
  description?: ReactNode
  icon?: LucideIcon
  action?: ReactNode
  /** Una línea, sin caja: para una sección vacía que no debe ocupar media pantalla. */
  compact?: boolean
}

export function EmptyState({ title, description, icon: Icon, action, compact }: EmptyStateProps) {
  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3.5 text-[13px]">
        {Icon && <Icon size={15} className="shrink-0 text-slate-400" />}
        <span className="font-medium text-slate-600">{title}</span>
        {description && <span className="text-slate-500">{description}</span>}
        {action && <span className="ml-auto">{action}</span>}
      </div>
    )
  }
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center sm:py-14">
      {Icon && (
        <span className="mx-auto mb-3 flex size-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 shadow-[0_1px_2px_rgb(24_24_27/0.04)]">
          <Icon size={21} />
        </span>
      )}
      <p className="font-medium text-slate-700">{title}</p>
      {description && (
        <p className="mx-auto mt-1 max-w-xs text-sm text-slate-500 sm:max-w-sm">{description}</p>
      )}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  )
}

export function Spinner({ inline }: { inline?: boolean }) {
  return (
    <div className={cn('flex justify-center', inline ? 'py-6' : 'py-14')} role="status" aria-label="Cargando">
      <div className="size-5 animate-spin rounded-full border-2 border-slate-200 border-t-brand-500" />
    </div>
  )
}

/* ─────────────────────────── Lightbox ─────────────────────────── */

/**
 * Visor de imagen a pantalla completa; cierra con Escape o clic fuera.
 * Si le pasas `images`, se vuelve galería: flechas, contador y teclas ← →.
 */
export function Lightbox({
  url,
  images,
  onClose,
}: {
  url: string | null
  images?: string[]
  onClose: () => void
}) {
  const gallery = images && images.length > 1 ? images : null
  const [index, setIndex] = useState(0)

  // Al abrir, arranca en la imagen sobre la que hicieron clic.
  useEffect(() => {
    if (!url || !gallery) return
    const found = gallery.indexOf(url)
    setIndex(found === -1 ? 0 : found)
  }, [url, gallery])

  useEffect(() => {
    if (!url) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (!gallery) return
      if (e.key === 'ArrowRight') setIndex((i) => (i + 1) % gallery.length)
      if (e.key === 'ArrowLeft') setIndex((i) => (i - 1 + gallery.length) % gallery.length)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [url, gallery, onClose])

  if (!url) return null

  const current = gallery ? gallery[index] : url

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
      >
        <X size={20} />
      </button>

      {gallery && (
        <>
          <button
            type="button"
            aria-label="Anterior"
            onClick={(e) => {
              e.stopPropagation()
              setIndex((i) => (i - 1 + gallery.length) % gallery.length)
            }}
            className="absolute left-3 rounded-full bg-white/10 p-2.5 text-white transition-colors hover:bg-white/20 sm:left-6"
          >
            <ChevronLeft size={22} />
          </button>
          <button
            type="button"
            aria-label="Siguiente"
            onClick={(e) => {
              e.stopPropagation()
              setIndex((i) => (i + 1) % gallery.length)
            }}
            className="absolute right-3 rounded-full bg-white/10 p-2.5 text-white transition-colors hover:bg-white/20 sm:right-6"
          >
            <ChevronRight size={22} />
          </button>
          <span className="absolute bottom-6 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white tabular-nums">
            {index + 1} / {gallery.length}
          </span>
        </>
      )}

      <img
        src={current}
        alt=""
        className="max-h-[85dvh] max-w-full rounded-xl object-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )
}

/* ─────────────────────────── Modal ─────────────────────────── */

interface ModalProps {
  title: string
  description?: ReactNode
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  /** Para formularios largos que necesitan más ancho que el default. */
  wide?: boolean
}

/**
 * Diálogo centrado que cierra con Escape o clic en el fondo.
 *
 * Bloquea el scroll del documento mientras está abierto: en mobile, un modal
 * sobre una página que todavía se desliza se siente roto.
 */
export function Modal({ title, description, onClose, children, footer, wide }: ModalProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/30 p-0 sm:items-center sm:p-4">
      <button type="button" aria-label="Cerrar" onClick={onClose} className="absolute inset-0 cursor-default" />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-[0_24px_48px_-12px_rgb(24_24_27/0.25)] sm:rounded-xl',
          wide ? 'sm:max-w-2xl' : 'sm:max-w-md',
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-3.5">
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold text-slate-900">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
          </div>
          <IconButton label="Cerrar" onClick={onClose}>
            <X size={17} />
          </IconButton>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {footer && (
          <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">{footer}</div>
        )}
      </div>
    </div>
  )
}

/* ─────────────────────────── 2.0 ─────────────────────────── */

export interface TabItem {
  key: string
  label: ReactNode
  count?: number
}

/**
 * Pestañas subrayadas: filtran lo que se ve debajo sin cambiar de pantalla.
 * Se deslizan de lado en el celular cuando no entran.
 */
export function Tabs({
  items,
  value,
  onChange,
  className,
}: {
  items: TabItem[]
  value: string
  onChange: (key: string) => void
  className?: string
}) {
  return (
    <div
      role="tablist"
      className={cn(
        'no-scrollbar -mx-4 flex gap-1 overflow-x-auto border-b border-slate-200 px-4 sm:-mx-6 sm:px-6',
        className,
      )}
    >
      {items.map((item) => {
        const active = item.key === value
        return (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.key)}
            className={cn(
              'focus-ring relative -mb-px inline-flex shrink-0 items-center gap-1.5 border-b-2 px-2.5 py-2.5 text-[13px] whitespace-nowrap transition-colors',
              active
                ? 'border-brand-500 font-medium text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-900',
            )}
          >
            {item.label}
            {item.count !== undefined && (
              <span
                className={cn(
                  'rounded-md px-1.5 text-[11px] tabular-nums',
                  active ? 'bg-brand-50 text-brand-600' : 'bg-slate-100 text-slate-500',
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export interface Stat {
  label: string
  value: string
  /** Una línea chica debajo: «5 delivery · 3 recojo», «+12 %». */
  hint?: string
  tone?: 'default' | 'good' | 'warn' | 'bad'
  /** Valores para el minigráfico, del más viejo al más nuevo. */
  spark?: number[]
  href?: string
}

const STAT_TONES = {
  default: 'text-slate-500',
  good: 'text-emerald-600',
  warn: 'text-amber-600',
  bad: 'text-red-600',
} as const

/**
 * La franja de indicadores de arriba de una pantalla: celdas separadas por una
 * línea, sin tarjetas. Cada número puede llevar un minigráfico.
 */
export function StatStrip({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-slate-200 bg-white lg:auto-cols-fr lg:grid-flow-col lg:grid-cols-none">
      {stats.map((stat, i) => {
        const body = (
          <>
            <div className="min-w-0">
              <p className="truncate text-xs text-slate-500">{stat.label}</p>
              <p className="mt-1 truncate text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
                {stat.value}
              </p>
              {stat.hint && (
                <p className={cn('mt-0.5 truncate text-xs font-medium', STAT_TONES[stat.tone ?? 'default'])}>
                  {stat.hint}
                </p>
              )}
            </div>
            {stat.spark && stat.spark.length > 1 && <Sparkline values={stat.spark} />}
          </>
        )
        const cls = cn(
          'flex items-end justify-between gap-3 p-4',
          // Líneas entre celdas: a la izquierda en escritorio, en grilla de 2 en el celular.
          i % 2 === 1 && 'border-l border-slate-200',
          i >= 2 && 'border-t border-slate-200 lg:border-t-0',
          i > 0 && 'lg:border-l',
        )
        return stat.href ? (
          <a key={stat.label} href={stat.href} className={cn(cls, 'transition-colors hover:bg-slate-50')}>
            {body}
          </a>
        ) : (
          <div key={stat.label} className={cls}>
            {body}
          </div>
        )
      })}
    </div>
  )
}

/** Minigráfico de línea, en el acento. Sin ejes: solo la forma de la tendencia. */
export function Sparkline({ values, className }: { values: number[]; className?: string }) {
  const max = Math.max(...values)
  const min = Math.min(...values)
  const span = max - min || 1
  const points = values
    .map((v, i) => `${(i / (values.length - 1)) * 100},${28 - ((v - min) / span) * 24}`)
    .join(' ')
  return (
    <svg
      viewBox="0 0 100 30"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={cn('hidden h-8 w-24 shrink-0 text-brand-500 sm:block', className)}
    >
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

/** Una tecla de atajo: «/», «Ctrl K». */
export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-slate-200 bg-white px-1.5 font-mono text-[10.5px] text-slate-500">
      {children}
    </kbd>
  )
}
