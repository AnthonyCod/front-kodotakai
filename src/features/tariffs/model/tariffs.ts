import type { TariffRoute } from '../api/tariffs-api'

export const TARIFFS_QUERY_KEY = ['tarifas'] as const
export const ADMIN_TARIFFS_QUERY_KEY = ['tarifas', 'admin'] as const

/** Kg que paga el flete mínimo: hasta ahí, peso × tarifa por kg da menos que el mínimo. */
export const minimoCubreKg = (route: TariffRoute) =>
  Math.floor((route.flete_minimo_cop / route.tarifa_kg_real_cop) * 2) / 2

/** Flete base como `/cotizar`: máx(flete mínimo, peso facturable × tarifa por kg). */
export const fleteBase = (route: TariffRoute, kg: number) =>
  Math.max(route.flete_minimo_cop, Math.round(kg * route.tarifa_kg_real_cop))

export const origins = (routes: TariffRoute[]) =>
  [...new Set(routes.map((route) => route.origen))].sort((a, b) => a.localeCompare(b, 'es'))

/** "25 %" o "20 a 30 %" según cómo varíe entre rutas. */
export function range(values: number[], format: (value: number) => string) {
  if (values.length === 0) return ''
  const min = Math.min(...values)
  const max = Math.max(...values)
  return min === max ? format(min) : `${format(min)} a ${format(max)}`
}

export const percent = (value: number) => `${value.toLocaleString('es-CO')} %`

/** Condiciones legales que acompañan la tarifa. */
export const TARIFF_TERMS = [
  'Se cobra el mayor entre el peso real y el peso volumétrico. Cada trayecto tiene un flete mínimo: si el peso por la tarifa por kg da menos, se cobra el mínimo.',
  'El seguro es un porcentaje del valor declarado, con un mínimo por trayecto. Declara el valor real: de él depende la indemnización.',
  'Por pérdida, saqueo o avería, la indemnización es de 5 veces la tarifa pagada más el valor asegurado (Ley 1369 de 2009, art. 25).',
  'El valor declarado máximo por envío es de 4 salarios mínimos. Por encima se necesita póliza especial.',
]
