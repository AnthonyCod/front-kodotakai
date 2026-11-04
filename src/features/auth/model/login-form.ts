import { z } from 'zod'
import type { LoginRequest } from '../api/auth-api'

const loginFormSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'Escribe tu correo.')
    .pipe(z.email('Escribe un correo válido.')),
  password: z.string().min(1, 'Escribe tu contraseña.'),
})

export type LoginErrors = Partial<Record<keyof LoginRequest, string>>

export function parseLoginForm(
  values: LoginRequest,
): { ok: true; request: LoginRequest } | { ok: false; errors: LoginErrors } {
  const result = loginFormSchema.safeParse(values)
  if (result.success) return { ok: true, request: result.data }
  const errors: LoginErrors = {}
  for (const issue of result.error.issues) {
    const key = issue.path[0] as keyof LoginRequest
    errors[key] ??= issue.message
  }
  return { ok: false, errors }
}
