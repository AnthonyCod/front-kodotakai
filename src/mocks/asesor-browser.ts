import { setupWorker } from 'msw/browser'
import { asesorHandlers } from './asesor-handlers'
import { authHandlers } from './handlers'

/**
 * `VITE_API_MOCKING=asesor`: solo se simulan el login y el CRM del asesor, que el backend todavía no
 * tiene (CR-007). Todo lo demás va al backend real.
 */
export const worker = setupWorker(...authHandlers, ...asesorHandlers)
