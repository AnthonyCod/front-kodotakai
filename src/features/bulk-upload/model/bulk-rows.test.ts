import { describe, expect, it } from 'vitest'
import { BULK_COLUMNS } from './bulk-columns'
import { buildBatch, parseBulkSheet } from './bulk-rows'

const HEADER = BULK_COLUMNS.map((c) => c.header)
const row = (overrides: Partial<Record<string, unknown>> = {}) =>
  BULK_COLUMNS.map((c) => (c.key in overrides ? overrides[c.key] : c.example))

describe('parseBulkSheet', () => {
  it('convierte una fila correcta en envío y completa la ciudad', () => {
    const result = parseBulkSheet([HEADER, row({ origen: 'bogota', requiere_cadena_frio: 'Sí' })])
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const [first] = result.rows
    expect(first?.errors).toEqual({})
    expect(first?.corrected).toEqual(['origen'])
    expect(first?.shipment).toMatchObject({
      referencia_cliente: 'PED-1001',
      origen: 'Bogotá D.C.',
      requiere_cadena_frio: true,
      destinatario: { telefono: '3001234567' },
    })
  })

  it('marca errores por columna y referencias repetidas', () => {
    const result = parseBulkSheet([
      HEADER,
      row(),
      row({ peso_real_kg: 0, mercancia_peligrosa: 'tal vez', destinatario_telefono: '12' }),
    ])
    if (!result.ok) throw new Error(result.error)
    const second = result.rows[1]
    expect(second?.line).toBe(3)
    expect(second?.shipment).toBeUndefined()
    expect(Object.keys(second?.errors ?? {}).sort()).toEqual([
      'destinatario_telefono',
      'mercancia_peligrosa',
      'peso_real_kg',
      'referencia_cliente',
    ])
  })

  it('ignora filas vacías y rechaza archivos sin la plantilla', () => {
    expect(parseBulkSheet([HEADER, [], row()]).ok).toBe(true)
    const wrong = parseBulkSheet([
      ['Nombre', 'Ciudad'],
      ['a', 'b'],
    ])
    expect(wrong).toEqual({ ok: false, error: expect.stringContaining('Faltan columnas') })
    expect(parseBulkSheet([HEADER])).toEqual({ ok: false, error: 'El archivo no tiene envíos.' })
  })

  it('arma el lote solo con las filas válidas', () => {
    const result = parseBulkSheet([
      HEADER,
      row(),
      row({ referencia_cliente: 'PED-2', alto_cm: '' }),
    ])
    if (!result.ok) throw new Error(result.error)
    expect(buildBatch(' LOTE-1 ', result.rows)).toMatchObject({
      referencia_lote: 'LOTE-1',
      envios: [{ referencia_cliente: 'PED-1001' }],
    })
  })

  it('la referencia sigue el patrón del backend (sin espacios)', () => {
    const result = parseBulkSheet([HEADER, row({ referencia_cliente: 'PED 1001' })])
    if (!result.ok) throw new Error(result.error)
    expect(result.rows[0]?.errors.referencia_cliente).toMatch(/sin espacios/)
  })
})
