import type { RequestState } from '../api/shipments-api'

export const SHIPMENTS_QUERY_KEY = ['envios'] as const

export const STATE_LABEL: Record<RequestState, string> = {
  PENDIENTE: 'Pendiente de aprobación',
  APROBADA: 'Aprobado',
  RECHAZADA: 'Rechazado',
}

export const STATE_TONE: Record<RequestState, string> = {
  PENDIENTE: 'bg-warning/15 text-warning',
  APROBADA: 'bg-success/15 text-success',
  RECHAZADA: 'bg-destructive/10 text-destructive',
}

export const dateTime = (iso: string) =>
  new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
