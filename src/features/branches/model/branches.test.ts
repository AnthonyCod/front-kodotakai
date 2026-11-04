import { BRANCHES, filterBranches, wrapIndex } from './branches'

describe('wrapIndex', () => {
  it('avanza y retrocede dentro de la lista', () => {
    expect(wrapIndex(1, 5)).toBe(1)
    expect(wrapIndex(3, 5)).toBe(3)
  })

  it('después de la última vuelve a la primera', () => {
    expect(wrapIndex(5, 5)).toBe(0)
  })

  it('antes de la primera va a la última', () => {
    expect(wrapIndex(-1, 5)).toBe(4)
  })

  it('no falla con la lista vacía', () => {
    expect(wrapIndex(3, 0)).toBe(0)
  })
})

describe('BRANCHES', () => {
  it('tienen id único y quedan en Sincelejo', () => {
    expect(new Set(BRANCHES.map((b) => b.id)).size).toBe(BRANCHES.length)
    for (const { position } of BRANCHES) {
      expect(position.lat).toBeGreaterThan(9.2)
      expect(position.lat).toBeLessThan(9.4)
      expect(position.lng).toBeGreaterThan(-75.5)
      expect(position.lng).toBeLessThan(-75.3)
    }
  })
})

describe('filterBranches', () => {
  it('busca por nombre, dirección o servicio sin importar tildes', () => {
    expect(filterBranches(BRANCHES, 'guacari').map(({ branch }) => branch.id)).toEqual(['guacari'])
    expect(filterBranches(BRANCHES, 'FRIO').map(({ branch }) => branch.id)).toEqual(['via-tolu'])
  })

  it('conserva el índice original y sin texto devuelve todas', () => {
    expect(filterBranches(BRANCHES, 'terminal')[0]?.index).toBe(4)
    expect(filterBranches(BRANCHES, '  ')).toHaveLength(BRANCHES.length)
  })
})
