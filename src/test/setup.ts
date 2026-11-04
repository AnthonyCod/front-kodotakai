import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { resetMockSession } from '@/mocks/handlers'
import { server } from '@/mocks/node'

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterEach(() => {
  cleanup()
  server.resetHandlers()
  resetMockSession()
})
afterAll(() => server.close())
