import { z } from 'zod'
import { CITIES, shipmentFormSchema } from '@/features/quote'
import { normalizeText, resolveOption } from '@/shared/lib/text-match'
import type { ShipmentBatchRequest } from '../api/batches-api'
import { BULK_COLUMNS, MAX_ROWS, type BulkColumnKey } from './bulk-columns'

const text = (missing: string, max: number) =>
  z.string({ error: missing }).trim().min(1, missing).max(max, `Máximo ${max} caracteres.`)

/** Referencia de pedido y de lote: como `REFERENCE_PATTERN` del backend. */
export const REFERENCE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/#-]{0,63}$/
export const REFERENCE_HINT = 'Solo letras, números y . _ : / # - (sin espacios), máximo 64.'

/**
 * Una fila = un envío del lote (`POST /shipment-batches`): paquete con las reglas de `/cotizar`,
 * `referencia_cliente` y destinatario (nombre, teléfono y dirección obligatorios). Largos máximos y
 * formato del teléfono: (por confirmar) con el backend.
 */
const bulkRowSchema = shipmentFormSchema.extend({
  referencia_cliente: text('Escribe la referencia del pedido.', 64).regex(
    REFERENCE_PATTERN,
    REFERENCE_HINT,
  ),
  destinatario_nombre: text('Escribe el nombre del destinatario.', 80),
  destinatario_telefono: z
    .string({ error: 'Escribe el teléfono del destinatario.' })
    .transform((value) => value.replace(/\D/g, ''))
    .refine((digits) => /^\d{7,10}$/.test(digits), 'El teléfono debe tener de 7 a 10 dígitos.'),
  destinatario_direccion: text('Escribe la dirección de entrega.', 120),
})

export interface BulkShipment {
  referencia_cliente: string
  origen: string
  destino: string
  alto_cm: number
  ancho_cm: number
  largo_cm: number
  peso_real_kg: number
  valor_declarado_cop: number
  requiere_cadena_frio: boolean
  mercancia_peligrosa: boolean
  destinatario: { nombre: string; telefono: string; direccion: string }
}

export interface BulkRow {
  /** Número de fila en Excel (la 1 es el encabezado). */
  line: number
  cells: Record<BulkColumnKey, string>
  shipment?: BulkShipment
  errors: Partial<Record<BulkColumnKey, string>>
  /** Ciudades que se completaron solas ("bogota" → "Bogotá D.C."). */
  corrected: BulkColumnKey[]
}

export type BulkParseResult = { ok: true; rows: BulkRow[] } | { ok: false; error: string }

const YES = new Set(['si', 'x', 'true', '1'])
const NO = new Set(['', 'no', 'false', '0'])

const cellText = (value: unknown) =>
  value === null || value === undefined ? '' : String(value).trim()

/** Lee la hoja (primera fila = encabezados de la plantilla) y valida cada fila. */
export function parseBulkSheet(sheet: readonly (readonly unknown[])[]): BulkParseResult {
  const [header = [], ...body] = sheet
  const position = new Map(header.map((title, index) => [normalizeText(cellText(title)), index]))
  const missing = BULK_COLUMNS.filter((column) => !position.has(normalizeText(column.header)))
  if (missing.length > 0)
    return {
      ok: false,
      error: `Faltan columnas: ${missing.map((c) => c.header).join(', ')}. Usa la plantilla.`,
    }

  const lines = body
    .map((cells, index) => ({ cells, line: index + 2 }))
    .filter(({ cells }) => cells.some((cell) => cellText(cell) !== ''))
  if (lines.length === 0) return { ok: false, error: 'El archivo no tiene envíos.' }
  if (lines.length > MAX_ROWS)
    return {
      ok: false,
      error: `Máximo ${MAX_ROWS} envíos por archivo; este tiene ${lines.length}.`,
    }

  const firstLineByReference = new Map<string, number>()
  const rows = lines.map(({ cells: raw, line }) => {
    const cells = Object.fromEntries(
      BULK_COLUMNS.map((c) => [c.key, cellText(raw[position.get(normalizeText(c.header)) ?? -1])]),
    ) as Record<BulkColumnKey, string>
    const row = validateRow(cells, line)

    const reference = normalizeText(cells.referencia_cliente)
    const first = firstLineByReference.get(reference)
    if (reference && first !== undefined) {
      row.errors.referencia_cliente ??= `Referencia repetida (fila ${first}).`
      row.shipment = undefined
    } else if (reference) firstLineByReference.set(reference, line)
    return row
  })
  return { ok: true, rows }
}

