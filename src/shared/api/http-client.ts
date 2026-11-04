import type { z } from 'zod'
import { env } from '@/shared/config/env'
import { ApiError, errorEnvelopeSchema } from './api-error'

const DEFAULT_TIMEOUT_MS = 20_000

interface RequestOptions<T> {
  method: 'GET' | 'POST' | 'PATCH'
  schema: z.ZodType<T>
  body?: unknown
  headers?: Record<string, string>
  signal?: AbortSignal
  timeoutMs?: number
  credentials?: RequestCredentials
}

export interface CallOptions {
  headers?: Record<string, string>
  signal?: AbortSignal
  /** Por defecto 20 s. Más para lo que el backend procesa dentro de la petición (lotes). */
  timeoutMs?: number
  /** `include` en las llamadas con sesión (cookie httpOnly del backend). */
  credentials?: RequestCredentials
}

/**
 * Único punto del frontend que habla con el backend.
 * Toda respuesta se valida con su schema: lo que no está en el contrato no llega a la UI.
 */
async function request<T>(path: string, options: RequestOptions<T>): Promise<T> {
  if (!navigator.onLine) throw new ApiError('offline', 'Sin conexión')

  const timeout = AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS)
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout

  let response: Response
  try {
    // FormData (adjuntos): el navegador pone el Content-Type multipart con su boundary.
    const isForm = options.body instanceof FormData
    response = await fetch(`${env.apiUrl}${path}`, {
      method: options.method,
      headers: {
        ...(options.body === undefined || isForm ? {} : { 'Content-Type': 'application/json' }),
        ...options.headers,
      },
      body: isForm
        ? (options.body as FormData)
        : options.body === undefined
          ? undefined
          : JSON.stringify(options.body),
      credentials: options.credentials,
      signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      throw new ApiError('timeout', 'Tiempo de espera agotado')
    }
    throw new ApiError('offline', 'No se pudo contactar al servidor')
  }

  const json: unknown = await response.json().catch(() => undefined)

  if (!response.ok) throw httpError(response.status, json)

  const result = options.schema.safeParse(json)
  if (!result.success) {
    if (import.meta.env.DEV)
      console.error('[http-client] Respuesta fuera de contrato', path, result.error)
    throw new ApiError('invalid_response', 'Respuesta fuera de contrato')
  }
  return result.data
}

/** Traduce el sobre `{error:{code,message,details,request_id}}` a `ApiError`. */
function httpError(status: number, json: unknown): ApiError {
  const envelope = errorEnvelopeSchema.safeParse(json)
  if (!envelope.success) return new ApiError('http', `HTTP ${status}`, { status })

  const { code, message, details, request_id } = envelope.data.error
  const retryAfter = details?.['reintentar_en_segundos']
  return new ApiError(status === 429 ? 'rate_limited' : 'http', `${status} ${code}`, {
    status,
    code,
    userMessage: message,
    requestId: request_id ?? undefined,
    retryAfterSeconds: typeof retryAfter === 'number' ? retryAfter : undefined,
  })
}

export const httpClient = {
  get: <T>(path: string, schema: z.ZodType<T>, options: CallOptions = {}) =>
    request(path, { method: 'GET', schema, ...options }),
  post: <T>(path: string, body: unknown, schema: z.ZodType<T>, options: CallOptions = {}) =>
    request(path, { method: 'POST', body, schema, ...options }),
  patch: <T>(path: string, body: unknown, schema: z.ZodType<T>, options: CallOptions = {}) =>
    request(path, { method: 'PATCH', body, schema, ...options }),
}
