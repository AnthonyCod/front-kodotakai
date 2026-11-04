import { useMemo, type ReactNode } from 'react'
import { BlockActionsProvider, type BlockActions } from '@/shared/blocks'
import { useChatStore } from './chat-store'
import { useSendMessage } from './use-send-message'

/** Implementación de `BlockActions` respaldada por el chat. No dibuja nada. */
export function ChatBlockActionsProvider({ children }: { children: ReactNode }) {
  const { send } = useSendMessage()
  // En ESCALATED el cliente puede seguir escribiendo (D.5): no deshabilita.
  const disabled = useChatStore((s) => s.pending || s.blockedUntil !== null)

  const actions = useMemo<BlockActions>(
    () => ({
      sendMessage: (text, options) => void send(text, options),
      disabled,
    }),
    [send, disabled],
  )

  return <BlockActionsProvider value={actions}>{children}</BlockActionsProvider>
}
