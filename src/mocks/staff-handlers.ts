import { http, HttpResponse, type RequestHandler } from 'msw'

// Bandeja, mercancía peligrosa y administración del personal (contrato 1.7.0, CR-009). Solo con el
// backend simulado completo (`VITE_API_MOCKING=true`); en modo `asesor` van al backend real.
// Formas tomadas de respuestas reales del backend publicado.
const api = (path: string) => `*/api/v1${path}`

const now = () => new Date().toISOString()
const ago = (min: number) => new Date(Date.now() - min * 60_000).toISOString()

const apiError = (status: number, code: string, message: string) =>
  HttpResponse.json(
    { error: { code, message, details: null, request_id: crypto.randomUUID() } },
    { status },
  )

type Status = 'PENDING' | 'ASSIGNED' | 'CLOSED'

const seedHandoffs = () => [
  {
    handoff_id: 'd5f1fbb6-a6d0-4033-bfcc-f38111886697',
    session_id: '360a5f59-b403-489c-9bcd-2969de1b59ac',
    canal: 'WEB_CHAT',
    prioridad: 'ALTA',
    cola_destino: 'SUPERVISOR',
    numero_guia_consultada: null as string | null,
    status: 'PENDING' as Status,
    created_at: ago(35),
    confidence_score_promedio: null as number | null,
    sentimiento_detectado: 'MUY_NEGATIVO',
    intentos_previos: 0,
    resumen_contexto: 'No se muestra (sin resumen IA).',
    historial: [
      {
        rol: 'USUARIO',
        texto: 'Voy a demandar ante la Supertransporte, pésimo servicio',
        timestamp: ago(35),
        canal: 'WEB_CHAT',
      },
    ],
    triggers: [
      {
        id_criterio: 'CRIT-002',
        accion: 'ESCALAR_PRIORIDAD_ALTA',
        accion_raw: 'ESCALAR_PRIORIDAD_ALTA',
        evidencia: 'palabras clave: pesimo servicio, demandar, supertransporte',
        modo: 'literal',
      },
    ],
    tiempo_espera_estimado_segundos: 45,
  },
  {
    handoff_id: '9b2e41c7-5f0a-4c1d-8e7b-2a6f3d9c1e44',
    session_id: '1f0c2b3a-9d8e-4f7a-b6c5-d4e3f2a1b0c9',
    canal: 'WEB_CHAT',
    prioridad: 'NORMAL',
    cola_destino: 'SERVICIO_CLIENTE',
    numero_guia_consultada: 'TLX-551904-CO' as string | null,
    status: 'ASSIGNED' as Status,
    created_at: ago(90),
    confidence_score_promedio: 0.42 as number | null,
    sentimiento_detectado: 'NEUTRO',
    intentos_previos: 2,
    resumen_contexto: 'No se muestra (sin resumen IA).',
    historial: [
      {
        rol: 'USUARIO',
        texto: '¿Por qué mi guía TLX-551904-CO no ha llegado?',
        timestamp: ago(92),
        canal: 'WEB_CHAT',
      },
      {
        rol: 'ASISTENTE',
        texto: 'Tu envío está en reparto en Pereira. ¿Quieres hablar con un asesor?',
        timestamp: ago(91),
        canal: 'WEB_CHAT',
      },
      { rol: 'USUARIO', texto: 'Sí, por favor.', timestamp: ago(90), canal: 'WEB_CHAT' },
    ],
    triggers: [
      {
        id_criterio: 'CRIT-001',
        accion: 'ESCALAR_A_HUMANO',
        accion_raw: 'ESCALAR_A_HUMANO',
        evidencia: 'confianza baja en 2 respuestas seguidas',
        modo: 'literal',
      },
    ],
    tiempo_espera_estimado_segundos: 120,
  },
]

const seedDangerousGoods = () => [
  {
    shipment_id: '7edf8c27-dd19-4bb2-9d4f-fd06fff00930',
    numero_guia: 'TLX-200001-CO',
    codigo_trayecto: 'TLX-BOG-MED-001',
    created_at: ago(120),
    revision: null as null | {
      shipment_id: string
      decision: 'APROBADA' | 'RECHAZADA'
      observaciones: string
      reviewer_staff_user_id: string
      created_at: string
    },
  },
]

