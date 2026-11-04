import { z } from 'zod'
import { COVERAGE_TYPES, type TariffCreate, type TariffRoute } from '../api/tariffs-api'

const number = z
  .string()
  .trim()
  .regex(/^\d+([.,]\d+)?$/, 'Escribe un número.')
  .transform((value) => Number(value.replace(',', '.')))
const cop = number.pipe(z.number().int('Sin decimales.'))
const positiveCop = cop.pipe(z.number().positive('Debe ser mayor que 0.'))
const pct = number.pipe(z.number().max(100, 'Máximo 100.'))
const place = z.string().trim().min(1, 'Escribe la ciudad o el departamento.').max(80)

/** Mismos campos y límites que `TarifaRutaCreate` del backend. */
export const tariffFormSchema = z.object({
  codigo_trayecto: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^TLX-[A-Z]{3}-[A-Z]{3}-\d{3}$/, 'Usa el formato TLX-BOG-MED-001.'),
  origen: place,
  departamento_origen: place,
  destino: place,
  departamento_destino: place,
  tipo_cobertura: z.enum(COVERAGE_TYPES),
  tarifa_kg_real_cop: positiveCop,
  tarifa_kg_volumetrico_cop: positiveCop,
  divisor_volumetrico: positiveCop,
  flete_minimo_cop: positiveCop,
  porcentaje_seguro: pct,
  seguro_minimo_cop: cop,
  recargo_cadena_frio_pct: pct,
  recargo_mercancia_peligrosa_cop: cop,
  tiempo_entrega_horas: positiveCop,
  observaciones: z.string().trim().max(500, 'Máximo 500 caracteres.'),
})

export type TariffField = keyof z.input<typeof tariffFormSchema>
export type TariffValues = Record<TariffField, string>
export type TariffErrors = Partial<Record<TariffField, string>>

/** Lo que identifica la ruta: no se edita (se crea otra y se desactiva esta). */
export const IDENTITY_FIELDS: TariffField[] = [
  'codigo_trayecto',
  'origen',
  'departamento_origen',
  'destino',
  'departamento_destino',
]

export const EMPTY_TARIFF: TariffValues = {
  codigo_trayecto: '',
  origen: '',
  departamento_origen: '',
  destino: '',
  departamento_destino: '',
  tipo_cobertura: 'Urbana Principal',
  tarifa_kg_real_cop: '',
  tarifa_kg_volumetrico_cop: '',
  divisor_volumetrico: '4000',
  flete_minimo_cop: '',
  porcentaje_seguro: '1',
  seguro_minimo_cop: '',
  recargo_cadena_frio_pct: '',
  recargo_mercancia_peligrosa_cop: '',
  tiempo_entrega_horas: '',
  observaciones: '',
}

export const toValues = (route: TariffRoute): TariffValues => ({
  codigo_trayecto: route.codigo_trayecto,
  origen: route.origen,
  departamento_origen: route.departamento_origen,
  destino: route.destino,
  departamento_destino: route.departamento_destino,
  tipo_cobertura: route.tipo_cobertura,
  tarifa_kg_real_cop: String(route.tarifa_kg_real_cop),
  tarifa_kg_volumetrico_cop: String(route.tarifa_kg_volumetrico_cop),
  divisor_volumetrico: String(route.divisor_volumetrico),
  flete_minimo_cop: String(route.flete_minimo_cop),
  porcentaje_seguro: String(route.porcentaje_seguro),
  seguro_minimo_cop: String(route.seguro_minimo_cop),
  recargo_cadena_frio_pct: String(route.recargo_cadena_frio_pct),
  recargo_mercancia_peligrosa_cop: String(route.recargo_mercancia_peligrosa_cop),
  tiempo_entrega_horas: String(route.tiempo_entrega_horas),
  observaciones: route.observaciones,
})

export function parseTariffForm(
  values: TariffValues,
): { ok: true; tariff: TariffCreate } | { ok: false; errors: TariffErrors } {
  const result = tariffFormSchema.safeParse(values)
  if (result.success) return { ok: true, tariff: result.data }
  const errors: TariffErrors = {}
  for (const issue of result.error.issues) {
    const field = issue.path[0] as TariffField
    errors[field] ??= issue.message
  }
  return { ok: false, errors }
}

/** Solo lo que cambió respecto a la ruta guardada (`PATCH` parcial). */
export function changedFields(route: TariffRoute, tariff: TariffCreate) {
  return Object.fromEntries(
    Object.entries(tariff).filter(
      ([field, value]) =>
        !IDENTITY_FIELDS.includes(field as TariffField) &&
        route[field as keyof TariffRoute] !== value,
    ),
  )
}
