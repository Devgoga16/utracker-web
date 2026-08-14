import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/cn'

const navItems = [
  { to: '/orders', label: 'Pedidos' },
  { to: '/catalog', label: 'Catálogo' },
  { to: '/workflow', label: 'Workflow' },
  { to: '/settings', label: 'Ajustes' },
]

export function AppLayout() {
  const navigate = useNavigate()
  const { user, activeTenant, setActiveTenant, logout } = useAuthStore()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-full">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-3">
          <span className="text-lg font-bold text-brand-600">uTracker</span>

          <nav className="flex gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                    isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-4 text-sm">
            <button
              type="button"
              onClick={() => {
                setActiveTenant(null)
                navigate('/tenants')
              }}
              className="flex items-center gap-2 font-medium text-slate-700 hover:text-brand-600"
            >
              {activeTenant?.logoUrl ? (
                <img
                  src={activeTenant.logoUrl}
                  alt=""
                  className="size-6 rounded-full object-cover ring-1 ring-slate-200"
                />
              ) : null}
              {activeTenant?.name}
            </button>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500">{user?.name}</span>
            <button type="button" onClick={handleLogout} className="text-slate-500 hover:text-red-600">
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  )
}
