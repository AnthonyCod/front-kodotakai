import { http, HttpResponse, type RequestHandler } from 'msw'
import { asesorHandlers, asesorTrackingHandlers } from './asesor-handlers'
import { chatFixtures, pickScenario } from './scenarios/chat-scenarios'
import userFixtures from './fixtures/users.json'
import envioFixtures from './fixtures/envios.json'
import batchFixtures from './fixtures/shipment-batches.json'

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

/** Login simulado: una sola sesión en memoria, como si fuera la cookie del backend. */
let sessionUserId: string | null = null

interface MockRequest {
  cotizacion_id: string
  estado: string
  origen: string
  destino: string
  peso_facturable_kg: number
  flete_total_cop: number
  solicitante: { nombre: string; email: string }
  solicitado_en: string
  revisado_en: string | null
  motivo_rechazo: string | null
  numero_guia: string | null
}
type MockTariff = (typeof envioFixtures.tarifas.items)[number]

// Solicitudes y tarifas en memoria, sembradas con capturas reales del backend.
let requests: MockRequest[] = []
let tariffs: MockTariff[] = []

/** Para los tests: cada uno empieza sin sesión y con los datos capturados. */
export function resetMockSession() {
  sessionUserId = null
  requests = structuredClone<MockRequest[]>(envioFixtures.misEnvios.items)
  tariffs = structuredClone(envioFixtures.tarifas.items)
}
resetMockSession()

/** Para los tests: entra directo con el usuario de prueba de ese rol. */
export function signInMock(rol: string) {
  sessionUserId = userFixtures.users.find((u) => u.rol === rol)?.id ?? null
}

const RANK = { USUARIO: 0, ENCARGADO: 1, ADMIN: 2 } as const

const publicUser = (id: string | null) => {
  const user = userFixtures.users.find((u) => u.id === id)
  return user && { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol }
}

const apiError = (status: number, code: string, message: string) =>
  HttpResponse.json({ error: { code, message, details: null, request_id: null } }, { status })

const noSession = () => apiError(401, 'NO_AUTENTICADO', 'Inicia sesión para continuar.')

/** Usuario de la sesión con al menos ese rol, o la respuesta de error del backend (401/403). */
function withRole(rol: keyof typeof RANK) {
  const user = userFixtures.users.find((u) => u.id === sessionUserId)
  if (!user) return { error: noSession() }
  if (RANK[user.rol as keyof typeof RANK] < RANK[rol])
    return { error: apiError(403, 'NO_AUTORIZADO', envioFixtures.forbidden.error.message) }
  return { user }
}

const notFound = () => apiError(404, 'NO_ENCONTRADO', 'No encontramos el recurso solicitado.')

export const handlers: RequestHandler[] = [
  http.post(api('/auth/login'), async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string }
    const user = userFixtures.users.find(
      (u) => u.email === body.email.trim().toLowerCase() && u.password === body.password,
    )
    if (!user) return apiError(401, 'CREDENCIALES_INVALIDAS', 'Correo o contraseña incorrectos.')
    sessionUserId = user.id
    return HttpResponse.json(publicUser(user.id))
  }),

  http.get(api('/auth/me'), () => {
    const user = publicUser(sessionUserId)
    return user ? HttpResponse.json(user) : noSession()
  }),

  http.post(api('/auth/logout'), () => {
    sessionUserId = null
    return HttpResponse.json({ sesion_cerrada: true })
  }),

  // Solicitud y aprobación de envíos (CR-003 del backend).
  http.post(api('/cotizaciones/:id/solicitar'), ({ params }) => {
    const { user, error } = withRole('USUARIO')
    if (error) return error
    const id = String(params.id)
    if (requests.some((r) => r.cotizacion_id === id))
      return apiError(409, 'CONFLICTO', envioFixtures.conflicto.error.message)
    const created: MockRequest = {
      ...envioFixtures.pendiente,
      cotizacion_id: id,
      solicitante: { nombre: user.nombre, email: user.email },
      solicitado_en: new Date().toISOString(),
    }
    requests = [created, ...requests]
    return HttpResponse.json(created, { status: 201 })
  }),

  http.get(api('/mis-envios'), () => {
    const { user, error } = withRole('USUARIO')
    if (error) return error
    return HttpResponse.json({ items: requests.filter((r) => r.solicitante.email === user.email) })
  }),

  // Matriz de tarifas (CR-002): pública para leer, ADMIN para editar.
  http.get(api('/tarifas'), () => HttpResponse.json({ items: tariffs.filter((t) => t.activo) })),

  http.get(api('/admin/tarifas'), () => {
    const { error } = withRole('ADMIN')
    return error ?? HttpResponse.json({ items: tariffs })
  }),

  http.post(api('/admin/tarifas'), async ({ request }) => {
    const { error } = withRole('ADMIN')
    if (error) return error
    const body = (await request.json()) as Omit<MockTariff, 'activo' | 'actualizado_en'>
    if (tariffs.some((t) => t.codigo_trayecto === body.codigo_trayecto))
      return apiError(
        409,
        'CONFLICTO',
        'Ya existe una ruta con ese código o con ese origen y destino.',
      )
    const created = { ...body, activo: true, actualizado_en: new Date().toISOString() }
    tariffs = [...tariffs, created]
    return HttpResponse.json(created, { status: 201 })
  }),

  http.patch(api('/admin/tarifas/:codigo'), async ({ params, request }) => {
    const { error } = withRole('ADMIN')
    if (error) return error
    const index = tariffs.findIndex((t) => t.codigo_trayecto === params.codigo)
    const current = tariffs[index]
    if (!current) return notFound()
    const changes = (await request.json()) as Partial<MockTariff>
    const updated = { ...current, ...changes, actualizado_en: new Date().toISOString() }
    tariffs = tariffs.with(index, updated)
    return HttpResponse.json(updated)
  }),

  // Envíos masivos B2B (contrato 1.3.0): API key en `Authorization`, respuesta del ejemplo oficial.
  http.post(api('/shipment-batches'), async ({ request }) => {
    if (!request.headers.get('Authorization')?.startsWith('Bearer '))
      return HttpResponse.json(batchFixtures.noAutenticado, { status: 401 })
    const body = (await request.json()) as { referencia_lote: string; envios: unknown[] }
    const [created] = batchFixtures.response.resultados
    return HttpResponse.json(
      {
        ...batchFixtures.response,
        referencia_lote: body.referencia_lote,
        total: body.envios.length,
        aceptados: body.envios.length,
        rechazados: 0,
        status: 'COMPLETED',
        resultados: body.envios.map((envio, index) => ({
          ...created,
          linea: index + 1,
          referencia_cliente: (envio as { referencia_cliente: string }).referencia_cliente,
          numero_guia: `TLX-${String(200001 + index)}-CO`,
        })),
      },
      { status: 201 },
    )
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

  ...asesorHandlers,
  ...asesorTrackingHandlers,
]
