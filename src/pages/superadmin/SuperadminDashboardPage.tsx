import { useQuery } from '@tanstack/react-query'
import { Building2, CreditCard, ShoppingBag, TrendingUp } from 'lucide-react'
import { getSuperadminStats } from '@/api/superadmin'
import { PageHeader, StatCard, Spinner } from '@/components/ui'

export function SuperadminDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['superadmin-stats'],
    queryFn: getSuperadminStats,
  })

  if (isLoading) return <Spinner />

  const subs = data?.subscriptions ?? { active: 0, trial: 0, suspended: 0 }

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Resumen global de la plataforma." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Building2}
          label="Negocios totales"
          value={String(data?.totalTenants ?? 0)}
        />
        <StatCard
          icon={CreditCard}
          label="Planes activos"
          value={String(data?.totalPlans ?? 0)}
        />
        <StatCard
          icon={ShoppingBag}
          label="Pedidos este mes"
          value={String(data?.ordersThisMonth ?? 0)}
        />
        <StatCard
          icon={TrendingUp}
          label="Suscripciones activas"
          value={String(subs.active)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {(
          [
            { label: 'Trial', count: subs.trial, color: 'bg-amber-100 text-amber-700' },
            { label: 'Activas', count: subs.active, color: 'bg-emerald-100 text-emerald-700' },
            { label: 'Suspendidas', count: subs.suspended, color: 'bg-red-100 text-red-700' },
          ] as const
        ).map(({ label, count, color }) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{count}</p>
            <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
              suscripciones
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
