import type { ChatMessage } from '@/features/chat'
import { handoffNoticeBlockSchema, type HandoffNoticeBlock } from '@/features/handoff'
import { quoteSummaryBlockSchema } from '@/features/quote'
import { buildTimeline, trackingCardBlockSchema, type TrackingTimeline } from '@/features/tracking'

/** Una ruta (origen → destino) según las cotizaciones que entregó Logi. */
export interface RouteStat {
  key: string
  origen: string
  destino: string
  codigoTrayecto: string
  cotizaciones: number
  fleteTotalCop: number
  fletePromedioCop: number
  pesoTotalKg: number
  /** Promedio de `tiempo_entrega_horas` de sus cotizaciones. */
  tiempoPromedioHoras: number
  advertencias: number
}

export interface TrackedGuide {
  numeroGuia: string
  estado: string
  ubicacion: string | null
  cargaEspecial: boolean
  /** Mismo criterio que la tarjeta de rastreo: en curso, novedad o entregado. */
  tono: TrackingTimeline['tone']
}

export interface StatusCount extends CountItem {
  tono: TrackingTimeline['tone']
}

export interface CountItem {
  label: string
  count: number
}

export interface RouteInsights {
  /** Mensajes que escribió el cliente. */
  consultas: number
  /** Respuestas de Logi. */
  respuestas: number
  /** Respuestas sin aviso de asesor. */
  resueltasPorIa: number
  escaladas: number
  cotizaciones: number
  fleteCotizadoCop: number
  rutas: RouteStat[]
  guias: TrackedGuide[]
  estadosGuia: StatusCount[]
  escalamientosPorCola: CountItem[]
  escalamientosPorPrioridad: CountItem[]
  /** Qué resolvió Logi, por tipo de bloque de respuesta. */
  temas: CountItem[]
}

const COLA_LABEL: Record<HandoffNoticeBlock['cola'], string> = {
  SERVICIO_CLIENTE: 'Servicio al cliente',
  SUPERVISOR: 'Supervisor',
  JURIDICO_PQRS: 'Jurídico y PQRS',
  EJECUTIVO_CUENTA: 'Ejecutivo de cuenta',
  OPERACIONES: 'Operaciones',
}

const PRIORIDAD_LABEL: Record<HandoffNoticeBlock['prioridad'], string> = {
  URGENTE: 'Urgente',
  ALTA: 'Alta',
  NORMAL: 'Normal',
}

const TEMA_LABEL: Record<string, string> = {
  TRACKING_CARD: 'Rastreo de guías',
  QUOTE_SUMMARY: 'Cotizaciones',
  CITATIONS: 'Normas y documentos',
  PQRS_TICKET: 'PQRS',
  HANDOFF_NOTICE: 'Paso a asesor',
}

const byCountDesc = (a: CountItem, b: CountItem) =>
  b.count - a.count || a.label.localeCompare(b.label)

function toCountItems(counts: Map<string, number>): CountItem[] {
  return [...counts].map(([label, count]) => ({ label, count })).sort(byCountDesc)
}

const bump = (map: Map<string, number>, key: string) => map.set(key, (map.get(key) ?? 0) + 1)

/**
 * Resume los resultados del chat (los bloques que respondió Logi) en indicadores por ruta.
 * Solo usa los campos de cada schema; un bloque que no valida se ignora.
 */
export function buildRouteInsights(messages: ChatMessage[]): RouteInsights {
  const rutas = new Map<
    string,
    Omit<RouteStat, 'fletePromedioCop' | 'tiempoPromedioHoras'> & { horas: number }
  >()
  const guias = new Map<string, TrackedGuide>()
  const colas = new Map<string, number>()
  const prioridades = new Map<string, number>()
  const temas = new Map<string, number>()
  const cotizacionesVistas = new Set<string>()
  let consultas = 0
  let respuestas = 0
  let escaladas = 0

  for (const message of messages) {
    if (message.role === 'user') {
      consultas++
      continue
    }
    respuestas++
    let escalada = false

    for (const block of message.blocks) {
      const tema = TEMA_LABEL[block.type]
      if (tema) bump(temas, tema)

      const quote = quoteSummaryBlockSchema.safeParse(block)
      if (quote.success) {
        const q = quote.data
        // La misma cotización puede repetirse (historial rehidratado): se cuenta una vez.
        if (cotizacionesVistas.has(q.cotizacion_id)) continue
        cotizacionesVistas.add(q.cotizacion_id)
        const key = `${q.origen}→${q.destino}`
        const ruta = rutas.get(key) ?? {
          key,
          origen: q.origen,
          destino: q.destino,
          codigoTrayecto: q.codigo_trayecto,
          cotizaciones: 0,
          fleteTotalCop: 0,
          pesoTotalKg: 0,
          advertencias: 0,
          horas: 0,
        }
        ruta.cotizaciones++
        ruta.fleteTotalCop += q.flete_total_cop
        ruta.pesoTotalKg += q.peso_facturable_kg
        ruta.horas += q.tiempo_entrega_horas
        ruta.advertencias += q.advertencias.length
        rutas.set(key, ruta)
        continue
      }

      const tracking = trackingCardBlockSchema.safeParse(block)
      if (tracking.success) {
        const t = tracking.data
        // Última consulta de cada guía.
        guias.set(t.numero_guia, {
          numeroGuia: t.numero_guia,
          estado: t.estado.etiqueta,
          ubicacion: t.ubicacion_referencia,
          cargaEspecial: t.flags.mercancia_peligrosa || t.flags.requiere_refrigeracion,
          tono: buildTimeline(t).tone,
        })
        continue
      }

      const handoff = handoffNoticeBlockSchema.safeParse(block)
      if (handoff.success) {
        escalada = true
        bump(colas, COLA_LABEL[handoff.data.cola])
        bump(prioridades, PRIORIDAD_LABEL[handoff.data.prioridad])
      }
    }

    if (escalada) escaladas++
  }

  const rutasList: RouteStat[] = [...rutas.values()]
    .map(({ horas, ...ruta }) => ({
      ...ruta,
      fletePromedioCop: Math.round(ruta.fleteTotalCop / ruta.cotizaciones),
      tiempoPromedioHoras: Math.round(horas / ruta.cotizaciones),
    }))
    .sort((a, b) => b.cotizaciones - a.cotizaciones || b.fleteTotalCop - a.fleteTotalCop)

  const estados = new Map<string, StatusCount>()
  for (const guia of guias.values()) {
    const item = estados.get(guia.estado) ?? { label: guia.estado, count: 0, tono: guia.tono }
    item.count++
    estados.set(guia.estado, item)
  }

  return {
    consultas,
    respuestas,
    resueltasPorIa: respuestas - escaladas,
    escaladas,
    cotizaciones: cotizacionesVistas.size,
    fleteCotizadoCop: rutasList.reduce((sum, r) => sum + r.fleteTotalCop, 0),
    rutas: rutasList,
    guias: [...guias.values()],
    estadosGuia: [...estados.values()].sort(byCountDesc),
    escalamientosPorCola: toCountItems(colas),
    escalamientosPorPrioridad: toCountItems(prioridades),
    temas: toCountItems(temas),
  }
}
