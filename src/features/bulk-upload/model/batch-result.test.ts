import { ApiError } from '@/shared/api'
import { BULK_COLUMNS } from './bulk-columns'
import { batchErrorText, itemErrorText, suggestBatchRef, summarizeBatch } from './batch-result'
import { parseBulkSheet } from './bulk-rows'

const HEADER = BULK_COLUMNS.map((c) => c.header)
const row = (reference: string) =>
  BULK_COLUMNS.map((c) => (c.key === 'referencia_cliente' ? reference : c.example))

describe('batch-result', () => {
  it('nombra el campo con la columna de la plantilla', () => {
    expect(itemErrorText({ code: 'VALIDACION', field: 'destinatario.telefono' })).toBe(
      'Teléfono destinatario: Dato inválido.',
    )
    expect(itemErrorText({ code: 'TARIFA_NO_DISPONIBLE', field: null })).toBe(
      'No hay tarifa para esa ruta.',
    )
    expect(itemErrorText({ code: 'OTRO' })).toBe('No se pudo crear (OTRO).')
  })

  it('explica los errores del lote por código y, si no lo conoce, usa el texto del backend', () => {
    const auth = new ApiError('http', '401', { status: 401, code: 'NO_AUTENTICADO' })
    expect(batchErrorText(auth)).toMatch(/API key no es válida/)
    const other = new ApiError('http', '422', { code: 'VALIDACION', userMessage: 'Falta algo.' })
    expect(batchErrorText(other)).toBe('Falta algo.')
  })

  it('cuenta por estado y une cada ítem con su fila del Excel', () => {
    const parsed = parseBulkSheet([HEADER, row('PED-1'), row('PED-2'), row('PED-3')])
    if (!parsed.ok) throw new Error(parsed.error)
    const summary = summarizeBatch(
      [
        { linea: 1, status: 'CREATED', referencia_cliente: 'PED-1', numero_guia: 'TLX-200001-CO' },
        { linea: 2, status: 'REJECTED', errores: [{ code: 'REFERENCIA_DUPLICADA', field: null }] },
        { linea: 3, status: 'PENDING', referencia_cliente: 'PED-3' },
      ],
      parsed.rows,
    )
    expect(summary).toMatchObject({ created: 1, rejected: 1, pending: 1 })
    // Excel: la fila 1 es el encabezado.
    expect(summary.rows.map(({ row }) => row?.line)).toEqual([2, 3, 4])
  })

  it('sugiere una referencia de lote con fecha y hora', () => {
    expect(suggestBatchRef(new Date(2026, 10, 4, 9, 5, 7))).toBe('LOTE-20261104-090507')
  })
})
