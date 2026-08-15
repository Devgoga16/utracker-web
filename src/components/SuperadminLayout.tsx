import { NavLink, Outlet } from 'react-router-dom'
import { BarChart2, Building2, CreditCard, LogOut, Receipt } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

const nav = [
  { to: '/superadmin', label: 'Dashboard', icon: BarChart2, end: true },
  { to: '/superadmin/plans', label: 'Planes', icon: CreditCard },
  { to: '/superadmin/tenants', label: 'Negocios', icon: Building2 },
  { to: '/superadmin/billing', label: 'Facturación', icon: Receipt },
]

export function SuperadminLayout() {
  const logout = useAuthStore((s) => s.logout)

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 flex w-56 flex-col border-r border-slate-200 bg-white">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
          <span className="flex size-7 items-center justify-center rounded-lg bg-violet-600 text-white text-xs font-bold">
            SA
          </span>
          <span className="text-sm font-semibold text-slate-800">Superadmin</span>
        </div>

        <nav className="flex-1 space-y-0.5 p-3">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-violet-50 text-violet-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-100 p-3">
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-red-600"
          >
            <LogOut size={16} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="ml-56 flex-1 p-8">
        <Outlet />
      </main>
    </div>
  )
}
