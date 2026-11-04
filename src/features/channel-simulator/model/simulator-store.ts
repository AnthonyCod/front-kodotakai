import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { RawBlock } from '@/shared/blocks'
import { EMPTY_CASE, type CaseInfo } from './case-info'

export type SimChannel = 'WHATSAPP' | 'PBX'

export interface SimTurn {
  id: string
  role: 'customer' | 'bot'
  text: string
  /** Solo bot: bloques de la respuesta. */
  blocks?: RawBlock[]
  createdAt: string
}

export interface SimConversation {
  id: string
  channel: SimChannel
  label: string
  /** WhatsApp: número del cliente (wa_id). PBX: call_id. */
  externalId: string
  turns: SimTurn[]
  case: CaseInfo
  startedAt: string
  /** PBX: la llamada terminó (colgó o se transfirió). */
  endedAt: string | null
  pending: boolean
  error: string | null
}

interface SimulatorState {
  conversations: SimConversation[]
  selectedId: string | null
  /** PBX: Logi lee en voz alta su respuesta (`speech_text`). */
  voiceEnabled: boolean

  create: (channel: SimChannel) => string
  select: (id: string) => void
  update: (id: string, patch: (c: SimConversation) => Partial<SimConversation>) => void
  endCall: (id: string) => void
  remove: (id: string) => void
  setVoiceEnabled: (on: boolean) => void
}

let customerCount = 0

function randomWaId() {
  return `57300${Math.floor(1_000_000 + Math.random() * 8_999_999)}`
}

export const useSimulatorStore = create<SimulatorState>()(
  persist(
    (set) => ({
      conversations: [],
      selectedId: null,
      voiceEnabled: true,

      create: (channel) => {
        customerCount += 1
        const conversation: SimConversation = {
          id: crypto.randomUUID(),
          channel,
          label:
            channel === 'WHATSAPP'
              ? `Cliente WhatsApp ${customerCount}`
              : `Llamada ${customerCount}`,
          externalId: channel === 'WHATSAPP' ? randomWaId() : `sim-${crypto.randomUUID()}`,
          turns: [],
          case: EMPTY_CASE,
          startedAt: new Date().toISOString(),
          endedAt: null,
          pending: false,
          error: null,
        }
        set((s) => ({
          conversations: [conversation, ...s.conversations],
          selectedId: conversation.id,
        }))
        return conversation.id
      },

      select: (selectedId) => set({ selectedId }),

      update: (id, patch) =>
        set((s) => ({
          conversations: s.conversations.map((c) => (c.id === id ? { ...c, ...patch(c) } : c)),
        })),

      endCall: (id) =>
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === id && !c.endedAt ? { ...c, endedAt: new Date().toISOString() } : c,
          ),
        })),

      remove: (id) =>
        set((s) => ({
          conversations: s.conversations.filter((c) => c.id !== id),
          selectedId: s.selectedId === id ? null : s.selectedId,
        })),

      setVoiceEnabled: (voiceEnabled) => set({ voiceEnabled }),
    }),
    {
      name: 'translogix-simulator',
      storage: createJSONStorage(() => sessionStorage),
      partialize: ({ conversations, selectedId, voiceEnabled }) => ({
        // Un envío a medias no sobrevive a la recarga.
        conversations: conversations.map((c) => ({ ...c, pending: false })),
        selectedId,
        voiceEnabled,
      }),
    },
  ),
)
