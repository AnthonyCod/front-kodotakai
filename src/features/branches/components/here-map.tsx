import { useEffect, useRef, useState } from 'react'
import { AnimateIcon } from '@animate-ui/react/icons'
import { cn } from 'cn'
import { MinusSign } from '@/shared/components/animate-ui/icons/hugeicons/minus-sign'
import { PlusSign } from '@/shared/components/animate-ui/icons/hugeicons/plus-sign'
import { env } from '@/shared/config/env'
import { ICON_PILL } from '@/shared/ui/page'
import {
  checkHereTiles,
  createHereBaseLayer,
  loadHereMaps,
  type HereDomIcon,
  type HereDomMarker,
  type HereLatLng,
  type HereMapInstance,
  type HereNamespace,
} from '@/shared/lib/here-maps'
import type { Branch } from '../model/branches'

const ZOOM = 15
const MIN_ZOOM = 11
const MAX_ZOOM = 19
const ZOOM_BUTTON = cn(ICON_PILL, 'size-10 bg-white/80')
const SINCELEJO = { lat: 9.3047, lng: -75.3978 }

// Marcadores con la foto de cada sucursal (borde blanco y sombra); el elegido, más grande, con aro
// azul y su nombre encima. En escritorio los demás muestran el nombre al lado. HERE ancla el
// elemento por su esquina superior izquierda: los márgenes negativos centran la foto en la coordenada.
const PIN_SHADOW = 'shadow-[0_2px_6px_rgb(15_23_42/0.25),0_8px_18px_rgb(15_23_42/0.18)]'
const SIDE_LABEL =
  'absolute top-1/2 left-full ml-1.5 hidden -translate-y-1/2 whitespace-nowrap text-xs font-semibold text-foreground [text-shadow:0_0_3px_var(--card),0_0_3px_var(--card),0_0_3px_var(--card)] lg:block'

