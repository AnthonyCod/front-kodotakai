import { z } from 'zod'
import { httpClient, type CallOptions } from '@/shared/api'

/**
 * Login con correo y contraseña (backend 1.3.0, CR-001). La sesión va en una cookie httpOnly,
 * así que el front nunca guarda tokens.
 */
export const ROLES = ['USUARIO', 'ENCARGADO', 'ADMIN'] as const
export type Role = (typeof ROLES)[number]

export const sessionUserSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  email: z.string(),
  rol: z.enum(ROLES),
})
export type SessionUser = z.infer<typeof sessionUserSchema>

/** Las llamadas con sesión envían la cookie del backend. */
export const WITH_SESSION: CallOptions = { credentials: 'include' }

export interface LoginRequest {
  email: string
  password: string
}

export const login = (body: LoginRequest) =>
  httpClient.post('/auth/login', body, sessionUserSchema, WITH_SESSION)

/** Corto: si el backend tarda, la app sigue como sin sesión en vez de quedarse cargando. */
export const fetchSessionUser = () =>
  httpClient.get('/auth/me', sessionUserSchema, {
    ...WITH_SESSION,
    signal: AbortSignal.timeout(5_000),
  })

export const logout = () => httpClient.post('/auth/logout', undefined, z.unknown(), WITH_SESSION)
