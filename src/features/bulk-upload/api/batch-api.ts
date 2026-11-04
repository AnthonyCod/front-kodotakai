import { z } from 'zod'
import { httpClient } from '@/shared/api'
import type { buildBatch } from '../model/bulk-rows'

/**
 * `POST /shipment-batches` (contrato 1.3.0 del backend, envíos masivos B2B). Se autentica con la
 * API key de la empresa (`Authorization: Bearer`): la escribe el cliente y vive solo en memoria.
 */
const itemSchema = z.object({
  linea: z.number().int().positive(),
  referencia_cliente: z.string().nullable(),
  status: z.enum(['PENDING', 'CREATED', 'REJECTED']),
  numero_guia: z.string().nullable(),
  flete_total_cop: z.number().int().nonnegative().nullable(),
  formula_version: z.string().nullable(),
  errores: z.array(z.object({ code: z.string(), field: z.string().nullable() })),
})

export const batchResponseSchema = z.object({
  lote_id: z.string(),
  referencia_lote: z.string(),
  status: z.enum(['RECEIVED', 'PROCESSING', 'COMPLETED', 'COMPLETED_WITH_ERRORS']),
  total: z.number().int(),
  aceptados: z.number().int(),
  rechazados: z.number().int(),
  pendientes: z.number().int(),
  created_at: z.string(),
  started_at: z.string().nullable(),
  completed_at: z.string().nullable(),
  resultados: z.array(itemSchema),
})
export type BatchResponse = z.infer<typeof batchResponseSchema>
export type BatchItem = BatchResponse['resultados'][number]

export const createBatch = ({
  batch,
  apiKey,
}: {
  batch: ReturnType<typeof buildBatch>
  apiKey: string
}) =>
  httpClient.post('/shipment-batches', batch, batchResponseSchema, {
    headers: {
      Authorization: `Bearer ${apiKey.trim()}`,
      'Idempotency-Key': batch.referencia_lote,
    },
  })
