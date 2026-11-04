import { z } from 'zod'
import type { QuoteRequest } from '../api/quote-api'

const place = (label: string) =>
  z
    .string({ error: `Escribe la ciudad de ${label}.` })
    .trim()
    .min(1, `Escribe la ciudad de ${label}.`)
    .max(80, 'Máximo 80 caracteres.')

const positive = (label: string) =>
  z.coerce
    .number({ error: `Escribe ${label}.` })
    .refine(
      (n) => Number.isFinite(n) && n > 0,
      `${label[0]?.toUpperCase()}${label.slice(1)} debe ser mayor que 0.`,
    )

/** Mismas reglas que `CotizacionRequest` (openapi): ciudades de 1 a 80 caracteres, medidas > 0, valor entero ≥ 0. */
export const shipmentFormSchema = z.object({
  origen: place('origen'),
  destino: place('destino'),
  alto_cm: positive('el alto'),
  ancho_cm: positive('el ancho'),
  largo_cm: positive('el largo'),
  peso_real_kg: positive('el peso'),
  valor_declarado_cop: z.coerce
    .number({ error: 'Escribe el valor declarado.' })
    .refine((n) => Number.isFinite(n) && n >= 0, 'El valor no puede ser negativo.')
    .transform(Math.round),
  requiere_cadena_frio: z.boolean().default(false),
  mercancia_peligrosa: z.boolean().default(false),
})

export type ShipmentField = keyof z.input<typeof shipmentFormSchema>
export type ShipmentErrors = Partial<Record<ShipmentField, string>>

/** Valida lo escrito: devuelve la petición lista para `POST /cotizar` o un error por campo. */
export function parseShipmentForm(
  values: Partial<Record<ShipmentField, unknown>>,
): { ok: true; request: QuoteRequest } | { ok: false; errors: ShipmentErrors } {
  // Vacío no es 0: así "requerido" y "mayor que 0" tienen su propio mensaje.
  const cleaned = Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, value === '' ? undefined : value]),
  )
  const result = shipmentFormSchema.safeParse(cleaned)
  if (result.success) return { ok: true, request: result.data }

  const errors: ShipmentErrors = {}
  for (const issue of result.error.issues) {
    const field = issue.path[0] as ShipmentField
    errors[field] ??= issue.message
  }
  return { ok: false, errors }
}
