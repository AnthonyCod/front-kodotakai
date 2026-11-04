import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { formatDateTime } from '@/shared/lib/format'
import { ErrorText } from '@/shared/ui/error-text'
import { FIELD, FIELD_LABEL, PRIMARY_BUTTON, type ResultSummary } from '@/shared/ui/form-styles'
import { EmptyResult, Metric } from '@/shared/ui/metric'
import { getTracking } from '../api/tracking-api'
import { GUIA_PATTERN } from '../api/tracking-card-block'
import { buildTimeline } from '../model/tracking-timeline'
import { TrackingCard } from './blocks/tracking-card'

/** Consulta directa `GET /tracking/{guia}`, sin pasar por el chat. */
export function TrackingLookup({ onResult }: { onResult?: (result: ResultSummary) => void }) {
  const [guia, setGuia] = useState('')
  const mutation = useMutation({
    mutationFn: getTracking,
    onSuccess: (data) =>
      onResult?.({
        reference: data.numero_guia,
        summary: data.estado_actual.etiqueta,
        alert: buildTimeline({ ...data, estado: data.estado_actual, eta: null }).tone === 'alert',
      }),
  })
  const valid = GUIA_PATTERN.test(guia)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (valid) mutation.mutate(guia)
  }
  const data = mutation.data

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-5">
        <form onSubmit={submit} className="space-y-2">
          <label htmlFor="guia" className={FIELD_LABEL}>
            Número de guía
          </label>
          <div className="flex gap-2">
            <input
              id="guia"
              value={guia}
              onChange={(e) => setGuia(e.target.value.toUpperCase().trim())}
              placeholder="TLX-123456-CO"
              className={FIELD}
            />
            <button
              type="submit"
              disabled={!valid || mutation.isPending}
              className={PRIMARY_BUTTON}
            >
              {mutation.isPending ? 'Buscando…' : 'Rastrear'}
            </button>
          </div>
          {guia && !valid && (
            <p className="text-xs text-muted-foreground">Formato: TLX-123456-CO</p>
          )}
          <ErrorText error={mutation.error} />
        </form>

        {data && (
          <>
            <div>
              <p className="text-sm text-muted-foreground">Estado actual</p>
              <p className="text-2xl font-semibold sm:text-3xl">{data.estado_actual.etiqueta}</p>
              <p className="text-sm text-muted-foreground">{data.estado_actual.explicacion}</p>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-5 border-t pt-5">
              <Metric label="Ruta" value={`${data.origen_ciudad} → ${data.destino_ciudad}`} />
              <Metric label="Servicio" value={data.tipo_servicio} />
              <Metric
                label="Entrega estimada"
                value={
                  data.fecha_estimada_entrega ? formatDateTime(data.fecha_estimada_entrega) : '—'
                }
              />
              <Metric
                label="Última temperatura"
                value={data.ultima_temperatura_c !== null ? `${data.ultima_temperatura_c} °C` : '—'}
              />
            </div>
          </>
        )}
      </div>

      {data ? (
        <TrackingCard
          numero_guia={data.numero_guia}
          estado={data.estado_actual}
          eta={data.fecha_estimada_entrega}
          ubicacion_referencia={data.ubicacion_referencia}
          eventos={data.eventos}
          flags={data.flags}
        />
      ) : (
        <EmptyResult>Escribe tu número de guía y aquí verás cada estado de tu envío.</EmptyResult>
      )}
    </div>
  )
}
