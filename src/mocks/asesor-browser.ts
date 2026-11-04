import { setupWorker } from 'msw/browser'
import { asesorHandlers } from './asesor-handlers'

/**
 * `VITE_API_MOCKING=asesor`: solo se simulan los endpoints del CRM del asesor, que el backend todavía
 * no tiene (CR-007). Todo lo demás va al backend real.
 */
export const worker = setupWorker(...asesorHandlers)
