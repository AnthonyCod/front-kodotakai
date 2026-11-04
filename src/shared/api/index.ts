import type { components } from './openapi'

export { httpClient, type CallOptions } from './http-client'
export {
  ApiError,
  API_ERROR_MESSAGES,
  apiErrorMessage,
  toApiError,
  type ApiErrorKind,
} from './api-error'

/** Schemas del contrato, generados de `docs/api/openapi.json` con `pnpm api:types`. */
export type ApiSchemas = components['schemas']
