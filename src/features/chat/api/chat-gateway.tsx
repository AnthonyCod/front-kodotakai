import { createContext, useContext } from 'react'
import { httpClient } from '@/shared/api'
import {
  chatMessageResponseSchema,
  sessionHistorySchema,
  type ChatMessageRequest,
  type ConversationReply,
  type SessionHistory,
} from './chat-contract'

/** Puerto: el chat depende de esto, no de cómo se transporta el mensaje. */
export interface ChatGateway {
  sendMessage(request: ChatMessageRequest, signal?: AbortSignal): Promise<ConversationReply>
  /** `clientId` va siempre: sin `X-Client-Id` el backend no comprueba de quién es la sesión. */
  getHistory(sessionId: string, clientId: string, signal?: AbortSignal): Promise<SessionHistory>
}

export const httpChatGateway: ChatGateway = {
  sendMessage: async (request, signal) =>
    (await httpClient.post('/chat/messages', request, chatMessageResponseSchema, { signal })).reply,
  getHistory: (sessionId, clientId, signal) =>
    httpClient.get(
      `/chat/sessions/${encodeURIComponent(sessionId)}/history`,
      sessionHistorySchema,
      {
        headers: { 'X-Client-Id': clientId },
        signal,
      },
    ),
}

const ChatGatewayContext = createContext<ChatGateway>(httpChatGateway)

/** Permite inyectar otro gateway (tests, simulador de canales). */
export const ChatGatewayProvider = ChatGatewayContext

export function useChatGateway(): ChatGateway {
  return useContext(ChatGatewayContext)
}
