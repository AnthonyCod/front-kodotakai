import { z } from 'zod'
import { WITH_SESSION } from '@/features/auth'
import { httpClient } from '@/shared/api'

/** Una cotización pasa a envío solo cuando un encargado la aprueba. */
export const REQUEST_STATES = ['PENDIENTE', 'APROBADA', 'RECHAZADA'] as const
export type RequestState = (typeof REQUEST_STATES)[number]

export const shipmentRequestSchema = z.object({
  cotizacion_id: z.string(),
  estado: z.enum(REQUEST_STATES),
  origen: z.string(),
  destino: z.string(),
  peso_facturable_kg: z.number().positive(),
  flete_total_cop: z.number().int().nonnegative(),
  solicitante: z.object({ nombre: z.string(), email: z.string() }),
  solicitado_en: z.string(),
  revisado_en: z.string().nullable(),
  motivo_rechazo: z.string().nullable(),
  numero_guia: z.string().nullable(),
})
export type ShipmentRequest = z.infer<typeof shipmentRequestSchema>

export const shipmentRequestListSchema = z.object({ items: z.array(shipmentRequestSchema) })

const byQuote = (id: string) => encodeURIComponent(id)

/** USUARIO: la cotización queda PENDIENTE con su precio congelado. */
export const requestShipment = (cotizacionId: string) =>
  httpClient.post(
    `/cotizaciones/${byQuote(cotizacionId)}/solicitar`,
    undefined,
    shipmentRequestSchema,
    WITH_SESSION,
  )

export const fetchMyShipments = () =>
  httpClient.get('/mis-envios', shipmentRequestListSchema, WITH_SESSION)
