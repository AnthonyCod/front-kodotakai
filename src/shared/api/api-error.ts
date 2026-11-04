import { z } from 'zod'

export type ApiErrorKind = 'offline' | 'timeout' | 'http' | 'rate_limited' | 'invalid_response'

/** Sobre único de errores del backend (FRONTEND_HANDOFF §G). */
export const errorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.string(), z.unknown()).nullish(),
    request_id: z.string().nullish(),
  }),
})

interface ApiErrorInit {
  status?: number
  /** `error.code` del backend: estable, se programa contra él (p. ej. `NO_ENCONTRADO`). */
  code?: string
  /** `error.message` del backend: ya viene redactado para el usuario final. */
  userMessage?: string
  /** Para soporte (500): se puede mostrar al usuario. */
  requestId?: string
  /** 429: segundos a esperar (`details.reintentar_en_segundos`; no hay `Retry-After`). */
  retryAfterSeconds?: number
}

export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly status: number | undefined
  readonly code: string | undefined
  readonly userMessage: string | undefined
  readonly requestId: string | undefined
  readonly retryAfterSeconds: number | undefined

  constructor(kind: ApiErrorKind, message: string, init: ApiErrorInit = {}) {
    super(message)
    this.name = 'ApiError'
    this.kind = kind
    this.status = init.status
    this.code = init.code
    this.userMessage = init.userMessage
    this.requestId = init.requestId
    this.retryAfterSeconds = init.retryAfterSeconds
  }
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error
  return new ApiError('http', error instanceof Error ? error.message : 'Error desconocido')
}

/** Texto para el usuario: el del backend si lo trae; si no, uno genérico por tipo. */
export function apiErrorMessage(error: ApiError): string {
  return error.userMessage ?? API_ERROR_MESSAGES[error.kind]
}

/** Mensajes para el usuario final: claros y sin jerga técnica. */
export const API_ERROR_MESSAGES: Record<ApiErrorKind, string> = {
  offline: 'No tienes conexión a internet. Revisa tu conexión e inténtalo de nuevo.',
  timeout: 'El servicio está tardando más de lo normal. Inténtalo de nuevo en un momento.',
  http: 'El servicio no está respondiendo en este momento. Inténtalo de nuevo en un momento.',
  rate_limited: 'Recibimos demasiados mensajes seguidos. Espera un momento e intenta de nuevo.',
  invalid_response: 'Recibimos una respuesta que no pudimos mostrar. Inténtalo de nuevo.',
}
