import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/node'
import { ApiError } from '@/shared/api'
import { createShipmentBatch, fetchBatchItems } from './batches-api'

const BATCHES = '*/api/v1/shipment-batches'
const envio = {
  referencia_cliente: 'PED-1',
  origen: 'Bogotá D.C.',
  destino: 'Medellín',
  alto_cm: 30,
  ancho_cm: 20,
  largo_cm: 15,
  peso_real_kg: 5,
  valor_declarado_cop: 200000,
  requiere_cadena_frio: false,
  mercancia_peligrosa: false,
  destinatario: { nombre: 'Ana', telefono: '3001234567', direccion: 'Cra 43A # 1-50' },
}

describe('batches-api', () => {
  it('manda la API key como Bearer y la referencia del lote como Idempotency-Key', async () => {
    const seen: Headers[] = []
    server.use(
      http.post(BATCHES, ({ request }) => {
        seen.push(request.headers)
        return HttpResponse.json({ batch_id: 'b-1', status: 'COMPLETED' }, { status: 201 })
      }),
    )
    const result = await createShipmentBatch('tlx_key', {
      referencia_lote: 'LOTE-1',
      envios: [envio],
    })
    expect(result.batch_id).toBe('b-1')
    expect(seen[0]?.get('Authorization')).toBe('Bearer tlx_key')
    expect(seen[0]?.get('Idempotency-Key')).toBe('LOTE-1')
  })

  it('recorre todas las páginas de items con next_cursor', async () => {
    const cursors: (string | null)[] = []
    server.use(
      http.get(`${BATCHES}/:id/items`, ({ request }) => {
        const cursor = new URL(request.url).searchParams.get('cursor')
        cursors.push(cursor)
        const linea = cursor ? 2 : 1
        return HttpResponse.json({
          items: [{ linea, status: 'CREATED', numero_guia: `TLX-20000${linea}-CO`, errores: [] }],
          next_cursor: cursor ? null : 'c2',
        })
      }),
    )
    const items = await fetchBatchItems('tlx_key', 'b-1')
    expect(items.map((item) => item.linea)).toEqual([1, 2])
    expect(cursors).toEqual([null, 'c2'])
  })

  it('traduce el sobre de error (409) a ApiError con su código', async () => {
    server.use(
      http.post(BATCHES, () =>
        HttpResponse.json(
          { error: { code: 'IDEMPOTENCIA_CONFLICTO', message: 'Conflicto.' } },
          { status: 409 },
        ),
      ),
    )
    const error = await createShipmentBatch('tlx_key', {
      referencia_lote: 'LOTE-1',
      envios: [envio],
    }).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).code).toBe('IDEMPOTENCIA_CONFLICTO')
  })
})
