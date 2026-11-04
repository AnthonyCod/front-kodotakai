import { z } from 'zod'
import { bearer, httpClient } from '@/shared/api'

// Bandeja de casos escalados (backend real, contrato 1.7.0). Con el token del asesor (REVIEWER) el
// backend devuelve la cola PENDING y sus propios casos; con ADMIN, todos. Un caso de otro revisor
// responde 404.

const isoDate = z.iso.datetime({ offset: true })

export const handoffStatusSchema = z.enum(['PENDING', 'ASSIGNED', 'CLOSED'])
export type HandoffStatus = z.infer<typeof handoffStatusSchema>

const prioritySchema = z.enum(['NORMAL', 'ALTA', 'URGENTE'])
export type HandoffPriority = z.infer<typeof prioritySchema>

const handoffSummarySchema = z.object({
  handoff_id: z.string(),
  session_id: z.string(),
  canal: z.string(),
  prioridad: prioritySchema,
  cola_destino: z.string(),
  numero_guia_consultada: z.string().nullable(),
  status: handoffStatusSchema,
  created_at: isoDate,
})
export type HandoffSummary = z.infer<typeof handoffSummarySchema>

// `resumen_contexto` no se valida ni se muestra: no se implementa el resumen IA.
const handoffDetailSchema = handoffSummarySchema.extend({
  /** 0..1 o `null` si no hubo búsqueda en la base. No se muestra como porcentaje. */
  confidence_score_promedio: z.number().nullable(),
  sentimiento_detectado: z.string(),
  intentos_previos: z.number(),
  historial: z.array(
    z.object({
      rol: z.enum(['USUARIO', 'ASISTENTE', 'ASESOR', 'SISTEMA']),
      texto: z.string(),
      timestamp: isoDate,
      canal: z.string(),
    }),
  ),
  triggers: z.array(z.object({ id_criterio: z.string(), evidencia: z.string() })),
  tiempo_espera_estimado_segundos: z.number(),
})
export type HandoffDetail = z.infer<typeof handoffDetailSchema>

export const listHandoffs = () =>
  httpClient.get('/handoffs', z.object({ items: z.array(handoffSummarySchema) }), bearer())

export const getHandoff = (id: string) =>
  httpClient.get(`/handoffs/${encodeURIComponent(id)}`, handoffDetailSchema, bearer())

/** Tomar (`ASSIGNED`) o cerrar (`CLOSED`). Cerrar uno de la cola lo toma y lo cierra. */
export const updateHandoff = (id: string, status: 'ASSIGNED' | 'CLOSED') =>
  httpClient.patch(`/handoffs/${encodeURIComponent(id)}`, { status }, handoffDetailSchema, bearer())
