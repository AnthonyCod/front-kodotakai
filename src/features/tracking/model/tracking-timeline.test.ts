import { buildTimeline } from './tracking-timeline'

const base = {
  numero_guia: 'TLX-984021-CO',
  eta: null,
  ubicacion_referencia: null,
  flags: { requiere_refrigeracion: false, mercancia_peligrosa: false },
}

const evento = (timestamp: string, estado: string, etiqueta: string) => ({
  timestamp,
  estado,
  etiqueta,
  ubicacion: null,
  descripcion_cliente: 'x',
})

describe('buildTimeline', () => {
  it('en tránsito: pasados hechos, último activo y entrega pendiente', () => {
    const t = buildTimeline({
      ...base,
      estado: { codigo: 'EN_TRANSITO', etiqueta: 'En tránsito', explicacion: 'x' },
      // Desordenados a propósito: se ordenan por fecha.
      eventos: [
        evento('2026-11-03T02:00:00-05:00', 'EN_TRANSITO', 'En tránsito'),
        evento('2026-11-02T18:00:00-05:00', 'EN_BODEGA_ORIGEN', 'En bodega'),
      ],
    })
    expect(t.steps.map((s) => [s.label, s.status])).toEqual([
      ['En bodega', 'done'],
      ['En tránsito', 'active'],
      ['Entregado', 'pending'],
    ])
    expect([t.completed, t.inProgress, t.remaining, t.tone]).toEqual([1, 1, 1, 'progress'])
  })

  it('retenido: el paso actual queda en alerta', () => {
    const t = buildTimeline({
      ...base,
      estado: { codigo: 'RETENIDO_NOVEDAD', etiqueta: 'Retenido', explicacion: 'x' },
      eventos: [evento('2026-11-02T15:00:00-05:00', 'RETENIDO_NOVEDAD', 'Retenido')],
    })
    expect(t.tone).toBe('alert')
    expect(t.steps[0]?.status).toBe('alert')
  })

  it('entregado: todo hecho, sin pendientes', () => {
    const t = buildTimeline({
      ...base,
      estado: { codigo: 'ENTREGADO', etiqueta: 'Entregado', explicacion: 'x' },
      eventos: [evento('2026-11-03T10:00:00-05:00', 'ENTREGADO', 'Entregado')],
    })
    expect([t.completed, t.remaining, t.percent, t.tone]).toEqual([1, 0, 100, 'delivered'])
  })
})
