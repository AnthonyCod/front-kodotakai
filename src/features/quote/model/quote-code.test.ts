import { quoteCode } from './quote-code'

it('código corto de cotización a partir del UUID del backend', () => {
  expect(quoteCode('3f2a9c1e-7b4d-4e8a-9c1f-2d3e4f5a6b7c')).toBe('COT-3F2A9C1E')
})