function validateRow(original: Record<BulkColumnKey, string>, line: number): BulkRow {
  const cells = { ...original }
  const errors: BulkRow['errors'] = {}
  const corrected: BulkColumnKey[] = []

  for (const key of ['origen', 'destino'] as const) {
    const city = resolveOption(CITIES, cells[key])
    if (city && city !== cells[key]) {
      cells[key] = city
      corrected.push(key)
    }
  }

  const flags: Partial<Record<'requiere_cadena_frio' | 'mercancia_peligrosa', boolean>> = {}
  for (const key of ['requiere_cadena_frio', 'mercancia_peligrosa'] as const) {
    const value = normalizeText(cells[key])
    if (YES.has(value)) flags[key] = true
    else if (NO.has(value)) flags[key] = false
    else errors[key] = 'Escribe SI o NO.'
  }

  const input = Object.fromEntries(
    Object.entries({ ...cells, ...flags }).map(([key, value]) => [
      key,
      value === '' ? undefined : value,
    ]),
  )
  delete input.requiere_cadena_frio
  delete input.mercancia_peligrosa
  const result = bulkRowSchema.safeParse({ ...input, ...flags })

  if (!result.success)
    for (const issue of result.error.issues) {
      const key = issue.path[0] as BulkColumnKey
      errors[key] ??= issue.message
    }

  const valid = result.success && Object.keys(errors).length === 0
  const shipment: BulkShipment | undefined =
    valid && result.success
      ? {
          referencia_cliente: result.data.referencia_cliente,
          origen: result.data.origen,
          destino: result.data.destino,
          alto_cm: result.data.alto_cm,
          ancho_cm: result.data.ancho_cm,
          largo_cm: result.data.largo_cm,
          peso_real_kg: result.data.peso_real_kg,
          valor_declarado_cop: result.data.valor_declarado_cop,
          requiere_cadena_frio: result.data.requiere_cadena_frio,
          mercancia_peligrosa: result.data.mercancia_peligrosa,
          destinatario: {
            nombre: result.data.destinatario_nombre,
            telefono: result.data.destinatario_telefono,
            direccion: result.data.destinatario_direccion,
          },
        }
      : undefined

  return { line, cells, shipment, errors, corrected }
}

/** Referencia por defecto, fija para el archivo cargado: reintentar no duplica el lote. */
export const defaultBatchReference = (date = new Date()) =>
  `LOTE-${date.toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '-')}`

export const isValidBatchReference = (value: string) => REFERENCE_PATTERN.test(value.trim())

/** Filas que van en el lote, en orden: solo las válidas. */
export const sendableRows = (rows: BulkRow[]) => rows.filter((row) => row.shipment)

/** Cuerpo de `POST /shipment-batches`. `referencia_lote` también va como `Idempotency-Key`. */
export function buildBatch(referenciaLote: string, rows: BulkRow[]): ShipmentBatchRequest {
  return {
    referencia_lote: referenciaLote.trim(),
    envios: rows.flatMap((row) => (row.shipment ? [row.shipment] : [])),
  }
}

/** Fila de Excel de cada envío enviado: `linea` 1 del lote = primera fila válida. */
export const sentLines = (rows: BulkRow[]) =>
  rows.flatMap((row) => (row.shipment ? [row.line] : []))
