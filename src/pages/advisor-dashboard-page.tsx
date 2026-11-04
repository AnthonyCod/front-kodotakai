import { ADVISOR_PATHS, AdvisorDashboard, useOpenLeadInFunnel } from '@/features/advisor-crm'
import { useNavigate } from 'react-router'

/** Ruta `/asesor` — Resumen operativo del asesor. */
export function AdvisorDashboardPage() {
  const navigate = useNavigate()
  const openLead = useOpenLeadInFunnel()
  return (
    <AdvisorDashboard onOpenLead={openLead} onSeeAll={() => void navigate(ADVISOR_PATHS.tasks)} />
  )
}
