import { z } from 'zod'
import { httpClient } from '@/shared/api'
import { trackingCardBlockSchema } from './tracking-card-block'

const card = trackingCardBlockSchema.shape

/** `GET /tracking/{guia}`: consulta directa, sin chat. */
const trackingResponseSchema = z.object({
  numero_guia: card.numero_guia,
  estado_actual: card.estado,
  origen_ciudad: z.string(),
  destino_ciudad: z.string(),
  tipo_servicio: z.string(),
  fecha_estimada_entrega: card.eta,
  ubicacion_referencia: card.ubicacion_referencia,
  eventos: card.eventos,
  flags: card.flags,
  ultima_temperatura_c: z.number().nullable(),
})
export type TrackingResponse = z.infer<typeof trackingResponseSchema>

export const getTracking = (guia: string) =>
  httpClient.get(`/tracking/${encodeURIComponent(guia)}`, trackingResponseSchema)
