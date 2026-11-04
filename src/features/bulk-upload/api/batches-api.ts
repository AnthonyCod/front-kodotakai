import { z } from 'zod'
import { httpClient } from '@/shared/api'
import type { BulkShipment } from '../model/bulk-rows'

// Envíos masivos B2B (contrato 1.3.0, tag «envíos masivos»). `docs/api/openapi.json` sigue en 1.2.0:
// cuando llegue el 1.3.0, `pnpm api:types` y estos tipos pasan a `ApiSchemas`. Lo que la guía del
// backend no nombra campo a campo va marcado (por confirmar).

export interface ShipmentBatchRequest {
  referencia_lote: string
  envios: BulkShipment[]
}

const itemErrorSchema = z.object({ code: z.string(), field: z.string().nullish() }).loose()
export type BatchItemError = z.infer<typeof itemErrorSchema>

const batchItemSchema = z
  .object({
    /** Posición del envío en `envios` (por confirmar: desde 1). */
    linea: z.number(),
    status: z.enum(['PENDING', 'CREATED', 'REJECTED']),
    referencia_cliente: z.string().nullish(), // (por confirmar)
    numero_guia: z.string().nullish(), // (por confirmar)
    errores: z.array(itemErrorSchema).nullish(),
  })
  .loose()
export type BatchItem = z.infer<typeof batchItemSchema>

/** Respuesta de `POST /shipment-batches`: aquí solo se usa el id (por confirmar: `batch_id`). */
const batchSchema = z.object({ batch_id: z.string() }).loose()

const itemsPageSchema = z
  .object({ items: z.array(batchItemSchema), next_cursor: z.string().nullish() })
  .loose()

/** El backend procesa el lote dentro de la petición: 500 envíos pueden tardar. */
const CREATE_TIMEOUT_MS = 120_000
/** Máximo de `limit` en `GET …/items`. */
const PAGE_LIMIT = 200

const auth = (apiKey: string) => ({ Authorization: `Bearer ${apiKey}` })

/**
 * `POST /shipment-batches`. `Idempotency-Key` = `referencia_lote`: repetir el mismo lote devuelve
 * el resultado anterior (200) o sigue los pendientes; con otro contenido responde 409.
 */
export const createShipmentBatch = (apiKey: string, batch: ShipmentBatchRequest) =>
  httpClient.post('/shipment-batches', batch, batchSchema, {
    headers: { ...auth(apiKey), 'Idempotency-Key': batch.referencia_lote },
    timeoutMs: CREATE_TIMEOUT_MS,
  })

/** `GET /shipment-batches/{id}/items`, todas las páginas (ordenadas por `linea`). */
export async function fetchBatchItems(apiKey: string, batchId: string): Promise<BatchItem[]> {
  const items: BatchItem[] = []
  let cursor: string | null | undefined
  do {
    const query = new URLSearchParams({ limit: String(PAGE_LIMIT) })
    if (cursor) query.set('cursor', cursor)
    const page = await httpClient.get(
      `/shipment-batches/${encodeURIComponent(batchId)}/items?${query}`,
      itemsPageSchema,
      { headers: auth(apiKey) },
    )
    items.push(...page.items)
    cursor = page.next_cursor
  } while (cursor)
  return items
}
