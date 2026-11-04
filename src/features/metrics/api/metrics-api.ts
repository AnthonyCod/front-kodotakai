import { z } from 'zod'
import { httpClient } from '@/shared/api'

const channelMetricsSchema = z.object({
  generado_en: z.string(),
  canales: z.array(
    z.object({
      channel: z.string(),
      conversaciones: z.number(),
      mensajes_entrantes: z.number(),
      mensajes_salientes: z.number(),
      handoffs: z.number(),
    }),
  ),
})
export type ChannelMetrics = z.infer<typeof channelMetricsSchema>

/** `GET /metrics/channels`: público, datos agregados sin PII. */
export const getChannelMetrics = () => httpClient.get('/metrics/channels', channelMetricsSchema)
