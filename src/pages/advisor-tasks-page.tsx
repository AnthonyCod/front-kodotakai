import { MyTasks, useOpenLeadInFunnel } from '@/features/advisor-crm'

/** Ruta `/asesor/tareas` — Agenda de llamadas y SLA del asesor. */
export function AdvisorTasksPage() {
  return <MyTasks onOpenLead={useOpenLeadInFunnel()} />
}
