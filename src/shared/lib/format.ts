const cop = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

/** Montos del backend: COP enteros. */
export const formatCop = (value: number) => cop.format(value)

/** Fechas ISO con offset de Bogotá. */
export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })

export const formatWait = (seconds: number) =>
  seconds < 60 ? `${seconds} s` : `${Math.round(seconds / 60)} min`
