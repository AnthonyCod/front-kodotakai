import { useState, type DragEvent, type FormEvent, type ReactNode } from 'react'
import { useMutation } from '@tanstack/react-query'
import { AnimateIcon } from '@animate-ui/react/icons'
import { Braces, ChevronDown, CircleAlert, FileDown, FileSpreadsheet } from 'lucide-react'
import { cn } from 'cn'
import { toApiError } from '@/shared/api'
import { env } from '@/shared/config/env'
import { formatCop } from '@/shared/lib/format'
import { Badge, BadgeDot } from '@/shared/ui/badge'
import { Download01 } from '@/shared/components/animate-ui/icons/hugeicons/download-01'
import { Sparkles } from '@/shared/components/animate-ui/icons/hugeicons/sparkles'
import { Upload01 } from '@/shared/components/animate-ui/icons/hugeicons/upload-01'
import { FIELD, FIELD_LABEL, PRIMARY_BUTTON } from '@/shared/ui/form-styles'
import { GLASS } from '@/shared/ui/glass'
import { PAGE_SUBTITLE, PAGE_TITLE, SURFACE } from '@/shared/ui/page'
import { Reveal } from '@/shared/ui/reveal'
import { createShipmentBatch, fetchBatchItems, type BatchItem } from '../api/batches-api'
import { batchErrorText, suggestBatchRef, summarizeBatch } from '../model/batch-result'
import { BULK_COLUMNS, MAX_ROWS, type BulkColumnKey } from '../model/bulk-columns'
import { buildBatch, parseBulkSheet, sendableRows, type BulkRow } from '../model/bulk-rows'
import { downloadTemplate } from '../model/template'
import { BatchResult } from './batch-result'
import { FilterTabs } from './filter-tabs'

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

const BATCHES_URL = `${env.apiUrl}/shipment-batches`
const INTEGRATION_REQUEST = [
  `POST ${BATCHES_URL}`,
  'Authorization: Bearer <tu API key>',
  'Idempotency-Key: PEDIDOS-NOV-04',
  'Content-Type: application/json',
].join('\n')

/** Opción de la zona de carga: recuadro con contorno, icono arriba, título y texto (como una hoja de «agregar»). */
const UPLOAD_TILE =
  'flex h-full cursor-pointer flex-col items-center justify-start gap-2 rounded-3xl border-[1.5px] border-foreground/70 bg-card px-3 py-5 text-center transition hover:bg-muted/40 active:scale-[0.98] sm:px-5 sm:py-6'

type Filter = 'all' | 'errors'

/** Lote enviado: el id para volver a consultarlo y las filas que salieron, en orden. */
interface SentBatch {
  batchId: string
  rows: BulkRow[]
  items: BatchItem[]
}

