import { useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import type { FunnelId } from '../api/crm-api'

export const ADVISOR_PATHS = {
  dashboard: '/asesor',
  funnel: (id: FunnelId) => `/asesor/embudos/${id}`,
  tools: '/asesor/consulta',
  tasks: '/asesor/tareas',
  dangerousGoods: '/asesor/mercancia-peligrosa',
  adminUsers: '/asesor/admin/usuarios',
  adminAudit: '/asesor/admin/auditoria',
} as const

/** Detalle encima de la pantalla actual con `?<name>=<id>` (inspector en escritorio). */
function useDetailParam(name: 'lead' | 'caso') {
  const [params, setParams] = useSearchParams()
  const id = params.get(name)

  const open = useCallback(
    (value: string) =>
      setParams((p) => {
        p.set(name, value)
        return p
      }),
    [setParams, name],
  )
  const close = useCallback(
    () =>
      setParams((p) => {
        p.delete(name)
        return p
      }),
    [setParams, name],
  )
  return { id, open, close }
}

/** Lead del CRM (`?lead=`). */
export function useLeadParam() {
  const { id, open, close } = useDetailParam('lead')
  return { leadId: id, open, close }
}

/** Caso real de la bandeja `/handoffs` (`?caso=`). */
export function useCaseParam() {
  const { id, open, close } = useDetailParam('caso')
  return { caseId: id, open, close }
}

/** Abre un lead desde cualquier pantalla (dashboard, tareas, búsqueda) dentro de su embudo. */
export function useOpenLeadInFunnel() {
  const navigate = useNavigate()
  return useCallback(
    (id: string, funnel: FunnelId) =>
      void navigate(`${ADVISOR_PATHS.funnel(funnel)}?lead=${encodeURIComponent(id)}`),
    [navigate],
  )
}
