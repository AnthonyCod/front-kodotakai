// API pública de la feature pqrs (M5). Fuera de la feature solo se importa desde aquí.
export {
  ATTACHMENT_LIMITS,
  documentoCodigoSchema,
  pqrsTicketBlockSchema,
  requestAttachmentsBlockSchema,
  type DocumentoCodigo,
  type PqrsTicketBlock,
  type RequestAttachmentsBlock,
} from './api/pqrs-blocks'
export {
  DOCUMENT_LABELS,
  pqrsTicketBlock,
  requestAttachmentsBlock,
} from './components/blocks/pqrs-blocks'
export { PqrsForm } from './components/pqrs-form'
export { uploadAttachment } from './api/pqrs-api'
