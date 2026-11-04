import { z } from 'zod'

const envSchema = z.object({
  VITE_API_URL: z.string().default('/api/v1'),
  VITE_API_MOCKING: z.enum(['true', 'false', 'asesor']).default('false'),
  VITE_HERE_API_KEY: z.string().default(''),
})

const parsed = envSchema.parse(import.meta.env)

export const env = {
  apiUrl: parsed.VITE_API_URL,
  /** Con `true` se levanta MSW y el backend se simula en el navegador (`asesor`: solo el CRM). */
  apiMocking: parsed.VITE_API_MOCKING === 'true',
  /** Key de HERE Maps (JS). Queda visible en el navegador: se protege con "Trusted domains" en HERE. */
  hereApiKey: parsed.VITE_HERE_API_KEY,
} as const
