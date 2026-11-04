import type { ChatMessage } from '@/features/chat'

// Conversación de demostración para el tablero cuando el chat aún no tiene resultados (o se abre
// en otra pestaña: el chat vive en sessionStorage). Los bloques tienen la misma forma que el
// backend y pasan por el mismo cálculo que los reales. Bogotá → Medellín, las dos guías y los
// avisos de asesor salen de capturas reales; las demás rutas son ejemplos.

type Blocks = Extract<ChatMessage, { role: 'assistant' }>['blocks']

const at = (minutes: number) => new Date(Date.UTC(2026, 10, 3, 14, minutes)).toISOString()

const quote = (
  id: string,
  [origen, destino, codigo]: [string, string, string],
  peso: number,
  flete: number,
  horas: number,
) => ({
  type: 'QUOTE_SUMMARY',
  cotizacion_id: id,
  codigo_trayecto: codigo,
  origen,
  destino,
  peso_facturable_kg: peso,
  flete_total_cop: flete,
  tiempo_entrega_horas: horas,
  formula_version: 'provisional-v1',
  advertencias: [],
})

const BOG_MED: [string, string, string] = ['Bogotá D.C.', 'Medellín', 'TLX-BOG-MED-001']
const BOG_CAL: [string, string, string] = ['Bogotá D.C.', 'Cali', 'TLX-BOG-CAL-001']
const MED_BAQ: [string, string, string] = ['Medellín', 'Barranquilla', 'TLX-MED-BAQ-001']
const CAL_BOG: [string, string, string] = ['Cali', 'Bogotá D.C.', 'TLX-CAL-BOG-001']

const tracking = (
  numero_guia: string,
  codigo: string,
  etiqueta: string,
  ubicacion: string,
  flags: { requiere_refrigeracion: boolean; mercancia_peligrosa: boolean },
) => ({
  type: 'TRACKING_CARD',
  numero_guia,
  estado: { codigo, etiqueta, explicacion: etiqueta },
  eta: null,
  ubicacion_referencia: ubicacion,
  eventos: [],
  flags,
})

const handoff = (id: string, cola: string, prioridad: string) => ({
  type: 'HANDOFF_NOTICE',
  handoff_id: id,
  prioridad,
  cola,
  mensaje_cliente: 'Te conecto con un asesor.',
  tiempo_espera_estimado_segundos: 45,
})

const REPLIES: Blocks[] = [
  [quote('demo-q1', BOG_MED, 45.5, 190_975, 24)],
  [quote('demo-q2', BOG_MED, 30, 142_300, 24)],
  [quote('demo-q3', BOG_MED, 80, 298_600, 24)],
  [quote('demo-q4', BOG_CAL, 25, 168_400, 36)],
  [quote('demo-q5', BOG_CAL, 60, 287_900, 36)],
  [quote('demo-q6', MED_BAQ, 40, 256_200, 48)],
  [quote('demo-q7', CAL_BOG, 15, 121_500, 36)],
  [
    tracking(
      'TLX-984021-CO',
      'EN_TRANSITO',
      'En tránsito',
      'Paso de Montaña Alto de la Línea - Sentido Bogotá-Ibague-Medellín',
      { requiere_refrigeracion: true, mercancia_peligrosa: false },
    ),
  ],
  [
    tracking(
      'TLX-310482-CO',
      'RETENIDO_NOVEDAD',
      'Retenido por novedad',
      'Puesto de Control POLFA / DIAN - Aguachica, Cesar',
      { requiere_refrigeracion: false, mercancia_peligrosa: true },
    ),
    handoff('demo-h1', 'OPERACIONES', 'URGENTE'),
  ],
  [{ type: 'CITATIONS' }],
  [{ type: 'CITATIONS' }],
  [handoff('demo-h2', 'SERVICIO_CLIENTE', 'NORMAL')],
  [handoff('demo-h3', 'SUPERVISOR', 'ALTA')],
  [{ type: 'PQRS_TICKET' }, handoff('demo-h4', 'JURIDICO_PQRS', 'ALTA')],
  [{ type: 'TEXT', text: '¡Hola! Soy Logi.' }],
]

export const DEMO_CONVERSATION: ChatMessage[] = REPLIES.flatMap((blocks, i): ChatMessage[] => [
  { id: `demo-u${i}`, role: 'user', text: '', createdAt: at(i * 2) },
  { id: `demo-r${i}`, role: 'assistant', blocks, createdAt: at(i * 2 + 1) },
])
