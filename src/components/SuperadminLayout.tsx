import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  BarChart2,
  Building2,
  CreditCard,
  LifeBuoy,
  LogOut,
  Menu,
  MessageCircle,
  Receipt,
  ScrollText,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { getTicketStats } from '@/api/support'
import { ErrorBoundary, useGlobalErrorReporting } from '@/components/ErrorBoundary'
import { ReportProblemDialog } from '@/components/ReportProblemDialog'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/cn'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

const NAV: NavItem[] = [
  { to: '/superadmin', label: 'Dashboard', icon: BarChart2, end: true },
  { to: '/superadmin/tickets', label: 'Tickets', icon: LifeBuoy },
  { to: '/superadmin/logs', label: 'Logs', icon: ScrollText },
  { to: '/superadmin/tenants', label: 'Negocios', icon: Building2 },
  { to: '/superadmin/plans', label: 'Planes', icon: CreditCard },
  { to: '/superadmin/billing', label: 'Facturación', icon: Receipt },
  { to: '/superadmin/whatsapp', label: 'WhatsApp', icon: MessageCircle },
]

/**
 * Marco del panel de superadmin.
 *
 * En desktop es un sidebar fijo; en mobile, una barra superior con un cajón
 * que se desliza. Soporte se atiende desde donde uno esté —y un reclamo no
 * espera a que uno llegue a la computadora—, así que el panel tiene que ser
 * usable con el celular en la mano.
 */
export function SuperadminLayout() {
  const logout = useAuthStore((s) => s.logout)
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  useGlobalErrorReporting()

  // El contador de pendientes es lo que hace que la bandeja se mire sin que
  // nadie avise: sin numerito, un portal de tickets se revisa una vez y nunca más.
  const { data: ticketStats } = useQuery({
    queryKey: ['ticket-stats'],
    queryFn: getTicketStats,
    refetchInterval: 60_000,
  })

  // Un cajón abierto que sobrevive a la navegación tapa la pantalla nueva.
  useEffect(() => setMenuOpen(false), [location.pathname])

  const current = NAV.find((item) =>
    item.end ? location.pathname === item.to : location.pathname.startsWith(item.to),
  )

  const navLinks = (
    <ul className="space-y-0.5">
      {NAV.map(({ to, label, icon: Icon, end }) => (
        <li key={to}>
          <NavLink
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                // min-h-11 en mobile: 44px es el mínimo cómodo para el dedo.
                'flex min-h-11 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors md:min-h-0',
                isActive
                  ? 'bg-violet-50 text-violet-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
              )
            }
          >
            <Icon size={16} className="shrink-0" />
            <span className="min-w-0 flex-1 truncate">{label}</span>
            {to === '/superadmin/tickets' && !!ticketStats?.open && (
              <span className="shrink-0 rounded-full bg-violet-600 px-1.5 py-0.5 text-[10px] font-bold text-white tabular-nums">
                {ticketStats.open}
              </span>
            )}
          </NavLink>
        </li>
      ))}
    </ul>
  )

  const logoutButton = (
    <button
      type="button"
      onClick={logout}
      className="flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-red-600 md:min-h-0"
    >
      <LogOut size={16} className="shrink-0" />
      Cerrar sesión
    </button>
  )

  const brand = (
    <div className="flex items-center gap-2">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-xs font-bold text-white">
        SA
      </span>
      <span className="text-sm font-semibold text-slate-800">Superadmin</span>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ══ Sidebar (desktop) ══ */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="shrink-0 border-b border-slate-100 px-5 py-4">{brand}</div>
        <nav className="min-h-0 flex-1 overflow-y-auto p-3">{navLinks}</nav>
        <div className="shrink-0 border-t border-slate-100 p-3">{logoutButton}</div>
      </aside>

      {/* ══ Cajón (mobile) ══ */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 cursor-default bg-slate-900/40 backdrop-blur-sm"
          />
          <div className="relative flex h-full w-72 max-w-[85vw] flex-col bg-white shadow-xl">
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
              {brand}
              <button
                type="button"
                aria-label="Cerrar menú"
                onClick={() => setMenuOpen(false)}
                className="flex size-9 items-center justify-center rounded-lg text-slate-400 active:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>
            <nav className="min-h-0 flex-1 overflow-y-auto p-3">{navLinks}</nav>
            <div className="pb-safe shrink-0 border-t border-slate-100 p-3">{logoutButton}</div>
          </div>
        </div>
      )}

      <div className="md:pl-56">
        {/* Header compacto: solo mobile, el sidebar cubre desktop. */}
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white md:hidden">
          <div className="flex items-center gap-2 px-3 py-2.5">
            <button
              type="button"
              aria-label="Abrir menú"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
              className="flex size-10 shrink-0 items-center justify-center rounded-lg text-slate-500 active:bg-slate-100"
            >
              <Menu size={20} />
            </button>

            <span className="min-w-0 flex-1 truncate font-semibold text-slate-900">
              {current?.label ?? 'Superadmin'}
            </span>

            {!!ticketStats?.open && (
              <NavLink
                to="/superadmin/tickets"
                aria-label={`${ticketStats.open} tickets pendientes`}
                className="flex shrink-0 items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 active:bg-violet-100"
              >
                <LifeBuoy size={14} />
                {ticketStats.open}
              </NavLink>
            )}
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-8">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      {/* El botón de reportar del ErrorBoundary necesita el diálogo montado. */}
      <ReportProblemDialog />
    </div>
  )
}
