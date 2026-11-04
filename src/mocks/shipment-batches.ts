import { http, HttpResponse, type RequestHandler } from 'msw'

// Simulación de envíos masivos B2B (contrato 1.3.0). Reglas de la guía del backend: idempotencia por
// `referencia_lote`, procesamiento parcial, referencias únicas entre lotes y cursor en `items`.
// Nombres de la respuesta (`batch_id`, `numero_guia`, contadores): (por confirmar).

const api = (path: string) => `*/api/v1${path}`

interface Envio {
  referencia_cliente?: string
  origen?: string
  destino?: string
  requiere_cadena_frio?: boolean
}

interface MockItem {
  linea: number
  status: 'CREATED' | 'REJECTED'
  referencia_cliente: string | null
  numero_guia: string | null
  errores: { code: string; field: string | null }[]
}

interface MockBatch {
  batch_id: string
  referencia_lote: string
  contentKey: string
  items: MockItem[]
}

const batchesByRef = new Map<string, MockBatch>()
const batchesById = new Map<string, MockBatch>()
const usedReferences = new Set<string>()
let nextGuide = 200_000

/** Destinos con servicio refrigerado en la simulación. */
const COLD_CHAIN = new Set(['Bogotá D.C.', 'Medellín', 'Cali', 'Barranquilla'])

const fail = (status: number, code: string, message: string) =>
  HttpResponse.json(
    { error: { code, message, details: null, request_id: crypto.randomUUID() } },
    { status },
  )

function processEnvio(envio: Envio, index: number, seen: Set<string>): MockItem {
  const reference = envio.referencia_cliente?.trim() ?? ''
  const reject = (code: string, field: string | null): MockItem => ({
    linea: index + 1,
    status: 'REJECTED',
    referencia_cliente: reference || null,
    numero_guia: null,
    errores: [{ code, field }],
  })
  if (!reference) return reject('VALIDACION', 'referencia_cliente')
  if (seen.has(reference) || usedReferences.has(reference))
    return reject('REFERENCIA_DUPLICADA', 'referencia_cliente')
  seen.add(reference)
  // Ejemplo de la guía: Bogotá → Envigado no tiene tarifa.
  if (envio.origen === 'Bogotá D.C.' && envio.destino === 'Envigado')
    return reject('TARIFA_NO_DISPONIBLE', null)
  if (envio.requiere_cadena_frio && !COLD_CHAIN.has(envio.destino ?? ''))
    return reject('SERVICIO_NO_DISPONIBLE', 'requiere_cadena_frio')

  usedReferences.add(reference)
  return {
    linea: index + 1,
    status: 'CREATED',
    referencia_cliente: reference,
    numero_guia: `TLX-${nextGuide++}-CO`,
    errores: [],
  }
}

const summary = (batch: MockBatch) => ({
  batch_id: batch.batch_id,
  referencia_lote: batch.referencia_lote,
  status: 'COMPLETED',
  total: batch.items.length,
  creados: batch.items.filter((item) => item.status === 'CREATED').length,
  rechazados: batch.items.filter((item) => item.status === 'REJECTED').length,
  pendientes: 0,
})

const authorized = (request: Request) =>
  /^Bearer \S+$/.test(request.headers.get('Authorization') ?? '')

export const shipmentBatchHandlers: RequestHandler[] = [
  http.post(api('/shipment-batches'), async ({ request }) => {
    if (!authorized(request))
      return fail(401, 'NO_AUTENTICADO', 'No pudimos verificar tu credencial.')

    const body = (await request.json().catch(() => null)) as {
      referencia_lote?: string
      envios?: Envio[]
    } | null
    const reference = body?.referencia_lote?.trim()
    const envios = body?.envios
    if (!reference || !Array.isArray(envios) || envios.length === 0)
      return fail(422, 'VALIDACION', 'El lote necesita referencia_lote y al menos un envío.')
    if (request.headers.get('Idempotency-Key') !== reference)
      return fail(422, 'VALIDACION', 'Idempotency-Key debe ser igual a referencia_lote.')
    if (envios.length > 500)
      return fail(413, 'LOTE_DEMASIADO_GRANDE', 'El lote supera el máximo de envíos.')

    const contentKey = JSON.stringify(envios)
    const previous = batchesByRef.get(reference)
    if (previous)
      return previous.contentKey === contentKey
        ? HttpResponse.json(summary(previous), { status: 200 })
        : fail(409, 'IDEMPOTENCIA_CONFLICTO', 'La referencia de lote ya se usó con otro contenido.')

    const seen = new Set<string>()
    const batch: MockBatch = {
      batch_id: crypto.randomUUID(),
      referencia_lote: reference,
      contentKey,
      items: envios.map((envio, index) => processEnvio(envio, index, seen)),
    }
    batchesByRef.set(reference, batch)
    batchesById.set(batch.batch_id, batch)
    return HttpResponse.json(summary(batch), { status: 201 })
  }),

  http.get(api('/shipment-batches/:batchId/items'), ({ params, request }) => {
    if (!authorized(request))
      return fail(401, 'NO_AUTENTICADO', 'No pudimos verificar tu credencial.')
    const batch = batchesById.get(String(params.batchId))
    if (!batch) return fail(404, 'NO_ENCONTRADO', 'No encontramos el recurso solicitado.')

    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const limit = Number(url.searchParams.get('limit') ?? 50)
    const offset = Number(url.searchParams.get('cursor') ?? 0)
    if (!Number.isInteger(offset) || offset < 0) return fail(422, 'VALIDACION', 'Cursor inválido.')
    const filtered = status ? batch.items.filter((item) => item.status === status) : batch.items
    const end = offset + Math.min(Math.max(limit, 1), 200)
    return HttpResponse.json({
      items: filtered.slice(offset, end),
      next_cursor: end < filtered.length ? String(end) : null,
    })
  }),
]
