import { TriangleAlert } from 'lucide-react'
import { cn } from 'cn'
import type { TrackingResponse } from '@/features/tracking'
import { useTmsTracking } from '../model/use-tms-tracking'
import { ErrorText } from '@/shared/ui/error-text'
import { Badge } from './ui'

const dateTime = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
})

/** Novedades del TMS (por confirmar: el backend no publica la lista de estados). */
const ALERT = /RETENIDO|NOVEDAD|DEVUELTO|DANO|SINIESTRO|INCIDENCIA/

/** Guía, ruta, estado actual y línea de tiempo (más reciente al final, como en el diseño). */
export function TmsTimeline({ data }: { data: TrackingResponse }) {
  const alert = ALERT.test(data.estado_actual.codigo)
  const events = [...data.eventos].sort((a, b) => a.timestamp.localeCompare(b.timestamp)).slice(-4)

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-primary tabular-nums">{data.numero_guia}</p>
          <p className="text-xs text-muted-foreground">
            {data.origen_ciudad} a {data.destino_ciudad} · {data.tipo_servicio}
          </p>
        </div>
        <Badge tone={alert ? 'warning' : 'primary'}>
          {alert && <TriangleAlert className="size-3.5" strokeWidth={1.75} aria-hidden />}
          {data.estado_actual.etiqueta}
        </Badge>
      </div>
      <ol className="space-y-3">
        {events.map((evento, index) => {
          const last = index === events.length - 1
          const isAlert = ALERT.test(evento.estado)
          return (
            <li key={evento.timestamp + evento.estado} className="flex gap-3">
              <span
                aria-hidden
                className={cn(
                  'mt-1.5 size-2.5 shrink-0 rounded-full',
                  isAlert ? 'bg-warning' : last ? 'bg-primary' : 'bg-success',
                )}
              />
              <div className="min-w-0 flex-1">
                <p className="flex justify-between gap-2 text-sm font-semibold">
                  {evento.etiqueta}
                  <span className="shrink-0 text-xs font-normal text-muted-foreground tabular-nums">
                    {dateTime.format(new Date(evento.timestamp))}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {evento.descripcion_cliente || evento.ubicacion}
                </p>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

/** Tracking de una guía que puede no existir todavía (venta sin cerrar). */
export function TmsTrackingSection({ guia }: { guia: string | null }) {
  const query = useTmsTracking(guia)
  if (!guia) {
    return (
      <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge tone="warning" dot>
          Sin guía aún
        </Badge>
        La guía TLX se genera al cerrar la venta.
      </p>
    )
  }
  if (query.isPending) return <div className="h-24 animate-pulse rounded-lg bg-muted" />
  if (query.error) return <ErrorText error={query.error} />
  return <TmsTimeline data={query.data} />
}
