import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router'
import { PackagePlus } from 'lucide-react'
import { cn } from 'cn'
import logiUrl from '@/assets/logi.webp'
import { useRequireAuth } from '@/features/auth'
import { requestShipment, SHIPMENTS_QUERY_KEY } from '@/features/shipments'
import { formatCop } from '@/shared/lib/format'
import { BlockCard, BlockHeader } from '@/shared/ui/block-card'
import { Autocomplete } from '@/shared/ui/autocomplete'
import { ErrorText } from '@/shared/ui/error-text'
import { FieldError } from '@/shared/ui/field-error'
import { FIELD, FIELD_LABEL, PRIMARY_BUTTON } from '@/shared/ui/form-styles'
import { GLASS } from '@/shared/ui/glass'
import { SplitText } from '@/shared/ui/split-text'
import { createQuote, type QuoteRequest } from '../api/quote-api'
import { CITIES } from '../model/cities'
import { parseShipmentForm, type ShipmentErrors, type ShipmentField } from '../model/shipment-form'
import { QuoteSummary } from './blocks/quote-summary'

/** Pausa de "Logi está escribiendo…" antes de mostrar el formulario (conversación simulada). */
const TYPING_MS = 700

type Values = Record<
  Exclude<ShipmentField, 'requiere_cadena_frio' | 'mercancia_peligrosa'>,
  string
> & {
  requiere_cadena_frio: boolean
  mercancia_peligrosa: boolean
}

const EMPTY: Values = {
  origen: '',
  destino: '',
  alto_cm: '',
  ancho_cm: '',
  largo_cm: '',
  peso_real_kg: '',
  valor_declarado_cop: '',
  requiere_cadena_frio: false,
  mercancia_peligrosa: false,
}

/**
 * "Hacer envío": conversación guiada. Logi pide los datos con un formulario dentro del chat;
 * aquí no hay caja de texto y la respuesta sale de `POST /cotizar`.
 */
export function ShipmentChat() {
  const [intro, setIntro] = useState(false)
  const [values, setValues] = useState<Values>(EMPTY)
  const [errors, setErrors] = useState<ShipmentErrors>({})
  const [sent, setSent] = useState<QuoteRequest | null>(null)
  const mutation = useMutation({ mutationFn: createQuote })
  const queryClient = useQueryClient()
  const save = useMutation({
    mutationFn: requestShipment,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SHIPMENTS_QUERY_KEY }),
  })
  const requireAuth = useRequireAuth()
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const id = window.setTimeout(() => setIntro(true), TYPING_MS)
    return () => window.clearTimeout(id)
  }, [])

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' })
  }, [intro, sent, mutation.status, save.status])

  function submit(event: FormEvent) {
    event.preventDefault()
    const parsed = parseShipmentForm(values)
    if (!parsed.ok) return setErrors(parsed.errors)
    setErrors({})
    setSent(parsed.request)
    mutation.mutate(parsed.request)
  }

  function restart() {
    mutation.reset()
    save.reset()
    setSent(null)
    setValues(EMPTY)
    setErrors({})
  }

  const data = mutation.data

  /** Solicitar exige cuenta: sin sesión se abre el login y, al ingresar, se envía solo. */
  function saveShipment(cotizacionId: string) {
    requireAuth('Ingresa para solicitar tu envío. Lo que llenaste no se pierde.', () =>
      save.mutate(cotizacionId),
    )
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-5xl flex-col gap-3 px-4 pt-3 pb-3 sm:px-6 sm:pt-6 sm:pb-5">
      <div
        className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-1 sm:space-y-7"
        aria-live="polite"
      >
        <UserBubble>Quiero hacer un envío</UserBubble>

        {!intro ? (
          <Typing />
        ) : (
          <LogiRow>
            <SplitText
              as="p"
              animate
              text="¡Claro! Para preparar tu envío necesito estos datos. Con ellos te digo cuánto cuesta y cuánto tarda."
              className="text-[15px] leading-relaxed text-foreground/80 sm:text-base"
            />
            {!sent && (
              <ShipmentForm
                values={values}
                errors={errors}
                onChange={(field, value) => {
                  setValues((current) => ({ ...current, [field]: value }))
                  // El rojo se quita en cuanto el usuario corrige ese campo.
                  setErrors((current) => ({ ...current, [field]: undefined }))
                }}
                onSubmit={submit}
              />
            )}
          </LogiRow>
        )}

        {sent && (
          <UserBubble>
            {sent.origen} → {sent.destino} · {sent.alto_cm}×{sent.ancho_cm}×{sent.largo_cm} cm ·{' '}
            {sent.peso_real_kg} kg · {formatCop(sent.valor_declarado_cop)}
            {sent.requiere_cadena_frio && ' · cadena de frío'}
            {sent.mercancia_peligrosa && ' · mercancía peligrosa'}
          </UserBubble>
        )}

        {sent && mutation.isPending && <Typing />}

        {sent && mutation.isError && (
          <LogiRow>
            <ErrorText error={mutation.error} />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={`${GLASS} rounded-full px-4 py-2 text-sm`}
                onClick={() => mutation.mutate(sent)}
              >
                Reintentar
              </button>
              <button
                type="button"
                className={`${GLASS} rounded-full px-4 py-2 text-sm`}
                onClick={() => setSent(null)}
              >
                Corregir datos
              </button>
            </div>
          </LogiRow>
        )}

        {sent && data && (
          <LogiRow>
            <SplitText
              as="p"
              animate
              text="Listo, este es el valor de tu envío. Si te sirve, solicítalo y un encargado lo revisa."
              className="text-[15px] leading-relaxed text-foreground/80 sm:text-base"
            />
            <QuoteSummary
              cotizacion_id={data.cotizacion_id}
              codigo_trayecto=""
              origen={data.ruta.origen}
              destino={data.ruta.destino}
              peso_facturable_kg={data.calculo.peso_facturable_kg}
              flete_total_cop={data.calculo.flete_total_cop}
              tiempo_entrega_horas={data.tiempo_entrega_horas}
              formula_version={data.formula_version}
              advertencias={data.advertencias}
            />
            {!save.data && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={save.isPending}
                  className={cn(PRIMARY_BUTTON, 'rounded-full')}
                  onClick={() => saveShipment(data.cotizacion_id)}
                >
                  {save.isPending ? 'Enviando…' : 'Solicitar envío'}
                </button>
                <button
                  type="button"
                  className={`${GLASS} rounded-full px-4 py-2 text-sm`}
                  onClick={restart}
                >
                  Cotizar otro envío
                </button>
              </div>
            )}
            <ErrorText error={save.error} />
          </LogiRow>
        )}

        {save.data && (
          <LogiRow>
            <SplitText
              as="p"
              animate
              text="¡Listo! Tu solicitud quedó pendiente de aprobación. Cuando un encargado la apruebe, verás el número de guía en Mis envíos."
              className="text-[15px] leading-relaxed text-foreground/80 sm:text-base"
            />
            <div className="flex flex-wrap gap-2">
              <Link to="/mis-envios" className={cn(PRIMARY_BUTTON, 'rounded-full')}>
                Ver mis envíos
              </Link>
              <button
                type="button"
                className={`${GLASS} rounded-full px-4 py-2 text-sm`}
                onClick={restart}
              >
                Hacer otro envío
              </button>
              <Link to="/" className={`${GLASS} rounded-full px-4 py-2 text-sm`}>
                Hablar con Logi
              </Link>
            </div>
          </LogiRow>
        )}
        <div ref={endRef} />
      </div>
    </div>
  )
}

