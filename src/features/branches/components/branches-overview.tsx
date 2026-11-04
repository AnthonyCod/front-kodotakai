import { useEffect, useRef, useState } from 'react'
import mapaUrl from '@/assets/mapa-cobertura.webp'
import { env } from '@/shared/config/env'
import { useMediaQuery } from '@/shared/hooks/use-media-query'
import { PAGE_SUBTITLE, PAGE_TITLE } from '@/shared/ui/page'
import { Reveal } from '@/shared/ui/reveal'
import { BRANCHES, filterBranches, wrapIndex } from '../model/branches'
import { useBranchesViewStore } from '../model/branches-view-store'
import { BranchCard } from './branch-card'
import { BranchDetails, BranchSearch } from './branch-panel'
import { HereMap } from './here-map'

/** Aire alrededor del pin activo (y entre la tarjeta flotante y el pin, en celular). */
const GAP = 24
/** Escritorio (`lg`): los detalles van en el panel derecho y nada tapa el mapa. */
const DESKTOP = '(min-width: 64rem)'

/**
 * Sucursales: título y buscador; el mapa en un recuadro con un punto por sucursal. Escritorio:
 * panel «Detalles» a la derecha. Celular y tablet: tarjeta flotante sobre el mapa con lo mismo
 * (◀ ▶ recorren la lista en círculo). Lista de prueba en Sincelejo hasta que el backend la
 * exponga (por confirmar).
 */
export function BranchesOverview() {
  // Sucursal y tarjeta guardadas: al volver de otra pantalla siguen como se dejaron.
  const { expanded, setActiveIndex, toggleExpanded } = useBranchesViewStore()
  const activeIndex = wrapIndex(
    useBranchesViewStore((state) => state.activeIndex),
    BRANCHES.length,
  )
  const [direction, setDirection] = useState<1 | -1>(1)
  const [query, setQuery] = useState('')
  const [mapError, setMapError] = useState<string | null>(
    env.hereApiKey ? null : 'Falta VITE_HERE_API_KEY en .env.development.',
  )
  const [cardHeight, setCardHeight] = useState(0)
  const cardRef = useRef<HTMLDivElement>(null)
  const desktop = useMediaQuery(DESKTOP)
  const results = filterBranches(BRANCHES, query)
  const branch = BRANCHES[activeIndex]

  // La tarjeta cambia de alto al desplegarse: el mapa recalcula su centro con ese espacio.
  useEffect(() => {
    const card = cardRef.current
    if (!card) return
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setCardHeight(Math.round(entry.contentRect.height))
    })
    observer.observe(card)
    return () => observer.disconnect()
  }, [])

  function go(step: 1 | -1) {
    setDirection(step)
    setActiveIndex(wrapIndex(activeIndex + step, BRANCHES.length))
  }

  function select(index: number) {
    setDirection(index >= activeIndex ? 1 : -1)
    setActiveIndex(index)
  }

  if (!branch) return null

  return (
    <div className="mx-auto flex h-full min-h-[34rem] w-full max-w-6xl">
      <section className="flex min-w-0 flex-1 flex-col gap-3 px-4 pt-4 pb-3 sm:gap-4 sm:px-6 sm:pt-6 sm:pb-6">
        <Reveal
          as="header"
          className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
        >
          <div>
            <h1 className={PAGE_TITLE}>Sucursales en Sincelejo</h1>
            <p className={PAGE_SUBTITLE}>{BRANCHES.length} puntos de atención en Sucre</p>
          </div>
          <BranchSearch value={query} onChange={setQuery} className="sm:w-64" />
        </Reveal>

        <Reveal
          order={1}
          className="relative min-h-0 flex-1 overflow-hidden rounded-3xl bg-muted shadow-[0_1px_2px_rgb(15_23_42/0.05),0_10px_30px_rgb(15_23_42/0.08)]"
        >
          {mapError ? (
            <>
              <img
                src={mapaUrl}
                alt="Mapa de la región donde opera TransLogix"
                className="absolute inset-0 size-full object-cover"
              />
              {/* Solo en desarrollo: el motivo ayuda a configurar la key (en producción no se muestra). */}
              {import.meta.env.DEV && (
                <p
                  role="status"
                  className="absolute inset-x-3 top-3 z-10 mx-auto max-w-xl rounded-xl border border-warning/40 bg-card/95 px-3 py-2 text-xs text-foreground"
                >
                  Mapa no disponible: {mapError}
                </p>
              )}
            </>
          ) : (
            <HereMap
              branches={BRANCHES}
              activeIndex={activeIndex}
              onSelect={select}
              onError={setMapError}
              padding={
                desktop ? { top: GAP * 2, bottom: GAP } : { top: GAP * 2, bottom: cardHeight + GAP }
              }
              className="absolute inset-0"
            />
          )}

          <div
            ref={cardRef}
            className="pointer-events-none absolute inset-x-0 bottom-0 z-10 p-2 sm:p-3 lg:hidden"
          >
            <div className="pointer-events-auto mx-auto w-full max-w-md">
              <BranchCard
                branch={branch}
                results={results}
                activeIndex={activeIndex}
                direction={direction}
                expanded={expanded}
                onToggle={toggleExpanded}
                onPrevious={() => go(-1)}
                onNext={() => go(1)}
                onSelect={select}
              />
            </div>
          </div>
        </Reveal>
      </section>

      <BranchDetails
        branch={branch}
        position={`${activeIndex + 1} de ${BRANCHES.length}`}
        results={results}
        activeIndex={activeIndex}
        query={query}
        onSelect={select}
      />
    </div>
  )
}
