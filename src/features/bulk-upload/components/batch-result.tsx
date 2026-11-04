import { useState } from 'react'
import { CircleAlert, RefreshCw } from 'lucide-react'
import { cn } from 'cn'
import { Badge, BadgeDot, BadgeSpinner } from '@/shared/ui/badge'
import { GLASS } from '@/shared/ui/glass'
import { itemErrorText, type BatchResultRow, type BatchSummary } from '../model/batch-result'
import { FilterTabs } from './filter-tabs'

const PAGE = 50
type Filter = 'rejected' | 'all'

/** Resultado del lote: cuántos se crearon, cuáles se rechazaron y por qué, y la guía de cada envío. */
export function BatchResult({
  summary,
  onRefresh,
  refreshing,
}: {
  summary: BatchSummary
  onRefresh: () => void
  refreshing: boolean
}) {
  const [filter, setFilter] = useState<Filter>(summary.rejected > 0 ? 'rejected' : 'all')
  const [visible, setVisible] = useState(PAGE)
  const shown =
    filter === 'rejected'
      ? summary.rows.filter(({ item }) => item.status === 'REJECTED')
      : summary.rows

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm" aria-live="polite">
        <Badge variant="success">
          <BadgeDot />
          {summary.created} creado{summary.created === 1 ? '' : 's'}
        </Badge>
        {summary.rejected > 0 && (
          <Badge variant="destructive">
            <BadgeDot />
            {summary.rejected} rechazado{summary.rejected === 1 ? '' : 's'}
          </Badge>
        )}
        {summary.pending > 0 && (
          <Badge variant="brand">
            <BadgeSpinner />
            {summary.pending} en proceso
          </Badge>
        )}
      </div>

      {summary.pending > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted p-3 text-sm">
          <p className="text-foreground/80">El lote todavía se está procesando.</p>
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className={`${GLASS} rounded-full px-3 py-1.5 text-sm`}
          >
            <RefreshCw size={14} aria-hidden className={cn(refreshing && 'animate-spin')} />
            {refreshing ? 'Consultando…' : 'Actualizar'}
          </button>
        </div>
      )}

      {summary.rejected > 0 && (
        <FilterTabs
          value={filter}
          onChange={setFilter}
          options={[
            ['rejected', 'Rechazados', summary.rejected],
            ['all', 'Todos', summary.rows.length],
          ]}
        />
      )}

      <ul className="space-y-2">
        {shown.slice(0, visible).map((result) => (
          <ResultCard key={result.item.linea} result={result} />
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
      {summary.rejected > 0 && (
        <p className="text-xs text-muted-foreground">
          Los rechazados no se crearon. Corrígelos en tu Excel y súbelos en un lote nuevo, con otra
          referencia de lote.
        </p>
      )}
    </div>
  )
}

function ResultCard({ result: { item, row } }: { result: BatchResultRow }) {
  const reference = item.referencia_cliente ?? row?.shipment?.referencia_cliente
  const rejected = item.status === 'REJECTED'
  return (
    <li className={cn('space-y-1.5 rounded-2xl bg-muted/50 p-3', rejected && 'bg-destructive/5')}>
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-sm font-medium">
          {row ? `Fila ${row.line}` : `Envío ${item.linea}`}
          {reference && <span className="font-normal text-muted-foreground"> · {reference}</span>}
        </p>
        {item.status === 'CREATED' && (
          <Badge variant="success">
            <BadgeDot />
            Creado
          </Badge>
        )}
        {item.status === 'PENDING' && (
          <Badge variant="brand">
            <BadgeSpinner />
            En proceso
          </Badge>
        )}
        {rejected && (
          <Badge variant="destructive">
            <BadgeDot />
            Rechazado
          </Badge>
        )}
      </div>
      {row?.shipment && (
        <p className="text-sm text-foreground/80">
          {row.shipment.origen} → {row.shipment.destino} · {row.shipment.destinatario.nombre}
        </p>
      )}
      {item.numero_guia && (
        <p className="text-xs text-muted-foreground">
          Guía <span className="font-mono font-semibold text-foreground">{item.numero_guia}</span>
        </p>
      )}
      {rejected && (
        <ul className="space-y-1">
          {(item.errores?.length ? item.errores : [{ code: '' }]).map((error, index) => (
            <li key={index} className="flex items-start gap-1 text-xs text-destructive">
              <CircleAlert size={13} aria-hidden className="mt-px shrink-0" />
              <span>{error.code ? itemErrorText(error) : 'No se pudo crear este envío.'}</span>
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}
