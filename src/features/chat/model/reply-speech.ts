import type { RawBlock } from '@/shared/blocks'
import { toPlainText } from '@/shared/lib/plain-text'

/**
 * Lo que Logi dice en voz alta de una respuesta: sus textos y el aviso de asesor.
 * Tarjetas (rastreo, cotización, fuentes…) se ven en pantalla, no se leen.
 */
export function replyToSpeech(blocks: RawBlock[]): string {
  return blocks
    .map((block) => {
      if (block.type === 'TEXT' && typeof block.text === 'string') return toPlainText(block.text)
      if (block.type === 'HANDOFF_NOTICE' && typeof block.mensaje_cliente === 'string')
        return toPlainText(block.mensaje_cliente)
      return ''
    })
    .filter(Boolean)
    .join(' ')
}
