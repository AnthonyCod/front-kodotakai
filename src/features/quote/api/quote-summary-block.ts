import { z } from 'zod'

/** Cotización calculada por el backend (`formula_version`). Montos: COP enteros. */
export const quoteSummaryBlockSchema = z.object({
  type: z.literal('QUOTE_SUMMARY'),
  cotizacion_id: z.string(),
  codigo_trayecto: z.string(),
  origen: z.string(),
  destino: z.string(),
  peso_facturable_kg: z.number().positive(),
  flete_total_cop: z.number().int().nonnegative(),
  tiempo_entrega_horas: z.number().int().positive(),
  formula_version: z.string(),
  advertencias: z.array(z.string()),
})
export type QuoteSummaryBlock = z.infer<typeof quoteSummaryBlockSchema>
