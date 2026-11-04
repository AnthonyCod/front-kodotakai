import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getAdvisor,
  getFunnel,
  moveLead,
  takeOverLead,
  type FunnelId,
  type StageChange,
} from '../api/crm-api'
import { useToasts } from './toast-store'

export const crmKeys = {
  advisor: ['asesor', 'me'] as const,
  dashboard: ['asesor', 'dashboard'] as const,
  funnel: (id: FunnelId) => ['asesor', 'embudo', id] as const,
  lead: (id: string) => ['asesor', 'lead', id] as const,
  tasks: ['asesor', 'tareas'] as const,
}

/** Tablero en vivo sin WebSocket todavía: se refresca cada 30 s (por confirmar con el backend). */
const POLL_MS = 30_000

export const useAdvisor = () => useQuery({ queryKey: crmKeys.advisor, queryFn: getAdvisor })

export const useFunnel = (id: FunnelId) =>
  useQuery({ queryKey: crmKeys.funnel(id), queryFn: () => getFunnel(id), refetchInterval: POLL_MS })

/** Busca el nombre de una etapa en lo que ya está en caché. */
function useStageName() {
  const queryClient = useQueryClient()
  return (funnel: FunnelId, stage: string) =>
    queryClient
      .getQueryData<Awaited<ReturnType<typeof getFunnel>>>(crmKeys.funnel(funnel))
      ?.etapas.find((s) => s.id === stage)?.nombre ?? stage
}

/** Mover de etapa con toast de confirmación y «Deshacer». */
export function useMoveLead() {
  const queryClient = useQueryClient()
  const show = useToasts((s) => s.show)
  const stageName = useStageName()

  const refresh = (change: StageChange) => {
    void queryClient.invalidateQueries({ queryKey: ['asesor'] })
    queryClient.setQueryData(crmKeys.lead(change.lead_id), (old: object | undefined) =>
      old ? { ...old, etapa: change.etapa, embudo: change.embudo } : old,
    )
  }

  const undo = useMutation({
    mutationFn: (v: { leadId: string; etapa: string }) => moveLead(v.leadId, v.etapa),
    onSuccess: refresh,
  })

  return useMutation({
    mutationFn: (v: { leadId: string; etapa: string; from: string }) => moveLead(v.leadId, v.etapa),
    onSuccess: (change, v) => {
      refresh(change)
      const revert = () => undo.mutate({ leadId: v.leadId, etapa: v.from })
      if (change.guia_creada) {
        show({ text: `Venta cerrada · Guía ${change.guia_creada} creada`, undo: revert })
      } else {
        show({ text: `Cliente movido a «${stageName(change.embudo, change.etapa)}»`, undo: revert })
      }
    },
  })
}

/** Embudo C: el asesor toma el lead y pasa al Embudo de Ventas. */
export function useTakeOver() {
  const queryClient = useQueryClient()
  const show = useToasts((s) => s.show)
  return useMutation({
    mutationFn: takeOverLead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['asesor'] })
      show({ text: 'Tomaste el control · Lead pasado al Embudo de Ventas' })
    },
  })
}
