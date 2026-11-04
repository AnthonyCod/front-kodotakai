import { quickRepliesBlock, textBlock } from '@/features/chat'
import { citationsBlock } from '@/features/citations'
import { handoffNoticeBlock } from '@/features/handoff'
import { pqrsTicketBlock, requestAttachmentsBlock } from '@/features/pqrs'
import { quoteSummaryBlock } from '@/features/quote'
import { trackingCardBlock } from '@/features/tracking'
import { createBlockRegistry } from '@/shared/blocks'

/**
 * Único lugar donde se conectan los bloques de cada feature con el chat.
 * Nuevo tipo de bloque = `defineBlock` en su feature + una línea aquí.
 */
export const blockRegistry = createBlockRegistry([
  textBlock,
  quickRepliesBlock,
  trackingCardBlock,
  quoteSummaryBlock,
  citationsBlock,
  requestAttachmentsBlock,
  pqrsTicketBlock,
  handoffNoticeBlock,
])
