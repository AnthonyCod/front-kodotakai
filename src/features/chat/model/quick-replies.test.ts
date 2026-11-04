import { resolveQuickReply } from './quick-replies'

describe('resolveQuickReply', () => {
  it('envía el título como texto por defecto', () => {
    expect(resolveQuickReply({ id: 'rastrear', title: 'Rastrear una guía' })).toEqual({
      kind: 'send',
      text: 'Rastrear una guía',
    })
  })

  it('aplica los arreglos de D.6', () => {
    expect(resolveQuickReply({ id: 'novedad', title: 'Reportar una novedad' })).toEqual({
      kind: 'send',
      text: 'Quiero reportar una novedad de mi envío',
    })
    expect(resolveQuickReply({ id: 'otra_guia', title: 'Escribir otra guía' }).kind).toBe(
      'focus_input',
    )
  })
})
