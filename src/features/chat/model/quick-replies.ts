import type { ApiSchemas } from '@/shared/api'

type QuickReplyOption = ApiSchemas['QuickReplyOption']

export type QuickReplyAction =
  | { kind: 'send'; text: string }
  /** No se envía nada: se enfoca el input para que el usuario escriba. */
  | { kind: 'focus_input'; placeholder: string }

/**
 * Web Chat no tiene `interactive_reply_id`: el botón se envía como texto (`option.title`).
 * Estos tres ids fallan así y llevan el arreglo que recomienda backend (D.6) hasta que lo corrijan.
 */
const OVERRIDES: Record<string, QuickReplyAction> = {
  novedad: { kind: 'send', text: 'Quiero reportar una novedad de mi envío' },
  otra_guia: { kind: 'focus_input', placeholder: 'TLX-123456-CO' },
  // (por confirmar) D.6 solo dice "reenviar la cotización con 'cadena de frío' en el texto".
  cadena_frio: { kind: 'send', text: 'Quiero cotizar el mismo envío con cadena de frío' },
}

export function resolveQuickReply(option: QuickReplyOption): QuickReplyAction {
  return OVERRIDES[option.id] ?? { kind: 'send', text: option.title }
}
