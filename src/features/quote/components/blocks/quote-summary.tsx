import { Calculator } from 'lucide-react'
import { defineBlock } from '@/shared/blocks'
import { formatCop } from '@/shared/lib/format'
import { toPlainText } from '@/shared/lib/plain-text'
import { BlockCard, BlockHeader, InfoPanel } from '@/shared/ui/block-card'
import { CopyCode } from '@/shared/ui/copy-code'
import { quoteSummaryBlockSchema, type QuoteSummaryBlock } from '../../api/quote-summary-block'
import { quoteCode } from '../../model/quote-code'

export function QuoteSummary(block: Omit<QuoteSummaryBlock, 'type'>) {
  return (
    <BlockCard>
      <BlockHeader
        icon={<Calculator size={20} aria-hidden />}
        title={`${block.origen} → ${block.destino}`}
        subtitle="Cotización de tu envío"
      />

      <div>
        <p className="text-xs text-muted-foreground">Flete total</p>
        <p className="text-3xl font-semibold tracking-tight">{formatCop(block.flete_total_cop)}</p>
      </div>

      <InfoPanel className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-muted-foreground">Peso facturable</p>
          <p className="font-medium">{block.peso_facturable_kg} kg</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Entrega aprox.</p>
          <p className="font-medium">{block.tiempo_entrega_horas} h</p>
        </div>
      </InfoPanel>

      {block.advertencias.length > 0 && (
        <ul className="space-y-1 text-xs text-muted-foreground">
          {block.advertencias.map((advertencia) => (
            <li key={advertencia} className="flex gap-1.5">
              <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-warning" />
              {toPlainText(advertencia)}
            </li>
          ))}
        </ul>
      )}

      <CopyCode
        label="Código de tu cotización"
        code={quoteCode(block.cotizacion_id)}
        value={block.cotizacion_id}
      />
    </BlockCard>
  )
}

export const quoteSummaryBlock = defineBlock({
  type: 'QUOTE_SUMMARY',
  schema: quoteSummaryBlockSchema,
  Component: ({ block }) => <QuoteSummary {...block} />,
})
