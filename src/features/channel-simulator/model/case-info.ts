import type { SimulatedReply } from '../api/simulator-api'

/** Ficha del caso (vista tipo CRM): lo que la IA entendió y usó en el último turno. */
export interface CaseInfo {
  intent: string | null
  services: string[]
  /** Última guía mencionada por el cliente o usada por la IA. */
  guia: string | null
  status: string
  escalated: boolean
  /** Solo llamadas: el turno terminó pasando la llamada a un asesor. */
  transferred: boolean
}

export const EMPTY_CASE: CaseInfo = {
  intent: null,
  services: [],
  guia: null,
  status: 'AWAITING_USER',
  escalated: false,
  transferred: false,
}

export const INTENT_LABELS: Record<string, string> = {
  TRACKING: 'Rastreo de guía',
  COTIZACION: 'Cotización',
  CONSULTA_DOCUMENTAL: 'Consulta de normas',
  CARGA_ESPECIAL: 'Carga especial',
  PQRS: 'PQRS / reclamo',
  SALUDO: 'Saludo',
  HABLAR_CON_HUMANO: 'Pide un asesor',
  DESCONOCIDA: 'No identificada',
}

export const SERVICE_LABELS: Record<string, string> = {
  tms: 'Rastreo (TMS)',
  quotation: 'Tarifas',
  rag: 'Documentos',
  escalation: 'Escalamiento',
  pqrs: 'PQRS',
}

const GUIA = /TLX-\d{6}-CO/i

export function nextCase(
  previous: CaseInfo,
  customerText: string,
  reply: SimulatedReply,
  transferred = false,
): CaseInfo {
  const guia =
    reply.meta.evidence_ids.find((id) => GUIA.test(id)) ??
    customerText.match(GUIA)?.[0]?.toUpperCase() ??
    previous.guia
  return {
    intent: reply.meta.intent,
    services: reply.meta.services_called,
    guia,
    status: reply.status,
    escalated: previous.escalated || reply.status === 'ESCALATED',
    transferred: previous.transferred || transferred,
  }
}
