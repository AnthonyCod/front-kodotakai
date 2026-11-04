import { Building2, Check, MapPin } from 'lucide-react'
import { cn } from 'cn'
import { Badge, BadgeDot } from '@/shared/ui/badge'
import { CARD_DIVIDER, SECTION_LABEL, SURFACE } from '@/shared/ui/page'
import { Reveal } from '@/shared/ui/reveal'
import { SearchPill } from '@/shared/ui/search-pill'
import { BRANCH_CITY, type Branch } from '../model/branches'

// Piezas de Sucursales (panel «Detalles» en escritorio y tarjeta flotante en celular): blanco,
// bordes finos, texto gris y un solo acento de marca.

/** Buscador de sucursales (nombre, dirección o servicio). */
export function BranchSearch({
  value,
  onChange,
  className,
}: {
  value: string
  onChange: (value: string) => void
  className?: string
}) {
  return (
    <SearchPill
      value={value}
      onChange={onChange}
      label="Buscar sucursal"
      placeholder="Buscar sucursal o servicio"
      className={className}
    />
  )
}

/** Datos en filas con icono (dirección y ciudad), en un recuadro con divisiones. */
export function BranchFacts({ branch, compact }: { branch: Branch; compact?: boolean }) {
  return (
    <ul className={cn(SURFACE, 'divide-y divide-border/70 text-sm')}>
      <li className="flex items-start gap-2.5 px-3 py-2.5">
        <MapPin className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
        <span>{branch.address}</span>
      </li>
      {!compact && (
        <li className="flex items-start gap-2.5 px-3 py-2.5">
          <Building2 className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
          <span>{BRANCH_CITY}</span>
        </li>
      )}
    </ul>
  )
}

export function BranchTags({ tags }: { tags: string[] }) {
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Servicios">
      {tags.map((tag) => (
        <li key={tag}>
          <Badge variant="brand">{tag}</Badge>
        </li>
      ))}
    </ul>
  )
}

/** Fila de la lista: miniatura, nombre y dirección. */
export function BranchListItem({
  branch,
  active,
  onSelect,
}: {
  branch: Branch
  active: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active}
      className={cn(
        SURFACE,
        'flex w-full items-center gap-3 p-2 text-left transition hover:-translate-y-px hover:shadow-[0_2px_4px_rgb(15_23_42/0.06),0_10px_24px_rgb(15_23_42/0.09)] active:scale-[0.99]',
        active && 'bg-brand/[0.06] ring-2 ring-brand/25',
      )}
    >
      <img
        src={branch.imageUrl}
        alt=""
        loading="lazy"
        className="size-11 shrink-0 rounded-xl bg-muted object-cover"
      />
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{branch.name}</span>
        <span className="block truncate text-xs text-muted-foreground">{branch.address}</span>
      </span>
    </button>
  )
}

/** Escritorio: panel «Detalles» a la derecha del mapa. */
export function BranchDetails({
  branch,
  position,
  results,
  activeIndex,
  query,
  onSelect,
}: {
  branch: Branch
  /** «2 de 6». */
  position: string
  results: { branch: Branch; index: number }[]
  activeIndex: number
  query: string
  onSelect: (index: number) => void
}) {
  return (
    <aside
      aria-label="Detalles de la sucursal"
      className="hidden min-h-0 w-[22rem] shrink-0 flex-col bg-card shadow-[-1px_0_0_rgb(15_23_42/0.04),-8px_0_24px_rgb(15_23_42/0.04)] lg:flex xl:w-[24rem]"
    >
      <div className="flex h-12 shrink-0 items-center justify-between px-5">
        <h2 className="text-sm font-medium">Detalles</h2>
        <Badge variant="brand">
          <BadgeDot />
          {results.length} {results.length === 1 ? 'sucursal' : 'sucursales'}
        </Badge>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
        {/* Tarjeta como las del inicio: rótulo, nombre, foto con mini tarjeta y servicios con ✓.
            Nueva clave = se revela otra vez al cambiar de sucursal. */}
        <Reveal
          key={branch.id}
          aria-live="polite"
          className="space-y-3 rounded-2xl bg-muted/70 p-4"
        >
          <div>
            <p className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
              Sucursal · {position}
            </p>
            <h3 className="mt-0.5 text-lg leading-tight font-semibold tracking-tight">
              {branch.name}
            </h3>
          </div>
          <div className="relative overflow-hidden rounded-xl">
            <img
              src={branch.imageUrl}
              alt={`Fachada de la sucursal ${branch.name}`}
              className="aspect-[16/11] w-full bg-muted object-cover"
            />
            <div className="absolute inset-x-2.5 bottom-2.5 flex items-center gap-2.5 rounded-xl bg-card/95 p-2.5 shadow-[0_1px_2px_rgb(15_23_42/0.06),0_8px_24px_rgb(15_23_42/0.14)] backdrop-blur-sm">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand-deep">
                <MapPin className="size-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium">{branch.address}</span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  {BRANCH_CITY}
                </span>
              </span>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-foreground/80">{branch.description}</p>
          <ul className="space-y-1.5 text-xs text-muted-foreground" aria-label="Servicios">
            {branch.tags.map((tag) => (
              <li key={tag} className="flex items-center gap-2">
                <Check className="size-3.5 shrink-0 text-success" aria-hidden />
                {tag}
              </li>
            ))}
          </ul>
        </Reveal>

        <section className={cn(CARD_DIVIDER, 'space-y-2 pt-5')}>
          <h4 className={cn(SECTION_LABEL, 'flex justify-between')}>
            Sucursales <span>{results.length}</span>
          </h4>
          {results.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No encontramos sucursales con «{query.trim()}».
            </p>
          ) : (
            <ul className="space-y-1.5">
              {results.map(({ branch: item, index }, position) => (
                <Reveal as="li" key={item.id} order={position}>
                  <BranchListItem
                    branch={item}
                    active={index === activeIndex}
                    onSelect={() => onSelect(index)}
                  />
                </Reveal>
              ))}
            </ul>
          )}
        </section>
      </div>
    </aside>
  )
}
