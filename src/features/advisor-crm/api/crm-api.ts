import { z } from 'zod'
import { httpClient } from '@/shared/api'

// Módulo Asesor (CRM). Todo el contrato de este archivo es provisional (por confirmar): el backend
// todavía no tiene estos endpoints. En desarrollo los simula MSW. Ver docs/asesor-backend-faltantes.md.

const isoDate = z.iso.datetime({ offset: true })

export const funnelIdSchema = z.enum(['ventas', 'casos', 'bot'])
export type FunnelId = z.infer<typeof funnelIdSchema>

const toneSchema = z.enum(['neutral', 'success', 'warning', 'danger'])
export type Tone = z.infer<typeof toneSchema>

// --- Asesor en sesión ---

export const advisorStatusSchema = z.enum(['DISPONIBLE', 'OCUPADO'])
export type AdvisorStatus = z.infer<typeof advisorStatusSchema>

const advisorSchema = z.object({
  asesor_id: z.string(),
  nombre: z.string(),
  estado: advisorStatusSchema,
  turno: z.string(),
  notificaciones_sin_leer: z.number(),
  tareas_pendientes: z.number(),
  /** Tarjetas abiertas por embudo (contadores de la navegación). */
  embudos_abiertos: z.object({ ventas: z.number(), casos: z.number(), bot: z.number() }),
})
export type Advisor = z.infer<typeof advisorSchema>

export const getAdvisor = () => httpClient.get('/asesor/me', advisorSchema)

export const updateAdvisorStatus = (estado: AdvisorStatus) =>
  httpClient.patch('/asesor/me', { estado }, advisorSchema)

// --- Dashboard ---

const priorityActionSchema = z.object({
  lead_id: z.string(),
  embudo: funnelIdSchema,
  titulo: z.string(),
  detalle: z.string(),
  sla_vence_at: isoDate,
})
export type PriorityAction = z.infer<typeof priorityActionSchema>

const dashboardSchema = z.object({
  kpis: z.object({
    leads_cotizacion_hoy: z.number(),
    leads_cotizacion_ayer: z.number(),
    consultas_escaladas: z.number(),
    consultas_prioridad_alta: z.number(),
    llamadas_pendientes: z.number(),
    proxima_llamada_at: isoDate.nullable(),
    sla_cumplimiento_pct: z.number(),
    sla_meta_pct: z.number(),
  }),
  acciones: z.array(priorityActionSchema),
})
export type Dashboard = z.infer<typeof dashboardSchema>

export const getDashboard = () => httpClient.get('/asesor/dashboard', dashboardSchema)

// --- Embudos ---

const contactSchema = z.object({
  nombre: z.string(),
  telefono: z.string(),
  telefono_verificado: z.boolean(),
})

const routeQuoteSchema = z.object({
  codigo: z.string(),
  origen: z.string(),
  destino: z.string(),
  valor_cop: z.number(),
})

const cardBase = {
  lead_id: z.string(),
  etapa: z.string(),
  cliente: contactSchema,
  creado_at: isoDate,
}

const salesCardSchema = z.object({
  ...cardBase,
  embudo: z.literal('ventas'),
  segmento: z.enum(['B2B', 'B2C']),
  cotizacion: routeQuoteSchema.extend({
    peso_facturable_kg: z.number(),
    tipo_carga: z.string(),
  }),
})
export type SalesCard = z.infer<typeof salesCardSchema>

const caseCardSchema = z.object({
  ...cardBase,
  embudo: z.literal('casos'),
  caso_codigo: z.string(),
  prioridad: z.enum(['ALTA', 'MEDIA', 'BAJA']),
  numero_guia: z.string().nullable(),
  motivo: z.string(),
  /** 0..1, donde se detuvo el bot. No se muestra como porcentaje. */
  confianza: z.number().min(0).max(1),
  sla_vence_at: isoDate.nullable(),
})
export type CaseCard = z.infer<typeof caseCardSchema>

const botCardSchema = z.object({
  ...cardBase,
  embudo: z.literal('bot'),
  estado_bot: z.enum(['ACTIVO', 'REACTIVADO', 'SIN_RESPUESTA']),
  intento: z.number(),
  intentos_max: z.number(),
  cotizacion: routeQuoteSchema,
  proxima_accion: z.string(),
})
export type BotCard = z.infer<typeof botCardSchema>

const funnelCardSchema = z.discriminatedUnion('embudo', [
  salesCardSchema,
  caseCardSchema,
  botCardSchema,
])
export type FunnelCard = z.infer<typeof funnelCardSchema>

const funnelSchema = z.object({
  embudo: funnelIdSchema,
  etapas: z.array(
    z.object({
      id: z.string(),
      nombre: z.string(),
      total: z.number(),
      proyectado_cop: z.number().nullable(),
    }),
  ),
  indicadores: z.array(
    z.object({ etiqueta: z.string(), valor: z.string(), detalle: z.string(), tono: toneSchema }),
  ),
  tarjetas: z.array(funnelCardSchema),
})
export type Funnel = z.infer<typeof funnelSchema>
export type FunnelStage = Funnel['etapas'][number]

export const getFunnel = (id: FunnelId) => httpClient.get(`/asesor/embudos/${id}`, funnelSchema)

