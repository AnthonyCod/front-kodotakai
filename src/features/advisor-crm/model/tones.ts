import type { Tone } from '../api/crm-api'

/** Color de texto por tono (tokens del tema). */
export const TONE_TEXT: Record<Tone | 'primary', string> = {
  neutral: 'text-muted-foreground',
  primary: 'text-primary',
  success: 'text-success',
  warning: 'text-warning-strong',
  danger: 'text-destructive',
}

/** Montos como en el diseño: `$340.000 COP`. */
export const copLabel = (value: number, unit = true) =>
  `$${Math.round(value).toLocaleString('es-CO')}${unit ? ' COP' : ''}`
