import { BookOpen, ChevronDown } from 'lucide-react'
import { defineBlock } from '@/shared/blocks'
import { toPlainText } from '@/shared/lib/plain-text'
import { BlockCard } from '@/shared/ui/block-card'
import { citationsBlockSchema, type CitationsBlock } from '../../api/citations-block'

function Citations({ items }: CitationsBlock) {
  return (
    <BlockCard className="p-0 sm:p-0">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center gap-3 p-4 sm:p-5 [&::-webkit-details-marker]:hidden">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-muted text-foreground/70">
            <BookOpen size={20} aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-base font-medium">Fuentes</span>
            <span className="block text-xs text-muted-foreground">
              {items.length} documento{items.length === 1 ? '' : 's'} consultado
              {items.length === 1 ? '' : 's'}
            </span>
          </span>
          <ChevronDown
            size={18}
            aria-hidden
            className="text-muted-foreground transition group-open:rotate-180"
          />
        </summary>
        <ul className="border-t border-dashed">
          {items.map((item) => (
            <li key={item.chunk_id} className="space-y-1 border-b px-4 py-3 last:border-0 sm:px-5">
              <p className="font-medium">{toPlainText(item.doc_title)}</p>
              <p className="text-xs text-muted-foreground">{toPlainText(item.section_path)}</p>
              <p className="text-xs whitespace-pre-wrap text-foreground/70">
                “{toPlainText(item.excerpt)}”
              </p>
            </li>
          ))}
        </ul>
      </details>
    </BlockCard>
  )
}

export const citationsBlock = defineBlock({
  type: 'CITATIONS',
  schema: citationsBlockSchema,
  Component: ({ block }) => <Citations {...block} />,
})
