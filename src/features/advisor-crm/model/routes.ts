import { useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import type { FunnelId } from '../api/crm-api'

export const ADVISOR_PATHS = {
  dashboard: '/asesor',
  funnel: (id: FunnelId) => `/asesor/embudos/${id}`,
  tools: '/asesor/consulta',
  tasks: '/asesor/tareas',
} as const

/** El detalle se abre encima de la pantalla actual con `?lead=<id>` (inspector en escritorio). */
export function useLeadParam() {
  const [params, setParams] = useSearchParams()
  const leadId = params.get('lead')

  const open = useCallback(
    (id: string) =>
      setParams((p) => {
        p.set('lead', id)
        return p
      }),
    [setParams],
  )
  const close = useCallback(
    () =>
      setParams((p) => {
        p.delete('lead')
        return p
      }),
    [setParams],
  )
  return { leadId, open, close }
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
