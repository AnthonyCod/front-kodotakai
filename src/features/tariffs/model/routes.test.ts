import { describe, expect, it } from 'vitest'
import { CITIES } from '@/features/quote'
import matrix from '../../../../docs/tarifas-trayectos.csv?raw'
import { fleteBase, roadDistanceKm, routeTariff, routesFrom } from './routes'

describe('routeTariff', () => {
  it('usa los valores reales de urbano y trayecto especial', () => {
    expect(routeTariff('Cali', 'Cali')).toMatchObject({
      codigoTrayecto: 'TLX-CAL-CAL-001',
      copPorKg: 2_357,
      fleteMinimoCop: 10_320,
      minimoCubreKg: 4,
    })
    expect(routeTariff('Leticia', 'Bogotá D.C.')).toMatchObject({
      kind: 'especial',
      fleteMinimoCop: 56_884,
    })
  })

  it('acerca Bogotá–Cali al nacional terrestre de referencia', () => {
    expect(roadDistanceKm('Bogotá D.C.', 'Cali')).toBeCloseTo(460, -2)
    const route = routeTariff('Bogotá D.C.', 'Cali')
    expect(Math.abs(route.fleteMinimoCop - 19_556)).toBeLessThan(500)
    expect(Math.abs(route.copPorKg - 3_631)).toBeLessThan(200)
  })

  it('cobra el mayor entre el mínimo y peso × tarifa, como /cotizar', () => {
    const route = routeTariff('Bogotá D.C.', 'Medellín')
    expect(route).toMatchObject({ codigoTrayecto: 'TLX-BOG-MED-001', minimoCubreKg: 5 })
    expect(fleteBase(route, 2)).toBe(route.fleteMinimoCop)
    expect(fleteBase(route, 5)).toBe(route.fleteMinimoCop)
    expect(fleteBase(route, 5.5)).toBe(Math.round(5.5 * route.copPorKg))
    expect(fleteBase(route, 45.5)).toBe(Math.round(45.5 * route.copPorKg))
  })

  it('cobra más a mayor distancia y lista del más cercano al más lejano', () => {
    expect(routeTariff('Bogotá D.C.', 'Riohacha').copPorKg).toBeGreaterThan(
      routeTariff('Bogotá D.C.', 'Tunja').copPorKg,
    )
    const list = routesFrom('Medellín')
    expect(list).toHaveLength(CITIES.length)
    expect(list[0]?.kind).toBe('urbano')
    expect(new Set(list.map((route) => route.codigoTrayecto)).size).toBe(CITIES.length)
  })

  it('coincide con la matriz para el backend', () => {
    const [header, ...rows] = matrix.trim().split('\n')
    expect(header).toBe(
      'codigo_trayecto,origen,destino,tipo,distancia_km,cop_por_kg,flete_minimo_cop,tiempo_entrega_horas',
    )
    expect(rows).toHaveLength(CITIES.length * CITIES.length)
    for (const row of rows) {
      const [codigo, origen, destino, tipo, km, porKg, minimo, horas] = row.split(',')
      const route = routeTariff(origen as never, destino as never)
      expect([
        route.codigoTrayecto,
        route.kind,
        route.distanceKm,
        route.copPorKg,
        route.fleteMinimoCop,
        route.tiempoEntregaHoras,
      ]).toEqual([codigo, tipo, Number(km), Number(porKg), Number(minimo), Number(horas)])
    }
  })
})
