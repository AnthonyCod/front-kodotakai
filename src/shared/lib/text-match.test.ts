import { describe, expect, it } from 'vitest'
import { matchOptions, normalizeText, resolveOption } from './text-match'

const CITIES = ['Bogotá D.C.', 'Medellín', 'Cartagena', 'Cartago', 'Ibagué', 'Santa Marta']

describe('text-match', () => {
  it('ignora tildes y mayúsculas', () => {
    expect(normalizeText(' IBAGUÉ ')).toBe('ibague')
  })

  it('sugiere primero las que empiezan con lo escrito', () => {
    expect(matchOptions(CITIES, 'mar')).toEqual(['Santa Marta'])
    expect(matchOptions(CITIES, 'cart')).toEqual(['Cartagena', 'Cartago'])
    expect(matchOptions(CITIES, '', 2)).toEqual(['Bogotá D.C.', 'Medellín'])
  })

  it('completa solo cuando no hay duda', () => {
    expect(resolveOption(CITIES, 'bogota')).toBe('Bogotá D.C.')
    expect(resolveOption(CITIES, 'MEDELLIN')).toBe('Medellín')
    expect(resolveOption(CITIES, 'cart')).toBeUndefined()
    expect(resolveOption(CITIES, 'bog')).toBeUndefined()
    expect(resolveOption(CITIES, 'Tokio')).toBeUndefined()
  })
})
