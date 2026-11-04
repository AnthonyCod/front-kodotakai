import { useMutation } from '@tanstack/react-query'
import type { FormEvent } from 'react'
import { formatCop } from '@/shared/lib/format'
import { ErrorText } from '@/shared/ui/error-text'
import { FIELD, FIELD_LABEL, PRIMARY_BUTTON, type ResultSummary } from '@/shared/ui/form-styles'
import { CopyCode } from '@/shared/ui/copy-code'
import { EmptyResult, Metric } from '@/shared/ui/metric'
import { createQuote, type QuoteRequest } from '../api/quote-api'
import { quoteCode } from '../model/quote-code'
import { useQuoteDraftStore } from '../model/quote-draft-store'

const NUMBER_FIELDS = [
  ['alto_cm', 'Alto (cm)'],
  ['ancho_cm', 'Ancho (cm)'],
  ['largo_cm', 'Largo (cm)'],
  ['peso_real_kg', 'Peso real (kg)'],
  ['valor_declarado_cop', 'Valor declarado (COP)'],
] as const

/** Consulta directa `POST /cotizar`. El borrador sobrevive a la navegación (F50). */
export function QuoteForm({ onResult }: { onResult?: (result: ResultSummary) => void }) {
  const { draft, setField } = useQuoteDraftStore()
  const mutation = useMutation({
    mutationFn: createQuote,
    onSuccess: (data) =>
      onResult?.({
        reference: `${quoteCode(data.cotizacion_id)} · ${data.ruta.origen} → ${data.ruta.destino}`,
        summary: formatCop(data.calculo.flete_total_cop),
        alert: data.advertencias.length > 0,
        searchKey: data.cotizacion_id,
      }),
  })

  const submit = (event: FormEvent) => {
    event.preventDefault()
    mutation.mutate({
      requiere_cadena_frio: false,
      mercancia_peligrosa: false,
      ...draft,
      valor_declarado_cop: Math.round(draft.valor_declarado_cop ?? 0),
    } as QuoteRequest)
  }
  const data = mutation.data

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <form onSubmit={submit} className="grid grid-cols-2 gap-3">
        {(['origen', 'destino'] as const).map((field) => (
          <label key={field} className="space-y-1">
            <span className={`${FIELD_LABEL} capitalize`}>{field}</span>
            <input
              required
              value={draft[field] ?? ''}
              onChange={(e) => setField(field, e.target.value)}
              className={FIELD}
            />
          </label>
        ))}
        {NUMBER_FIELDS.map(([field, label]) => (
          <label
            key={field}
            className={field === 'valor_declarado_cop' ? 'col-span-2 space-y-1' : 'space-y-1'}
          >
            <span className={FIELD_LABEL}>{label}</span>
            <input
              required
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={draft[field] ?? ''}
              onChange={(e) => setField(field, Number(e.target.value))}
              className={FIELD}
            />
          </label>
        ))}
        <label className="col-span-2 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.requiere_cadena_frio ?? false}
            onChange={(e) => setField('requiere_cadena_frio', e.target.checked)}
          />
          Requiere cadena de frío
        </label>
        <label className="col-span-2 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.mercancia_peligrosa ?? false}
            onChange={(e) => setField('mercancia_peligrosa', e.target.checked)}
          />
          Mercancía peligrosa
        </label>
        <button
          type="submit"
          disabled={mutation.isPending}
          className={`col-span-2 ${PRIMARY_BUTTON}`}
        >
          {mutation.isPending ? 'Calculando…' : 'Cotizar'}
        </button>
        <div className="col-span-2">
          <ErrorText error={mutation.error} />
        </div>
      </form>

      {data ? (
        <div className="space-y-5">
          <div>
            <p className="text-sm text-muted-foreground">
              {data.ruta.origen} → {data.ruta.destino}
            </p>
            <p className="text-3xl font-semibold sm:text-4xl">
              {formatCop(data.calculo.flete_total_cop)}
            </p>
            <p className="text-xs text-muted-foreground">
              Flete total
              {data.calculo.flete_minimo_aplicado && ' · se aplicó el flete mínimo'}
            </p>
          </div>
          <CopyCode
            label="Código de tu cotización"
            code={quoteCode(data.cotizacion_id)}
            value={data.cotizacion_id}
          />
          <div className="grid grid-cols-2 gap-x-4 gap-y-5 border-t pt-5">
            <Metric label="Flete base" value={formatCop(data.calculo.flete_base_cop)} />
            <Metric label="Seguro" value={formatCop(data.calculo.seguro_cop)} />
            <Metric
              label="Peso facturable"
              value={`${data.calculo.peso_facturable_kg} kg`}
              hint={`Volumétrico ${data.calculo.peso_volumetrico_kg} kg`}
            />
            <Metric label="Entrega aprox." value={`${data.tiempo_entrega_horas} h`} />
          </div>
          {/* `supuestos` y `formula_version` son técnicos (clave=valor): no se muestran. */}
          {data.advertencias.length > 0 && (
            <ul className="space-y-1 rounded-xl bg-warning/10 p-3 text-xs">
              {data.advertencias.map((text) => (
                <li key={text}>• {text}</li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <EmptyResult>Completa los datos del paquete y aquí verás el valor del envío.</EmptyResult>
      )}
    </div>
  )
}
