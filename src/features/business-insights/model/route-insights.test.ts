import type { ChatMessage } from '@/features/chat'
import { DEMO_CONVERSATION } from './demo-conversation'
import { buildRouteInsights } from './route-insights'

const at = '2026-11-03T10:00:00-05:00'
const user = (id: string): ChatMessage => ({ id, role: 'user', text: 'hola', createdAt: at })
type Blocks = Extract<ChatMessage, { role: 'assistant' }>['blocks']
const reply = (id: string, blocks: Blocks): ChatMessage => ({
  id,
  role: 'assistant',
  blocks,
  createdAt: at,
})

const quote = (id: string, destino: string, flete: number) => ({
  type: 'QUOTE_SUMMARY',
  cotizacion_id: id,
  codigo_trayecto: `TLX-BOG-${destino.slice(0, 3).toUpperCase()}-001`,
  origen: 'Bogotá D.C.',
  destino,
  peso_facturable_kg: 10,
  flete_total_cop: flete,
  tiempo_entrega_horas: 24,
  formula_version: 'provisional-v1',
  advertencias: [],
})

describe('buildRouteInsights', () => {
  it('agrupa las cotizaciones por ruta y cuenta cada una una sola vez', () => {
    const insights = buildRouteInsights([
      user('u1'),
      reply('r1', [{ type: 'TEXT', text: 'Listo' }, quote('q1', 'Medellín', 100_000)]),
      user('u2'),
      reply('r2', [quote('q2', 'Medellín', 200_000)]),
      reply('r3', [quote('q2', 'Medellín', 200_000)]),
      reply('r4', [quote('q3', 'Cali', 50_000)]),
    ])

    expect(insights.consultas).toBe(2)
    expect(insights.cotizaciones).toBe(3)
    expect(insights.fleteCotizadoCop).toBe(350_000)
    expect(insights.rutas.map((r) => [r.destino, r.cotizaciones, r.fletePromedioCop])).toEqual([
      ['Medellín', 2, 150_000],
      ['Cali', 1, 50_000],
    ])
  })

  it('separa lo que resolvió la IA de lo que pasó a un asesor', () => {
    const insights = buildRouteInsights([
      reply('r1', [{ type: 'TEXT', text: 'Hola' }]),
      reply('r2', [
        {
          type: 'HANDOFF_NOTICE',
          handoff_id: 'h1',
          prioridad: 'URGENTE',
          cola: 'OPERACIONES',
          mensaje_cliente: 'Te conecto',
          tiempo_espera_estimado_segundos: 60,
        },
      ]),
    ])

    expect(insights.resueltasPorIa).toBe(1)
    expect(insights.escaladas).toBe(1)
    expect(insights.escalamientosPorCola).toEqual([{ label: 'Operaciones', count: 1 }])
  })

  it('ignora bloques que no cumplen el schema', () => {
    const insights = buildRouteInsights([reply('r1', [{ type: 'QUOTE_SUMMARY', origen: 'X' }])])
    expect(insights.cotizaciones).toBe(0)
    expect(insights.rutas).toEqual([])
  })
})

describe('DEMO_CONVERSATION', () => {
  it('pasa por el mismo cálculo y llena todas las secciones', () => {
    const insights = buildRouteInsights(DEMO_CONVERSATION)
    expect(insights.rutas[0]).toMatchObject({
      origen: 'Bogotá D.C.',
      destino: 'Medellín',
      cotizaciones: 3,
    })
    expect(insights.rutas).toHaveLength(4)
    expect(insights.guias).toHaveLength(2)
    expect(insights.escalamientosPorCola.length).toBeGreaterThan(0)
    expect(insights.temas.length).toBeGreaterThan(0)
  })
})
