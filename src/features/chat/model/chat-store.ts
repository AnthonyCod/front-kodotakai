import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { ApiErrorKind } from '@/shared/api'
import type { RawBlock } from '@/shared/blocks'
import type {
  AttachmentRef,
  Channel,
  ConversationReply,
  ConversationStatus,
  SessionHistory,
} from '../api/chat-contract'
import { rotateClientId } from './client-id'

export type ChatMessage =
  | {
      /** = `message_id` enviado al backend. */
      id: string
      role: 'user'
      text: string
      attachments?: AttachmentRef[]
      createdAt: string
    }
  | {
      /** = `reply_id` del backend. */
      id: string
      role: 'assistant'
      blocks: RawBlock[]
      createdAt: string
    }

export interface FailedSend {
  /** Se reusa al reintentar: el backend no reprocesa un `message_id` ya atendido. */
  messageId: string
  text: string
  attachments?: AttachmentRef[]
  errorKind: ApiErrorKind
  /** Texto del backend para el usuario, si lo trajo. */
  errorMessage?: string
}

interface ChatState {
  /** Sale de cada respuesta; puede cambiar (sesión expirada a los 30 min). */
  sessionId: string | null
  status: ConversationStatus
  /** F49: canal activo; las pestañas del simulador comparten este mismo estado. */
  channel: Channel
  /** F03, F50: historial completo, sobrevive a navegación y recarga. */
  messages: ChatMessage[]
  pending: boolean
  /** Último envío fallido, para reintentar sin duplicar el mensaje del usuario. */
  failed: FailedSend | null
  /** 429: hasta cuándo (epoch ms) se deshabilita el envío. */
  blockedUntil: number | null
  /** Botón "Escribir otra guía": enfoca el input con esta pista. */
  composerHint: string | null
  /** Logi lee sus respuestas en voz alta. Preferencia del usuario: se conserva. */
  voiceReplies: boolean

  setChannel: (channel: Channel) => void
  setComposerHint: (hint: string | null) => void
  setVoiceReplies: (on: boolean) => void
  addUserMessage: (message: { id: string; text: string; attachments?: AttachmentRef[] }) => void
  startSending: () => void
  receiveReply: (reply: ConversationReply) => void
  fail: (failed: FailedSend, blockedUntil?: number) => void
  /** Sesión inexistente o ajena (404 NO_ENCONTRADO): se descarta y se reenvía sin ella. */
  dropSession: () => void
  /** D.7: rehidrata desde `GET /chat/sessions/{id}/history`. */
  hydrate: (history: SessionHistory) => void
  reset: () => void
  /** "Nuevo chat": borra la conversación y cambia de `client_id` (ver `rotateClientId`). */
  startNewChat: () => void
}

const initialState = {
  sessionId: null,
  status: 'AWAITING_USER' as const,
  channel: 'WEB_CHAT' as const,
  messages: [],
  pending: false,
  failed: null,
  blockedUntil: null,
  composerHint: null,
  voiceReplies: false,
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      ...initialState,

      setChannel: (channel) => set({ channel }),

      setComposerHint: (composerHint) => set({ composerHint }),

      setVoiceReplies: (voiceReplies) => set({ voiceReplies }),

      addUserMessage: ({ id, text, attachments }) =>
        set((state) => ({
          messages: [
            ...state.messages,
            { id, role: 'user', text, attachments, createdAt: new Date().toISOString() },
          ],
        })),

      startSending: () => set({ pending: true, failed: null, blockedUntil: null }),

      receiveReply: (reply) =>
        set((state) => ({
          pending: false,
          sessionId: reply.session_id,
          status: reply.status,
          // Un reintento puede devolver la misma respuesta: no se duplica.
          messages: state.messages.some((m) => m.id === reply.reply_id)
            ? state.messages
            : [
                ...state.messages,
                {
                  id: reply.reply_id,
                  role: 'assistant',
                  blocks: reply.blocks,
                  createdAt: reply.created_at,
                },
              ],
        })),

      fail: (failed, blockedUntil) => {
        set({ pending: false, failed, blockedUntil: blockedUntil ?? null })
        // Se desbloquea solo al cumplirse la espera, salvo que otro 429 la haya reemplazado.
        if (blockedUntil)
          setTimeout(
            () => set((s) => (s.blockedUntil === blockedUntil ? { blockedUntil: null } : {})),
            blockedUntil - Date.now(),
          )
      },

      dropSession: () => set({ sessionId: null }),

      hydrate: (history) =>
        set({
          sessionId: history.session_id,
          status: history.status,
          messages: history.messages.map((entry): ChatMessage =>
            entry.direction === 'INBOUND'
              ? {
                  id: entry.message_id,
                  role: 'user',
                  text: entry.text ?? '',
                  createdAt: entry.created_at,
                }
              : {
                  id: entry.message_id,
                  role: 'assistant',
                  blocks: entry.blocks ?? [],
                  createdAt: entry.created_at,
                },
          ),
        }),

      reset: () => set((s) => ({ ...initialState, voiceReplies: s.voiceReplies })),

      startNewChat: () => {
        rotateClientId()
        set((s) => ({ ...initialState, voiceReplies: s.voiceReplies }))
      },
    }),
    {
      name: 'translogix-chat',
      storage: createJSONStorage(() => sessionStorage),
      // `pending`, `failed` y `blockedUntil` son de la petición en curso: no se persisten.
      partialize: ({ sessionId, status, channel, messages, voiceReplies }) => ({
        sessionId,
        status,
        channel,
        messages,
        voiceReplies,
      }),
    },
  ),
)
