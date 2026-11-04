import { useCallback } from 'react'
import { apiErrorMessage, toApiError } from '@/shared/api'
import { speak } from '@/shared/lib/speech-synthesis'
import { toPlainText } from '@/shared/lib/plain-text'
import { simulatePbx, simulateWhatsApp } from '../api/simulator-api'
import { nextCase } from './case-info'
import { useSimulatorStore, type SimTurn } from './simulator-store'

const turn = (role: SimTurn['role'], text: string, blocks?: SimTurn['blocks']): SimTurn => ({
  id: crypto.randomUUID(),
  role,
  text,
  blocks,
  createdAt: new Date().toISOString(),
})

/** Envía un turno a la conversación simulada (WhatsApp o llamada) y actualiza su ficha. */
export function useSimulatorSend() {
  return useCallback(async (conversationId: string, rawText: string) => {
    const text = rawText.trim()
    const { conversations, update, endCall } = useSimulatorStore.getState()
    const conversation = conversations.find((c) => c.id === conversationId)
    if (!text || !conversation || conversation.pending || conversation.endedAt) return

    update(conversationId, (c) => ({
      turns: [...c.turns, turn('customer', text)],
      pending: true,
      error: null,
    }))

    try {
      if (conversation.channel === 'WHATSAPP') {
        const { results } = await simulateWhatsApp(text, conversation.externalId)
        update(conversationId, (c) => ({
          pending: false,
          turns: [
            ...c.turns,
            ...results.map((r) => turn('bot', toPlainText(r.outbound.plain_text), r.reply.blocks)),
          ],
          case: results.reduce((acc, r) => nextCase(acc, text, r.reply), c.case),
        }))
        return
      }

      // PBX: cada envío es un turno de la llamada; turn_index = turnos del cliente previos.
      const turnIndex = conversation.turns.filter((t) => t.role === 'customer').length
      const result = await simulatePbx(conversation.externalId, turnIndex, text)
      const speech = toPlainText(result.speech_text)
      update(conversationId, (c) => ({
        pending: false,
        turns: [...c.turns, turn('bot', speech, result.reply.blocks)],
        case: nextCase(c.case, text, result.reply, result.transfer),
      }))
      if (useSimulatorStore.getState().voiceEnabled) speak(speech)
      if (result.transfer) endCall(conversationId)
    } catch (error) {
      update(conversationId, () => ({
        pending: false,
        error: apiErrorMessage(toApiError(error)),
      }))
    }
  }, [])
}
