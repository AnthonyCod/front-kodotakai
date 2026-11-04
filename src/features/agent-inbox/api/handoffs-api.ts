import { z } from 'zod'
import { httpClient } from '@/shared/api'

// Endpoints administrativos: exigen X-Admin-Token. El token lo escribe el asesor y vive solo en
// memoria; nunca va en el bundle ni en variables VITE_ (pendiente: BFF o entorno interno).

export const handoffStatusSchema = z.enum(['PENDING', 'ASSIGNED', 'CLOSED'])
export type HandoffStatus = z.infer<typeof handoffStatusSchema>

const handoffSummarySchema = z.object({
  handoff_id: z.string(),
  session_id: z.string(),
  canal: z.string(),
  prioridad: z.string(),
  cola_destino: z.string(),
  numero_guia_consultada: z.string().nullable(),
  status: handoffStatusSchema,
  created_at: z.string(),
})
export type HandoffSummary = z.infer<typeof handoffSummarySchema>

const handoffDetailSchema = handoffSummarySchema.extend({
  confidence_score_promedio: z.number().nullable(),
  sentimiento_detectado: z.string(),
  intentos_previos: z.number(),
  resumen_contexto: z.string(),
  historial: z.array(
    z.object({ rol: z.string(), texto: z.string(), timestamp: z.string(), canal: z.string() }),
  ),
  triggers: z.array(z.object({ id_criterio: z.string(), evidencia: z.string() })),
  tiempo_espera_estimado_segundos: z.number(),
})
export type HandoffDetail = z.infer<typeof handoffDetailSchema>

const auth = (token: string) => ({ headers: { 'X-Admin-Token': token } })

export const listHandoffs = (token: string, status?: HandoffStatus) =>
  httpClient.get(
    `/handoffs${status ? `?status=${status}` : ''}`,
    z.object({ items: z.array(handoffSummarySchema) }),
    auth(token),
  )

export const getHandoff = (token: string, id: string) =>
  httpClient.get(`/handoffs/${encodeURIComponent(id)}`, handoffDetailSchema, auth(token))

/** Transiciones válidas: PENDING→ASSIGNED, PENDING→CLOSED, ASSIGNED→CLOSED. */
export const updateHandoff = (token: string, id: string, status: 'ASSIGNED' | 'CLOSED') =>
  httpClient.patch(
    `/handoffs/${encodeURIComponent(id)}`,
    { status },
    handoffDetailSchema,
    auth(token),
  )
