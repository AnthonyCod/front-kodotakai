import { z } from 'zod'

export const documentoCodigoSchema = z.enum([
  'GUIA',
  'FACTURA_COMERCIAL',
  'CARTA_RECLAMACION',
  'CERTIFICACION_BANCARIA',
  'FOTOS_EMPAQUE',
  'FOTOS_DANO',
  'CEDULA_O_RUT',
  'ACTA_CON_SALVEDAD',
])
export type DocumentoCodigo = z.infer<typeof documentoCodigoSchema>

/** El usuario sube cada documento (`POST /attachments`) y lo envía en el chat como `attachments`. */
export const requestAttachmentsBlockSchema = z.object({
  type: z.literal('REQUEST_ATTACHMENTS'),
  checklist: z
    .array(
      z.object({
        codigo: documentoCodigoSchema,
        obligatorio: z.boolean(),
        recibido: z.boolean(),
        descripcion: z.string(),
      }),
    )
    .min(1),
})
export type RequestAttachmentsBlock = z.infer<typeof requestAttachmentsBlockSchema>

export const pqrsTicketBlockSchema = z.object({
  type: z.literal('PQRS_TICKET'),
  ticket_id: z.string(),
  estado: z.enum(['BORRADOR', 'RADICADO', 'FUERA_DE_PLAZO', 'ESCALADO']),
  faltantes: z.array(documentoCodigoSchema),
})
export type PqrsTicketBlock = z.infer<typeof pqrsTicketBlockSchema>

/** Límites de adjuntos del backend: PDF o JPEG (detectado por contenido), ≤ 10 MB. */
export const ATTACHMENT_LIMITS = {
  maxBytes: 10 * 1024 * 1024,
  mimeTypes: ['application/pdf', 'image/jpeg'],
} as const
