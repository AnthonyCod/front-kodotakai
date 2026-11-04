import { useQuery } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { ArrowLeft, ChevronDown, Search, Snowflake, TriangleAlert } from 'lucide-react'
import { cn } from 'cn'
import { formatCop } from '@/shared/lib/format'
import { normalizeText } from '@/shared/lib/text-match'
import { ErrorText } from '@/shared/ui/error-text'
import { FIELD, FIELD_LABEL } from '@/shared/ui/form-styles'
import { fetchTariffs, type TariffRoute } from '../api/tariffs-api'
import {
  TARIFFS_QUERY_KEY,
  TARIFF_TERMS,
  fleteBase,
  minimoCubreKg,
  origins,
  percent,
  range,
} from '../model/tariffs'

const SECTION_TITLE = 'text-xs font-medium tracking-wide text-muted-foreground uppercase'
const CARD = 'rounded-[1.25rem] bg-card p-4 shadow-card sm:p-5'
const CHIP = 'shrink-0 rounded-full bg-muted px-3 py-1 text-xs text-foreground/70'

const EXAMPLE_KG = 10

const kg = (value: number) => `${value.toLocaleString('es-CO')} kg`
const hours = (value: number) => (value <= 72 ? `${value} h` : `${value / 24} días`)
const longDate = (iso: string) => new Date(iso).toLocaleDateString('es-CO', { dateStyle: 'long' })

