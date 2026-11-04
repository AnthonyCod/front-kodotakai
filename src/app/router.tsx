import { createBrowserRouter, Navigate } from 'react-router'
import { RequireRole } from '@/features/auth'
import { AdminInsightsPage } from '@/pages/admin-insights-page'
import { AdminTariffsPage } from '@/pages/admin-tariffs-page'
import { MyShipmentsPage } from '@/pages/my-shipments-page'
import { ChatPage } from '@/pages/chat-page'
import { QueriesPage } from '@/pages/queries-page'
import { BranchesPage } from '@/pages/branches-page'
import { ShipmentPage } from '@/pages/shipment-page'
import { BulkUploadPage } from '@/pages/bulk-upload-page'
import { InfoPage } from '@/pages/info-page'
import { TariffsPage } from '@/pages/tariffs-page'
import { LegalDocumentPage } from '@/pages/legal-document-page'
import { LoginPage } from '@/pages/login-page'
import { UserLayout } from './user-layout'

// Cada ruta apunta a una página de `src/pages/`, que solo compone features.
export const router = createBrowserRouter([
  {
    // App del cliente: barra lateral con sus 3 secciones y, abajo, la del administrador.
    element: <UserLayout />,
    children: [
      { path: '/', element: <ChatPage /> },
      { path: '/consultas', element: <QueriesPage /> },
      { path: '/sucursales', element: <BranchesPage /> },
      { path: '/hacer-envio', element: <ShipmentPage /> },
      { path: '/carga-masiva', element: <BulkUploadPage /> },
      { path: '/info', element: <InfoPage /> },
      { path: '/info/tarifas', element: <TariffsPage /> },
      { path: '/info/:slug', element: <LegalDocumentPage /> },
      { path: '/login', element: <LoginPage /> },
      // Por rol: solo es interfaz; el backend valida el rol en cada endpoint.
      {
        path: '/mis-envios',
        element: (
          <RequireRole role="USUARIO">
            <MyShipmentsPage />
          </RequireRole>
        ),
      },
      {
        path: '/admin',
        element: (
          <RequireRole role="ADMIN">
            <AdminInsightsPage />
          </RequireRole>
        ),
      },
      {
        path: '/admin/tarifas',
        element: (
          <RequireRole role="ADMIN">
            <AdminTariffsPage />
          </RequireRole>
        ),
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
