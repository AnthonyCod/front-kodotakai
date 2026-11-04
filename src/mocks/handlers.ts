import { http, HttpResponse, type RequestHandler } from 'msw'
import { chatFixtures, pickScenario } from './scenarios/chat-scenarios'
import { shipmentBatchHandlers } from './shipment-batches'

// Rutas relativas a VITE_API_URL (/api/v1). Respuestas: capturas reales del backend.
const api = (path: string) => `*/api/v1${path}`

interface MockSession {
  clientId: string
  escalated: boolean
  messages: unknown[]
}

const sessions = new Map<string, MockSession>()
/** Idempotencia como el backend: el mismo `message_id` devuelve la misma respuesta. */
const repliesByMessageId = new Map<string, unknown>()

interface ChatBody {
  session_id?: string | null
  client_id: string
  message_id: string
  text?: string | null
}

/** Respuesta simulada con una captura real elegida por el texto (WhatsApp y PBX). */
function channelReply(text: string, escalated: boolean) {
  const capture = chatFixtures.replies[pickScenario(text, escalated)]
  return {
    ...capture,
    session_id: crypto.randomUUID(),
    reply_id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  }
}

const plainText = (blocks: { type: string; text?: string }[]) =>
  blocks
    .filter((b) => b.type === 'TEXT')
    .map((b) => b.text)
    .join('\n')

export const handlers: RequestHandler[] = [
  http.post(api('/channels/whatsapp/simulate'), async ({ request }) => {
    const body = (await request.json()) as {
      entry: { changes: { value: { messages: { text: { body: string } }[] } }[] }[]
    }
    const text = body.entry[0]?.changes[0]?.value.messages[0]?.text.body ?? ''
    const reply = { ...channelReply(text, false), channel: 'WHATSAPP' }
    return HttpResponse.json({
      delivery_mode: 'SIMULATED',
      results: [{ reply, outbound: { plain_text: plainText(reply.blocks) } }],
    })
  }),

  http.post(api('/channels/pbx/simulate'), async ({ request }) => {
    const { transcript } = (await request.json()) as { transcript: string }
    const reply = { ...channelReply(transcript, false), channel: 'PBX' }
    return HttpResponse.json({
      reply,
      speech_text: plainText(reply.blocks) || 'Te comunico con un asesor.',
      transfer: reply.status === 'ESCALATED',
      delivery: {
        delivery_mode: 'SIMULATED',
        status: 'NOT_ATTEMPTED',
        provider_message_id: null,
        error_code: null,
      },
    })
  }),

  http.post(api('/chat/messages'), async ({ request }) => {
    const body = (await request.json()) as ChatBody
    if (!body.text?.trim()) {
      const { status, body: error } = chatFixtures.errors.validacion
      return HttpResponse.json(error, { status })
    }

    const previous = repliesByMessageId.get(body.message_id)
    if (previous) return HttpResponse.json({ reply: previous })

    let sessionId = body.session_id ?? null
    const existing = sessionId ? sessions.get(sessionId) : undefined
    if (sessionId && existing?.clientId !== body.client_id) {
      const { status, body: error } = chatFixtures.errors.sesion_ajena
      return HttpResponse.json(error, { status })
    }

    sessionId ??= crypto.randomUUID()
    const session = existing ?? { clientId: body.client_id, escalated: false, messages: [] }
    sessions.set(sessionId, session)

    const now = new Date().toISOString()
    const capture = chatFixtures.replies[pickScenario(body.text, session.escalated)]
    const reply = {
      ...capture,
      session_id: sessionId,
      in_reply_to: body.message_id,
      reply_id: crypto.randomUUID(),
      created_at: now,
    }
    session.escalated ||= reply.status === 'ESCALATED'
    session.messages.push(
      {
        message_id: body.message_id,
        direction: 'INBOUND',
        message_type: 'TEXT',
        text: body.text,
        blocks: null,
        delivery_mode: 'SIMULATED',
        created_at: now,
      },
      {
        message_id: reply.reply_id,
        direction: 'OUTBOUND',
        message_type: null,
        text: null,
        blocks: reply.blocks,
        delivery_mode: 'SIMULATED',
        created_at: now,
      },
    )
    repliesByMessageId.set(body.message_id, reply)
    return HttpResponse.json({ reply })
  }),

  http.get(api('/chat/sessions/:sessionId/history'), ({ params, request }) => {
    const session = sessions.get(String(params.sessionId))
    if (!session || session.clientId !== request.headers.get('X-Client-Id')) {
      const { status, body: error } = chatFixtures.errors.sesion_ajena
      return HttpResponse.json(error, { status })
    }
    return HttpResponse.json({
      session_id: params.sessionId,
      channel: 'WEB_CHAT',
      status: session.escalated ? 'ESCALATED' : 'AWAITING_USER',
      messages: session.messages,
    })
  }),

  // Cifras de la captura real Bogotá → Medellín (QUOTE_SUMMARY de chat.json); la ruta repite lo pedido.
  http.post(api('/cotizar'), async ({ request }) => {
    const body = (await request.json()) as { origen: string; destino: string }
    return HttpResponse.json({
      cotizacion_id: crypto.randomUUID(),
      ruta: { origen: body.origen, destino: body.destino },
      calculo: {
        peso_volumetrico_kg: 45.5,
        peso_facturable_kg: 45.5,
        flete_base_cop: 190975,
        seguro_cop: 0,
        flete_minimo_aplicado: false,
        flete_total_cop: 190975,
      },
      tiempo_entrega_horas: 24,
      advertencias: [],
      supuestos: [],
      formula_version: 'provisional-v1',
    })
  }),

  ...shipmentBatchHandlers,
]
