import { apiErrorMessage, toApiError } from '@/shared/api'

/** Error de una consulta con el texto del backend. La referencia (`request_id`) solo en fallos 5xx, para soporte. */
export function ErrorText({ error }: { error: unknown }) {
  if (!error) return null
  const apiError = toApiError(error)
  return (
    <p className="rounded border border-dashed p-2 text-sm" role="alert">
      {apiErrorMessage(apiError)}
      {apiError.requestId && (apiError.status ?? 0) >= 500 && (
        <span className="block text-xs">Ref: {apiError.requestId}</span>
      )}
    </p>
  )
}