const stageChangeSchema = z.object({
  lead_id: z.string(),
  embudo: funnelIdSchema,
  etapa: z.string(),
  /** Solo al pasar a "Venta cerrada": guía creada en el TMS. */
  guia_creada: z.string().nullable(),
})
export type StageChange = z.infer<typeof stageChangeSchema>

export const moveLead = (leadId: string, etapa: string) =>
  httpClient.patch(`/asesor/leads/${encodeURIComponent(leadId)}`, { etapa }, stageChangeSchema)

/** Embudo C → A: el asesor toma el lead que perseguía el bot. */
export const takeOverLead = (leadId: string) =>
  httpClient.post(
    `/asesor/leads/${encodeURIComponent(leadId)}/tomar-control`,
    {},
    stageChangeSchema,
  )

// --- Detalle del lead / caso ---

const noteSchema = z.object({
  id: z.string(),
  autor: z.string(),
  tipo: z.enum(['LLAMADA', 'NOTA', 'SISTEMA']),
  resultado: z.enum(['CONTESTO', 'NO_CONTESTO', 'BUZON']).nullable(),
  texto: z.string(),
  recordatorio_at: isoDate.nullable(),
  timestamp: isoDate,
})
export type LeadNote = z.infer<typeof noteSchema>
export type CallResult = NonNullable<LeadNote['resultado']>

const leadDetailSchema = z.object({
  lead_id: z.string(),
  embudo: funnelIdSchema,
  etapa: z.string(),
  /** Código visible: cotización (`COT-99201`) o caso (`CAS-8921`). */
  referencia: z.string(),
  segmento: z.enum(['B2B', 'B2C']).nullable(),
  cliente: z.object({
    nombre: z.string(),
    telefono: z.string(),
    correo: z.string().nullable(),
    empresa: z.string().nullable(),
  }),
  /** Datos estructurados que el bot capturó (teléfono, NIT, dimensiones…), ya rotulados. */
  datos_bot: z.array(z.object({ etiqueta: z.string(), valor: z.string() })),
  transcripcion: z.array(
    z.object({ rol: z.enum(['BOT', 'CLIENTE']), texto: z.string(), timestamp: isoDate }),
  ),
  notas: z.array(noteSchema),
  cotizacion: z
    .object({
      codigo: z.string(),
      origen: z.string(),
      destino: z.string(),
      conceptos: z.array(z.object({ concepto: z.string(), valor_cop: z.number() })),
      total_cop: z.number(),
      peso_real_kg: z.number(),
      peso_volumetrico_kg: z.number(),
      volumen_cm3: z.number(),
      divisor_volumetrico: z.number(),
      peso_facturable_kg: z.number(),
    })
    .nullable(),
  numero_guia: z.string().nullable(),
})
export type LeadDetail = z.infer<typeof leadDetailSchema>

export const getLead = (leadId: string) =>
  httpClient.get(`/asesor/leads/${encodeURIComponent(leadId)}`, leadDetailSchema)

export interface NewNote {
  resultado: CallResult | null
  texto: string
  recordatorio_at: string | null
}

export const addNote = (leadId: string, note: NewNote) =>
  httpClient.post(`/asesor/leads/${encodeURIComponent(leadId)}/notas`, note, noteSchema)

// --- Mis tareas ---

const taskSchema = z.object({
  id: z.string(),
  lead_id: z.string(),
  embudo: funnelIdSchema,
  titulo: z.string(),
  detalle: z.string(),
  vence_at: isoDate,
  hecha: z.boolean(),
})
export type Task = z.infer<typeof taskSchema>

const tasksSchema = z.object({
  tareas: z.array(taskSchema),
  sla: z.object({
    cumplimiento_pct: z.number(),
    meta_pct: z.number(),
    vencidas_hoy: z.number(),
    primer_contacto_promedio_min: z.number(),
  }),
})
export type Tasks = z.infer<typeof tasksSchema>

export const getTasks = () => httpClient.get('/asesor/tareas', tasksSchema)

export const setTaskDone = (taskId: string, hecha: boolean) =>
  httpClient.patch(`/asesor/tareas/${encodeURIComponent(taskId)}`, { hecha }, taskSchema)

// --- Búsqueda global y base RAG ---

const searchSchema = z.object({
  resultados: z.array(
    z.object({
      lead_id: z.string(),
      embudo: funnelIdSchema,
      titulo: z.string(),
      detalle: z.string(),
    }),
  ),
})
export type SearchResult = z.infer<typeof searchSchema>['resultados'][number]

export const searchLeads = (q: string) =>
  httpClient.get(`/asesor/buscar?q=${encodeURIComponent(q)}`, searchSchema)

const ragSearchSchema = z.object({
  resultados: z.array(
    z.object({
      titulo: z.string(),
      fragmento: z.string(),
      fuente: z.string(),
      pagina: z.number().nullable(),
      relevancia: z.number().min(0).max(1),
    }),
  ),
})
export type RagResult = z.infer<typeof ragSearchSchema>['resultados'][number]

export const searchKnowledge = (q: string) =>
  httpClient.get(`/asesor/rag/buscar?q=${encodeURIComponent(q)}`, ragSearchSchema)
