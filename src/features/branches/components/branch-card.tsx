import { useEffect, useRef, type PointerEvent } from 'react'
import {
  AnimatePresence,
  motion,
  useDragControls,
  useReducedMotion,
  type PanInfo,
} from 'motion/react'
import { AnimateIcon } from '@animate-ui/react/icons'
import { cn } from 'cn'
import { ICON_PILL, SECTION_LABEL } from '@/shared/ui/page'
import { ArrowDown01 } from '@/shared/components/animate-ui/icons/hugeicons/arrow-down-01'
import { ArrowLeft01 } from '@/shared/components/animate-ui/icons/hugeicons/arrow-left-01'
import { ArrowRight01 } from '@/shared/components/animate-ui/icons/hugeicons/arrow-right-01'
import { BRANCH_CITY, type Branch } from '../model/branches'
import { BranchFacts, BranchListItem, BranchTags } from './branch-panel'

const ICON_BUTTON = cn(ICON_PILL, 'size-8')

/** Px que hay que arrastrar la fila (o velocidad) para pasar de sucursal. */
const SWIPE_OFFSET = 60
const SWIPE_VELOCITY = 400

interface BranchCardProps {
  branch: Branch
  /** Sucursales que muestra la lista (las del buscador), con su índice en la lista completa. */
  results: { branch: Branch; index: number }[]
  activeIndex: number
  /** 1 = vino con "siguiente", -1 = con "anterior". Define hacia dónde se desliza el nombre. */
  direction: 1 | -1
  expanded: boolean
  onToggle: () => void
  onPrevious: () => void
  onNext: () => void
  onSelect: (index: number) => void
}

/**
 * Celular y tablet: tarjeta flotante sobre el mapa. Minimizada: miniatura, nombre y ◀ ▶ (la fila
 * también se desliza con el dedo). Desplegada: servicios, dirección, etiquetas y la lista.
 */
export function BranchCard({
  branch,
  results,
  activeIndex,
  direction,
  expanded,
  onToggle,
  onPrevious,
  onNext,
  onSelect,
}: BranchCardProps) {
  const reduceMotion = useReducedMotion()
  const slide = reduceMotion ? 0 : 20 * direction
  const dragControls = useDragControls()
  const listRef = useRef<HTMLUListElement>(null)

  // La sucursal activa siempre a la vista en la fila horizontal (al tocar un pin o ◀ ▶).
  useEffect(() => {
    listRef.current?.querySelector('[aria-current="true"]')?.scrollIntoView({
      block: 'nearest',
      inline: 'center',
      behavior: reduceMotion ? 'auto' : 'smooth',
    })
  }, [activeIndex, expanded, reduceMotion])

  // El arrastre empieza en la fila del nombre y fuera de los botones: un toque en ◀ ▶ no cuenta doble.
  function startDrag(event: PointerEvent) {
    if (!(event.target as HTMLElement).closest('button')) dragControls.start(event)
  }

  function endDrag(_: unknown, { offset, velocity }: PanInfo) {
    if (offset.x < -SWIPE_OFFSET || velocity.x < -SWIPE_VELOCITY) onNext()
    else if (offset.x > SWIPE_OFFSET || velocity.x > SWIPE_VELOCITY) onPrevious()
  }

  return (
    <motion.section
      aria-label="Sucursal seleccionada"
      drag="x"
      dragListener={false}
      dragControls={dragControls}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.18}
      onDragEnd={endDrag}
      className="rounded-3xl bg-card/95 p-3 text-card-foreground shadow-[0_2px_6px_rgb(15_23_42/0.06),0_14px_36px_rgb(15_23_42/0.16)] backdrop-blur-xl"
    >
      <div onPointerDown={startDrag} className="flex touch-pan-y items-center gap-3">
        <img
          key={branch.id}
          src={branch.imageUrl}
          alt=""
          className="size-12 shrink-0 rounded-2xl bg-muted object-cover"
        />
        <div className="min-w-0 flex-1 overflow-hidden" aria-live="polite">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={branch.id}
              initial={{ opacity: 0, x: slide }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -slide }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <h2 className="truncate text-base leading-tight font-semibold tracking-tight">
                {branch.name}
              </h2>
              <p className="truncate text-xs text-muted-foreground">{BRANCH_CITY}</p>
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="flex shrink-0 gap-1">
          <AnimateIcon animateOnHover animateOnTap asChild>
            <button
              type="button"
              onClick={onPrevious}
              aria-label="Sucursal anterior"
              className={ICON_BUTTON}
            >
              <ArrowLeft01 size={16} aria-hidden />
            </button>
          </AnimateIcon>
          <AnimateIcon animateOnHover animateOnTap asChild>
            <button
              type="button"
              onClick={onNext}
              aria-label="Sucursal siguiente"
              className={ICON_BUTTON}
            >
              <ArrowRight01 size={16} aria-hidden />
            </button>
          </AnimateIcon>
          <AnimateIcon animateOnHover animateOnTap asChild>
            <button
              type="button"
              onClick={onToggle}
              aria-expanded={expanded}
              aria-controls="branch-details"
              aria-label={expanded ? 'Minimizar detalle' : 'Ver detalle'}
              className={ICON_BUTTON}
            >
              <ArrowDown01
                size={16}
                aria-hidden
                className={cn('transition-transform', !expanded && 'rotate-180')}
              />
            </button>
          </AnimateIcon>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            id="branch-details"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.25, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              {branch.description}
            </p>
            <div className="mt-3 space-y-2.5">
              <BranchFacts branch={branch} compact />
              <BranchTags tags={branch.tags} />
            </div>
            <h3 className={cn(SECTION_LABEL, 'mt-3 mb-1.5 flex justify-between')}>
              Sucursales <span>{results.length}</span>
            </h3>
            {results.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ninguna coincide con la búsqueda.</p>
            ) : (
              // Fila horizontal: se desliza sola; la tarjeta no se arrastra desde aquí.
              <ul
                ref={listRef}
                className="-mx-3 flex snap-x snap-mandatory [scrollbar-width:none] gap-2 overflow-x-auto px-3 pb-0.5"
              >
                {results.map(({ branch: item, index }) => (
                  <li key={item.id} className="w-56 shrink-0 snap-start">
                    <BranchListItem
                      branch={item}
                      active={index === activeIndex}
                      onSelect={() => onSelect(index)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  )
}
