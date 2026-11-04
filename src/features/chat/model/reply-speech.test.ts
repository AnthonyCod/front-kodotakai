import { replyToSpeech } from './reply-speech'

describe('replyToSpeech', () => {
  it('lee textos y aviso de asesor, limpia LaTeX y omite tarjetas', () => {
    expect(
      replyToSpeech([
        { type: 'TEXT', text: 'Debe viajar a $-20^\\circ\\text{C}$.' },
        { type: 'TRACKING_CARD', numero_guia: 'TLX-984021-CO' },
        { type: 'HANDOFF_NOTICE', mensaje_cliente: 'Un asesor te atenderá.' },
      ]),
    ).toBe('Debe viajar a -20°C. Un asesor te atenderá.')
  })
})
