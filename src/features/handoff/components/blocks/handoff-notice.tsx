import { Headphones } from 'lucide-react'
import { defineBlock } from '@/shared/blocks'
import { formatWait } from '@/shared/lib/format'
import { toPlainText } from '@/shared/lib/plain-text'
import { BlockCard, BlockHeader, InfoPanel, StatusDot } from '@/shared/ui/block-card'
import { handoffNoticeBlockSchema, type HandoffNoticeBlock } from '../../api/handoff-notice-block'

// Prioridad y cola son datos internos del asesor: el cliente solo ve el mensaje y la espera.
function HandoffNotice(block: HandoffNoticeBlock) {
  return (
    <BlockCard role="status">
      <BlockHeader
        icon={<Headphones size={20} aria-hidden />}
        title="Un asesor tomará tu caso"
        subtitle={`Espera estimada: ${formatWait(block.tiempo_espera_estimado_segundos)}`}
        aside={<StatusDot tone="alert">En espera</StatusDot>}
      />
      <InfoPanel>
        <p className="leading-relaxed whitespace-pre-wrap">{toPlainText(block.mensaje_cliente)}</p>
      </InfoPanel>
    </BlockCard>
  )
}

export const handoffNoticeBlock = defineBlock({
  type: 'HANDOFF_NOTICE',
  schema: handoffNoticeBlockSchema,
  Component: ({ block }) => <HandoffNotice {...block} />,
})
