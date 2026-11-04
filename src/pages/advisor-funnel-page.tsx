import { Navigate, useNavigate, useParams } from 'react-router'
import { ADVISOR_PATHS, FunnelBoard, funnelIdSchema, useLeadParam } from '@/features/advisor-crm'

/** Ruta `/asesor/embudos/:embudo` — Embudos A (ventas), B (casos) y C (bot). */
export function AdvisorFunnelPage() {
  const navigate = useNavigate()
  const { leadId, open } = useLeadParam()
  const parsed = funnelIdSchema.safeParse(useParams().embudo)
  if (!parsed.success) return <Navigate to={ADVISOR_PATHS.funnel('ventas')} replace />

  return (
    <FunnelBoard
      funnel={parsed.data}
      selectedLead={leadId}
      onFunnelChange={(id) => void navigate(ADVISOR_PATHS.funnel(id))}
      onOpenLead={open}
    />
  )
}
