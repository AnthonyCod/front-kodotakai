import { useQuery } from '@tanstack/react-query'
import { getTracking } from '@/features/tracking'

/** Guía en el TMS (`GET /tracking/{guia}`, endpoint real del backend). */
export const useTmsTracking = (guia: string | null) =>
  useQuery({
    queryKey: ['tracking', guia],
    queryFn: () => getTracking(guia!),
    enabled: Boolean(guia),
    retry: false,
  })
