import { z } from 'zod'

const envSchema = z.object({
  VITE_API_URL: z.string().default('/api/v1'),
  VITE_API_MOCKING: z.enum(['true', 'false']).default('false'),
})

const parsed = envSchema.parse(import.meta.env)

export const env = {
  apiUrl: parsed.VITE_API_URL,
  /** Con `true` se levanta MSW y el backend se simula en el navegador. */
  apiMocking: parsed.VITE_API_MOCKING === 'true',
} as const