let handoffs = seedHandoffs()
let dangerousGoods = seedDangerousGoods()
const audit: { action: string; http_status: number; resource_type: string | null }[] = []

/** Para los tests: datos iniciales. */
export function resetStaffMocks() {
  handoffs = seedHandoffs()
  dangerousGoods = seedDangerousGoods()
  audit.length = 0
}

const summary = ({
  confidence_score_promedio: _c,
  sentimiento_detectado: _s,
  intentos_previos: _i,
  resumen_contexto: _r,
  historial: _h,
  triggers: _t,
  tiempo_espera_estimado_segundos: _w,
  ...rest
}: (typeof handoffs)[number]) => rest

const log = (action: string, http_status: number, resource_type: string | null) =>
  audit.unshift({ action, http_status, resource_type })

export const staffHandlers: RequestHandler[] = [
  http.get(api('/handoffs'), () => {
    log('handoff.read', 200, 'handoff')
    return HttpResponse.json({ items: handoffs.map(summary) })
  }),

  http.get(api('/handoffs/:id'), ({ params }) => {
    const item = handoffs.find((h) => h.handoff_id === params.id)
    return item ? HttpResponse.json(item) : apiError(404, 'NO_ENCONTRADO', 'No existe.')
  }),

  http.patch(api('/handoffs/:id'), async ({ params, request }) => {
    const item = handoffs.find((h) => h.handoff_id === params.id)
    if (!item) return apiError(404, 'NO_ENCONTRADO', 'No existe.')
    item.status = ((await request.json()) as { status: Status }).status
    log('handoff.update', 200, 'handoff')
    return HttpResponse.json(item)
  }),

  http.get(api('/internal/dangerous-goods'), ({ request }) => {
    const estado = new URL(request.url).searchParams.get('estado')
    const items = dangerousGoods.filter((d) =>
      estado === 'REVISADO' ? d.revision !== null : d.revision === null,
    )
    return HttpResponse.json({ items })
  }),

  http.post(api('/internal/shipments/:id/dangerous-goods-review'), async ({ params, request }) => {
    const item = dangerousGoods.find((d) => d.shipment_id === params.id)
    if (!item) return apiError(404, 'NO_ENCONTRADO', 'No existe.')
    if (item.revision) return apiError(422, 'VALIDACION', 'Este envío ya tiene una decisión.')
    const body = (await request.json()) as {
      decision: 'APROBADA' | 'RECHAZADA'
      observaciones: string
    }
    item.revision = {
      shipment_id: item.shipment_id,
      ...body,
      reviewer_staff_user_id: 'staff-reviewer',
      created_at: now(),
    }
    log('dangerous_goods.review', 201, 'shipment')
    return HttpResponse.json(item.revision, { status: 201 })
  }),

  http.post(api('/internal/staff-users'), async ({ request }) => {
    const body = (await request.json()) as { email: string; nombre: string; roles: string[] }
    log('staff.create', 201, 'staff_user')
    return HttpResponse.json(
      { id: crypto.randomUUID(), ...body, estado: 'ACTIVE', created_at: now(), updated_at: now() },
      { status: 201 },
    )
  }),

  http.patch(api('/internal/staff-users/:id/roles'), async ({ params, request }) => {
    const { roles } = (await request.json()) as { roles: string[] }
    if (params.id === 'staff-admin')
      return HttpResponse.json(
        {
          error: {
            code: 'NO_AUTORIZADO',
            message: 'No puedes cambiar tus propios roles.',
            details: { motivo: 'propio_rol' },
            request_id: crypto.randomUUID(),
          },
        },
        { status: 403 },
      )
    log('staff.roles.update', 200, 'staff_user')
    return HttpResponse.json({
      id: params.id,
      email: 'revisora@translogix.co',
      nombre: 'Revisora de turno',
      roles,
      estado: 'ACTIVE',
      created_at: ago(600),
      updated_at: now(),
    })
  }),

  http.get(api('/internal/audit-events'), ({ request }) => {
    const action = new URL(request.url).searchParams.get('action')
    const items = audit
      .filter((e) => !action || e.action === action)
      .map((e, i) => ({
        id: `ev-${i}`,
        request_id: `req-${i}`,
        client_id: null,
        staff_user_id: 'staff-admin',
        resource_id: null,
        created_at: ago(i),
        ...e,
      }))
    return HttpResponse.json({ items })
  }),
]
