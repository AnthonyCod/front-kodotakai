import fixtures from '@/mocks/fixtures/envios.json'
import { tariffListSchema } from '../api/tariffs-api'
import { fleteBase, minimoCubreKg, origins, range } from './tariffs'

const routes = tariffListSchema.parse(fixtures.tarifas).items
const bogMed = routes.find((route) => route.codigo_trayecto === 'TLX-BOG-MED-001')!

describe('tarifas en formato del backend', () => {
  it('lee las 25 rutas de la matriz', () => {
    expect(routes).toHaveLength(25)
    expect(origins(routes)[0]).toBe('Barranquilla')
  })

  it('el mínimo cubre hasta el peso donde peso × tarifa lo alcanza', () => {
    const kg = minimoCubreKg(bogMed)
    expect(kg * bogMed.tarifa_kg_real_cop).toBeLessThanOrEqual(bogMed.flete_minimo_cop)
    expect((kg + 0.5) * bogMed.tarifa_kg_real_cop).toBeGreaterThan(bogMed.flete_minimo_cop)
  })

  it('flete base = máx(mínimo, kg × tarifa), como /cotizar', () => {
    expect(fleteBase(bogMed, 1)).toBe(bogMed.flete_minimo_cop)
    expect(fleteBase(bogMed, 20)).toBe(20 * bogMed.tarifa_kg_real_cop)
  })

  it('resume un valor fijo o un rango', () => {
    expect(range([25, 25], String)).toBe('25')
    expect(range([30, 20, 25], String)).toBe('20 a 30')
  })
})
