import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  BarChart2,
  Bug,
  CalendarDays,
  ChevronDown,
  ChevronsUpDown,
  ClipboardList,
  CreditCard,
  ExternalLink,
  Gift,
  LifeBuoy,
  ListFilter,
  LogOut,
  Menu,
  MoreHorizontal,
  Package,
  PackageSearch,
  Plug,
  Repeat,
  Search,
  Settings,
  ShieldAlert,
  ShoppingCart,
  Store as Storefront,
  Sun,
  Users,
  Workflow,
  X,
  Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { getToday } from '@/api/orders'
import { useAuthStore } from '@/stores/authStore'
import { useSubscription } from '@/hooks/useSubscription'
import { ErrorBoundary, useGlobalErrorReporting } from '@/components/ErrorBoundary'
import { ReportProblemDialog } from '@/components/ReportProblemDialog'
import { CommandPalette } from '@/components/CommandPalette'
import { Banner, Button, Kbd } from '@/components/ui'
import { Toaster } from '@/components/Toaster'
import { useSupportStore } from '@/stores/supportStore'
import { cn, formatDateTime } from '@/lib/cn'
import type { FeatureKey, MembershipRole } from '@/types'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  /** Si está, el ítem solo se muestra cuando el plan incluye esa funcionalidad. */
  featureKey?: FeatureKey
  /** Exige coincidencia exacta: evita que un padre se marque junto al hijo. */
  end?: boolean
  /** Si está, solo lo ven estos roles. */
  roles?: MembershipRole[]
  /** Nombre corto para la barra inferior, donde caben unas diez letras. */
  mobileLabel?: string
  /** Para encontrarlo en el buscador con otras palabras. */
  keywords?: string
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const MANAGERS: MembershipRole[] = ['owner', 'admin']
const TEAM: MembershipRole[] = ['owner', 'admin', 'staff']

/**
 * El menú sigue el orden en que se usa el sistema: lo de todos los días
 * arriba, lo que se configura una vez abajo. Cada grupo se puede plegar.
 */
const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Operación',
    items: [
      // La pantalla con la que se abre el negocio: qué hacer ahora.
      { to: '/today', label: 'Hoy', icon: Sun, keywords: 'inicio resumen' },
      { to: '/orders', label: 'Pedidos', icon: ClipboardList, keywords: 'ventas' },
      { to: '/pos', label: 'Punto de venta', icon: ShoppingCart, featureKey: 'pos', roles: TEAM, mobileLabel: 'Vender', keywords: 'caja mostrador vender' },
      { to: '/calendar', label: 'Calendario', icon: CalendarDays, featureKey: 'orderCalendar', keywords: 'agenda semana' },
      { to: '/campaigns', label: 'Campañas', icon: Zap, featureKey: 'campaigns', roles: MANAGERS, keywords: 'preventa' },
      { to: '/finances', label: 'Finanzas', icon: BarChart2, featureKey: 'finances', roles: MANAGERS, keywords: 'ingresos cobros' },
    ],
  },
  {
    label: 'Catálogo',
    items: [
      // `end` porque /catalog/filters es su hermano en el menú, no su hijo.
      { to: '/catalog', label: 'Productos', icon: Package, end: true, roles: TEAM, keywords: 'catálogo servicios' },
      { to: '/catalog/filters', label: 'Filtros', icon: ListFilter, featureKey: 'productFilters', roles: MANAGERS, keywords: 'tallas colores' },
      { to: '/inventory', label: 'Inventario', icon: PackageSearch, featureKey: 'inventory', roles: TEAM, keywords: 'stock' },
    ],
  },
  {
    label: 'Configuración',
    items: [
      { to: '/workflow', label: 'Workflow', icon: Workflow, roles: MANAGERS, keywords: 'estados' },
      { to: '/team', label: 'Equipo', icon: Users, roles: MANAGERS, keywords: 'invitar personal roles' },
      { to: '/settings', label: 'Ajustes', icon: Settings, roles: MANAGERS, keywords: 'tienda logo whatsapp avisos horario' },
      { to: '/integration', label: 'Integración', icon: Plug, featureKey: 'storefrontApi', roles: MANAGERS, keywords: 'api llaves' },
      { to: '/billing', label: 'Suscripción', icon: CreditCard, roles: MANAGERS, keywords: 'plan facturas' },
      { to: '/referrals', label: 'Invita y gana', icon: Gift, roles: MANAGERS, keywords: 'referidos descuento código invitar' },
      { to: '/support', label: 'Soporte', icon: LifeBuoy, keywords: 'ayuda tickets' },
    ],
  },
]

