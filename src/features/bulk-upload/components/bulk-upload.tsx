import { useState, type DragEvent, type ReactNode } from 'react'
import { ChevronDown, CircleAlert, FileDown, FileSpreadsheet, FileUp } from 'lucide-react'
import { cn } from 'cn'
import { formatCop } from '@/shared/lib/format'
import { StatusDot } from '@/shared/ui/block-card'
import { FIELD, FIELD_LABEL, PRIMARY_BUTTON } from '@/shared/ui/form-styles'
import { GLASS } from '@/shared/ui/glass'
import { BULK_COLUMNS, MAX_ROWS, type BulkColumnKey } from '../model/bulk-columns'
import { buildBatch, parseBulkSheet, type BulkRow } from '../model/bulk-rows'
import { downloadTemplate } from '../model/template'

const MAX_FILE_BYTES = 5 * 1024 * 1024
/** Tarjetas que se pintan de una vez; el resto con "Mostrar más". */
const PAGE = 50
const HEADER_BY_KEY = Object.fromEntries(BULK_COLUMNS.map((c) => [c.key, c.header])) as Record<
  BulkColumnKey,
  string
>

const EXAMPLE_JSON = JSON.stringify(
  buildBatch('PEDIDOS-NOV-04', [
    {
      line: 2,
      cells: {} as BulkRow['cells'],
      errors: {},
      corrected: [],
      shipment: {
        referencia_cliente: 'PED-1001',
        origen: 'Bogotá D.C.',
        destino: 'Medellín',
        alto_cm: 30,
        ancho_cm: 20,
        largo_cm: 15,
        peso_real_kg: 5,
        valor_declarado_cop: 200000,
        requiere_cadena_frio: false,
        mercancia_peligrosa: false,
        destinatario: { nombre: 'Ana Pérez', telefono: '3001234567', direccion: 'Cra 43A # 1-50' },
      },
    },
  ]),
  null,
  2,
)

type Filter = 'all' | 'errors'

/**
 * Carga masiva: plantilla → archivo → revisión fila por fila → lote JSON.
 * Todo ocurre en el navegador; (por confirmar) el envío al backend espera su endpoint de lotes.
 */
