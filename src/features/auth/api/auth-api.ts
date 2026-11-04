import { z } from 'zod'
import { bearer, getAccess, httpClient, setAccess, type CallOptions } from '@/shared/api'

/**
 * Dos formas de sesión, mientras el backend no tenga login con contraseña (CR-007):
 * - Token personal (backend 1.7.0): en "contraseña" se pega el token (`tlxs_…` del personal,
 *   `tlx_…` de un cliente B2B). `GET /auth/me` con `Authorization: Bearer` devuelve los roles.
 * - Login simulado con cookie httpOnly (solo MSW): las cuentas de prueba de `users.json`.
 */
/** `ASESOR` = rol `REVIEWER` del backend (asesor humano y revisor de casos). */
export const ROLES = ['USUARIO', 'ENCARGADO', 'ADMIN', 'ASESOR'] as const
export type Role = (typeof ROLES)[number]

export const sessionUserSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  email: z.string(),
  rol: z.enum(ROLES),
  /** Solo con token personal: id del usuario interno y roles tal como los da el backend. */
  staff_user_id: z.string().nullable().optional(),
  roles: z.array(z.string()).optional(),
})
export type SessionUser = z.infer<typeof sessionUserSchema>

/** `GET /auth/me` con token (contrato 1.7.0, CR-009). */
const whoAmISchema = z.object({
  roles: z.array(z.enum(['ADMIN', 'CLIENT', 'REVIEWER'])),
  metodo: z.string(),
  staff_user_id: z.string().nullable(),
  client_id: z.string().nullable(),
  scopes: z.array(z.string()),
})
type WhoAmI = z.infer<typeof whoAmISchema>

/** Las llamadas con sesión envían la cookie del backend. */
export const WITH_SESSION: CallOptions = { credentials: 'include' }

export interface LoginRequest {
  email: string
  password: string
}

/** Tokens del backend: `tlxs_` (personal) o `tlx_` (cliente B2B). */
export const isAccessToken = (value: string) => /^tlxs?_[A-Za-z0-9]+_\S+$/.test(value.trim())

/** «admin.demo@translogix.co» → «Admin Demo». `/auth/me` no trae el nombre. */
const nameFromEmail = (email: string) =>
  email
    .split('@')[0]!
    .split(/[._-]+/)
    .filter(Boolean)
    .map((word) => word[0]!.toUpperCase() + word.slice(1))
    .join(' ')

function toSessionUser(who: WhoAmI, email: string): SessionUser {
  const rol: Role = who.roles.includes('ADMIN')
    ? 'ADMIN'
    : who.roles.includes('REVIEWER')
      ? 'ASESOR'
      : 'USUARIO'
  return {
    id: who.staff_user_id ?? who.client_id ?? email,
    nombre: nameFromEmail(email),
    email,
    rol,
    staff_user_id: who.staff_user_id,
    roles: who.roles,
  }
}

const whoAmI = (token: string, signal?: AbortSignal) =>
  httpClient.get('/auth/me', whoAmISchema, { ...bearer(token), signal })

/** Con token: lo valida contra `/auth/me` y solo entonces lo guarda. Sin token: login simulado. */
export async function login(body: LoginRequest): Promise<SessionUser> {
  if (!isAccessToken(body.password))
    return httpClient.post('/auth/login', body, sessionUserSchema, WITH_SESSION)
  const token = body.password.trim()
  const user = toSessionUser(await whoAmI(token), body.email)
  setAccess({ token, email: body.email })
  return user
}

/** Corto: si el backend tarda, la app sigue como sin sesión en vez de quedarse cargando. */
export async function fetchSessionUser(): Promise<SessionUser> {
  const signal = AbortSignal.timeout(5_000)
  const access = getAccess()
  if (access) return toSessionUser(await whoAmI(access.token, signal), access.email)
  return httpClient.get('/auth/me', sessionUserSchema, { ...WITH_SESSION, signal })
}

/** El token no tiene logout en el backend: basta con olvidarlo en este dispositivo. */
export async function logout() {
  if (getAccess()) return setAccess(null)
  await httpClient.post('/auth/logout', undefined, z.unknown(), WITH_SESSION)
}

/** Token vencido o revocado (401 en una ruta protegida): se olvida y se vuelve al login. */
export const forgetAccess = () => setAccess(null)