/**
 * Qué va en la barra inferior del celular, por prioridad. Se toman los cinco
 * primeros que el plan y el rol permitan.
 */
const MOBILE_PRIORITY = ['/today', '/orders', '/pos', '/calendar', '/catalog', '/inventory', '/settings']

const FOLDED_KEY = 'utracker:nav-folded'

function readFolded(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(FOLDED_KEY) ?? '[]')
    return Array.isArray(raw) ? raw : []
  } catch {
    return []
  }
}

function localDate() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/**
 * uTracker 2.0: barra lateral gris claro con el negocio arriba, un buscador
 * para todo, el menú en grupos plegables y la cuenta abajo. El contenido va
 * en blanco, a todo lo ancho.
 */
export function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { activeTenant, setActiveTenant, logout } = useAuthStore()
  const { can, isSuspended } = useSubscription()

  // Lo que se rompe fuera de React también tiene que llegar a los logs.
  useGlobalErrorReporting()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)

  const role = activeTenant?.role
  // Un grupo que se queda sin ítems por el plan o el rol no deja su título solo.
  const groups = NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter(
      (item) =>
        (!item.featureKey || can(item.featureKey)) &&
        (!item.roles || !role || item.roles.includes(role)),
    ),
  })).filter((g) => g.items.length > 0)

  const allItems = groups.flatMap((g) => g.items)
  const mobileNav = MOBILE_PRIORITY.map((to) => allItems.find((i) => i.to === to))
    .filter((i): i is NavItem => Boolean(i))
    .slice(0, 5)

  // Un cajón abierto sobreviviendo a la navegación tapa la pantalla nueva.
  useEffect(() => setDrawerOpen(false), [location.pathname])

  // «/» o Ctrl+K abren el buscador desde cualquier lado, salvo escribiendo.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)
      if ((e.key === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !typing)) {
        e.preventDefault()
        setPaletteOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function switchTenant() {
    setActiveTenant(null)
    navigate('/tenants')
  }

  const sidebar = (
    <Sidebar
      groups={groups}
      onSearch={() => {
        setDrawerOpen(false)
        setPaletteOpen(true)
      }}
      onSwitchTenant={switchTenant}
      onLogout={() => {
        logout()
        navigate('/login')
      }}
    />
  )

  return (
    <div className="min-h-full bg-white">
      {/* ══ Barra lateral (escritorio) ══ */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-slate-200 bg-slate-50 md:block">
        {sidebar}
      </aside>

      {/* ══ Cajón (celular) ══ */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 cursor-default bg-slate-950/30"
          />
          <div className="relative h-full w-72 max-w-[85vw] border-r border-slate-200 bg-slate-50 shadow-xl transition-transform duration-200 ease-snappy starting:-translate-x-full">
            <button
              type="button"
              aria-label="Cerrar menú"
              onClick={() => setDrawerOpen(false)}
              className="absolute top-4 right-3 z-10 flex size-8 items-center justify-center rounded-lg text-slate-400 active:bg-slate-200"
            >
              <X size={17} />
            </button>
            {sidebar}
          </div>
        </div>
      )}

      <div className="min-h-full pb-20 md:pb-0 md:pl-64">
        {/* Cabecera compacta: solo celular, la barra lateral cubre el escritorio. */}
        <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-slate-200 bg-white/90 px-3 py-2 backdrop-blur md:hidden">
          <button
            type="button"
            aria-label="Abrir menú"
            onClick={() => setDrawerOpen(true)}
            className="flex size-9 items-center justify-center rounded-lg text-slate-600 active:bg-slate-100"
          >
            <Menu size={19} />
          </button>
          <TenantAvatar size="sm" />
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900">
            {activeTenant?.name}
          </span>
          <button
            type="button"
            aria-label="Buscar"
            onClick={() => setPaletteOpen(true)}
            className="flex size-9 items-center justify-center rounded-lg text-slate-600 active:bg-slate-100"
          >
            <Search size={18} />
          </button>
        </header>

        <main className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6 sm:py-6">
          {/* Soporte mirando un negocio ajeno: que no se olvide ni por un momento. */}
          {/* Avisos del marco: van por encima de la barra de título de cada pantalla. */}
          {(activeTenant?.support || isSuspended) && (
            <div className="-mx-4 -mt-5 mb-5 space-y-2 border-b border-slate-200 bg-slate-50 px-4 py-2.5 sm:-mx-6 sm:-mt-6 sm:px-6">
              {activeTenant?.support && (
                <Banner
                  tone={activeTenant.support.canWrite ? 'warning' : 'info'}
                  icon={ShieldAlert}
                  title={
                    activeTenant.support.canWrite
                      ? `Soporte con permiso de cambios en ${activeTenant.name}`
                      : `Soporte en solo lectura en ${activeTenant.name}`
                  }
                  action={
                    <Button size="sm" variant="secondary" onClick={switchTenant}>
                      Salir del negocio
                    </Button>
                  }
                >
                  {activeTenant.support.canWrite
                    ? 'Lo que cambies queda registrado a nombre de soporte.'
                    : 'Puedes mirar todo, pero no guardar cambios.'}{' '}
                  El acceso vence {formatDateTime(activeTenant.support.expiresAt)}.
                </Banner>
              )}
              {isSuspended && (
                <Banner tone="danger" icon={AlertTriangle} title="Tu suscripción está suspendida">
                  Puedes ver tu información, pero no registrar pedidos nuevos. Escríbenos desde Soporte
                  para reactivarla.
                </Banner>
              )}
            </div>
          )}

          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        items={allItems.map((i) => ({ to: i.to, label: i.label, icon: i.icon, keywords: i.keywords }))}
      />

      {/* Un solo diálogo de reporte para toda la aplicación. */}
      <ReportProblemDialog />
      <Toaster />

      {/* ══ Barra inferior (celular) ══ */}
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden">
        <div className="grid" style={{ gridTemplateColumns: `repeat(${mobileNav.length}, minmax(0, 1fr))` }}>
          {mobileNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors',
                  isActive ? 'text-brand-600' : 'text-slate-400 active:text-slate-600',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
                  {item.mobileLabel ?? item.label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}

function TenantAvatar({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const tenant = useAuthStore((s) => s.activeTenant)
  const cls = size === 'sm' ? 'size-7 rounded-md text-xs' : 'size-9 rounded-lg text-sm'
  return tenant?.logoUrl ? (
    <img src={tenant.logoUrl} alt="" className={cn(cls, 'shrink-0 object-cover border border-slate-200')} />
  ) : (
    <span className={cn(cls, 'flex shrink-0 items-center justify-center bg-navy font-semibold text-white')}>
      {tenant?.name?.charAt(0).toUpperCase() ?? '?'}
    </span>
  )
}

function Sidebar({
  groups,
  onSearch,
  onSwitchTenant,
  onLogout,
}: {
  groups: NavGroup[]
  onSearch: () => void
  onSwitchTenant: () => void
  onLogout: () => void
}) {
  const { user, activeTenant } = useAuthStore()
  const { plan } = useSubscription()
  const openReporter = useSupportStore((s) => s.openReporter)
  const [folded, setFolded] = useState<string[]>(readFolded)
  const [accountOpen, setAccountOpen] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(FOLDED_KEY, JSON.stringify(folded))
    } catch {
      /* sin almacenamiento: los grupos vuelven a abrirse, nada más */
    }
  }, [folded])

  // Lo que pide atención, junto a «Hoy». Comparte la consulta con esa pantalla.
  const [date] = useState(localDate)
  const { data: today } = useQuery({
    queryKey: ['today', date],
    queryFn: () => getToday(date),
    refetchInterval: 60_000,
    enabled: Boolean(activeTenant),
  })
  const attention = today ? today.overdue.length + today.proofs.length : 0

  const toggle = (label: string) =>
    setFolded((f) => (f.includes(label) ? f.filter((l) => l !== label) : [...f, label]))

  return (
    <div className="flex h-full flex-col">
      {/* Negocio activo: desde aquí se cambia de negocio. */}
      <button
        type="button"
        onClick={onSwitchTenant}
        className="m-3 mb-2 flex items-center gap-3 rounded-lg p-2 pr-9 text-left transition-colors hover:bg-slate-200/60 md:pr-2"
      >
        <TenantAvatar />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold text-slate-900">{activeTenant?.name}</span>
          <span className="block truncate text-xs text-slate-500">
            {plan?.name ? `Plan ${plan.name}` : 'Cambiar de negocio'}
          </span>
        </span>
        <ChevronsUpDown size={15} className="hidden shrink-0 text-slate-400 md:block" />
      </button>

      <button
        type="button"
        onClick={onSearch}
        className="mx-3 mb-3 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[13px] text-slate-400 shadow-[0_1px_2px_rgb(24_24_27/0.03)] transition-colors hover:border-slate-300"
      >
        <Search size={14} />
        <span className="flex-1 text-left">Buscar</span>
        <Kbd>/</Kbd>
      </button>

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        {groups.map((group) => {
          const isFolded = folded.includes(group.label)
          return (
            <div key={group.label} className="mt-3 first:mt-0">
              <button
                type="button"
                onClick={() => toggle(group.label)}
                aria-expanded={!isFolded}
                className="flex w-full items-center gap-1.5 px-2 py-1 text-[11px] font-medium tracking-[0.08em] text-slate-400 uppercase hover:text-slate-600"
              >
                <ChevronDown size={12} className={cn('transition-transform duration-150', isFolded && '-rotate-90')} />
                {group.label}
              </button>
              {!isFolded && (
                <ul className="mt-0.5 space-y-px">
                  {group.items.map((item) => (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        end={item.end}
                        className={({ isActive }) =>
                          cn(
                            // Activo: fondo sutil, texto fuerte y una barra naranja a la izquierda. Sin contorno.
                            'focus-ring relative flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] transition-colors',
                            isActive
                              ? 'bg-slate-200/70 font-medium text-slate-900 before:absolute before:inset-y-1.5 before:-left-3 before:w-[3px] before:rounded-r-full before:bg-brand-500'
                              : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900',
                          )
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <item.icon
                              size={16}
                              strokeWidth={1.8}
                              className={cn('shrink-0', isActive ? 'text-brand-500' : 'text-slate-400')}
                            />
                            <span className="min-w-0 flex-1 truncate">{item.label}</span>
                            {item.to === '/today' && attention > 0 && (
                              <span className="rounded-md border border-slate-200 bg-white px-1.5 text-[11px] text-slate-600 tabular-nums">
                                {attention}
                              </span>
                            )}
                          </>
                        )}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}

        {activeTenant?.slug && (
          <a
            href={`/store/${activeTenant.slug}`}
            target="_blank"
            rel="noreferrer"
            className="mt-4 flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] text-slate-600 transition-colors hover:bg-slate-200/60 hover:text-slate-900"
          >
            <Storefront size={16} strokeWidth={1.8} className="shrink-0 text-slate-400" />
            <span className="min-w-0 flex-1 truncate">Ver mi tienda</span>
            <ExternalLink size={12} className="shrink-0 text-slate-400" />
          </a>
        )}
      </nav>

      {/* Cuenta */}
      <div className="pb-safe relative border-t border-slate-200 p-3">
        <div className="flex items-center gap-2.5 px-1">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700">
            {user?.name?.charAt(0).toUpperCase() ?? '?'}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-slate-900">{user?.name}</p>
            <p className="truncate text-xs text-slate-500">{user?.email}</p>
          </div>
          <button
            type="button"
            aria-label="Opciones de la cuenta"
            aria-expanded={accountOpen}
            onClick={() => setAccountOpen((v) => !v)}
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200/60"
          >
            <MoreHorizontal size={16} />
          </button>
        </div>

        {accountOpen && (
          <>
            <button
              type="button"
              aria-label="Cerrar"
              onClick={() => setAccountOpen(false)}
              className="fixed inset-0 z-10 cursor-default"
            />
            <div className="absolute right-3 bottom-full left-3 z-20 mb-1 rounded-xl border border-slate-200 bg-white p-1 shadow-[0_12px_32px_-8px_rgb(24_24_27/0.25)] transition-[opacity,transform] duration-150 ease-snappy starting:translate-y-1 starting:opacity-0">
              <MenuItem icon={Repeat} onClick={onSwitchTenant}>
                Cambiar de negocio
              </MenuItem>
              <MenuItem
                icon={Bug}
                onClick={() => {
                  setAccountOpen(false)
                  openReporter({ category: 'error' })
                }}
              >
                Reportar un problema
              </MenuItem>
              <div className="my-1 border-t border-slate-100" />
              <MenuItem icon={LogOut} onClick={onLogout} danger>
                Salir
              </MenuItem>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function MenuItem({
  icon: Icon,
  onClick,
  danger,
  children,
}: {
  icon: LucideIcon
  onClick: () => void
  danger?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors',
        danger ? 'text-danger-600 hover:bg-danger-50' : 'text-slate-700 hover:bg-slate-100',
      )}
    >
      <Icon size={15} className={danger ? 'text-danger-500' : 'text-slate-400'} />
      {children}
    </button>
  )
}
