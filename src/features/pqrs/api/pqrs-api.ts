import { z } from 'zod'
import { httpClient, type ApiSchemas } from '@/shared/api'
import { documentoCodigoSchema, type DocumentoCodigo } from './pqrs-blocks'

const attachmentUploadSchema = z.object({
  attachment_id: z.string(),
  mime_type: z.string(),
  size_bytes: z.number(),
})

/** `POST /attachments` (multipart). Luego se manda en el chat como `attachments`. */
export function uploadAttachment(file: File, docCode?: DocumentoCodigo) {
  const form = new FormData()
  form.append('file', file)
  if (docCode) form.append('declared_doc_code', docCode)
  return httpClient.post('/attachments', form, attachmentUploadSchema)
}

export type PqrsTicketRequest = ApiSchemas['PqrsTicketRequest']

const pqrsTicketResponseSchema = z.object({
  ticket_id: z.string(),
  estado: z.string(),
  checklist: z.array(
    z.object({ codigo: documentoCodigoSchema, obligatorio: z.boolean(), recibido: z.boolean() }),
  ),
  faltantes: z.array(documentoCodigoSchema),
  liquidacion_preliminar: z.looseObject({}).nullable(),
  escalamiento: z
    .object({ escalate: z.boolean(), mensaje_cliente: z.string().nullable() })
    .nullable(),
})
export type PqrsTicketResponse = z.infer<typeof pqrsTicketResponseSchema>

export const createPqrsTicket = (body: PqrsTicketRequest) =>
  httpClient.post('/pqrs/crear-ticket', body, pqrsTicketResponseSchema)
