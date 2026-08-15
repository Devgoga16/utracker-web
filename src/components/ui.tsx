import { useEffect } from 'react'
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'
import { StateIcon } from '@/lib/icons'

/* ─────────────────────────── Botones ─────────────────────────── */

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
type ButtonSize = 'sm' | 'md'

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm shadow-brand-600/20',
  secondary: 'bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50',
  danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm shadow-red-600/20',
  ghost: 'text-slate-600 hover:bg-slate-100',
}

const buttonSizes: Record<ButtonSize, string> = {
  // min-h-11 en mobile: 44px es el mínimo cómodo para el dedo.
  md: 'min-h-11 px-4 py-2 text-sm sm:min-h-0',
  sm: 'min-h-9 px-3 py-1.5 text-xs sm:min-h-0',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

export function Button({ variant = 'primary', size = 'md', className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors select-none disabled:cursor-not-allowed disabled:opacity-50',
        buttonSizes[size],
        buttonVariants[variant],
        className,
      )}
      {...props}
    />
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
        'inline-flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors',
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
  description?: ReactNode
  actions?: ReactNode
  /** Muestra un enlace de retorno encima del título. */
  backTo?: string
  backLabel?: string
}

export function PageHeader({ title, description, actions, backTo, backLabel }: PageHeaderProps) {
  return (
    <div>
      {backTo && (
        <Link
          to={backTo}
          className="mb-2 inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-brand-600"
        >
          <ArrowLeft size={15} />
          {backLabel ?? 'Volver'}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
          {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
      </div>
    </div>
  )
}

/** Rótulo de sección, mismo tratamiento que los grupos del sidebar. */
export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        'text-[11px] font-semibold tracking-wide text-slate-400 uppercase',
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
        'rounded-xl bg-white shadow-sm shadow-slate-900/[0.03] ring-1 ring-slate-200',
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
            {title && <h2 className="text-sm font-semibold text-slate-900">{title}</h2>}
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

/* ─────────────────────────── Formularios ─────────────────────────── */

interface FieldProps {
  label: string
  htmlFor?: string
  hint?: string
  children: ReactNode
  className?: string
}

export function Field({ label, htmlFor, hint, children, className }: FieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  )
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        // text-base en mobile: por debajo de 16px Safari hace zoom al enfocar.
        'w-full rounded-lg border-0 bg-white px-3 py-2.5 text-base text-slate-900 ring-1 ring-slate-300 transition-shadow placeholder:text-slate-400 focus:ring-2 focus:ring-brand-500 focus:outline-none sm:py-2 sm:text-sm',
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
        'w-full rounded-lg border-0 bg-white px-3 py-2.5 text-base text-slate-900 ring-1 ring-slate-300 transition-shadow focus:ring-2 focus:ring-brand-500 focus:outline-none sm:py-2 sm:text-sm',
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
        className="mt-0.5 size-4 shrink-0 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
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
        'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap ring-1 transition-colors',
        active
          ? 'bg-slate-900 text-white ring-slate-900'
          : 'bg-white text-slate-600 ring-slate-300 hover:bg-slate-50',
        className,
      )}
      {...props}
    >
      {children}
      {count !== undefined && (
        <span className={cn('tabular-nums', active ? 'text-white/60' : 'text-slate-400')}>
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

type Tone = 'brand' | 'green' | 'amber' | 'red' | 'slate'

const toneStyles: Record<Tone, { chip: string; text: string }> = {
  brand: { chip: 'bg-brand-50 text-brand-600', text: 'text-brand-600' },
  green: { chip: 'bg-emerald-50 text-emerald-600', text: 'text-emerald-600' },
  amber: { chip: 'bg-amber-50 text-amber-600', text: 'text-amber-600' },
  red: { chip: 'bg-red-50 text-red-600', text: 'text-red-600' },
  slate: { chip: 'bg-slate-100 text-slate-500', text: 'text-slate-900' },
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
    <div className="rounded-xl bg-white p-4 shadow-sm shadow-slate-900/[0.03] ring-1 ring-slate-200">
      <div className="flex items-center gap-2.5">
        {Icon && (
          <span
            className={cn(
              'flex size-8 shrink-0 items-center justify-center rounded-lg',
              toneStyles[tone].chip,
            )}
          >
            <Icon size={16} />
          </span>
        )}
        <p className="min-w-0 truncate text-xs font-medium text-slate-500">{label}</p>
      </div>
      <p className={cn('mt-2 truncate text-2xl font-bold tracking-tight', toneStyles[tone].text)}>
        {value}
      </p>
      {hint && <p className="mt-0.5 truncate text-xs text-slate-400">{hint}</p>}
    </div>
  )
}

export function Badge({
  children,
  tone = 'slate',
  className,
}: {
  children: ReactNode
  tone?: Tone
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        toneStyles[tone].chip,
        className,
      )}
    >
      {children}
    </span>
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
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
      style={{ backgroundColor: `${color}1a`, color }}
    >
      <StateIcon name={icon} size={14} />
      {name}
    </span>
  )
}

/* ─────────────────────────── Estados ─────────────────────────── */

export function Alert({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
      {children}
    </div>
  )
}

interface EmptyStateProps {
  title: string
  description?: ReactNode
  icon?: LucideIcon
  action?: ReactNode
}

export function EmptyState({ title, description, icon: Icon, action }: EmptyStateProps) {
  return (
    <div className="rounded-xl border-2 border-dashed border-slate-200 px-4 py-10 text-center sm:py-14">
      {Icon && (
        <span className="mx-auto mb-3 flex size-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <Icon size={20} />
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
    <div className={cn('flex justify-center', inline ? 'py-6' : 'py-14')}>
      <div className="size-6 animate-spin rounded-full border-2 border-slate-200 border-t-brand-600" />
    </div>
  )
}

/* ─────────────────────────── Lightbox ─────────────────────────── */

/** Visor de imagen a pantalla completa; cierra con Escape o clic fuera. */
export function Lightbox({ url, onClose }: { url: string | null; onClose: () => void }) {
  useEffect(() => {
    if (!url) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [url, onClose])

  if (!url) return null

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
      <img
        src={url}
        alt=""
        className="max-h-[85dvh] max-w-full rounded-xl object-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )
}
