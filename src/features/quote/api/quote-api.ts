import { z } from 'zod'
import { httpClient, type ApiSchemas } from '@/shared/api'

export type QuoteRequest = ApiSchemas['CotizacionRequest']

/** `POST /cotizar`: el backend calcula todo; aquí solo se muestra. */
const quoteResponseSchema = z.object({
  cotizacion_id: z.string(),
  ruta: z.object({ origen: z.string(), destino: z.string() }).loose(),
  calculo: z.object({
    peso_volumetrico_kg: z.number(),
    peso_facturable_kg: z.number(),
    flete_base_cop: z.number(),
    seguro_cop: z.number(),
    flete_minimo_aplicado: z.boolean(),
    flete_total_cop: z.number(),
  }),
  tiempo_entrega_horas: z.number(),
  advertencias: z.array(z.string()),
  supuestos: z.array(z.string()),
  formula_version: z.string(),
})
export type QuoteResponse = z.infer<typeof quoteResponseSchema>

export const createQuote = (body: QuoteRequest) =>
  httpClient.post('/cotizar', body, quoteResponseSchema)
