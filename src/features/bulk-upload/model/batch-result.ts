import { apiErrorMessage, type ApiError } from '@/shared/api'
import type { BatchItem, BatchItemError } from '../api/batches-api'
import { BULK_COLUMNS } from './bulk-columns'
import type { BulkRow } from './bulk-rows'

/** Motivo de rechazo de un envío (`errores[].code`), en palabras del cliente. */
const ITEM_ERROR_MESSAGES: Record<string, string> = {
  VALIDACION: 'Dato inválido.',
  REFERENCIA_DUPLICADA: 'La referencia ya se usó, en este lote o en uno anterior.',
  CIUDAD_NO_RECONOCIDA: 'No reconocemos la ciudad.',
  CIUDAD_NO_CUBIERTA: 'Todavía no tenemos cobertura en esa ciudad.',
  TARIFA_NO_DISPONIBLE: 'No hay tarifa para esa ruta.',
  SERVICIO_NO_DISPONIBLE: 'No hay cadena de frío hacia ese destino.',
  ERROR_INTERNO: 'No pudimos guardar este envío. Inclúyelo en un lote nuevo.',
}

const HEADER_BY_FIELD = new Map<string, string>(BULK_COLUMNS.map((c) => [c.key, c.header]))

/** `destinatario.telefono` → «Teléfono destinatario» (la columna de la plantilla). */
function fieldLabel(field: string): string {
  return HEADER_BY_FIELD.get(field.replaceAll('.', '_')) ?? field
}

/** El campo solo se nombra cuando ayuda («Dato inválido» o un código que aún no conocemos). */
export function itemErrorText({ code, field }: BatchItemError): string {
  const known = ITEM_ERROR_MESSAGES[code]
  const message = known ?? `No se pudo crear (${code}).`
  return field && (code === 'VALIDACION' || !known) ? `${fieldLabel(field)}: ${message}` : message
}

/** Errores del lote completo (`error.code` del sobre). Si no está en la lista, el texto del backend. */
const BATCH_ERROR_MESSAGES: Record<string, string> = {
  NO_AUTENTICADO:
    'La API key no es válida o fue revocada. Revísala con tu ejecutivo de TransLogix.',
  NO_AUTORIZADO:
    'Esta API key no tiene permiso para crear o consultar lotes, o la cuenta de tu empresa está inactiva.',
  IDEMPOTENCIA_CONFLICTO:
    'Esa referencia de lote ya se usó con otros envíos. Cambia la referencia para crear un lote nuevo.',
  LOTE_DEMASIADO_GRANDE: 'El lote supera el máximo permitido. Divide el archivo en varios lotes.',
  LIMITE_DE_TASA: 'Enviaste muchos lotes seguidos. Espera un minuto e inténtalo de nuevo.',
}

export function batchErrorText(error: ApiError): string {
  return (error.code && BATCH_ERROR_MESSAGES[error.code]) || apiErrorMessage(error)
}

export interface BatchResultRow {
  item: BatchItem
  /** Fila del Excel de donde salió el envío (si se pudo emparejar). */
  row?: BulkRow
}

export interface BatchSummary {
  created: number
  rejected: number
  pending: number
  rows: BatchResultRow[]
}

/**
 * Une cada ítem con su fila del Excel: por `referencia_cliente` (única en el archivo) o, si no
 * viene, por posición en `envios` (`linea`, por confirmar: desde 1).
 */
export function summarizeBatch(items: BatchItem[], sentRows: BulkRow[]): BatchSummary {
  const byReference = new Map(sentRows.map((row) => [row.shipment?.referencia_cliente, row]))
  const rows = items.map((item) => ({
    item,
    row:
      (item.referencia_cliente && byReference.get(item.referencia_cliente)) ||
      sentRows[item.linea - 1],
  }))
  const count = (status: BatchItem['status']) => items.filter((i) => i.status === status).length
  return {
    created: count('CREATED'),
    rejected: count('REJECTED'),
    pending: count('PENDING'),
    rows,
  }
}

/** Referencia sugerida al subir un archivo: `LOTE-AAAAMMDD-HHMMSS` (hora local). */
export function suggestBatchRef(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  const day = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`
  const time = `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  return `LOTE-${day}-${time}`
}
