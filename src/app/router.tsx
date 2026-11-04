import { createBrowserRouter, Navigate } from 'react-router'
import { AdminInsightsPage } from '@/pages/admin-insights-page'
import { AgentInboxPage } from '@/pages/agent-inbox-page'
import { ChannelSimulatorPage } from '@/pages/channel-simulator-page'
import { ChatPage } from '@/pages/chat-page'
import { MetricsPage } from '@/pages/metrics-page'
import { QueriesPage } from '@/pages/queries-page'
import { BranchesPage } from '@/pages/branches-page'
import { ShipmentPage } from '@/pages/shipment-page'
import { BulkUploadPage } from '@/pages/bulk-upload-page'
import { InfoPage } from '@/pages/info-page'
import { TariffsPage } from '@/pages/tariffs-page'
import { LegalDocumentPage } from '@/pages/legal-document-page'
import { InternalLayout } from './internal-layout'
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
      { path: '/simulador', element: <ChannelSimulatorPage /> },
      // Sin login todavía (por confirmar con el backend).
      { path: '/admin', element: <AdminInsightsPage /> },
    ],
  },
  {
    // Equipo interno. Sin login todavía (por confirmar con el backend).
    path: '/interno',
    element: <InternalLayout />,
    children: [
      { index: true, element: <Navigate to="asesor" replace /> },
      { path: 'asesor', element: <AgentInboxPage /> },
      { path: 'metricas', element: <MetricsPage /> },
    ],
  },
  { path: '/asesor', element: <Navigate to="/interno/asesor" replace /> },
  { path: '/metricas', element: <Navigate to="/interno/metricas" replace /> },
  { path: '*', element: <Navigate to="/" replace /> },
])
