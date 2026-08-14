import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/AppLayout'
import { RequireAuth, RequireTenant } from '@/components/guards'
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
import { PublicOrderLinkPage } from '@/pages/PublicOrderLinkPage'
import { TrackOrderPage } from '@/pages/TrackOrderPage'
import { StorePage } from '@/pages/StorePage'

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
              { path: '/settings', element: <SettingsPage /> },
            ],
          },
        ],
      },
    ],
  },

  { path: '*', element: <Navigate to="/" replace /> },
])
