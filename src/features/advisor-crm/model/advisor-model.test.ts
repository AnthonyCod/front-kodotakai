import { phoneDigits, quoteMessage, telLink, whatsappLink } from './contact'
import { confidenceLabel, isLockedStage, shortStage } from './funnels'
import { formatAgo, slaRemaining } from './time'
import { copLabel } from './tones'

const NOW = Date.parse('2026-11-04T10:00:00-05:00')
const plus = (seconds: number) => new Date(NOW + seconds * 1000).toISOString()

describe('slaRemaining', () => {
  it('muestra mm:ss por debajo de una hora y marca crítico bajo 15 min', () => {
    expect(slaRemaining(plus(4 * 60 + 12), NOW)).toEqual({
      text: '04:12',
      expired: false,
      critical: true,
    })
    expect(slaRemaining(plus(25 * 60 + 10), NOW)).toEqual({
      text: '25:10',
      expired: false,
      critical: false,
    })
  })

  it('muestra hh:mm h desde una hora y vencido al pasar el plazo', () => {
    expect(slaRemaining(plus(95 * 60), NOW).text).toBe('01:35 h')
    expect(slaRemaining(plus(-1), NOW)).toEqual({ text: '00:00', expired: true, critical: true })
  })
})

describe('formatAgo', () => {
  it('redacta minutos y horas como en el diseño', () => {
    expect(formatAgo(plus(-8 * 60), NOW)).toBe('Hace 8 min')
    expect(formatAgo(plus(-72 * 60), NOW)).toBe('Hace 1 h 12 min')
    expect(formatAgo(plus(-120 * 60), NOW)).toBe('Hace 2 h')
  })
})

describe('contacto sin API de WhatsApp', () => {
  it('arma tel: y wa.me solo con dígitos', () => {
    expect(phoneDigits('+57 310 456 7890')).toBe('573104567890')
    expect(telLink('+57 310 456 7890')).toBe('tel:+573104567890')
    expect(whatsappLink('+57 310 456 7890', 'Hola María')).toBe(
      'https://wa.me/573104567890?text=Hola%20Mar%C3%ADa',
    )
  })

  it('pre-arma el mensaje con los datos de la cotización', () => {
    expect(
      quoteMessage({
        cliente: 'María González',
        asesor: 'Camila Rojas',
        codigo: 'COT-99201',
        origen: 'Bogotá',
        destino: 'Cali',
        valor_cop: 340000,
        peso_kg: 120,
      }),
    ).toBe(
      'Hola María, soy Camila de TransLogix. Te escribo por tu cotización COT-99201 de Bogotá a Cali (120 kg) por $340.000 COP. ¿Seguimos con el envío?',
    )
  })
})

describe('textos de embudo', () => {
  it('acorta nombres de etapa y formatea COP', () => {
    expect(shortStage('En Contacto / Llamada')).toBe('En Contacto')
    expect(shortStage('Nuevas Cotizaciones (Bot)')).toBe('Nuevas Cotizaciones')
    expect(copLabel(3480000)).toBe('$3.480.000 COP')
  })

  it('describe la confianza del bot sin porcentaje', () => {
    expect(confidenceLabel(0.42).hint).toBe('Requiere humano')
    expect(confidenceLabel(0.55).tone).toBe('warning')
    expect(confidenceLabel(0.88).level).toBe('Confianza IA alta')
  })
})

describe('etapas acordadas con el backend (CR-007)', () => {
  it('bloquea mover desde venta cerrada y descartado', () => {
    expect(isLockedStage('VENTA_CERRADA')).toBe(true)
    expect(isLockedStage('DESCARTADO')).toBe(true)
    expect(isLockedStage('NEGOCIACION')).toBe(false)
  })
})
