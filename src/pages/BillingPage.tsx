import { useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CreditCard, Eye, FileText, Upload, XCircle } from 'lucide-react'
import { getMyBills, submitBillingProof, uploadBillingProofFile } from '@/api/billing'
import { apiErrorMessage } from '@/api/client'
import { useSubscription } from '@/hooks/useSubscription'
import { Alert, Button, PageHeader, Spinner } from '@/components/ui'
import type { Bill, BillStatus } from '@/types'

const STATUS_CONFIG: Record<BillStatus, { label: string; className: string }> = {
  pending: { label: 'Pendiente', className: 'bg-amber-100 text-amber-700' },
  reviewing: { label: 'En revisión', className: 'bg-blue-100 text-blue-700' },
  paid: { label: 'Pagada', className: 'bg-emerald-100 text-emerald-700' },
  overdue: { label: 'Vencida', className: 'bg-red-100 text-red-700' },
}

function formatPeriod(period: string) {
  const [year, month] = period.split('-').map(Number)
  const label = new Date(year, month - 1).toLocaleDateString('es-PE', {
    month: 'long',
    year: 'numeric',
  })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount)
}

function StatusBadge({ status }: { status: BillStatus }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  )
}

function ProofLightbox({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] max-w-2xl overflow-auto rounded-xl bg-white p-2"
        onClick={(e) => e.stopPropagation()}
      >
        <img src={url} alt="Comprobante de pago" className="max-w-full rounded" />
        <button
          className="absolute right-3 top-3 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
          onClick={onClose}
        >
          <XCircle size={20} />
        </button>
      </div>
    </div>
  )
}

function ProofUploader({ bill }: { bill: Bill }) {
  const qc = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const [step, setStep] = useState<'idle' | 'uploading' | 'submitting'>('idle')

  async function handleFile(file: File) {
    setError('')
    try {
      setStep('uploading')
      const url = await uploadBillingProofFile(file)
      setStep('submitting')
      await submitBillingProof(bill._id, url)
      qc.invalidateQueries({ queryKey: ['my-bills'] })
      setStep('idle')
    } catch (e) {
      setError(apiErrorMessage(e))
      setStep('idle')
    }
  }

  const busy = step !== 'idle'

  return (
    <div className="mt-2">
      {error && <div className="mb-2"><Alert>{error}</Alert></div>}
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ''
        }}
      />
      <Button
        size="sm"
        variant="secondary"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        <Upload size={14} className="mr-1" />
        {step === 'uploading'
          ? 'Subiendo...'
          : step === 'submitting'
            ? 'Enviando...'
            : 'Subir comprobante'}
      </Button>
      <p className="mt-1 text-xs text-slate-500">
        El comprobante quedará en revisión por el equipo de uTracker.
      </p>
    </div>
  )
}

function BillCard({ bill, onViewProof }: { bill: Bill; onViewProof: (url: string) => void }) {
  const canUpload = bill.status === 'pending' || bill.status === 'overdue'

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-900">{formatPeriod(bill.period)}</p>
          <p className="text-sm text-slate-500">
            {bill.planName} · {formatCurrency(bill.amount)}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">
            Vence: {new Date(bill.dueDate).toLocaleDateString('es-PE')}
          </p>
        </div>
        <StatusBadge status={bill.status} />
      </div>

      {bill.proofImageUrl && (
        <button
          onClick={() => onViewProof(bill.proofImageUrl!)}
          className="mt-2 flex items-center gap-1 text-xs text-blue-600 hover:underline"
        >
          <Eye size={12} />
          Ver comprobante enviado
        </button>
      )}

      {canUpload && !bill.proofImageUrl && <ProofUploader bill={bill} />}

      {bill.status === 'reviewing' && (
        <p className="mt-2 text-xs text-blue-600">
          Tu comprobante está siendo revisado. Te avisaremos cuando se confirme.
        </p>
      )}
    </div>
  )
}

export function BillingPage() {
  const { subscription, isLoading: subLoading } = useSubscription()
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  const { data: bills, isLoading: billsLoading } = useQuery({
    queryKey: ['my-bills'],
    queryFn: getMyBills,
  })

  const isLoading = subLoading || billsLoading

  return (
    <div className="space-y-6">
      {lightboxUrl && <ProofLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}

      <PageHeader title="Suscripción" description="Tu plan activo y el historial de facturas." />

      {/* Current plan card */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
            <CreditCard size={20} className="text-slate-600" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Plan actual
            </p>
            {subscription ? (
              <>
                <p className="font-semibold text-slate-900">{subscription.plan.name}</p>
                <p className="text-sm text-slate-500">
                  {new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(
                    subscription.plan.price
                  )}{' '}
                  / mes ·{' '}
                  <span
                    className={
                      subscription.status === 'active'
                        ? 'text-emerald-600'
                        : subscription.status === 'suspended'
                          ? 'text-red-600'
                          : 'text-amber-600'
                    }
                  >
                    {subscription.status === 'active'
                      ? 'Activa'
                      : subscription.status === 'suspended'
                        ? 'Suspendida'
                        : 'Trial'}
                  </span>
                </p>
              </>
            ) : isLoading ? (
              <Spinner inline />
            ) : (
              <p className="text-sm text-slate-400">Sin plan asignado</p>
            )}
          </div>
        </div>
      </div>

      {/* Bills list */}
      <div>
        <h2 className="mb-3 font-semibold text-slate-800">Historial de facturas</h2>

        {isLoading ? (
          <Spinner />
        ) : !bills || bills.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white py-12 text-slate-400">
            <FileText size={32} />
            <p className="text-sm">No hay facturas aún.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {[...bills]
              .sort((a, b) => b.period.localeCompare(a.period))
              .map((bill) => (
                <BillCard key={bill._id} bill={bill} onViewProof={setLightboxUrl} />
              ))}
          </div>
        )}
      </div>
    </div>
  )
}