/** Tarifas y servicios (`/info/tarifas`): la matriz del backend, ciudad a ciudad. */
export function TariffSheet() {
  const query = useQuery({ queryKey: TARIFFS_QUERY_KEY, queryFn: fetchTariffs })
  const routes = query.data?.items ?? []
  const updated = routes
    .map((route) => route.actualizado_en)
    .sort()
    .at(-1)

  return (
    <article className="mx-auto w-full max-w-3xl space-y-7 px-3 py-3 sm:space-y-9 sm:px-6 sm:py-6">
      <div className="space-y-3">
        <Link
          to="/info"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} aria-hidden /> Información legal
        </Link>
        <h1 className="text-2xl leading-tight font-medium sm:text-3xl">Tarifas y servicios</h1>
        {updated && (
          <div className="flex flex-wrap gap-2">
            <span className={CHIP}>{routes.length} trayectos</span>
            <span className={CHIP}>Actualizado el {longDate(updated)}</span>
          </div>
        )}
        <p className="text-sm text-muted-foreground">
          Valores en pesos colombianos. El precio final de tu envío es el de la cotización.
        </p>
      </div>

      {query.isPending && <p className="text-sm text-muted-foreground">Cargando tarifas…</p>}
      <ErrorText error={query.error} />
      {routes.length > 0 && (
        <>
          <CityTariffs routes={routes} />
          <ExtraServices routes={routes} />
        </>
      )}

      <section className="space-y-3">
        <h2 className={SECTION_TITLE}>Cómo se calcula</h2>
        <ol className="space-y-3">
          {steps(routes[0]?.divisor_volumetrico ?? 4000).map((step, index) => (
            <li key={step} className="flex items-start gap-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-deep text-xs font-medium text-brand-foreground">
                {index + 1}
              </span>
              <p className="pt-0.5 text-[15px] leading-snug text-foreground/80">{step}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-3 rounded-[1.25rem] bg-muted/70 p-4 sm:p-5">
        <h2 className={SECTION_TITLE}>Condiciones</h2>
        <ul className="space-y-2 text-[15px] leading-snug text-foreground/80">
          {TARIFF_TERMS.map((term) => (
            <li key={term} className="flex gap-2">
              <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-deep/60" />
              {term}
            </li>
          ))}
        </ul>
      </section>
    </article>
  )
}

const steps = (divisor: number) => [
  'Busca tu ciudad de origen y la de destino.',
  `Peso facturable: el mayor entre el peso real y el volumétrico (alto × ancho × largo en cm ÷ ${divisor.toLocaleString('es-CO')}).`,
  'Flete = peso facturable × tarifa por kg del trayecto (la volumétrica si pesa más el volumen).',
  'Si ese valor queda por debajo del flete mínimo del trayecto, pagas el mínimo.',
  'Suma el seguro y los servicios adicionales que necesites.',
]

/** Rutas desde un origen, con buscador de destino. */
function CityTariffs({ routes }: { routes: TariffRoute[] }) {
  const cities = origins(routes)
  const [origen, setOrigen] = useState(cities.includes('Bogotá D.C.') ? 'Bogotá D.C.' : cities[0])
  const [query, setQuery] = useState('')
  const search = normalizeText(query)
  const fromOrigin = routes.filter((route) => route.origen === origen)
  const visible = fromOrigin.filter((route) => normalizeText(route.destino).includes(search))
  const example =
    fromOrigin.find((route) => fleteBase(route, EXAMPLE_KG) > route.flete_minimo_cop) ??
    fromOrigin[0]

  return (
    <section className="space-y-3">
      <h2 className={SECTION_TITLE}>Tarifas por ciudad</h2>
      <div className={cn(CARD, 'space-y-4')}>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1">
            <span className={FIELD_LABEL}>Desde</span>
            <select
              className={FIELD}
              value={origen}
              onChange={(event) => setOrigen(event.target.value)}
            >
              {cities.map((city) => (
                <option key={city}>{city}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className={FIELD_LABEL}>Hacia</span>
            <span className="relative block">
              <Search
                size={16}
                aria-hidden
                className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
              />
              <input
                className={cn(FIELD, 'pl-9')}
                type="search"
                placeholder="Buscar ciudad"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </span>
          </label>
        </div>

        {example && (
          <div className="space-y-1 rounded-xl bg-muted/70 p-3 text-sm leading-snug">
            <p>
              Pagas el peso por la tarifa por kg. Si da menos que el{' '}
              <strong className="font-medium">flete mínimo</strong>, pagas el mínimo.
            </p>
            <p className="text-foreground/75">
              Ejemplo: {origen} → {example.destino}. El mínimo de{' '}
              {formatCop(example.flete_minimo_cop)} cubre hasta {kg(minimoCubreKg(example))}. Con{' '}
              {kg(EXAMPLE_KG)}: {EXAMPLE_KG} × {formatCop(example.tarifa_kg_real_cop)} ={' '}
              <strong className="font-medium text-foreground">
                {formatCop(fleteBase(example, EXAMPLE_KG))}
              </strong>
            </p>
          </div>
        )}

        <div className="flex justify-between px-1 text-xs text-muted-foreground">
          <span>Destino</span>
          <span>Mínimo · por kg</span>
        </div>
        {visible.length > 0 ? (
          <ul className="-mt-2 divide-y">
            {visible.map((route) => (
              <RouteRow key={route.codigo_trayecto} route={route} />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No tenemos tarifa para esa ciudad.</p>
        )}
      </div>
    </section>
  )
}

function RouteRow({ route }: { route: TariffRoute }) {
  const covers = minimoCubreKg(route)
  const special = route.tipo_cobertura !== 'Urbana Principal'

  return (
    <li>
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-1 py-3 [&::-webkit-details-marker]:hidden">
          <span className="min-w-0">
            <span className="flex items-center gap-1 font-medium">
              {route.destino}
              <ChevronDown
                size={14}
                aria-hidden
                className="shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
              />
            </span>
            <span className={cn('block text-xs text-muted-foreground', special && 'text-warning')}>
              {route.tipo_cobertura} · {hours(route.tiempo_entrega_horas)}
            </span>
          </span>
          <span className="shrink-0 text-right">
            <span className="block font-medium">
              {formatCop(route.flete_minimo_cop)}
              <span className="text-xs font-normal text-muted-foreground"> hasta {kg(covers)}</span>
            </span>
            <span className="block text-xs text-muted-foreground">
              {formatCop(route.tarifa_kg_real_cop)} por kg desde {kg(covers + 0.5)}
            </span>
          </span>
        </summary>
        <dl className="mb-3 grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl bg-muted/70 p-3 text-sm sm:grid-cols-3">
          <Fact label="Kg volumétrico">{formatCop(route.tarifa_kg_volumetrico_cop)}</Fact>
          <Fact label="Seguro">
            {percent(route.porcentaje_seguro)} · mín. {formatCop(route.seguro_minimo_cop)}
          </Fact>
          <Fact label="Cadena de frío">+{percent(route.recargo_cadena_frio_pct)} del flete</Fact>
          <Fact label="Mercancía peligrosa">
            +{formatCop(route.recargo_mercancia_peligrosa_cop)}
          </Fact>
          <Fact label="Destino">{route.departamento_destino}</Fact>
          <Fact label="Código">{route.codigo_trayecto}</Fact>
          {route.observaciones && (
            <p className="col-span-full text-foreground/75">{route.observaciones}</p>
          )}
        </dl>
      </details>
    </li>
  )
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="truncate">{children}</dd>
    </div>
  )
}

/** Recargos de la matriz: % sobre el flete base (frío) y valor fijo (peligrosa). */
function ExtraServices({ routes }: { routes: TariffRoute[] }) {
  const services = [
    {
      name: 'Cadena de frío (2 a 8 °C)',
      icon: <Snowflake size={18} aria-hidden />,
      price: `+${range(
        routes.map((route) => route.recargo_cadena_frio_pct),
        percent,
      )} sobre el flete base, según el trayecto`,
      conditions: [
        'Para alimentos, medicamentos y productos perecederos.',
        'Vehículo con equipo de frío y registro de temperatura (Resolución 2505 de 2004).',
        'Alimentos: requisitos sanitarios de la Resolución 2674 de 2013 (INVIMA).',
      ],
    },
    {
      name: 'Mercancía peligrosa',
      icon: <TriangleAlert size={18} aria-hidden />,
      price: `+${range(
        routes.map((route) => route.recargo_mercancia_peligrosa_cop),
        formatCop,
      )} por envío, según el trayecto`,
      conditions: [
        'Según el Decreto 1609 de 2002, compilado en el Decreto 1079 de 2015.',
        'Requiere hoja de seguridad, clase ONU y embalaje homologado.',
        'No se transportan explosivos (clase 1) ni material radiactivo (clase 7).',
      ],
    },
  ]

  return (
    <section className="space-y-3">
      <h2 className={SECTION_TITLE}>Servicios adicionales</h2>
      <ul className="space-y-2 sm:space-y-3">
        {services.map((service) => (
          <li key={service.name} className={cn(CARD, 'flex gap-3')}>
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-muted text-foreground/70">
              {service.icon}
            </span>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="font-medium">{service.name}</p>
              <p className="text-sm font-medium text-brand-deep">{service.price}</p>
              <ul className="space-y-0.5 text-sm text-foreground/75">
                {service.conditions.map((condition) => (
                  <li key={condition}>{condition}</li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
