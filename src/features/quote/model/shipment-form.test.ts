import { describe, expect, it } from 'vitest'
import { parseShipmentForm } from './shipment-form'

const valid = {
  origen: ' Bogotá D.C. ',
  destino: 'Medellín',
  alto_cm: '30',
  ancho_cm: '20',
  largo_cm: '15',
  peso_real_kg: '5',
  valor_declarado_cop: '200000.4',
}

describe('parseShipmentForm', () => {
  it('arma la petición de /cotizar con números y ciudades limpias', () => {
    const result = parseShipmentForm(valid)
    expect(result).toEqual({
      ok: true,
      request: {
        origen: 'Bogotá D.C.',
        destino: 'Medellín',
        alto_cm: 30,
        ancho_cm: 20,
        largo_cm: 15,
        peso_real_kg: 5,
        valor_declarado_cop: 200000,
        requiere_cadena_frio: false,
        mercancia_peligrosa: false,
      },
    })
  })

  it('marca cada campo vacío o fuera de rango', () => {
    const result = parseShipmentForm({ ...valid, origen: '', alto_cm: '', peso_real_kg: '0' })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(Object.keys(result.errors).sort()).toEqual(['alto_cm', 'origen', 'peso_real_kg'])
    expect(result.errors.origen).toBe('Escribe la ciudad de origen.')
  })

  it('no acepta valor declarado negativo', () => {
    const result = parseShipmentForm({ ...valid, valor_declarado_cop: '-1' })
    expect(result.ok).toBe(false)
  })
})
