import { z } from 'zod'
import { httpClient } from '@/shared/api'
import { rawBlockSchema } from '@/shared/blocks'

// Canales simulados: el backend procesa el mensaje como si viniera de WhatsApp o del PBX y
// devuelve lo que habría enviado (nada sale a Meta ni a la central telefónica).

const replySchema = z.object({
  session_id: z.string(),
  status: z.string(),
  blocks: z.array(rawBlockSchema),
  meta: z.object({
    intent: z.string(),
    services_called: z.array(z.string()),
    /** chunk_id, guía o cotizacion_id usados en la respuesta. */
    evidence_ids: z.array(z.string()),
  }),
})
export type SimulatedReply = z.infer<typeof replySchema>

const whatsappResultSchema = z.object({
  results: z.array(
    z.object({ reply: replySchema, outbound: z.object({ plain_text: z.string() }) }),
  ),
})
export type WhatsAppResult = z.infer<typeof whatsappResultSchema>

/** Envía un texto como mensaje entrante de WhatsApp (payload de webhook mínimo). */
export function simulateWhatsApp(text: string, waId: string) {
  const payload = {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: '100000000000000',
        changes: [
          {
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '570000000000',
                phone_number_id: '100000000000001',
              },
              contacts: [{ profile: { name: 'Cliente Demo' }, wa_id: waId }],
              messages: [
                {
                  from: waId,
                  id: `wamid.SIM-${crypto.randomUUID()}`,
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  type: 'text',
                  text: { body: text },
                },
              ],
            },
          },
        ],
      },
    ],
  }
  return httpClient.post('/channels/whatsapp/simulate', payload, whatsappResultSchema)
}

const pbxResultSchema = z.object({
  reply: replySchema,
  speech_text: z.string(),
  transfer: z.boolean(),
})
export type PbxResult = z.infer<typeof pbxResultSchema>

/**
 * `caller_id` propio por llamada: sin él, el backend usa `simulated-caller` para todas y las une en
 * una sola sesión (si una se escaló, las siguientes nacen escaladas). Máximo 32 caracteres.
 */
export const simulatePbx = (callId: string, turnIndex: number, transcript: string) =>
  httpClient.post(
    '/channels/pbx/simulate',
    { call_id: callId, turn_index: turnIndex, transcript, caller_id: callId.slice(0, 32) },
    pbxResultSchema,
  )
