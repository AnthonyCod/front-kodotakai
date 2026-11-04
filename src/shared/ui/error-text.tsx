import { CircleAlert } from 'lucide-react'
import { apiErrorMessage, toApiError } from '@/shared/api'

/** Error de una consulta con el texto del backend. La referencia (`request_id`) solo en fallos 5xx, para soporte. */
export function ErrorText({ error }: { error: unknown }) {
  if (!error) return null
  const apiError = toApiError(error)
  return (
    <div
      className="flex gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
      role="alert"
    >
      <CircleAlert size={16} aria-hidden className="mt-0.5 shrink-0" />
      <p>
        {apiErrorMessage(apiError)}
        {apiError.requestId && (apiError.status ?? 0) >= 500 && (
          <span className="block text-xs opacity-80">Ref: {apiError.requestId}</span>
        )}
      </p>
    </div>
  )
}
