import captures from '@/mocks/fixtures/envios.json'
import { errorEnvelopeSchema } from '@/shared/api/api-error'
import { shipmentRequestListSchema, shipmentRequestSchema } from '@/features/shipments'
import { tariffListSchema, tariffRouteSchema } from '@/features/tariffs'

// Capturas reales del backend 1.3.0 (usuarios, tarifas y aprobación de envíos).
describe('contrato de tarifas y envíos contra capturas reales', () => {
  it.each([
    ['GET /tarifas', tariffListSchema, captures.tarifas],
    ['GET /admin/tarifas', tariffListSchema, captures.adminTarifas],
    ['PATCH /admin/tarifas/{codigo}', tariffRouteSchema, captures.tarifaEditada],
    ['POST …/solicitar', shipmentRequestSchema, captures.pendiente],
    ['GET /mis-envios', shipmentRequestListSchema, captures.misEnvios],
  ] as const)('%s', (_, schema, capture) => {
    expect(schema.safeParse(capture).success).toBe(true)
  })

  it.each([
    ['sin sesión', captures.noSession, 'NO_AUTENTICADO'],
    ['rol insuficiente', captures.forbidden, 'NO_AUTORIZADO'],
    ['ya solicitada', captures.conflicto, 'CONFLICTO'],
    ['credenciales', captures.credenciales, 'CREDENCIALES_INVALIDAS'],
  ])('error %s', (_, capture, code) => {
    expect(errorEnvelopeSchema.parse(capture).error.code).toBe(code)
  })
})
