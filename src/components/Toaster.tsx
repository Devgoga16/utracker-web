import { CheckCircle2, X, XCircle } from 'lucide-react'
import { useToastStore } from '@/stores/toastStore'
import { cn } from '@/lib/cn'

/** Donde aparecen los avisos breves: abajo a la derecha, encima de todo. */
export function Toaster() {
  const { toasts, dismiss } = useToastStore()
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-20 z-[70] flex flex-col items-center gap-2 px-3 md:inset-x-auto md:right-5 md:bottom-5 md:items-end"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role={t.tone === 'error' ? 'alert' : 'status'}
          className="pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-[13px] text-slate-800 shadow-[0_12px_32px_-8px_rgb(24_24_27/0.25)] transition-[opacity,transform] duration-200 ease-snappy starting:translate-y-2 starting:opacity-0"
        >
          {t.tone === 'success' ? (
            <CheckCircle2 size={16} className="mt-px shrink-0 text-success-600" />
          ) : (
            <XCircle size={16} className="mt-px shrink-0 text-danger-600" />
          )}
          <span className={cn('min-w-0 flex-1', t.tone === 'error' && 'text-danger-700')}>{t.message}</span>
          <button
            type="button"
            aria-label="Cerrar aviso"
            onClick={() => dismiss(t.id)}
            className="focus-ring -m-1 shrink-0 rounded p-1 text-slate-400 hover:text-slate-700"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
