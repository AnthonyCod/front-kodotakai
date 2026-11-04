import { GLASS_TINT } from './glass'

// Clases comunes de los formularios de Consultas (rastrear, cotizar, PQRS).

/** Campo de texto. Con error (`aria-invalid` o validación nativa tras tocarlo) se ve en rojo. */
export const FIELD =
  'w-full rounded-xl border bg-background px-3 py-2 text-base outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 aria-invalid:border-destructive aria-invalid:bg-destructive/5 aria-invalid:focus:ring-destructive/20 user-invalid:border-destructive user-invalid:bg-destructive/5 user-invalid:focus:ring-destructive/20'

export const FIELD_LABEL = 'block text-xs font-medium text-muted-foreground'

/** Acción principal de un formulario: vidrio azul Logi en píldora (como todos los botones). */
export const PRIMARY_BUTTON = `${GLASS_TINT} rounded-full px-5 py-2.5 text-sm font-medium`

/** Lo que cada consulta reporta al historial de la sesión. */
export interface ResultSummary {
  reference: string
  summary: string
  alert?: boolean
  /** Identificador completo (p. ej. el que se copia) para encontrarlo en el buscador. */
  searchKey?: string
}
