import { toPlainText } from './plain-text'

describe('toPlainText', () => {
  it.each([
    [
      'ejemplo real del backend (R7)',
      'Mantener a $-20^\\circ\\text{C}$ o menos.',
      'Mantener a -20°C o menos.',
    ],
    [
      'LaTeX con \\( \\)',
      'Entre \\(2^\\circ\\text{C}\\) y \\(8^\\circ\\text{C}\\)',
      'Entre 2°C y 8°C',
    ],
    [
      'símbolos',
      'Caja de $40 \\times 50$ cm, peso $\\leq 30$ kg',
      'Caja de 40 × 50 cm, peso ≤ 30 kg',
    ],
    [
      'negrita y cursiva',
      'Es **obligatorio** adjuntar la *MSDS*.',
      'Es obligatorio adjuntar la MSDS.',
    ],
    [
      'títulos y viñetas',
      '## Requisitos\n- Envase hermético\n* Doble caja',
      'Requisitos\n• Envase hermético\n• Doble caja',
    ],
    [
      'enlaces y código',
      'Ver [norma](https://x.co) y `NTC 4532`',
      'Ver norma (https://x.co) y NTC 4532',
    ],
    ['HTML', 'Hola <b>cliente</b><script>x</script>', 'Hola clientex'],
    ['precio y fórmula juntos', 'Flete $190.975 a $-20^\\circ\\text{C}$', 'Flete $190.975 a -20°C'],
    ['invisibles y saltos de más', 'A\u200B\uFEFFB\n\n\n\nC', 'AB\n\nC'],
  ])('%s', (_, input, expected) => {
    expect(toPlainText(input)).toBe(expected)
  })

  it('no toca texto normal, guiones bajos en palabras ni precios', () => {
    const text = 'Guía TLX-984021-CO, código FOTOS_DANO, flete $190.975 (seguro $125.000).'
    expect(toPlainText(text)).toBe(text)
  })
})
