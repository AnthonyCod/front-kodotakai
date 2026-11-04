import fixtures from '@/mocks/fixtures/shipment-batches.json'
import { batchResponseSchema } from './batch-api'

describe('contrato de POST /shipment-batches', () => {
  it('acepta la respuesta oficial del backend (1 creado, 2 rechazados)', () => {
    const result = batchResponseSchema.parse(fixtures.response)
    expect(result.resultados.map((item) => item.status)).toEqual([
      'CREATED',
      'REJECTED',
      'REJECTED',
    ])
  })
})
