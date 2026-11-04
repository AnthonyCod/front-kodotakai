import { z } from 'zod'
import { bearer, httpClient } from '@/shared/api'

// Revisión de mercancía peligrosa (backend real, contrato 1.7.0). Listar: ADMIN y REVIEWER.
// Decidir: solo REVIEWER, una vez por envío (una segunda decisión responde 422).

const isoDate = z.iso.datetime({ offset: true })

export const reviewDecisionSchema = z.enum(['APROBADA', 'RECHAZADA'])
export type ReviewDecision = z.infer<typeof reviewDecisionSchema>

const reviewSchema = z.object({
  shipment_id: z.string(),
  decision: reviewDecisionSchema,
  observaciones: z.string(),
  reviewer_staff_user_id: z.string(),
  created_at: isoDate,
})

const itemSchema = z.object({
  shipment_id: z.string(),
  numero_guia: z.string(),
  codigo_trayecto: z.string(),
  created_at: isoDate,
  /** `null` = pendiente. Nunca trae datos del destinatario. */
  revision: reviewSchema.nullable(),
})
export type DangerousGoodsItem = z.infer<typeof itemSchema>

export type DangerousGoodsState = 'PENDIENTE' | 'REVISADO'

export const listDangerousGoods = (estado: DangerousGoodsState) =>
  httpClient.get(
    `/internal/dangerous-goods?estado=${estado}&limit=50`,
    z.object({ items: z.array(itemSchema) }),
    bearer(),
  )

/** `observaciones`: de 5 a 2.000 caracteres. */
export const OBSERVATIONS_MIN = 5
export const OBSERVATIONS_MAX = 2000

export const reviewDangerousGoods = (
  shipmentId: string,
  decision: ReviewDecision,
  observaciones: string,
) =>
  httpClient.post(
    `/internal/shipments/${encodeURIComponent(shipmentId)}/dangerous-goods-review`,
    { decision, observaciones },
    reviewSchema,
    bearer(),
  )
