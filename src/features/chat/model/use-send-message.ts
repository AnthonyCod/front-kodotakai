import { useCallback } from 'react'
import { toApiError, type ApiError } from '@/shared/api'
import { speak } from '@/shared/lib/speech-synthesis'
import type { AttachmentRef, ConversationReply } from '../api/chat-contract'
import { useChatGateway, type ChatGateway } from '../api/chat-gateway'
import { useChatStore } from './chat-store'
import { getClientId } from './client-id'
import { replyToSpeech } from './reply-speech'

/** Límite del backend para `text`. */
export const MAX_MESSAGE_LENGTH = 4096

interface SendOptions {
  attachments?: AttachmentRef[]
  /** Al reintentar: se reusa el `message_id` y no se repite el mensaje en el historial. */
  retryOf?: string
}

export function useSendMessage() {
  const gateway = useChatGateway()

  const send = useCallback(
    async (text: string, { attachments, retryOf }: SendOptions = {}) => {
      const trimmed = text.trim().slice(0, MAX_MESSAGE_LENGTH)
      const state = useChatStore.getState()
      const hasAttachments = (attachments?.length ?? 0) > 0
      if ((!trimmed && !hasAttachments) || state.pending) return
      if (state.blockedUntil && Date.now() < state.blockedUntil) return

      const messageId = retryOf ?? crypto.randomUUID()
      if (!retryOf) state.addUserMessage({ id: messageId, text: trimmed, attachments })
      state.startSending()

      try {
        const reply = await sendWithSessionRecovery(gateway, {
          messageId,
          text: trimmed,
          attachments,
          sessionId: state.sessionId,
        })
        useChatStore.getState().receiveReply(reply)
        if (useChatStore.getState().voiceReplies) speak(replyToSpeech(reply.blocks))
      } catch (error) {
        const apiError = toApiError(error)
        useChatStore.getState().fail(
          {
            messageId,
            text: trimmed,
            attachments,
            errorKind: apiError.kind,
            errorMessage: apiError.userMessage,
          },
          blockedUntil(apiError),
        )
      }
    },
    [gateway],
  )

  const retry = useCallback(() => {
    const { failed } = useChatStore.getState()
    if (failed)
      void send(failed.text, { attachments: failed.attachments, retryOf: failed.messageId })
  }, [send])

  return { send, retry }
}

/** D.8: sesión inexistente, ajena o expirada → se descarta y se reenvía el MISMO `message_id`. */
async function sendWithSessionRecovery(
  gateway: ChatGateway,
  message: {
    messageId: string
    text: string
    attachments?: AttachmentRef[]
    sessionId: string | null
  },
): Promise<ConversationReply> {
  const request = (sessionId: string | null) =>
    gateway.sendMessage({
      client_id: getClientId(),
      message_id: message.messageId,
      session_id: sessionId,
      text: message.text || null,
      attachments: message.attachments,
    })

  try {
    return await request(message.sessionId)
  } catch (error) {
    const apiError = toApiError(error)
    if (message.sessionId && apiError.status === 404 && apiError.code === 'NO_ENCONTRADO') {
      useChatStore.getState().dropSession()
      return request(null)
    }
    throw apiError
  }
}

/** 429: el backend dice cuántos segundos esperar (por defecto ~60). */
function blockedUntil(error: ApiError): number | undefined {
  if (error.kind !== 'rate_limited') return undefined
  return Date.now() + (error.retryAfterSeconds ?? 60) * 1000
}
