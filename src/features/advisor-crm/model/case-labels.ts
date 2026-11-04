import type { HandoffPriority, HandoffStatus } from '../api/handoffs-api'

/** Textos de la bandeja real (contrato 1.7.0). Un valor nuevo del backend se muestra tal cual. */
const label = (map: Record<string, string>) => (value: string) => map[value] ?? value

export const queueLabel = label({
  SERVICIO_CLIENTE: 'Servicio al cliente',
  SUPERVISOR: 'Supervisor',
  JURIDICO_PQRS: 'Jurídico y PQRS',
  EJECUTIVO_CUENTA: 'Ejecutivo de cuenta',
  OPERACIONES: 'Operaciones',
})

export const channelLabel = label({ WEB_CHAT: 'Chat web', WHATSAPP: 'WhatsApp', PBX: 'Llamada' })

export const sentimentLabel = label({
  POSITIVO: 'Positivo',
  NEUTRO: 'Neutro',
  NEGATIVO: 'Negativo',
  MUY_NEGATIVO: 'Muy negativo',
})

export const PRIORITY: Record<HandoffPriority, { label: string; tone: 'danger' | 'neutral' }> = {
  URGENTE: { label: 'Urgente', tone: 'danger' },
  ALTA: { label: 'Prioridad alta', tone: 'danger' },
  NORMAL: { label: 'Prioridad normal', tone: 'neutral' },
}

export const STATUS_LABEL: Record<HandoffStatus, string> = {
  PENDING: 'En cola',
  ASSIGNED: 'En gestión',
  CLOSED: 'Cerrado',
}

/** Número corto y estable para mostrar: «#D5F1FBB6». */
export const shortCaseId = (id: string) => `#${id.slice(0, 8).toUpperCase()}`
