import { CITIES } from '@/features/quote'
import {
  CITY_CODES,
  CITY_COORDS,
  INTERCITY,
  ROAD_FACTOR,
  SPECIAL,
  SPECIAL_CITIES,
  URBAN,
  type RouteRates,
} from './tariffs'

type City = (typeof CITIES)[number]

/** Un trayecto del tarifario, con los mismos campos que usa `/cotizar`. */
export interface RouteTariff extends RouteRates {
  codigoTrayecto: string
  destino: City
  kind: 'urbano' | 'nacional' | 'especial'
  /** Distancia aproximada por carretera; 0 en urbano. */
  distanceKm: number
  /** Hasta este peso (múltiplo de 0,5 kg) se cobra el flete mínimo. */
  minimoCubreKg: number
}

const EARTH_RADIUS_KM = 6_371
const toRad = (deg: number) => (deg * Math.PI) / 180
const round100 = (cop: number) => Math.round(cop / 100) * 100

/** Distancia aproximada por carretera, redondeada a 10 km. */
export function roadDistanceKm(a: City, b: City) {
  const [lat1, lon1] = CITY_COORDS[a]
  const [lat2, lon2] = CITY_COORDS[b]
  const h =
    Math.sin(toRad(lat2 - lat1) / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(toRad(lon2 - lon1) / 2) ** 2
  const straight = 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h))
  return Math.round((straight * ROAD_FACTOR) / 10) * 10
}

const intercityHours = (km: number) => (km <= 350 ? 24 : km <= 800 ? 48 : 72)

function rates(kind: RouteTariff['kind'], km: number): RouteRates {
  if (kind === 'urbano') return URBAN
  if (kind === 'especial') return SPECIAL
  const copPorKg = round100(INTERCITY.copPorKg.baseCop + km * INTERCITY.copPorKg.perKmCop)
  const firstKg = round100(INTERCITY.firstKg.baseCop + km * INTERCITY.firstKg.perKmCop)
  return {
    copPorKg,
    fleteMinimoCop: firstKg + 2 * copPorKg,
    tiempoEntregaHoras: intercityHours(km),
  }
}

/** Tarifa del trayecto origen → destino (por confirmar). */
export function routeTariff(origen: City, destino: City): RouteTariff {
  const distanceKm = origen === destino ? 0 : roadDistanceKm(origen, destino)
  const kind =
    origen === destino
      ? 'urbano'
      : SPECIAL_CITIES.includes(origen) || SPECIAL_CITIES.includes(destino)
        ? 'especial'
        : 'nacional'
  const routeRates = rates(kind, distanceKm)
  return {
    codigoTrayecto: `TLX-${CITY_CODES[origen]}-${CITY_CODES[destino]}-001`,
    destino,
    kind,
    distanceKm,
    ...routeRates,
    minimoCubreKg: Math.floor((routeRates.fleteMinimoCop / routeRates.copPorKg) * 2) / 2,
  }
}

/** `flete_base_cop` de `/cotizar`: máx(flete mínimo, peso facturable × tarifa por kg). */
export const fleteBase = (route: RouteRates, pesoFacturableKg: number) =>
  Math.max(route.fleteMinimoCop, Math.round(pesoFacturableKg * route.copPorKg))

/** Todos los destinos desde una ciudad, del más cercano al más lejano. */
export const routesFrom = (origen: City) =>
  CITIES.map((destino) => routeTariff(origen, destino)).sort((a, b) => a.distanceKm - b.distanceKm)
