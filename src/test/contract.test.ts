import fixtures from '@/mocks/fixtures/chat.json'
import { citationsBlockSchema } from '@/features/citations'
import { handoffNoticeBlockSchema } from '@/features/handoff'
import { pqrsTicketBlockSchema, requestAttachmentsBlockSchema } from '@/features/pqrs'
import { quoteSummaryBlockSchema } from '@/features/quote'
import { trackingCardBlockSchema } from '@/features/tracking'
import { quickRepliesBlockSchema, textBlockSchema } from '@/features/chat'

// Los schemas del frontend deben aceptar lo que el backend responde de verdad.
const schemas = {
  TEXT: textBlockSchema,
  QUICK_REPLIES: quickRepliesBlockSchema,
  TRACKING_CARD: trackingCardBlockSchema,
  QUOTE_SUMMARY: quoteSummaryBlockSchema,
  CITATIONS: citationsBlockSchema,
  REQUEST_ATTACHMENTS: requestAttachmentsBlockSchema,
  PQRS_TICKET: pqrsTicketBlockSchema,
  HANDOFF_NOTICE: handoffNoticeBlockSchema,
} as const

const blocks = Object.entries(fixtures.replies).flatMap(([scenario, reply]) =>
  reply.blocks.map((block) => [`${scenario} · ${block.type}`, block] as const),
)

describe('contrato de bloques contra capturas reales', () => {
  it('cubre los 8 tipos', () => {
    expect(new Set(blocks.map(([, b]) => b.type))).toEqual(new Set(Object.keys(schemas)))
  })

  it.each(blocks)('%s', (_, block) => {
    const schema = schemas[block.type as keyof typeof schemas]
    expect(schema.safeParse(block).success).toBe(true)
  })
})
