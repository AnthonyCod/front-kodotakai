import { CircleAlert } from 'lucide-react'

/** Mensaje de error debajo de un campo (va con `aria-invalid` en el campo). */
export function FieldError({ children }: { children?: string }) {
  if (!children) return null
  return (
    <span role="alert" className="flex items-start gap-1 text-xs text-destructive">
      <CircleAlert size={13} aria-hidden className="mt-px shrink-0" />
      {children}
    </span>
  )
}
