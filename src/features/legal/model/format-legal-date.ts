const DATE = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })

/** "2026-11-04" → "4 de noviembre de 2026" (sin desfase de zona horaria). */
export const formatLegalDate = (isoDate: string) => {
  const [year, month, day] = isoDate.split('-').map(Number)
  return DATE.format(new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1))
}
