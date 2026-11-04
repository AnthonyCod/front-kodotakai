import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toApiError } from '@/shared/api'
import { getHandoff, listHandoffs, updateHandoff, type HandoffStatus } from '../api/handoffs-api'
import { useToasts } from './toast-store'

export const caseKeys = {
  list: ['asesor', 'handoffs'] as const,
  detail: (id: string) => ['asesor', 'handoff', id] as const,
}

/** Columnas del embudo B: los 3 estados del backend (no hay "Validando con Operaciones"). */
export const CASE_STAGES: { id: HandoffStatus; nombre: string }[] = [
  { id: 'PENDING', nombre: 'Escalados por IA (cola)' },
  { id: 'ASSIGNED', nombre: 'En gestión humana' },
  { id: 'CLOSED', nombre: 'Resueltos' },
]

export const useCases = () =>
  useQuery({ queryKey: caseKeys.list, queryFn: listHandoffs, refetchInterval: 30_000 })

export const useCase = (id: string) =>
  useQuery({ queryKey: caseKeys.detail(id), queryFn: () => getHandoff(id), retry: false })

/** 404: el caso no existe o ya es de otro revisor (el backend no distingue). */
export const isGoneCase = (error: unknown) => toApiError(error).status === 404

export function useUpdateCase() {
  const queryClient = useQueryClient()
  const show = useToasts((s) => s.show)
  return useMutation({
    mutationFn: (v: { id: string; status: 'ASSIGNED' | 'CLOSED' }) => updateHandoff(v.id, v.status),
    onSuccess: (detail) => {
      queryClient.setQueryData(caseKeys.detail(detail.handoff_id), detail)
      void queryClient.invalidateQueries({ queryKey: caseKeys.list })
      show({ text: detail.status === 'CLOSED' ? 'Caso cerrado' : 'Tomaste el caso' })
    },
    onError: (error) => {
      void queryClient.invalidateQueries({ queryKey: caseKeys.list })
      show({
        text: isGoneCase(error)
          ? 'Este caso ya no está disponible: lo tomó otro asesor.'
          : 'No se pudo actualizar el caso. Intenta de nuevo.',
      })
    },
  })
}