export function BulkUpload() {
  const [fileName, setFileName] = useState<string | null>(null)
  const [rows, setRows] = useState<BulkRow[]>([])
  const [fileError, setFileError] = useState<string | null>(null)
  const [reading, setReading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')
  const [visible, setVisible] = useState(PAGE)
  const [batchRef, setBatchRef] = useState('')

  const valid = rows.filter((row) => row.shipment).length
  const withErrors = rows.length - valid
  const shown = filter === 'errors' ? rows.filter((row) => !row.shipment) : rows

  async function load(file: File | undefined) {
    if (!file) return
    setFileError(null)
    setRows([])
    setFileName(file.name)
    if (!file.name.toLowerCase().endsWith('.xlsx'))
      return setFileError('El archivo debe ser de Excel (.xlsx). Usa la plantilla.')
    if (file.size > MAX_FILE_BYTES) return setFileError('El archivo supera 5 MB.')
    setReading(true)
    try {
      const { readSheet } = await import('read-excel-file/browser')
      const result = parseBulkSheet(await readSheet(file))
      if (!result.ok) return setFileError(result.error)
      setRows(result.rows)
      setFilter(result.rows.some((row) => !row.shipment) ? 'errors' : 'all')
      setVisible(PAGE)
    } catch {
      setFileError('No pudimos leer el archivo. Revisa que sea la plantilla en formato .xlsx.')
    } finally {
      setReading(false)
    }
  }

  function onDrop(event: DragEvent) {
    event.preventDefault()
    setDragging(false)
    void load(event.dataTransfer.files[0])
  }

  function downloadJson() {
    const blob = new Blob([JSON.stringify(buildBatch(batchRef, rows), null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const link = Object.assign(document.createElement('a'), {
      href: url,
      download: `lote-${batchRef.trim() || 'envios'}.json`,
    })
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 px-3 py-3 sm:space-y-6 sm:px-6 sm:py-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-medium sm:text-3xl">Carga masiva</h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Crea muchos envíos a la vez desde un archivo de Excel.
        </p>
      </header>

      <Step number={1} title="Descarga la plantilla">
        <p className="text-sm text-muted-foreground">
          Una fila por envío. En la hoja «Instrucciones» está qué va en cada columna.
        </p>
        <button
          type="button"
          onClick={() => void downloadTemplate()}
          className={`${GLASS} rounded-full px-4 py-2 text-sm font-medium`}
        >
          <FileDown size={16} aria-hidden /> Descargar plantilla (.xlsx)
        </button>
      </Step>

      <Step number={2} title="Sube tu archivo">
        <label
          onDragOver={(event) => {
            event.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            'flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-4 py-7 text-center transition',
            dragging ? 'border-brand bg-brand/5' : 'hover:bg-muted/50',
            fileError && 'border-destructive/50 bg-destructive/5',
          )}
        >
          <span className="grid size-11 place-items-center rounded-full bg-muted text-foreground/70">
            {fileName && !fileError ? (
              <FileSpreadsheet size={20} aria-hidden />
            ) : (
              <FileUp size={20} aria-hidden />
            )}
          </span>
          <span className="text-[15px] font-medium">
            {reading ? 'Leyendo…' : (fileName ?? 'Toca para elegir tu Excel')}
          </span>
          <span className="text-xs text-muted-foreground">
            {fileName ? 'Toca para cambiar el archivo' : 'o arrástralo aquí'} · .xlsx · máximo{' '}
            {MAX_ROWS} envíos
          </span>
          <input
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="sr-only"
            onChange={(event) => {
              void load(event.target.files?.[0])
              event.target.value = ''
            }}
          />
        </label>
        {fileError && (
          <p
            role="alert"
            className="flex gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
          >
            <CircleAlert size={16} aria-hidden className="mt-0.5 shrink-0" />
            {fileError}
          </p>
        )}
      </Step>

      {rows.length > 0 && (
        <Step number={3} title="Revisa los envíos">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <span>{rows.length} filas</span>
            <StatusDot tone="ok">{valid} listas</StatusDot>
            {withErrors > 0 && <StatusDot tone="alert">{withErrors} con error</StatusDot>}
          </div>

          {withErrors > 0 && (
            <div className="grid w-full grid-cols-2 gap-1 rounded-2xl bg-muted p-1 sm:w-80">
              {(
                [
                  ['errors', 'Con error'],
                  ['all', 'Todas'],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={filter === value}
                  onClick={() => setFilter(value)}
                  className="rounded-xl px-2 py-1.5 text-sm text-muted-foreground transition aria-pressed:bg-card aria-pressed:font-medium aria-pressed:text-foreground aria-pressed:shadow-card"
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          <ul className="space-y-2">
            {shown.slice(0, visible).map((row) => (
              <RowCard key={row.line} row={row} />
            ))}
          </ul>
          {shown.length > visible && (
            <button
              type="button"
              onClick={() => setVisible((current) => current + PAGE)}
              className={`${GLASS} w-full rounded-full px-4 py-2 text-sm`}
            >
              Mostrar más ({shown.length - visible})
            </button>
          )}
          {withErrors > 0 && (
            <p className="text-xs text-muted-foreground">
              Corrige las filas con error en tu Excel y vuelve a subirlo, o continúa solo con las
              listas.
            </p>
          )}
        </Step>
      )}

      {valid > 0 && (
        <Step number={4} title="Crea los envíos">
          <label className="block space-y-1">
            <span className={FIELD_LABEL}>Referencia del lote (opcional)</span>
            <input
              value={batchRef}
              maxLength={40}
              placeholder="Ej.: PEDIDOS-NOV-04"
              onChange={(event) => setBatchRef(event.target.value)}
              className={FIELD}
            />
          </label>
          <div className="grid gap-2 sm:grid-cols-2">
            <button type="button" disabled className={cn(PRIMARY_BUTTON, 'py-3')}>
              Crear {valid} envío{valid === 1 ? '' : 's'}
            </button>
            <button
              type="button"
              onClick={downloadJson}
              className={`${GLASS} rounded-xl px-4 py-3 text-sm font-medium`}
            >
              <FileDown size={16} aria-hidden /> Descargar JSON
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Crear envíos se activará cuando el servicio de lotes esté listo (por confirmar).
            Mientras tanto puedes descargar el lote en JSON.
          </p>
        </Step>
      )}

      <details className="group rounded-[1.25rem] bg-muted/70 px-4">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-4 text-[15px] font-medium [&::-webkit-details-marker]:hidden">
          ¿Tu empresa tiene su propio sistema?
          <ChevronDown
            size={18}
            aria-hidden
            className="shrink-0 text-muted-foreground transition group-open:rotate-180"
          />
        </summary>
        <div className="space-y-4 pb-4 text-sm">
          <p className="text-foreground/80">
            Tu sistema puede enviarnos los envíos en este formato JSON, con los mismos campos de la
            plantilla.
          </p>
          <ul className="divide-y rounded-xl bg-card">
            {BULK_COLUMNS.map((column) => (
              <li key={column.key} className="space-y-0.5 px-3 py-2">
                <p className="font-mono text-xs">{column.key}</p>
                <p className="text-xs text-muted-foreground">
                  {column.header} · {column.hint}
                </p>
              </li>
            ))}
          </ul>
          <pre className="overflow-x-auto rounded-xl bg-card p-3 font-mono text-xs leading-relaxed">
            {EXAMPLE_JSON}
          </pre>
        </div>
      </details>
    </div>
  )
}

function Step({ number, title, children }: { number: number; title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 rounded-[1.25rem] bg-card p-4 shadow-card sm:rounded-[1.75rem] sm:p-5">
      <h2 className="flex items-center gap-2.5 font-medium">
        <span className="grid size-7 place-items-center rounded-full bg-brand-deep text-xs text-brand-foreground">
          {number}
        </span>
        {title}
      </h2>
      {children}
    </section>
  )
}

function RowCard({ row }: { row: BulkRow }) {
  const { cells } = row
  const errors = Object.entries(row.errors) as [BulkColumnKey, string][]
  return (
    <li
      className={cn(
        'space-y-1.5 rounded-2xl border p-3',
        errors.length > 0 && 'border-destructive/40 bg-destructive/5',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-sm font-medium">
          Fila {row.line}
          {cells.referencia_cliente && (
            <span className="font-normal text-muted-foreground"> · {cells.referencia_cliente}</span>
          )}
        </p>
        {row.shipment ? (
          <StatusDot tone="ok">Lista</StatusDot>
        ) : (
          <span className="shrink-0 text-xs text-destructive">
            {errors.length} error{errors.length === 1 ? '' : 'es'}
          </span>
        )}
      </div>
      <p className="text-sm text-foreground/80">
        {cells.origen || '—'} → {cells.destino || '—'}
      </p>
      {row.shipment && (
        <p className="text-xs text-muted-foreground">
          {row.shipment.alto_cm}×{row.shipment.ancho_cm}×{row.shipment.largo_cm} cm ·{' '}
          {row.shipment.peso_real_kg} kg · {formatCop(row.shipment.valor_declarado_cop)} ·{' '}
          {row.shipment.destinatario.nombre}
        </p>
      )}
      {row.corrected.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Completamos {row.corrected.map((key) => HEADER_BY_KEY[key].toLowerCase()).join(' y ')}.
        </p>
      )}
      {errors.length > 0 && (
        <ul className="space-y-1">
          {errors.map(([key, message]) => (
            <li key={key} className="flex items-start gap-1 text-xs text-destructive">
              <CircleAlert size={13} aria-hidden className="mt-px shrink-0" />
              <span>
                <span className="font-medium">{HEADER_BY_KEY[key]}:</span> {message}
              </span>
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}
