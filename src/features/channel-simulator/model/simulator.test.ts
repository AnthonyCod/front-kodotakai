import { act, renderHook } from '@testing-library/react'
import { EMPTY_CASE, nextCase } from './case-info'
import { useSimulatorStore } from './simulator-store'
import { useSimulatorSend } from './use-simulator-send'

vi.mock('@/shared/lib/speech-synthesis', () => ({ speak: vi.fn(), stopSpeaking: vi.fn() }))

beforeEach(() => {
  sessionStorage.clear()
  useSimulatorStore.setState({ conversations: [], selectedId: null, voiceEnabled: true })
})

describe('nextCase', () => {
  it('toma intención, servicios y la guía usada como evidencia', () => {
    const info = nextCase(EMPTY_CASE, 'hola', {
      session_id: 's',
      status: 'AWAITING_USER',
      blocks: [],
      meta: { intent: 'TRACKING', services_called: ['tms'], evidence_ids: ['TLX-984021-CO'] },
    })
    expect(info).toMatchObject({ intent: 'TRACKING', services: ['tms'], guia: 'TLX-984021-CO' })
  })
})

describe('simulador', () => {
  it('WhatsApp: agrega el turno del cliente y la respuesta de Logi', async () => {
    const id = useSimulatorStore.getState().create('WHATSAPP')
    const { result } = renderHook(() => useSimulatorSend())
    await act(() => result.current(id, '¿Dónde está mi guía TLX-984021-CO?'))

    const conversation = useSimulatorStore.getState().conversations[0]
    expect(conversation?.turns.map((t) => t.role)).toEqual(['customer', 'bot'])
    expect(conversation?.case.intent).toBe('TRACKING')
    expect(conversation?.case.guia).toBe('TLX-984021-CO')
  })

  it('llamada: al pedir un asesor se transfiere y la llamada termina', async () => {
    const id = useSimulatorStore.getState().create('PBX')
    const { result } = renderHook(() => useSimulatorSend())
    await act(() => result.current(id, 'Quiero hablar con un asesor'))

    const conversation = useSimulatorStore.getState().conversations[0]
    expect(conversation?.case.transferred).toBe(true)
    expect(conversation?.endedAt).not.toBeNull()
    // Una llamada terminada no acepta más turnos.
    await act(() => result.current(id, 'Hola'))
    expect(useSimulatorStore.getState().conversations[0]?.turns).toHaveLength(2)
  })
})