/**
 * Carga masiva: plantilla → archivo → revisión fila por fila → `POST /shipment-batches`.
 * El Excel se lee y valida en el navegador; el backend crea cada envío por separado y responde cuál
 * se creó (con su guía) y cuál no. La API key solo vive en memoria: no se guarda ni se registra.
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
  const [apiKey, setApiKey] = useState('')
  const [sent, setSent] = useState<SentBatch | null>(null)

  const create = useMutation({
    mutationFn: async ({ key, reference }: { key: string; reference: string }) => {
      const outgoing = sendableRows(rows)
      const { batch_id } = await createShipmentBatch(key, buildBatch(reference, outgoing))
      return { batchId: batch_id, rows: outgoing, items: await fetchBatchItems(key, batch_id) }
    },
    onSuccess: setSent,
  })
  // «En proceso» (otra petición del mismo lote sigue viva): se vuelve a pedir el detalle.
  const refresh = useMutation({
    mutationFn: (batch: SentBatch) => fetchBatchItems(apiKey.trim(), batch.batchId),
    onSuccess: (items) => setSent((current) => current && { ...current, items }),
  })
  const summary = sent && summarizeBatch(sent.items, sent.rows)
  const error = create.error ?? refresh.error

  const valid = rows.filter((row) => row.shipment).length
  const withErrors = rows.length - valid
  const shown = filter === 'errors' ? rows.filter((row) => !row.shipment) : rows

  async function load(file: File | undefined) {
    if (!file) return
    setFileError(null)
    setRows([])
    resetBatch()
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
      setBatchRef((current) => current || suggestBatchRef(new Date()))
    } catch {
      setFileError('No pudimos leer el archivo. Revisa que sea la plantilla en formato .xlsx.')
    } finally {
      setReading(false)
    }
  }

  function resetBatch() {
    setSent(null)
    create.reset()
    refresh.reset()
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    create.mutate({ key: apiKey.trim(), reference: batchRef.trim() })
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
    <div className="mx-auto w-full max-w-3xl space-y-5 px-4 py-3 sm:space-y-6 sm:px-6 sm:py-6">
      <Reveal as="header" className="space-y-1">
        <h1 className={PAGE_TITLE}>Carga masiva</h1>
        <p className={PAGE_SUBTITLE}>Crea muchos envíos a la vez desde un archivo de Excel.</p>
      </Reveal>

      {/* Agregar envíos: dos opciones (subir el Excel o bajar la plantilla) y, abajo, la API. */}
      <Reveal as="section" className={cn(SURFACE, 'space-y-5 p-5 text-center sm:p-7')}>
        <div aria-hidden className="relative mx-auto h-24 w-36">
          <span className="absolute top-5 left-6 h-16 w-14 -rotate-12 rounded-2xl bg-primary/20" />
          <span className="absolute top-4 right-6 h-16 w-14 rotate-12 rounded-2xl bg-brand/25" />
          <span className="absolute top-1 left-1/2 grid h-[4.75rem] w-16 -translate-x-1/2 place-items-center rounded-2xl bg-card shadow-[0_2px_6px_rgb(15_23_42/0.08),0_12px_28px_rgb(15_23_42/0.14)]">
            <FileSpreadsheet className="size-8 text-success" />
          </span>
          <Sparkles
            size={20}
            animateOnView
            animateOnViewOnce
            className="absolute top-0 right-3 text-warning"
          />
          <Sparkles
            size={14}
            animateOnView
            animateOnViewOnce
            className="absolute bottom-2 left-4 text-brand"
          />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-lg font-semibold tracking-tight sm:text-xl">Agrega tus envíos</h2>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            Una fila por envío. En la hoja «Instrucciones» de la plantilla está qué va en cada
            columna.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <AnimateIcon animateOnHover asChild>
            <label
              onDragOver={(event) => {
                event.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={cn(
                UPLOAD_TILE,
                dragging && 'border-brand bg-brand/5',
                fileError && 'border-destructive/60 bg-destructive/5',
                fileName && !fileError && 'border-success/70 bg-success/5',
              )}
            >
              <span
                className={cn(
                  'grid size-12 place-items-center rounded-2xl',
                  fileName && !fileError
                    ? 'bg-success/10 text-success'
                    : 'bg-brand/10 text-brand-deep',
                )}
              >
                {fileName && !fileError ? (
                  <FileSpreadsheet size={22} aria-hidden />
                ) : (
                  <Upload01 size={22} aria-hidden />
                )}
              </span>
              <span className="text-[15px] font-semibold sm:text-base">
                {reading ? 'Leyendo…' : fileName ? 'Archivo listo' : 'Sube tu Excel'}
              </span>
              <span className="line-clamp-3 text-xs leading-snug text-muted-foreground sm:text-sm">
                {fileName
                  ? `${fileName} · toca para cambiarlo`
                  : `Toca o arrastra tu .xlsx aquí. Máximo ${MAX_ROWS} envíos.`}
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
          </AnimateIcon>
          <AnimateIcon animateOnHover asChild>
            <button type="button" onClick={() => void downloadTemplate()} className={UPLOAD_TILE}>
              <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                <Download01 size={22} aria-hidden />
              </span>
              <span className="text-[15px] font-semibold sm:text-base">Descarga la plantilla</span>
              <span className="line-clamp-3 text-xs leading-snug text-muted-foreground sm:text-sm">
                El archivo .xlsx con las columnas listas para llenar.
              </span>
            </button>
          </AnimateIcon>
        </div>

        {fileError && (
          <p
            role="alert"
            className="flex gap-2 rounded-xl bg-destructive/5 p-3 text-left text-sm text-destructive"
          >
            <CircleAlert size={16} aria-hidden className="mt-0.5 shrink-0" />
            {fileError}
          </p>
        )}

        <div className="flex items-center gap-3 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
          <span className="h-px flex-1 bg-border" />
          O desde tu sistema
          <span className="h-px flex-1 bg-border" />
        </div>
        <p className="flex items-center justify-center gap-2.5 text-left text-sm text-foreground/80 sm:text-center">
          <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-muted text-foreground/70">
            <Braces size={15} aria-hidden />
          </span>
          <span>
            Tu sistema puede crear los envíos con{' '}
            <a href="#integracion" className="font-medium text-brand-deep hover:underline">
              nuestra API de lotes
            </a>
            , con los mismos campos de la plantilla.
          </span>
        </p>
      </Reveal>

      {rows.length > 0 && (
        <Step number={1} title="Revisa los envíos">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <span>{rows.length} filas</span>
            <Badge variant="success">
              <BadgeDot />
              {valid} listas
            </Badge>
            {withErrors > 0 && (
              <Badge variant="destructive">
                <BadgeDot />
                {withErrors} con error
              </Badge>
            )}
          </div>

          {withErrors > 0 && (
            <FilterTabs
              value={filter}
              onChange={setFilter}
              options={[
                ['errors', 'Con error', withErrors],
                ['all', 'Todas', rows.length],
              ]}
            />
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
        <Step number={2} title="Crea los envíos">
          <form onSubmit={submit} className="space-y-3">
            <label className="block space-y-1">
              <span className={FIELD_LABEL}>API key de tu empresa</span>
              <input
                type="password"
                required
                value={apiKey}
                autoComplete="off"
                spellCheck={false}
                onChange={(event) => setApiKey(event.target.value)}
                className={FIELD}
              />
              <span className="block text-xs text-muted-foreground">
                Te la entrega TransLogix. Solo se usa para este envío: no se guarda.
              </span>
            </label>
            <label className="block space-y-1">
              <span className={FIELD_LABEL}>Referencia del lote</span>
              <input
                required
                value={batchRef}
                maxLength={40}
                placeholder="Ej.: PEDIDOS-NOV-04"
                onChange={(event) => {
                  setBatchRef(event.target.value)
                  resetBatch()
                }}
                className={FIELD}
              />
              <span className="block text-xs text-muted-foreground">
                Si envías otra vez el mismo archivo con la misma referencia, no se duplican envíos.
              </span>
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="submit"
                disabled={create.isPending || sent !== null}
                className={cn(PRIMARY_BUTTON, 'py-3')}
              >
                {create.isPending
                  ? 'Creando envíos…'
                  : sent
                    ? 'Lote enviado'
                    : `Crear ${valid} envío${valid === 1 ? '' : 's'}`}
              </button>
              <button
                type="button"
                onClick={downloadJson}
                className={`${GLASS} rounded-full px-4 py-3 text-sm font-medium`}
              >
                <FileDown size={16} aria-hidden /> Descargar JSON
              </button>
            </div>
            {create.isPending && valid > 100 && (
              <p className="text-xs text-muted-foreground">
                Un lote grande puede tardar hasta un par de minutos. No cierres esta pantalla.
              </p>
            )}
            {error && (
              <p
                role="alert"
                className="flex gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
              >
                <CircleAlert size={16} aria-hidden className="mt-0.5 shrink-0" />
                {batchErrorText(toApiError(error))}
              </p>
            )}
          </form>
        </Step>
      )}

      {sent && summary && (
        <Step number={3} title="Resultado del lote">
          <BatchResult
            key={sent.batchId}
            summary={summary}
            refreshing={refresh.isPending}
            onRefresh={() => refresh.mutate(sent)}
          />
        </Step>
      )}

      <details id="integracion" className={cn(SURFACE, 'group scroll-mt-4 px-4')}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-4 text-[15px] font-medium [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand-deep">
              <Braces size={15} aria-hidden />
            </span>
            ¿Tu empresa tiene su propio sistema?
          </span>
          <ChevronDown
            size={18}
            aria-hidden
            className="shrink-0 text-muted-foreground transition group-open:rotate-180"
          />
        </summary>
        <div className="space-y-4 pb-4 text-sm">
          <p className="text-foreground/80">
            Tu sistema puede crear los envíos directamente, con tu API key y los mismos campos de la
            plantilla. Cada envío se procesa por separado: los inválidos se rechazan con su motivo y
            los demás se crean.
          </p>
          <pre className="overflow-x-auto rounded-xl bg-card p-3 font-mono text-xs leading-relaxed">
            {INTEGRATION_REQUEST}
          </pre>
          <p className="text-xs text-muted-foreground">
            Repetir el mismo lote con la misma referencia no duplica envíos. El resultado de cada
            envío se consulta en{' '}
            <span className="font-mono">
              GET {BATCHES_URL}/{'{id}'}/items
            </span>
            .
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
    <Reveal as="section" className={cn(SURFACE, 'space-y-3 p-4 sm:p-5')}>
      <h2 className="flex items-center gap-2.5 font-medium">
        <span className="grid size-7 place-items-center rounded-full bg-brand-deep text-xs text-brand-foreground">
          {number}
        </span>
        {title}
      </h2>
      {children}
    </Reveal>
  )
}

function RowCard({ row }: { row: BulkRow }) {
  const { cells } = row
  const errors = Object.entries(row.errors) as [BulkColumnKey, string][]
  return (
    <li
      className={cn(
        'space-y-1.5 rounded-2xl bg-muted/50 p-3',
        errors.length > 0 && 'bg-destructive/5',
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
          <Badge variant="success">
            <BadgeDot />
            Lista
          </Badge>
        ) : (
          <Badge variant="destructive">
            <BadgeDot />
            {errors.length} error{errors.length === 1 ? '' : 'es'}
          </Badge>
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
