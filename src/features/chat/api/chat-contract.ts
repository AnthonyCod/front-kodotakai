import { z } from 'zod'
import type { ApiSchemas } from '@/shared/api'
import { rawBlockSchema } from '@/shared/blocks'

// Contrato real: docs/api/openapi.json (API pública del MVP 1.2.0).
// Lo saliente se tipa con lo generado; lo entrante se valida con Zod (solo los campos que usa la UI).

export const channelSchema = z.enum(['WEB_CHAT', 'WHATSAPP', 'PBX'])
export type Channel = z.infer<typeof channelSchema>

/**
 * AWAITING_USER: respuesta normal. ESCALATED: hay handoff; el input sigue habilitado.
 * CLOSED: solo PBX. ACTIVE e IDLE no llegan hoy en las respuestas.
 */
export const conversationStatusSchema = z.enum([
  'ACTIVE',
  'AWAITING_USER',
  'IDLE',
  'ESCALATED',
  'CLOSED',
])
export type ConversationStatus = z.infer<typeof conversationStatusSchema>

export const intentSchema = z.enum([
  'TRACKING',
  'COTIZACION',
  'CONSULTA_DOCUMENTAL',
  'CARGA_ESPECIAL',
  'PQRS',
  'SALUDO',
  'HABLAR_CON_HUMANO',
  'DESCONOCIDA',
])
export type Intent = z.infer<typeof intentSchema>

/** `confidence_score` es heurístico: no se muestra como porcentaje. */
export const replyMetaSchema = z.object({
  trace_id: z.string(),
  intent: intentSchema,
  confidence_score: z.number().nullable(),
  delivery_mode: z.enum(['REAL', 'SIMULATED']),
})

export const conversationReplySchema = z.object({
  session_id: z.string(),
  in_reply_to: z.string(),
  reply_id: z.string(),
  channel: channelSchema,
  status: conversationStatusSchema,
  // Cada bloque lo valida su feature al renderizar (BlockRenderer).
  blocks: z.array(rawBlockSchema),
  meta: replyMetaSchema,
  created_at: z.iso.datetime({ offset: true }),
})
export type ConversationReply = z.infer<typeof conversationReplySchema>

export const chatMessageResponseSchema = z.object({ reply: conversationReplySchema })

export type ChatMessageRequest = ApiSchemas['ChatMessageRequest']
export type AttachmentRef = ApiSchemas['AttachmentRef']

const historyEntrySchema = z.object({
  message_id: z.string(),
  direction: z.enum(['INBOUND', 'OUTBOUND']),
  text: z.string().nullable(),
  blocks: z.array(rawBlockSchema).nullable(),
  created_at: z.iso.datetime({ offset: true }),
})

export const sessionHistorySchema = z.object({
  session_id: z.string(),
  channel: channelSchema,
  status: conversationStatusSchema,
  messages: z.array(historyEntrySchema),
})
export type SessionHistory = z.infer<typeof sessionHistorySchema>
