import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, Clock, Eye, FileText, RefreshCw, XCircle } from 'lucide-react'
import {
  generateBills,
  listSuperadminBills,
  updateSuperadminBill,
} from '@/api/billing'
import { apiErrorMessage } from '@/api/client'
import { Alert, Button, Input, PageHeader, Spinner } from '@/components/ui'
import type { Bill, BillStatus } from '@/types'

const STATUS_CONFIG: Record<BillStatus, { label: string; className: string }> = {
  pending: { label: 'Pendiente', className: 'bg-amber-100 text-amber-700' },
  reviewing: { label: 'En revisión', className: 'bg-blue-100 text-blue-700' },
  paid: { label: 'Pagada', className: 'bg-emerald-100 text-emerald-700' },
  overdue: { label: 'Vencida', className: 'bg-red-100 text-red-700' },
}

const ALL_STATUSES: BillStatus[] = ['pending', 'reviewing', 'paid', 'overdue']

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

function tenantName(bill: Bill) {
  if (typeof bill.tenant === 'object') return bill.tenant.name
  return bill.tenant
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

function BillActions({ bill }: { bill: Bill }) {
  const qc = useQueryClient()
  const [error, setError] = useState('')

  const update = useMutation({
    mutationFn: (payload: { status: BillStatus; notes?: string }) =>
      updateSuperadminBill(bill._id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['superadmin-bills'] }),
    onError: (e) => setError(apiErrorMessage(e)),
  })

  return (
    <div className="flex items-center gap-1">
      {error && <span className="text-xs text-red-600">{error}</span>}
      {bill.status === 'reviewing' && (
        <Button
          size="sm"
          onClick={() => update.mutate({ status: 'paid' })}
          disabled={update.isPending}
        >
          <CheckCircle size={14} className="mr-1" />
          Confirmar pago
        </Button>
      )}
      {(bill.status === 'pending' || bill.status === 'reviewing') && (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => update.mutate({ status: 'overdue' })}
          disabled={update.isPending}
        >
          <Clock size={14} className="mr-1" />
          Vencer
        </Button>
      )}
    </div>
  )
}

function GenerateBillsPanel() {
  const qc = useQueryClient()
  const [period, setPeriod] = useState('')
  const [result, setResult] = useState<{ created: number; period: string } | null>(null)
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: () => generateBills(period.trim() || undefined),
    onSuccess: (data) => {
      setResult(data)
      qc.invalidateQueries({ queryKey: ['superadmin-bills'] })
    },
    onError: (e) => setError(apiErrorMessage(e)),
  })

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="mb-3 font-semibold text-slate-800">Generar facturas</h3>
      <p className="mb-3 text-sm text-slate-500">
        Genera las facturas del mes para todos los tenants con plan de pago. Si ya existen, se
        omiten automáticamente.
      </p>
      {error && <div className="mb-3"><Alert>{error}</Alert></div>}
      {result && (
        <div className="mb-3 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {result.created} factura{result.created !== 1 ? 's' : ''} generada
          {result.created !== 1 ? 's' : ''} para {formatPeriod(result.period)}.
        </div>
      )}
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Período (YYYY-MM, vacío = mes actual)
          </label>
          <Input
            placeholder="2026-08"
            value={period}
            onChange={(e) => {
              setPeriod(e.target.value)
              setResult(null)
              setError('')
            }}
            className="max-w-xs"
          />
        </div>
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          <RefreshCw size={14} className="mr-1" />
          {mutation.isPending ? 'Generando...' : 'Generar'}
        </Button>
      </div>
    </div>
  )
}

export function SuperadminBillingPage() {
  const [statusFilter, setStatusFilter] = useState<BillStatus | 'all'>('all')
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['superadmin-bills', statusFilter],
    queryFn: () =>
      listSuperadminBills(statusFilter !== 'all' ? { status: statusFilter } : undefined),
  })

  const bills = data?.bills ?? []
  const total = data?.total ?? 0

  // Stats from the full list (unfiltered counts from currently loaded data when filter=all)
  const statsByStatus =
    statusFilter === 'all'
      ? ALL_STATUSES.reduce<Record<BillStatus, number>>((acc, s) => {
          acc[s] = bills.filter((b) => b.status === s).length
          return acc
        }, {} as Record<BillStatus, number>)
      : null

  return (
    <div className="space-y-6">
      {lightboxUrl && <ProofLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}

      <PageHeader
        title="Facturación"
        description="Gestión de facturas mensuales de los negocios."
      />

      {/* Stats row */}
      {statsByStatus && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {ALL_STATUSES.map((s) => {
            const cfg = STATUS_CONFIG[s]
            return (
              <div key={s} className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-medium text-slate-500">{cfg.label}</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{statsByStatus[s]}</p>
              </div>
            )
          })}
        </div>
      )}

      <GenerateBillsPanel />

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setStatusFilter('all')}
          className={`rounded-full border px-3 py-1 text-sm font-medium transition ${
            statusFilter === 'all'
              ? 'border-slate-800 bg-slate-800 text-white'
              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'
          }`}
        >
          Todas ({total || bills.length})
        </button>
        {ALL_STATUSES.map((s) => {
          const cfg = STATUS_CONFIG[s]
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-full border px-3 py-1 text-sm font-medium transition ${
                statusFilter === s
                  ? 'border-slate-800 bg-slate-800 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'
              }`}
            >
              {cfg.label}
            </button>
          )
        })}
      </div>

      {/* Table */}
      {isLoading ? (
        <Spinner />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Negocio</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Período</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Plan</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Monto</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Vence</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {bills.map((bill) => (
                <tr key={bill._id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{tenantName(bill)}</td>
                  <td className="px-4 py-3 text-slate-700">{formatPeriod(bill.period)}</td>
                  <td className="px-4 py-3 text-slate-600">{bill.planName}</td>
                  <td className="px-4 py-3 text-right font-medium text-slate-900">
                    {formatCurrency(bill.amount)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {new Date(bill.dueDate).toLocaleDateString('es-PE')}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={bill.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {bill.proofImageUrl && (
                        <button
                          title="Ver comprobante"
                          onClick={() => setLightboxUrl(bill.proofImageUrl!)}
                          className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                        >
                          <Eye size={16} />
                        </button>
                      )}
                      <BillActions bill={bill} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {bills.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-12 text-slate-400">
              <FileText size={32} />
              <p className="text-sm">No hay facturas.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
