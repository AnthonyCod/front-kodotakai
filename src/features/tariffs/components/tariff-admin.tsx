import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Plus, Search } from 'lucide-react'
import { cn } from 'cn'
import { formatCop } from '@/shared/lib/format'
import { normalizeText } from '@/shared/lib/text-match'
import { ErrorText } from '@/shared/ui/error-text'
import { FieldError } from '@/shared/ui/field-error'
import { FIELD, FIELD_LABEL, PRIMARY_BUTTON } from '@/shared/ui/form-styles'
import { GLASS } from '@/shared/ui/glass'
import {
  COVERAGE_TYPES,
  createTariff,
  fetchAllTariffs,
  updateTariff,
  type TariffUpdate,
} from '../api/tariffs-api'
import { ADMIN_TARIFFS_QUERY_KEY, TARIFFS_QUERY_KEY } from '../model/tariffs'
import {
  EMPTY_TARIFF,
  IDENTITY_FIELDS,
  changedFields,
  parseTariffForm,
  toValues,
  type TariffErrors,
  type TariffField,
  type TariffValues,
} from '../model/tariff-form'

const CARD = 'rounded-[1.25rem] bg-card p-4 shadow-card sm:p-5'

/** `/admin/tarifas`: el administrador crea, edita y desactiva rutas de la matriz. */
export function TariffAdmin() {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ADMIN_TARIFFS_QUERY_KEY, queryFn: fetchAllTariffs })
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)

  const refresh = () => queryClient.invalidateQueries({ queryKey: TARIFFS_QUERY_KEY })
  const create = useMutation({
    mutationFn: createTariff,
    onSuccess: () => {
      setCreating(false)
      return refresh()
    },
  })
  const update = useMutation({
    mutationFn: ({ codigo, body }: { codigo: string; body: TariffUpdate }) =>
      updateTariff(codigo, body),
    onSuccess: () => {
      setEditing(null)
      return refresh()
    },
  })

  const needle = normalizeText(search)
  const routes = (query.data?.items ?? []).filter((route) =>
    normalizeText(`${route.origen} ${route.destino} ${route.codigo_trayecto}`).includes(needle),
  )

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 px-3 py-3 sm:px-6 sm:py-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-medium">Tarifas</h1>
          <p className="text-sm text-muted-foreground">
            Lo que guardes aquí se usa en las cotizaciones desde ese momento.
          </p>
        </div>
        {!creating && (
          <button
            type="button"
            className={cn(PRIMARY_BUTTON, 'flex items-center gap-1.5 rounded-full')}
            onClick={() => {
              create.reset()
              setCreating(true)
            }}
          >
            <Plus size={16} aria-hidden /> Nueva ruta
          </button>
        )}
      </div>

      {creating && (
        <div className={CARD}>
          <h2 className="mb-3 font-medium">Nueva ruta</h2>
          <TariffForm
            initial={EMPTY_TARIFF}
            pending={create.isPending}
            error={create.error}
            submitLabel="Crear ruta"
            onCancel={() => setCreating(false)}
            onSubmit={(tariff) => create.mutate(tariff)}
          />
        </div>
      )}

      <label className="relative block">
        <span className="sr-only">Buscar ruta</span>
        <Search
          size={16}
          aria-hidden
          className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
        />
        <input
          className={cn(FIELD, 'pl-9')}
          type="search"
          placeholder="Buscar por ciudad o código"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>

      {query.isPending && <p className="text-sm text-muted-foreground">Cargando tarifas…</p>}
      <ErrorText error={query.error} />

      <ul className="space-y-2">
        {routes.map((route) => (
          <li key={route.codigo_trayecto} className={cn(CARD, !route.activo && 'opacity-70')}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium">
                  {route.origen} → {route.destino}
                </p>
                <p className="text-xs text-muted-foreground">
                  {route.codigo_trayecto} · {route.tipo_cobertura}
                  {!route.activo && <span className="text-warning"> · Inactiva</span>}
                </p>
                <p className="mt-1 text-sm">
                  {formatCop(route.tarifa_kg_real_cop)} por kg · mínimo{' '}
                  {formatCop(route.flete_minimo_cop)}
                </p>
              </div>
              {editing !== route.codigo_trayecto && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={cn(GLASS, 'rounded-full px-3 py-1.5 text-sm')}
                    onClick={() => {
                      update.reset()
                      setEditing(route.codigo_trayecto)
                    }}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    disabled={update.isPending}
                    className={cn(GLASS, 'rounded-full px-3 py-1.5 text-sm')}
                    onClick={() =>
                      update.mutate({
                        codigo: route.codigo_trayecto,
                        body: { activo: !route.activo },
                      })
                    }
                  >
                    {route.activo ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
              )}
            </div>
            {editing === route.codigo_trayecto && (
              <div className="mt-4 border-t pt-4">
                <TariffForm
                  initial={toValues(route)}
                  locked
                  pending={update.isPending}
                  error={update.error}
                  submitLabel="Guardar cambios"
                  onCancel={() => setEditing(null)}
                  onSubmit={(tariff) =>
                    update.mutate({
                      codigo: route.codigo_trayecto,
                      body: changedFields(route, tariff),
                    })
                  }
                />
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

const FIELDS: { name: TariffField; label: string; wide?: boolean }[] = [
  { name: 'codigo_trayecto', label: 'Código' },
  { name: 'tipo_cobertura', label: 'Cobertura' },
  { name: 'origen', label: 'Ciudad de origen' },
  { name: 'departamento_origen', label: 'Departamento de origen' },
  { name: 'destino', label: 'Ciudad de destino' },
  { name: 'departamento_destino', label: 'Departamento de destino' },
  { name: 'tarifa_kg_real_cop', label: 'Tarifa por kg real (COP)' },
  { name: 'tarifa_kg_volumetrico_cop', label: 'Tarifa por kg volumétrico (COP)' },
  { name: 'flete_minimo_cop', label: 'Flete mínimo (COP)' },
  { name: 'divisor_volumetrico', label: 'Divisor volumétrico' },
  { name: 'porcentaje_seguro', label: 'Seguro (%)' },
  { name: 'seguro_minimo_cop', label: 'Seguro mínimo (COP)' },
  { name: 'recargo_cadena_frio_pct', label: 'Cadena de frío (% del flete)' },
  { name: 'recargo_mercancia_peligrosa_cop', label: 'Mercancía peligrosa (COP)' },
  { name: 'tiempo_entrega_horas', label: 'Tiempo de entrega (horas)' },
  { name: 'observaciones', label: 'Observaciones', wide: true },
]

function TariffForm({
  initial,
  locked = false,
  pending,
  error,
  submitLabel,
  onCancel,
  onSubmit,
}: {
  initial: TariffValues
  /** Edición: el código y las ciudades no cambian. */
  locked?: boolean
  pending: boolean
  error: unknown
  submitLabel: string
  onCancel: () => void
  onSubmit: (tariff: Parameters<typeof createTariff>[0]) => void
}) {
  const [values, setValues] = useState(initial)
  const [errors, setErrors] = useState<TariffErrors>({})

  function submit(event: FormEvent) {
    event.preventDefault()
    const result = parseTariffForm(values)
    if (!result.ok) return setErrors(result.errors)
    setErrors({})
    onSubmit(result.tariff)
  }

  return (
    <form noValidate onSubmit={submit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {FIELDS.map(({ name, label, wide }) => {
          const disabled = locked && IDENTITY_FIELDS.includes(name)
          const common = {
            name,
            value: values[name],
            disabled,
            'aria-invalid': errors[name] ? true : undefined,
            className: cn(FIELD, disabled && 'bg-muted text-muted-foreground'),
            onChange: (event: { target: { value: string } }) =>
              setValues((current) => ({ ...current, [name]: event.target.value })),
          }
          return (
            <label key={name} className={cn('space-y-1', wide && 'sm:col-span-2')}>
              <span className={FIELD_LABEL}>{label}</span>
              {name === 'tipo_cobertura' ? (
                <select {...common}>
                  {COVERAGE_TYPES.map((type) => (
                    <option key={type}>{type}</option>
                  ))}
                </select>
              ) : name === 'observaciones' ? (
                <textarea {...common} rows={2} />
              ) : (
                <input {...common} inputMode={name.endsWith('_cop') ? 'numeric' : undefined} />
              )}
              <FieldError>{errors[name]}</FieldError>
            </label>
          )
        })}
      </div>
      <ErrorText error={error} />
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={pending} className={cn(PRIMARY_BUTTON, 'rounded-full')}>
          {pending ? 'Guardando…' : submitLabel}
        </button>
        <button
          type="button"
          className={cn(GLASS, 'rounded-full px-4 py-2 text-sm')}
          onClick={onCancel}
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
