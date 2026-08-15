import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/AppLayout'
import { SuperadminLayout } from '@/components/SuperadminLayout'
import { RequireAuth, RequireSuperAdmin, RequireTenant } from '@/components/guards'
import { LandingPage } from '@/pages/LandingPage'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { TenantsPage } from '@/pages/TenantsPage'
import { OrdersPage } from '@/pages/OrdersPage'
import { OrderDetailPage } from '@/pages/OrderDetailPage'
import { NewOrderPage } from '@/pages/NewOrderPage'
import { CatalogPage } from '@/pages/CatalogPage'
import { WorkflowPage } from '@/pages/WorkflowPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { FinancesPage } from '@/pages/FinancesPage'
import { InventoryPage } from '@/pages/InventoryPage'
import { PublicOrderLinkPage } from '@/pages/PublicOrderLinkPage'
import { TrackOrderPage } from '@/pages/TrackOrderPage'
import { StorePage } from '@/pages/StorePage'
import { SuperadminDashboardPage } from '@/pages/superadmin/SuperadminDashboardPage'
import { SuperadminPlansPage } from '@/pages/superadmin/SuperadminPlansPage'
import { SuperadminTenantsPage } from '@/pages/superadmin/SuperadminTenantsPage'

export const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/order/:token', element: <PublicOrderLinkPage /> },
  { path: '/track/:token', element: <TrackOrderPage /> },
  { path: '/store/:slug', element: <StorePage /> },

  {
    element: <RequireAuth />,
    children: [
      { path: '/tenants', element: <TenantsPage /> },
      {
        element: <RequireSuperAdmin />,
        children: [
          {
            element: <SuperadminLayout />,
            children: [
              { path: '/superadmin', element: <SuperadminDashboardPage /> },
              { path: '/superadmin/plans', element: <SuperadminPlansPage /> },
              { path: '/superadmin/tenants', element: <SuperadminTenantsPage /> },
            ],
          },
        ],
      },
      {
        element: <RequireTenant />,
        children: [
          {
            element: <AppLayout />,
            children: [
              { path: '/orders', element: <OrdersPage /> },
              { path: '/orders/new', element: <NewOrderPage /> },
              { path: '/orders/:id', element: <OrderDetailPage /> },
              { path: '/catalog', element: <CatalogPage /> },
              { path: '/products', element: <Navigate to="/catalog" replace /> },
              { path: '/workflow', element: <WorkflowPage /> },
              { path: '/finances', element: <FinancesPage /> },
              { path: '/inventory', element: <InventoryPage /> },
              { path: '/settings', element: <SettingsPage /> },
            ],
          },
        ],
      },
    ],
  },

  { path: '*', element: <Navigate to="/" replace /> },
])
