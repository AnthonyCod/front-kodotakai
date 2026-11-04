import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { ArrowLeft, HandCoins, Search, Snowflake, TriangleAlert, Undo2 } from 'lucide-react'
import { cn } from 'cn'
import { CITIES } from '@/features/quote'
import { formatCop } from '@/shared/lib/format'
import { normalizeText } from '@/shared/lib/text-match'
import { FIELD, FIELD_LABEL } from '@/shared/ui/form-styles'
import { fleteBase, routesFrom, type RouteTariff } from '../model/routes'
import {
  EXTRA_SERVICES,
  TARIFF_EFFECTIVE_DATE,
  TARIFF_TERMS,
  TARIFF_VERSION,
  type ExtraService,
} from '../model/tariffs'

const SECTION_TITLE = 'text-xs font-medium tracking-wide text-muted-foreground uppercase'
const CARD = 'rounded-[1.25rem] bg-card p-4 shadow-card sm:p-5'
const CHIP = 'shrink-0 rounded-full bg-muted px-3 py-1 text-xs text-foreground/70'

const EXTRA_ICON: Record<ExtraService['id'], ReactNode> = {
  CADENA_FRIO: <Snowflake size={18} aria-hidden />,
  MERCANCIA_PELIGROSA: <TriangleAlert size={18} aria-hidden />,
  CONTRA_ENTREGA: <HandCoins size={18} aria-hidden />,
  DEVOLUCION: <Undo2 size={18} aria-hidden />,
}

const STEPS = [
  'Busca tu ciudad de origen y la de destino.',
  'Peso facturable: el mayor entre el peso real y el volumétrico (alto × ancho × largo en cm ÷ 2.500).',
  'Flete = peso facturable × tarifa por kg del trayecto.',
  'Si ese valor queda por debajo del flete mínimo del trayecto, pagas el mínimo.',
  'Suma el seguro (2 % del valor declarado) y los servicios adicionales que necesites.',
]

const effectiveDate = new Date(`${TARIFF_EFFECTIVE_DATE}T12:00:00`).toLocaleDateString('es-CO', {
  dateStyle: 'long',
})

/** Tarifas y servicios (`/info/tarifas`): tarifas ciudad a ciudad, adicionales y condiciones. */
export function TariffSheet() {
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
        <div className="flex flex-wrap gap-2">
          <span className={CHIP}>Versión {TARIFF_VERSION}</span>
          <span className={CHIP}>Vigente desde {effectiveDate}</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Valores en pesos colombianos. El precio final de tu envío es el de la cotización.
        </p>
      </div>

      <CityTariffs />

      <section className="space-y-3">
        <h2 className={SECTION_TITLE}>Servicios adicionales</h2>
        <ul className="space-y-2 sm:space-y-3">
          {EXTRA_SERVICES.map((service) => (
            <li key={service.id} className={cn(CARD, 'flex gap-3')}>
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-muted text-foreground/70">
                {EXTRA_ICON[service.id]}
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

      <section className="space-y-3">
        <h2 className={SECTION_TITLE}>Cómo se calcula</h2>
        <ol className="space-y-3">
          {STEPS.map((step, index) => (
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

type City = (typeof CITIES)[number]

const EXAMPLE_KG = 10

const kg = (value: number) => `${value.toLocaleString('es-CO')} kg`
const hours = (value: number) => (value <= 72 ? `${value} h` : `${value / 24} días`)

/** Tarifa desde una ciudad de origen hacia todas las demás, con buscador de destino. */
function CityTariffs() {
  const [origen, setOrigen] = useState<City>('Bogotá D.C.')
  const [query, setQuery] = useState('')
  const search = normalizeText(query)
  const all = routesFrom(origen)
  const example = all.find((route) => route.kind === 'nacional')
  const routes = all.filter((route) => normalizeText(route.destino).includes(search))

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
              onChange={(event) => setOrigen(event.target.value as City)}
            >
              {CITIES.map((city) => (
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
              {formatCop(example.fleteMinimoCop)} cubre hasta {kg(example.minimoCubreKg)}. Con{' '}
              {kg(EXAMPLE_KG)}: {EXAMPLE_KG} × {formatCop(example.copPorKg)} ={' '}
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
        {routes.length > 0 ? (
          <ul className="-mt-2 divide-y">
            {routes.map((route) => (
              <RouteRow key={route.destino} route={route} />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No tenemos tarifa para esa ciudad.</p>
        )}
      </div>
    </section>
  )
}

function RouteRow({ route }: { route: RouteTariff }) {
  const detail =
    route.kind === 'urbano'
      ? 'Misma ciudad'
      : route.kind === 'especial'
        ? 'Trayecto especial'
        : `≈ ${route.distanceKm.toLocaleString('es-CO')} km`

  return (
    <li className="flex items-center justify-between gap-3 px-1 py-3">
      <span className="min-w-0">
        <span className="block font-medium">{route.destino}</span>
        <span
          className={cn(
            'block text-xs text-muted-foreground',
            route.kind === 'especial' && 'text-warning',
          )}
        >
          {detail} · {hours(route.tiempoEntregaHoras)}
        </span>
      </span>
      <span className="shrink-0 text-right">
        <span className="block font-medium">
          {formatCop(route.fleteMinimoCop)}
          <span className="text-xs font-normal text-muted-foreground">
            {' '}
            hasta {kg(route.minimoCubreKg)}
          </span>
        </span>
        <span className="block text-xs text-muted-foreground">
          {formatCop(route.copPorKg)} por kg desde {kg(route.minimoCubreKg + 0.5)}
        </span>
      </span>
    </li>
  )
}
