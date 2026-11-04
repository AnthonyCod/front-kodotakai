import { act, renderHook } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/node'
import { useChatStore } from './chat-store'
import { useSendMessage } from './use-send-message'

const CHAT_URL = '*/api/v1/chat/messages'

async function send(text: string) {
  const { result } = renderHook(() => useSendMessage())
  await act(() => result.current.send(text))
  return result
}

beforeEach(() => {
  sessionStorage.clear()
  useChatStore.getState().reset()
})

describe('useSendMessage', () => {
  it('guarda la respuesta y el session_id que devuelve el backend', async () => {
    await send('Hola')
    const state = useChatStore.getState()
    expect(state.sessionId).toBeTruthy()
    expect(state.messages.map((m) => m.role)).toEqual(['user', 'assistant'])
  })

  it('con sesión ajena (404 NO_ENCONTRADO) la descarta y reenvía el mismo message_id', async () => {
    useChatStore.setState({ sessionId: 'b6a1f0e4-0000-4000-8000-000000000000' })
    const bodies: { session_id?: string | null; message_id: string }[] = []
    server.events.on('request:start', async ({ request }) => {
      if (request.method === 'POST') bodies.push(await request.clone().json())
    })

    await send('Hola')
    server.events.removeAllListeners()

    expect(bodies).toHaveLength(2)
    expect(bodies[1]?.session_id).toBeNull()
    expect(bodies[1]?.message_id).toBe(bodies[0]?.message_id)
    expect(useChatStore.getState().failed).toBeNull()
  })

  it('al reintentar reusa el message_id y no repite el mensaje del usuario', async () => {
    server.use(http.post(CHAT_URL, () => HttpResponse.error(), { once: true }))
    const result = await send('Hola')
    const failed = useChatStore.getState().failed
    expect(failed?.errorKind).toBe('offline')

    const ids: string[] = []
    server.events.on('request:start', async ({ request }) => {
      ids.push((await request.clone().json()).message_id)
    })
    await act(() => result.current.retry())
    server.events.removeAllListeners()

    expect(ids).toEqual([failed?.messageId])
    expect(useChatStore.getState().messages.filter((m) => m.role === 'user')).toHaveLength(1)
  })

  it('con 429 bloquea el envío los segundos que indica el backend', async () => {
    server.use(
      http.post(CHAT_URL, () =>
        HttpResponse.json(
          {
            error: {
              code: 'LIMITE_DE_TASA',
              message: 'Recibimos demasiadas solicitudes seguidas.',
              details: { reintentar_en_segundos: 42 },
              request_id: 'r1',
            },
          },
          { status: 429 },
        ),
      ),
    )
    await send('Hola')
    const { failed, blockedUntil } = useChatStore.getState()
    expect(failed?.errorKind).toBe('rate_limited')
    expect(failed?.errorMessage).toBe('Recibimos demasiadas solicitudes seguidas.')
    expect(blockedUntil! - Date.now()).toBeGreaterThan(40_000)
  })
})

describe('nuevo chat', () => {
  it('no reutiliza la sesión anterior: cambia de client_id y no envía session_id', async () => {
    const bodies: { client_id: string; session_id?: string | null }[] = []
    server.events.on('request:start', async ({ request }) => {
      bodies.push(await request.clone().json())
    })

    await send('Quiero hablar con un asesor')
    useChatStore.getState().startNewChat()
    expect(useChatStore.getState().status).toBe('AWAITING_USER')
    await send('Hola')
    server.events.removeAllListeners()

    expect(bodies[1]?.session_id).toBeNull()
    expect(bodies[1]?.client_id).not.toBe(bodies[0]?.client_id)
    expect(useChatStore.getState().status).toBe('AWAITING_USER')
  })
})
