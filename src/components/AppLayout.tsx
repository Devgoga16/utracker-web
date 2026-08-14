import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ChevronDown, ClipboardList, Package, Settings, Workflow } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/cn'

const navItems: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/orders', label: 'Pedidos', icon: ClipboardList },
  { to: '/catalog', label: 'Catálogo', icon: Package },
  { to: '/workflow', label: 'Workflow', icon: Workflow },
  { to: '/settings', label: 'Ajustes', icon: Settings },
]

export function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, activeTenant, setActiveTenant, logout } = useAuthStore()
  const [menuOpen, setMenuOpen] = useState(false)

  // Un menú abierto sobreviviendo a la navegación tapa la pantalla nueva.
  useEffect(() => setMenuOpen(false), [location.pathname])

  function handleLogout() {
    logout()
    navigate('/login')
  }

  function switchTenant() {
    setActiveTenant(null)
    navigate('/tenants')
  }

  const tenantAvatar = activeTenant?.logoUrl ? (
    <img
      src={activeTenant.logoUrl}
      alt=""
      className="size-7 shrink-0 rounded-full object-cover ring-1 ring-slate-200"
    />
  ) : (
    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-600">
      {activeTenant?.name?.charAt(0).toUpperCase() ?? '?'}
    </span>
  )

  return (
    // pb-20 deja libre la altura de la barra inferior en mobile.
    <div className="min-h-full pb-20 md:pb-0">
      {/* ── Header ── */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        {/* Mobile: negocio a la izquierda, cuenta a la derecha. */}
        <div className="relative flex items-center gap-2 px-4 py-2.5 md:hidden">
          <button
            type="button"
            onClick={switchTenant}
            className="flex min-w-0 flex-1 items-center gap-2 rounded-lg py-1 text-left active:bg-slate-50"
          >
            {tenantAvatar}
            <span className="truncate font-semibold text-slate-900">{activeTenant?.name}</span>
            <ChevronDown size={15} className="shrink-0 text-slate-400" />
          </button>

          <button
            type="button"
            aria-label="Cuenta"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600 active:bg-slate-200"
          >
            {user?.name?.charAt(0).toUpperCase() ?? '?'}
          </button>

          {menuOpen && (
            <>
              <button
                type="button"
                aria-label="Cerrar menú"
                onClick={() => setMenuOpen(false)}
                className="fixed inset-0 z-30 cursor-default"
              />
              <div className="absolute top-full right-4 z-40 mt-1 w-56 rounded-xl bg-white p-1.5 shadow-lg ring-1 ring-slate-200">
                <div className="px-3 py-2">
                  <p className="truncate text-sm font-medium text-slate-900">{user?.name}</p>
                  <p className="truncate text-xs text-slate-500">{user?.email}</p>
                </div>
                <button
                  type="button"
                  onClick={switchTenant}
                  className="w-full rounded-lg px-3 py-2.5 text-left text-sm text-slate-700 active:bg-slate-100"
                >
                  Cambiar de negocio
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full rounded-lg px-3 py-2.5 text-left text-sm text-red-600 active:bg-red-50"
                >
                  Salir
                </button>
              </div>
            </>
          )}
        </div>

        {/* Desktop: navegación completa en la barra superior. */}
        <div className="mx-auto hidden max-w-6xl items-center gap-6 px-6 py-3 md:flex">
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

          <div className="ml-auto flex min-w-0 items-center gap-4 text-sm">
            <button
              type="button"
              onClick={switchTenant}
              className="flex min-w-0 items-center gap-2 font-medium text-slate-700 hover:text-brand-600"
            >
              {activeTenant?.logoUrl ? (
                <img
                  src={activeTenant.logoUrl}
                  alt=""
                  className="size-6 shrink-0 rounded-full object-cover ring-1 ring-slate-200"
                />
              ) : null}
              <span className="truncate">{activeTenant?.name}</span>
            </button>
            <span className="text-slate-300">|</span>
            <span className="truncate text-slate-500">{user?.name}</span>
            <button
              type="button"
              onClick={handleLogout}
              className="shrink-0 text-slate-500 hover:text-red-600"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>

      {/* ── Barra inferior (solo mobile) ── */}
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white md:hidden">
        <div className="grid grid-cols-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors',
                  isActive ? 'text-brand-600' : 'text-slate-400 active:text-slate-600',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon size={21} strokeWidth={isActive ? 2.3 : 2} />
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
