// Carga diferida de HERE Maps API for JavaScript (v3.1) desde su CDN. No va en el bundle: solo se
// descarga al abrir una pantalla con mapa. Tipos mínimos de lo que usa la app (HERE no publica tipos en npm).

const HERE_CDN = 'https://js.api.here.com/v3/3.1/'
// El orden importa: core primero.
const SCRIPTS = ['mapsjs-core.js', 'mapsjs-service.js', 'mapsjs-mapevents.js']

/**
 * Estilo de Raster Tile API v3: `explore.day` (calles suaves, parques y agua con color) sin los
 * lugares (`pois:disabled`), para que solo se vean las sucursales encima.
 */
export const HERE_MAP_STYLE = 'explore.day'
const HERE_MAP_FEATURES = 'pois:disabled'

export interface HereLatLng {
  lat: number
  lng: number
}

export interface HereDomIcon {
  readonly __hereDomIcon?: never
}

export interface HereDomMarker {
  setIcon(icon: HereDomIcon): void
  setZIndex(zIndex: number): void
  addEventListener(type: 'tap', listener: () => void): void
}

export interface HereMapInstance {
  getViewModel(): {
    setLookAtData(data: { position?: HereLatLng; zoom?: number }, animate?: boolean): void
    getLookAtData(): { zoom?: number }
  }
  getViewPort(): {
    resize(): void
    setPadding(top: number, right: number, bottom: number, left: number): void
  }
  addObject(object: HereDomMarker): void
  removeObject(object: HereDomMarker): void
  dispose(): void
}

export interface HerePlatform {
  getRasterTileService(options: { queryParams: Record<string, string | number> }): unknown
}

export interface HereNamespace {
  service: {
    Platform: new (options: { apikey: string }) => HerePlatform
    rasterTile: {
      Provider: new (service: unknown, options?: { tileSize?: number }) => unknown
    }
  }
  Map: {
    new (
      element: HTMLElement,
      baseLayer: unknown,
      options: { center: HereLatLng; zoom: number; pixelRatio?: number },
    ): HereMapInstance
  }
  mapevents: {
    MapEvents: new (map: HereMapInstance) => unknown
    Behavior: new (mapEvents: unknown) => { dispose(): void }
  }
  map: {
    DomIcon: new (html: string) => HereDomIcon
    DomMarker: new (position: HereLatLng, options: { icon: HereDomIcon }) => HereDomMarker
    layer: { TileLayer: new (provider: unknown) => unknown }
  }
}

declare global {
  interface Window {
    H?: HereNamespace
  }
}

function addScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = src
    script.async = false
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`No se pudo cargar ${src}`))
    document.head.append(script)
  })
}

let loading: Promise<HereNamespace> | null = null

/** Descarga HERE una sola vez. Si falla (sin internet), el siguiente intento vuelve a probar. */
export function loadHereMaps(): Promise<HereNamespace> {
  if (window.H) return Promise.resolve(window.H)
  loading ??= (async () => {
    for (const file of SCRIPTS) await addScript(HERE_CDN + file)
    if (!window.H) throw new Error('HERE Maps no quedó disponible')
    return window.H
  })().catch((error: unknown) => {
    loading = null
    throw error
  })
  return loading
}

/**
 * Capa base raster (Raster Tile API v3) con el motor WebGL por defecto. No usar `EngineType.P2D`:
 * desde HERE 3.1.6x ese motor ya no viene en `mapsjs-core.js` y `new H.Map` falla
 * ("Cannot read properties of undefined (reading 'RenderEngine')").
 * `ppi` 200 solo con `devicePixelRatio` ≥ 2 (celulares, Retina): en pantallas de 1.25x o 1.5x los
 * rótulos salían al doble de tamaño.
 */
export function createHereBaseLayer(H: HereNamespace, platform: HerePlatform): unknown {
  const hiDpi = window.devicePixelRatio >= 2
  const service = platform.getRasterTileService({
    queryParams: {
      style: HERE_MAP_STYLE,
      features: HERE_MAP_FEATURES,
      lang: 'es',
      ppi: hiDpi ? 200 : 100,
    },
  })
  const provider = new H.service.rasterTile.Provider(service, { tileSize: 512 })
  return new H.map.layer.TileLayer(provider)
}

/**
 * Pide una sola tesela para saber si la key sirve. HERE pinta las teselas dentro del mapa sin avisar
 * si fallan; así el error (401/403: key inválida o dominio no permitido) se ve en la consola.
 */
export async function checkHereTiles(apiKey: string, at: HereLatLng): Promise<string | null> {
  const zoom = 12
  const n = 2 ** zoom
  const latRad = (at.lat * Math.PI) / 180
  const x = Math.floor(((at.lng + 180) / 360) * n)
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n)
  const url = `https://maps.hereapi.com/v3/base/mc/${zoom}/${x}/${y}/png8?style=${HERE_MAP_STYLE}&apiKey=${encodeURIComponent(apiKey)}`
  try {
    const response = await fetch(url)
    if (response.ok) return null
    const detail = await response.text().catch(() => '')
    return `HERE respondió ${response.status}. ${detail.slice(0, 200)}`
  } catch {
    return 'No hay conexión con los servidores de HERE.'
  }
}
