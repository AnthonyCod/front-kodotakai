import { z } from 'zod'
import { WITH_SESSION } from '@/features/auth'
import { httpClient, type ApiSchemas } from '@/shared/api'

/** Matriz de tarifas del backend (`GET /tarifas`): las mismas rutas con las que cotiza `/cotizar`. */
export const COVERAGE_TYPES = [
  'Urbana Principal',
  'Frontera',
  'Zona ZOMAC',
  'Trayecto Especial',
] as const

const cop = z.number().int().nonnegative()

export const tariffRouteSchema = z.object({
  codigo_trayecto: z.string(),
  origen: z.string(),
  departamento_origen: z.string(),
  destino: z.string(),
  departamento_destino: z.string(),
  tipo_cobertura: z.enum(COVERAGE_TYPES),
  tarifa_kg_real_cop: cop,
  tarifa_kg_volumetrico_cop: cop,
  divisor_volumetrico: z.number().int().positive(),
  flete_minimo_cop: cop,
  porcentaje_seguro: z.number().nonnegative(),
  seguro_minimo_cop: cop,
  recargo_cadena_frio_pct: z.number().nonnegative(),
  recargo_mercancia_peligrosa_cop: cop,
  tiempo_entrega_horas: z.number().int().positive(),
  observaciones: z.string(),
  activo: z.boolean(),
  actualizado_en: z.string(),
})
export type TariffRoute = z.infer<typeof tariffRouteSchema>

export const tariffListSchema = z.object({ items: z.array(tariffRouteSchema) })

export type TariffCreate = ApiSchemas['TarifaRutaCreate']
export type TariffUpdate = ApiSchemas['TarifaRutaUpdate']

export const fetchTariffs = () => httpClient.get('/tarifas', tariffListSchema)

/** Solo ADMIN: incluye las rutas inactivas. */
export const fetchAllTariffs = () =>
  httpClient.get('/admin/tarifas', tariffListSchema, WITH_SESSION)

export const createTariff = (body: TariffCreate) =>
  httpClient.post('/admin/tarifas', body, tariffRouteSchema, WITH_SESSION)

export const updateTariff = (codigo: string, body: TariffUpdate) =>
  httpClient.patch(
    `/admin/tarifas/${encodeURIComponent(codigo)}`,
    body,
    tariffRouteSchema,
    WITH_SESSION,
  )
