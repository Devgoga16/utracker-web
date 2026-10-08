import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/AppLayout'
import { SuperadminLayout } from '@/components/SuperadminLayout'
import { RequireAuth, RequireSuperAdmin, RequireTenant } from '@/components/guards'
import { LandingPage } from '@/pages/LandingPage'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { TenantsPage } from '@/pages/TenantsPage'
import { OrdersPage } from '@/pages/OrdersPage'
import { CalendarPage } from '@/pages/CalendarPage'
import { OrderDetailPage } from '@/pages/OrderDetailPage'
import { ReceiptPage } from '@/pages/ReceiptPage'
import { NewOrderPage } from '@/pages/NewOrderPage'
import { CatalogPage } from '@/pages/CatalogPage'
import { CatalogFiltersPage } from '@/pages/CatalogFiltersPage'
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
import { SuperadminBillingPage } from '@/pages/superadmin/SuperadminBillingPage'
import { SuperadminWhatsappPage } from '@/pages/superadmin/SuperadminWhatsappPage'
import { BillingPage } from '@/pages/BillingPage'
import { CampaignsPage } from '@/pages/CampaignsPage'
import { PublicCampaignPage } from '@/pages/PublicCampaignPage'
import { HostedCheckoutPage } from '@/pages/HostedCheckoutPage'
import { IntegrationPage } from '@/pages/IntegrationPage'
import { SupportPage } from '@/pages/SupportPage'
import { TicketDetailPage } from '@/pages/TicketDetailPage'
import { SuperadminTicketsPage } from '@/pages/superadmin/SuperadminTicketsPage'
import { SuperadminTicketDetailPage } from '@/pages/superadmin/SuperadminTicketDetailPage'
import { SuperadminLogsPage } from '@/pages/superadmin/SuperadminLogsPage'
import { SuperadminTenantDetailPage } from '@/pages/superadmin/SuperadminTenantDetailPage'

export const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/order/:token', element: <PublicOrderLinkPage /> },
  { path: '/track/:token', element: <TrackOrderPage /> },
  { path: '/store/:slug', element: <StorePage /> },
  { path: '/c/:token', element: <PublicCampaignPage /> },
  // Checkout hospedado: lo abre la web de un tercero, sin sesión.
  { path: '/checkout/:token', element: <HostedCheckoutPage /> },

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
              { path: '/superadmin/tenants/:id', element: <SuperadminTenantDetailPage /> },
              { path: '/superadmin/tickets', element: <SuperadminTicketsPage /> },
              { path: '/superadmin/tickets/:id', element: <SuperadminTicketDetailPage /> },
              { path: '/superadmin/logs', element: <SuperadminLogsPage /> },
              { path: '/superadmin/billing', element: <SuperadminBillingPage /> },
              { path: '/superadmin/whatsapp', element: <SuperadminWhatsappPage /> },
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
              { path: '/calendar', element: <CalendarPage /> },
              { path: '/orders/new', element: <NewOrderPage /> },
              { path: '/orders/:id', element: <OrderDetailPage /> },
              { path: '/orders/:id/receipt', element: <ReceiptPage /> },
              { path: '/catalog', element: <CatalogPage /> },
              { path: '/catalog/filters', element: <CatalogFiltersPage /> },
              { path: '/products', element: <Navigate to="/catalog" replace /> },
              { path: '/campaigns', element: <CampaignsPage /> },
              { path: '/workflow', element: <WorkflowPage /> },
              { path: '/finances', element: <FinancesPage /> },
              { path: '/inventory', element: <InventoryPage /> },
              { path: '/settings', element: <SettingsPage /> },
              { path: '/integration', element: <IntegrationPage /> },
              { path: '/billing', element: <BillingPage /> },
              { path: '/support', element: <SupportPage /> },
              { path: '/support/:id', element: <TicketDetailPage /> },
            ],
          },
        ],
      },
    ],
  },

  { path: '*', element: <Navigate to="/" replace /> },
])
