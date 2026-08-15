import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  BarChart2,
  ChevronDown,
  ChevronsLeft,
  ClipboardList,
  CreditCard,
  LogOut,
  Package,
  PackageSearch,
  Settings,
  Workflow,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useSubscription } from '@/hooks/useSubscription'
import { cn } from '@/lib/cn'
import type { PlanFeatures } from '@/types'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  /** Si está, el ítem solo se muestra cuando el plan incluye esa feature. */
  featureKey?: keyof PlanFeatures
}

const ALL_MAIN_NAV: NavItem[] = [
  { to: '/orders', label: 'Pedidos', icon: ClipboardList },
  { to: '/catalog', label: 'Catálogo', icon: Package },
  { to: '/inventory', label: 'Inventario', icon: PackageSearch, featureKey: 'inventory' },
  { to: '/finances', label: 'Finanzas', icon: BarChart2, featureKey: 'finances' },
]

const configNav: NavItem[] = [
  { to: '/workflow', label: 'Workflow', icon: Workflow },
  { to: '/settings', label: 'Ajustes', icon: Settings },
  { to: '/billing', label: 'Suscripción', icon: CreditCard },
]

const COLLAPSE_KEY = 'utracker:sidebar-collapsed'

export function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, activeTenant, setActiveTenant, logout } = useAuthStore()
  const { can, isSuspended } = useSubscription()
  const [menuOpen, setMenuOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(COLLAPSE_KEY) === '1',
  )

  const mainNav = ALL_MAIN_NAV.filter((item) => !item.featureKey || can(item.featureKey))
  const mobileNav = [...mainNav, configNav[0]].slice(0, 5)

  // Un menú abierto sobreviviendo a la navegación tapa la pantalla nueva.
  useEffect(() => setMenuOpen(false), [location.pathname])

  useEffect(() => {
    localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0')
  }, [collapsed])

  function handleLogout() {
    logout()
    navigate('/login')
  }

  function switchTenant() {
    setActiveTenant(null)
    navigate('/tenants')
  }

  const tenantInitial = activeTenant?.name?.charAt(0).toUpperCase() ?? '?'

  const tenantAvatar = activeTenant?.logoUrl ? (
    <img
      src={activeTenant.logoUrl}
      alt=""
      className="size-7 shrink-0 rounded-full object-cover ring-1 ring-slate-200"
    />
  ) : (
    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-600">
      {tenantInitial}
    </span>
  )

  return (
    <div className="min-h-full">
      {/* ══ Sidebar (desktop) ══ */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-slate-200 bg-white transition-[width] duration-200 md:flex',
          collapsed ? 'w-[4.5rem]' : 'w-60',
        )}
      >
        {/* Marca */}
        <div
          className={cn(
            'flex h-16 shrink-0 items-center border-b border-slate-100',
            collapsed ? 'justify-center px-2' : 'gap-2.5 px-4',
          )}
        >
          <img src="/uTrackerLogo.png" alt="" className="size-8 shrink-0" />
          {!collapsed && (
            <span className="truncate text-lg font-bold tracking-tight text-slate-900">
              uTracker
            </span>
          )}
        </div>

        {/* Negocio activo */}
        <div className={cn('shrink-0 py-3', collapsed ? 'px-2' : 'px-3')}>
          <button
            type="button"
            onClick={switchTenant}
            title={collapsed ? `${activeTenant?.name} — cambiar de negocio` : undefined}
            className={cn(
              'flex w-full items-center rounded-xl bg-slate-50 text-left transition-colors hover:bg-slate-100',
              collapsed ? 'justify-center p-2' : 'gap-2.5 px-3 py-2.5',
            )}
          >
            {tenantAvatar}
            {!collapsed && (
              <>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-slate-900">
                    {activeTenant?.name}
                  </span>
                  <span className="block truncate text-xs text-slate-400">Cambiar de negocio</span>
                </span>
                <ChevronDown size={15} className="shrink-0 text-slate-400" />
              </>
            )}
          </button>
        </div>

        {/* Navegación */}
        <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
          <SidebarGroup items={mainNav} collapsed={collapsed} />
          <SidebarGroup
            items={configNav}
            collapsed={collapsed}
            label="Configuración"
            className="mt-6"
          />
        </nav>

        {/* Cuenta */}
        <div
          className={cn(
            'shrink-0 border-t border-slate-100 py-3',
            collapsed ? 'px-2' : 'px-3',
          )}
        >
          <div
            className={cn(
              'flex items-center',
              collapsed ? 'flex-col gap-2' : 'gap-2.5 px-1',
            )}
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
              {user?.name?.charAt(0).toUpperCase() ?? '?'}
            </span>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">{user?.name}</p>
                <p className="truncate text-xs text-slate-400">{user?.email}</p>
              </div>
            )}
            <button
              type="button"
              onClick={handleLogout}
              title="Salir"
              aria-label="Salir"
              className="shrink-0 rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
            >
              <LogOut size={16} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            title={collapsed ? 'Expandir menú' : 'Contraer menú'}
            className={cn(
              'mt-2 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600',
              collapsed && 'justify-center',
            )}
          >
            <ChevronsLeft
              size={16}
              className={cn('shrink-0 transition-transform', collapsed && 'rotate-180')}
            />
            {!collapsed && 'Contraer'}
          </button>
        </div>
      </aside>

      {/* ══ Contenido ══ */}
      {/* pb-20 deja libre la altura de la barra inferior en mobile. */}
      <div
        className={cn(
          'min-h-full pb-20 transition-[padding] duration-200 md:pb-0',
          collapsed ? 'md:pl-[4.5rem]' : 'md:pl-60',
        )}
      >
        {/* Header compacto: solo mobile, el sidebar cubre desktop. */}
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white md:hidden">
          <div className="relative flex items-center gap-2 px-4 py-2.5">
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
                  <NavLink
                    to="/settings"
                    className="block w-full rounded-lg px-3 py-2.5 text-left text-sm text-slate-700 active:bg-slate-100"
                  >
                    Ajustes
                  </NavLink>
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
        </header>

        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          {isSuspended && (
            <div className="mb-6 flex items-center gap-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
              <AlertTriangle size={16} className="shrink-0" />
              Tu suscripción está suspendida. Algunas funciones pueden no estar disponibles.
              Contacta al administrador para reactivarla.
            </div>
          )}
          <Outlet />
        </main>
      </div>

      {/* ══ Barra inferior (solo mobile) ══ */}
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white md:hidden">
        <div className="grid grid-cols-5">
          {mobileNav.map((item) => (
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

function SidebarGroup({
  items,
  collapsed,
  label,
  className,
}: {
  items: NavItem[]
  collapsed: boolean
  label?: string
  className?: string
}) {
  return (
    <div className={className}>
      {label && !collapsed && (
        <p className="mb-1 px-3 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
          {label}
        </p>
      )}
      {/* Con el sidebar contraído el separador reemplaza al título del grupo. */}
      {label && collapsed && <div className="mx-2 mb-2 border-t border-slate-100" />}

      <ul className="space-y-0.5">
        {items.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                cn(
                  'flex items-center rounded-lg text-sm font-medium transition-colors',
                  collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2',
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon size={18} strokeWidth={isActive ? 2.3 : 2} className="shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </div>
  )
}
