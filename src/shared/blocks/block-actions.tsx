import { createContext, useContext } from 'react'
import type { ApiSchemas } from '@/shared/api'

/**
 * Lo que un bloque interactivo puede pedirle a la conversación.
 * Los bloques dependen de esta interfaz, no de la feature chat.
 */
export interface BlockActions {
  /**
   * Respuesta rápida o texto libre, como si el usuario lo escribiera. El backend no recibe datos
   * estructurados: todo va como texto, con adjuntos ya subidos (`POST /attachments`) si los hay.
   */
  sendMessage: (text: string, options?: { attachments?: ApiSchemas['AttachmentRef'][] }) => void
  /** true mientras no se debe interactuar (enviando o esperando por límite de tasa). */
  disabled: boolean
}

const noopActions: BlockActions = {
  sendMessage: () => {},
  disabled: true,
}

const BlockActionsContext = createContext<BlockActions>(noopActions)

export const BlockActionsProvider = BlockActionsContext

export function useBlockActions(): BlockActions {
  return useContext(BlockActionsContext)
}
