import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSession } from '@/features/auth'
import { toApiError } from '@/shared/api'
import {
  closeSale,
  getAdvisor,
  getFunnel,
  moveLead,
  takeOverLead,
  type FunnelId,
  type Recipient,
  type StageChange,
  type StageMove,
} from '../api/crm-api'
import { STAGE } from './funnels'
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

/** Nombre de quien inició sesión; el del CRM simulado solo como respaldo. */
export function useAdvisorName() {
  const { user } = useSession()
  const advisor = useAdvisor()
  return user?.nombre ?? advisor.data?.nombre ?? ''
}

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

/** Otro asesor cambió el lead antes: se avisa y se recarga el tablero. */
export const isStaleVersion = (error: unknown) =>
  toApiError(error).code === 'VERSION_DESACTUALIZADA'

function useRefresh() {
  const queryClient = useQueryClient()
  return (change?: StageChange) => {
    void queryClient.invalidateQueries({ queryKey: ['asesor'] })
    if (change)
      queryClient.setQueryData(crmKeys.lead(change.lead_id), (old: object | undefined) =>
        old ? { ...old, etapa: change.etapa, embudo: change.embudo, version: change.version } : old,
      )
  }
}

const STALE_TEXT = 'Otro asesor actualizó este cliente. Recargamos los datos.'

/** Mover de etapa con toast de confirmación y «Deshacer» (nunca para cerrar la venta). */
export function useMoveLead() {
  const show = useToasts((s) => s.show)
  const stageName = useStageName()
  const refresh = useRefresh()

  const undo = useMutation({
    mutationFn: (v: { leadId: string; move: StageMove }) => moveLead(v.leadId, v.move),
    onSuccess: refresh,
    onError: (error) => {
      refresh()
      show({ text: isStaleVersion(error) ? STALE_TEXT : 'No se pudo deshacer el cambio.' })
    },
  })

  return useMutation({
    mutationFn: (v: { leadId: string; move: StageMove; from: string }) =>
      moveLead(v.leadId, v.move),
    onSuccess: (change, v) => {
      refresh(change)
      const revert = () =>
        undo.mutate({
          leadId: v.leadId,
          move: { etapa: v.from, expected_version: change.version },
        })
      show({
        text: `Cliente movido a «${stageName(change.embudo, change.etapa)}»`,
        // El descarte es final (CR-007): no se ofrece deshacer.
        undo: change.etapa === STAGE.descartado ? undefined : revert,
      })
    },
    onError: (error) => {
      if (!isStaleVersion(error)) return
      refresh()
      show({ text: STALE_TEXT })
    },
  })
}

/** Cierre de venta con destinatario: emite la guía y no tiene «Deshacer». */
export function useCloseSale() {
  const show = useToasts((s) => s.show)
  const refresh = useRefresh()
  return useMutation({
    mutationFn: (v: { leadId: string; expectedVersion: number; recipient: Recipient }) =>
      closeSale(v.leadId, v.expectedVersion, v.recipient),
    onSuccess: (change) => {
      refresh(change)
      show({ text: `Venta cerrada · Guía ${change.guia_creada ?? ''} creada` })
    },
    onError: (error) => {
      if (!isStaleVersion(error)) return
      refresh()
      show({ text: STALE_TEXT })
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
