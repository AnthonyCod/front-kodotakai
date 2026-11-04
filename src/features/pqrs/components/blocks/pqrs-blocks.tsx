import { useState } from 'react'
import { FileText, Plus } from 'lucide-react'
import { cn } from 'cn'
import { apiErrorMessage, toApiError } from '@/shared/api'
import { defineBlock, useBlockActions } from '@/shared/blocks'
import { CheckmarkCircle02 } from '@/shared/components/animate-ui/icons/hugeicons/checkmark-circle-02'
import { ClipboardCheck } from '@/shared/components/animate-ui/icons/hugeicons/clipboard-check'
import { BlockCard, BlockHeader, InfoPanel, StatusDot } from '@/shared/ui/block-card'
import { CopyCode } from '@/shared/ui/copy-code'
import { GLASS } from '@/shared/ui/glass'
import { uploadAttachment } from '../../api/pqrs-api'
import {
  ATTACHMENT_LIMITS,
  pqrsTicketBlockSchema,
  requestAttachmentsBlockSchema,
  type DocumentoCodigo,
  type PqrsTicketBlock,
  type RequestAttachmentsBlock,
} from '../../api/pqrs-blocks'

function DocumentRow({
  codigo,
  descripcion,
  obligatorio,
  recibido,
}: RequestAttachmentsBlock['checklist'][number]) {
  const { sendMessage, disabled } = useBlockActions()
  const [state, setState] = useState<'idle' | 'uploading' | 'done' | string>(
    recibido ? 'done' : 'idle',
  )

  async function onFile(file: File | undefined) {
    if (!file) return
    if (!(ATTACHMENT_LIMITS.mimeTypes as readonly string[]).includes(file.type))
      return setState('Solo PDF o JPG.')
    if (file.size > ATTACHMENT_LIMITS.maxBytes) return setState('Máximo 10 MB.')
    setState('uploading')
    try {
      const { attachment_id } = await uploadAttachment(file, codigo)
      sendMessage(`Adjunto ${codigo}`, {
        attachments: [{ attachment_id, declared_doc_code: codigo }],
      })
      setState('done')
    } catch (error) {
      setState(apiErrorMessage(toApiError(error)))
    }
  }

  const done = state === 'done'
  const error = !['idle', 'uploading', 'done'].includes(state) ? state : null

  return (
    <li className="flex items-center gap-3 border-b py-3 last:border-0">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-muted text-foreground/70">
        {done ? <CheckmarkCircle02 size={18} aria-hidden /> : <FileText size={18} aria-hidden />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium">{descripcion}</p>
        <p className={cn('text-xs', error ? 'text-destructive' : 'text-muted-foreground')}>
          {error ??
            (done
              ? 'Recibido'
              : state === 'uploading'
                ? 'Subiendo…'
                : obligatorio
                  ? 'Obligatorio · PDF o JPG'
                  : 'Opcional · PDF o JPG')}
        </p>
      </div>
      {!done && (
        <label
          className={cn(
            GLASS,
            'size-9 shrink-0 cursor-pointer rounded-full',
            (disabled || state === 'uploading') && 'pointer-events-none opacity-45',
          )}
        >
          <span className="sr-only">Adjuntar {descripcion}</span>
          <Plus size={16} aria-hidden />
          <input
            type="file"
            accept="application/pdf,image/jpeg"
            className="sr-only"
            disabled={disabled || state === 'uploading'}
            onChange={(event) => void onFile(event.target.files?.[0])}
          />
        </label>
      )}
    </li>
  )
}

function RequestAttachments({ checklist }: RequestAttachmentsBlock) {
  const received = checklist.filter((item) => item.recibido).length
  return (
    <BlockCard>
      <BlockHeader
        icon={<ClipboardCheck size={20} aria-hidden />}
        title="Documentos para tu caso"
        subtitle={`${received} de ${checklist.length} recibidos`}
      />
      <ul className="border-t border-dashed">
        {checklist.map((item) => (
          <DocumentRow key={item.codigo} {...item} />
        ))}
      </ul>
    </BlockCard>
  )
}

export const DOCUMENT_LABELS: Record<DocumentoCodigo, string> = {
  GUIA: 'Guía',
  FACTURA_COMERCIAL: 'Factura comercial',
  CARTA_RECLAMACION: 'Carta de reclamación',
  CERTIFICACION_BANCARIA: 'Certificación bancaria',
  FOTOS_EMPAQUE: 'Fotos del empaque',
  FOTOS_DANO: 'Fotos del daño',
  CEDULA_O_RUT: 'Cédula o RUT',
  ACTA_CON_SALVEDAD: 'Acta con salvedad',
}

export const TICKET_STATUS_LABELS: Record<string, string> = {
  BORRADOR: 'En borrador: faltan documentos',
  RADICADO: 'Radicado',
  FUERA_DE_PLAZO: 'Fuera de plazo',
  ESCALADO: 'Escalado a un asesor',
}

/** Número de caso legible: los primeros 8 caracteres del id. */
export const ticketNumber = (id: string) => id.slice(0, 8).toUpperCase()

function PqrsTicket({ ticket_id, estado, faltantes }: PqrsTicketBlock) {
  return (
    <BlockCard>
      <BlockHeader
        icon={<ClipboardCheck size={20} aria-hidden />}
        title={`Caso ${ticketNumber(ticket_id)}`}
        subtitle="Tu PQRS quedó registrada"
        aside={
          <StatusDot tone={faltantes.length > 0 || estado === 'FUERA_DE_PLAZO' ? 'alert' : 'ok'}>
            {TICKET_STATUS_LABELS[estado] ?? estado}
          </StatusDot>
        }
      />
      {faltantes.length > 0 && (
        <InfoPanel>
          <p className="text-xs text-muted-foreground">Faltan</p>
          <p>{faltantes.map((codigo) => DOCUMENT_LABELS[codigo]).join(', ')}</p>
        </InfoPanel>
      )}
      <CopyCode label="Número de caso" code={ticketNumber(ticket_id)} value={ticket_id} />
    </BlockCard>
  )
}

export const requestAttachmentsBlock = defineBlock({
  type: 'REQUEST_ATTACHMENTS',
  schema: requestAttachmentsBlockSchema,
  Component: ({ block }) => <RequestAttachments {...block} />,
})
export const pqrsTicketBlock = defineBlock({
  type: 'PQRS_TICKET',
  schema: pqrsTicketBlockSchema,
  Component: ({ block }) => <PqrsTicket {...block} />,
})
