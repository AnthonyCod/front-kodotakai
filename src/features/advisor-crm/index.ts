// API pública de la feature advisor-crm (Módulo Asesor). Fuera de la feature solo se importa desde aquí.
export { funnelIdSchema, type FunnelId } from './api/crm-api'
export { AdvisorShell } from './components/advisor-shell'
export { AdvisorDashboard } from './components/dashboard'
export { FunnelBoard } from './components/funnel-board'
export { QuickTools } from './components/quick-tools'
export { MyTasks } from './components/my-tasks'
export { ADVISOR_PATHS, useLeadParam, useOpenLeadInFunnel } from './model/routes'