const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`)

function pinHtml(branch: Branch, active: boolean): string {
  const title = escapeHtml(branch.name)
  const image = escapeHtml(branch.imageUrl)
  return active
    ? `<div title="${title}" class="relative -mt-7 -ml-7 cursor-pointer">
        <img src="${image}" alt="" class="size-14 rounded-2xl border-[3px] border-card bg-muted object-cover ring-4 ring-brand/40 ${PIN_SHADOW}" />
        <span class="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-brand px-2 py-1 text-xs font-medium text-brand-foreground ${PIN_SHADOW}">${title}</span>
      </div>`
    : `<div title="${title}" class="group relative -mt-5 -ml-5 cursor-pointer">
        <img src="${image}" alt="" class="size-10 rounded-xl border-2 border-card bg-muted object-cover transition-transform group-hover:scale-110 ${PIN_SHADOW}" />
        <span class="${SIDE_LABEL}">${title}</span>
      </div>`
}

interface Pin {
  marker: HereDomMarker
  normal: HereDomIcon
  active: HereDomIcon
}

/**
 * Un solo mapa de HERE por pestaña. Si se destruye (`dispose`) y se crea otro al volver a la
 * pantalla, el nuevo solo dibuja los pines: las teselas quedan en blanco. Por eso al salir de
 * Sucursales el mapa no se destruye: su elemento sale del DOM y vuelve a entrar al regresar, con
 * todo lo que ya tenía cargado.
 */
interface MapSession {
  element: HTMLDivElement
  map: HereMapInstance
  branches: Branch[]
  pins: Pin[]
  /** Arrastrar y hacer zoom con mouse, dedo o rueda. Vive lo mismo que el mapa. */
  behavior: { dispose(): void }
}
let session: MapSession | null = null
/** Toque en un pin: lo fija el `HereMap` montado (hay uno a la vez). */
let selectPin: (index: number) => void = () => {}

function createPins(H: HereNamespace, map: HereMapInstance, branches: Branch[]): Pin[] {
  return branches.map((branch, index) => {
    const normal = new H.map.DomIcon(pinHtml(branch, false))
    const active = new H.map.DomIcon(pinHtml(branch, true))
    const marker = new H.map.DomMarker(branch.position, { icon: normal })
    marker.addEventListener('tap', () => selectPin(index))
    map.addObject(marker)
    return { marker, normal, active }
  })
}

function createSession(H: HereNamespace, branches: Branch[], start: HereLatLng): MapSession {
  const element = document.createElement('div')
  element.className = 'size-full'
  const platform = new H.service.Platform({ apikey: env.hereApiKey })
  const map = new H.Map(element, createHereBaseLayer(H, platform), {
    center: start,
    zoom: ZOOM,
    pixelRatio: window.devicePixelRatio || 1,
  })
  const behavior = new H.mapevents.Behavior(new H.mapevents.MapEvents(map))
  return { element, map, branches, behavior, pins: createPins(H, map, branches) }
}

/** Mismo mapa con otra lista de sucursales (hoy la lista es fija): se cambian solo los pines. */
function syncPins(current: MapSession, branches: Branch[]): MapSession {
  if (current.branches === branches || !window.H) return current
  current.pins.forEach(({ marker }) => current.map.removeObject(marker))
  current.pins = createPins(window.H, current.map, branches)
  current.branches = branches
  return current
}

interface HereMapProps {
  branches: Branch[]
  activeIndex: number
  onSelect: (index: number) => void
  /** Espacio que tapan la cabecera y la tarjeta: el pin activo queda centrado en lo visible. */
  padding: { top: number; bottom: number }
  /** HERE no cargó (sin internet, key inválida o dominio no permitido). */
  onError: (reason: string) => void
  className?: string
}

/** Mapa de HERE con un pin por sucursal. Al cambiar la activa, el mapa se mueve hasta ella animado. */
export function HereMap({
  branches,
  activeIndex,
  onSelect,
  padding,
  onError,
  className,
}: HereMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const prevIndexRef = useRef<number | null>(null)
  const [mounted, setMounted] = useState<MapSession | null>(null)

  // Las funciones del padre cambian en cada render: se leen por referencia para no rehacer el mapa.
  const onErrorRef = useRef(onError)
  const activeRef = useRef(activeIndex)
  useEffect(() => {
    selectPin = onSelect
    onErrorRef.current = onError
    activeRef.current = activeIndex
  })

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    // Estado de esta ejecución del efecto (si se desmonta antes de que HERE termine de cargar).
    const run: { disposed: boolean; resizer?: ResizeObserver } = { disposed: false }

    const attach = (current: MapSession) => {
      container.append(current.element)
      run.resizer = new ResizeObserver(() => current.map.getViewPort().resize())
      run.resizer.observe(container)
      current.map.getViewPort().resize()
      prevIndexRef.current = null
      setMounted(current)
    }

    const fail = (reason: string) => {
      console.error(`[here-map] ${reason}`)
      if (!run.disposed) onErrorRef.current(reason)
    }

    if (session) {
      attach(syncPins(session, branches))
    } else {
      const start = branches[activeRef.current]?.position ?? SINCELEJO
      // HERE no avisa si las teselas fallan: se prueba una aparte para mostrar el motivo.
      void checkHereTiles(env.hereApiKey, start).then((problem) => {
        if (problem) fail(problem)
      })
      loadHereMaps().then(
        (H) => {
          if (run.disposed) return
          // Separado de la descarga: si HERE cambia su API, el motivo real llega a la consola.
          try {
            session ??= createSession(H, branches, start)
            attach(syncPins(session, branches))
          } catch (error) {
            fail(`HERE no pudo crear el mapa: ${error instanceof Error ? error.message : error}`)
          }
        },
        () => fail('No se pudo descargar HERE Maps (js.api.here.com).'),
      )
    }

    return () => {
      run.disposed = true
      run.resizer?.disconnect()
      if (session?.element.parentElement === container) session.element.remove()
      setMounted(null)
    }
  }, [branches])

  // Pin activo resaltado y el mapa viaja hasta él (respetando lo que tapan cabecera y tarjeta).
  useEffect(() => {
    const branch = branches[activeIndex]
    if (!mounted || !branch) return
    const { map, pins } = mounted

    pins.forEach(({ marker, normal, active }, index) => {
      const isActive = index === activeIndex
      marker.setIcon(isActive ? active : normal)
      marker.setZIndex(isActive ? 1 : 0)
    })

    map.getViewPort().setPadding(padding.top, 0, padding.bottom, 0)
    const branchChanged = prevIndexRef.current !== null && prevIndexRef.current !== activeIndex
    prevIndexRef.current = activeIndex
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    map
      .getViewModel()
      .setLookAtData({ position: branch.position, zoom: ZOOM }, branchChanged && !reduceMotion)
  }, [mounted, activeIndex, branches, padding.top, padding.bottom])

  /** Botones + y − (el mapa también hace zoom con la rueda o con dos dedos). */
  function zoomBy(step: number) {
    const map = mounted?.map
    if (!map) return
    const zoom = map.getViewModel().getLookAtData().zoom ?? ZOOM
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    map
      .getViewModel()
      .setLookAtData({ zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom + step)) }, !reduceMotion)
  }

  return (
    <div className={cn('bg-muted', className)}>
      <div
        ref={containerRef}
        role="region"
        aria-label="Mapa de sucursales"
        className="absolute inset-0"
      />
      {mounted && (
        <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
          <AnimateIcon animateOnHover animateOnTap asChild>
            <button
              type="button"
              aria-label="Acercar"
              onClick={() => zoomBy(1)}
              className={ZOOM_BUTTON}
            >
              <PlusSign size={18} aria-hidden />
            </button>
          </AnimateIcon>
          <AnimateIcon animateOnHover animateOnTap asChild>
            <button
              type="button"
              aria-label="Alejar"
              onClick={() => zoomBy(-1)}
              className={ZOOM_BUTTON}
            >
              <MinusSign size={18} aria-hidden />
            </button>
          </AnimateIcon>
        </div>
      )}
    </div>
  )
}
