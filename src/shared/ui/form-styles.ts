// Clases comunes de los formularios de Consultas (rastrear, cotizar, PQRS).

/** Campo de texto. Con error (`aria-invalid` o validación nativa tras tocarlo) se ve en rojo. */
export const FIELD =
  'w-full rounded-xl border bg-background px-3 py-2 text-base outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 aria-invalid:border-destructive aria-invalid:bg-destructive/5 aria-invalid:focus:ring-destructive/20 user-invalid:border-destructive user-invalid:bg-destructive/5 user-invalid:focus:ring-destructive/20'

export const FIELD_LABEL = 'block text-xs font-medium text-muted-foreground'

export const PRIMARY_BUTTON =
  'rounded-xl bg-brand-deep px-4 py-2.5 text-sm font-medium text-brand-foreground transition hover:bg-brand-deep/90 active:scale-[0.98] disabled:opacity-50'

/** Lo que cada consulta reporta al historial de la sesión. */
export interface ResultSummary {
  reference: string
  summary: string
  alert?: boolean
  /** Identificador completo (p. ej. el que se copia) para encontrarlo en el buscador. */
  searchKey?: string
}