function ShipmentForm({
  values,
  errors,
  onChange,
  onSubmit,
}: {
  values: Values
  errors: ShipmentErrors
  onChange: (field: ShipmentField, value: string | boolean) => void
  onSubmit: (event: FormEvent) => void
}) {
  const field = (
    name: Exclude<ShipmentField, 'requiere_cadena_frio' | 'mercancia_peligrosa'>,
    label: string,
    placeholder: string,
  ) => (
    <label className="block space-y-1">
      <span className={FIELD_LABEL}>{label}</span>
      {name === 'origen' || name === 'destino' ? (
        <Autocomplete
          name={name}
          value={values[name]}
          options={CITIES}
          placeholder={placeholder}
          invalid={Boolean(errors[name])}
          onChange={(value) => onChange(name, value)}
        />
      ) : (
        <input
          name={name}
          value={values[name]}
          placeholder={placeholder}
          inputMode="decimal"
          autoComplete="off"
          aria-invalid={Boolean(errors[name])}
          onChange={(event) => onChange(name, event.target.value)}
          className={FIELD}
        />
      )}
      <FieldError>{errors[name]}</FieldError>
    </label>
  )

  return (
    <BlockCard>
      <BlockHeader
        icon={<PackagePlus size={20} aria-hidden />}
        title="Datos de tu envío"
        subtitle="Todos los campos son obligatorios"
      />
      <form noValidate onSubmit={onSubmit} className="space-y-4">
        <fieldset className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <legend className="mb-2 text-sm font-medium">Ruta</legend>
          {field('origen', 'Punto de partida', 'Escribe una ciudad')}
          {field('destino', 'Punto de llegada', 'Escribe una ciudad')}
        </fieldset>

        <fieldset className="grid grid-cols-3 gap-2 sm:gap-3">
          <legend className="mb-2 text-sm font-medium">Paquete (cm)</legend>
          {field('alto_cm', 'Alto', 'Ej. 30')}
          {field('ancho_cm', 'Ancho', 'Ej. 20')}
          {field('largo_cm', 'Largo', 'Ej. 15')}
        </fieldset>

        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {field('peso_real_kg', 'Peso (kg)', 'Ej. 5')}
          {field('valor_declarado_cop', 'Valor declarado (COP)', 'Ej. 200000')}
        </div>

        <div className="space-y-2 text-sm">
          {(
            [
              ['requiere_cadena_frio', 'Requiere cadena de frío'],
              ['mercancia_peligrosa', 'Mercancía peligrosa'],
            ] as const
          ).map(([name, label]) => (
            <label key={name} className="flex items-center gap-2">
              <input
                type="checkbox"
                className="size-4 accent-brand-deep"
                checked={values[name]}
                onChange={(event) => onChange(name, event.target.checked)}
              />
              {label}
            </label>
          ))}
        </div>

        <button type="submit" className={cn(PRIMARY_BUTTON, 'w-full py-3 text-base')}>
          Calcular mi envío
        </button>
      </form>
    </BlockCard>
  )
}

function UserBubble({ children }: { children: ReactNode }) {
  return (
    <p className="ml-auto w-fit max-w-[85%] rounded-3xl bg-user-bubble px-4 py-2.5 text-[15px] break-words text-user-bubble-foreground sm:px-5 sm:py-3 sm:text-base">
      {children}
    </p>
  )
}

function LogiRow({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 sm:gap-4">
      <img src={logiUrl} alt="" className="size-8 shrink-0 rounded-[22%] shadow-card sm:size-11" />
      <div className="max-w-full min-w-0 flex-1 space-y-3 sm:max-w-[85%]">{children}</div>
    </div>
  )
}

function Typing() {
  return (
    <LogiRow>
      <p className="animate-pulse pt-2 text-sm text-muted-foreground" role="status">
        Logi está escribiendo…
      </p>
    </LogiRow>
  )
}
