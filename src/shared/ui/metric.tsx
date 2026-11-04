import type { ReactNode } from 'react'
import { cn } from 'cn'

/** Dato con etiqueta pequeña arriba y valor grande abajo (estilo tablero). */
export function Metric({
  label,
  value,
  hint,
  className,
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('min-w-0 space-y-1', className)}>
      <p className="text-xs text-muted-foreground sm:text-sm">{label}</p>
      <p className="text-lg leading-tight font-semibold break-words sm:text-xl">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

/** Hueco del resultado antes de consultar. */
export function EmptyResult({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-40 place-items-center rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
      {children}
    </div>
  )
}
