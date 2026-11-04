import { Navigate, useNavigate, useParams } from 'react-router'
import {
  ADVISOR_PATHS,
  FunnelBoard,
  funnelIdSchema,
  useCaseParam,
  useLeadParam,
} from '@/features/advisor-crm'

/** Ruta `/asesor/embudos/:embudo` — Embudos A (ventas), B (casos reales) y C (bot). */
export function AdvisorFunnelPage() {
  const navigate = useNavigate()
  const lead = useLeadParam()
  const caso = useCaseParam()
  const parsed = funnelIdSchema.safeParse(useParams().embudo)
  if (!parsed.success) return <Navigate to={ADVISOR_PATHS.funnel('ventas')} replace />

  return (
    <FunnelBoard
      funnel={parsed.data}
      selectedLead={lead.leadId}
      selectedCase={caso.caseId}
      onFunnelChange={(id) => void navigate(ADVISOR_PATHS.funnel(id))}
      onOpenLead={lead.open}
      onOpenCase={caso.open}
    />
  )
}
