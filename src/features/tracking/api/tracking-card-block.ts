import { z } from 'zod'

const isoDate = z.iso.datetime({ offset: true })

/** Textos visibles al cliente: el backend garantiza que no traen datos personales. */
const estadoVistaSchema = z.object({
  codigo: z.string(),
  etiqueta: z.string(),
  explicacion: z.string(),
})

const eventoVistaSchema = z.object({
  timestamp: isoDate,
  estado: z.string(),
  etiqueta: z.string(),
  ubicacion: z.string().nullable(),
  descripcion_cliente: z.string(),
})

export const trackingCardBlockSchema = z.object({
  type: z.literal('TRACKING_CARD'),
  numero_guia: z.string(),
  estado: estadoVistaSchema,
  eta: isoDate.nullable(),
  ubicacion_referencia: z.string().nullable(),
  eventos: z.array(eventoVistaSchema),
  flags: z.object({
    requiere_refrigeracion: z.boolean(),
    mercancia_peligrosa: z.boolean(),
  }),
})
export type TrackingCardBlock = z.infer<typeof trackingCardBlockSchema>

/** Formato de guía del backend (validación inline del input). */
export const GUIA_PATTERN = /^TLX-\d{6}-CO$/
