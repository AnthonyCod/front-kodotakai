import type { HereLatLng } from '@/shared/lib/here-maps'
import { normalizeText } from '@/shared/lib/text-match'

export interface Branch {
  id: string
  name: string
  description: string
  address: string
  imageUrl: string
  /** Servicios en corto, para las etiquetas (salen de la descripción). */
  tags: string[]
  position: HereLatLng
}

/** Todas las sucursales de prueba están en la misma ciudad. */
export const BRANCH_CITY = 'Sincelejo, Sucre'

/** Imagen de ejemplo estable por sucursal (por confirmar: fotos reales). */
const photo = (seed: string) => `https://picsum.photos/seed/translogix-${seed}/640/480`

/**
 * Sucursales de prueba en Sincelejo (Sucre). El backend aún no expone la lista: datos, direcciones
 * y coordenadas son de ejemplo (por confirmar).
 */
export const BRANCHES: Branch[] = [
  {
    id: 'centro',
    name: 'Sincelejo Centro',
    description: 'Recepción y entrega de paquetes, cotización en mostrador y pagos.',
    address: 'Calle 21 # 19-45, Centro',
    imageUrl: photo('centro'),
    tags: ['Recepción', 'Entregas', 'Cotización', 'Pagos'],
    position: { lat: 9.3018, lng: -75.3952 },
  },
  {
    id: 'majagual',
    name: 'Majagual',
    description: 'Punto de envíos express y recogida de paquetes cerca de la plaza.',
    address: 'Carrera 20 # 23-10, Majagual',
    imageUrl: photo('majagual'),
    tags: ['Envío express', 'Recogida'],
    position: { lat: 9.3046, lng: -75.3928 },
  },
  {
    id: 'guacari',
    name: 'C.C. Guacarí',
    description: 'Envíos nacionales y casillero para recoger compras en línea.',
    address: 'Carrera 25 # 23-108, local 12',
    imageUrl: photo('guacari'),
    tags: ['Envíos nacionales', 'Casillero'],
    position: { lat: 9.2975, lng: -75.387 },
  },
  {
    id: 'la-ford',
    name: 'La Ford',
    description: 'Atención a empresas, carga masiva y recogida programada.',
    address: 'Calle 28 # 24-15, La Ford',
    imageUrl: photo('la-ford'),
    tags: ['Empresas', 'Carga masiva', 'Recogida programada'],
    position: { lat: 9.3115, lng: -75.387 },
  },
  {
    id: 'terminal',
    name: 'Terminal de Transportes',
    description: 'Despacho intermunicipal y entregas el mismo día en Sucre.',
    address: 'Carrera 25 con Calle 38, Terminal',
    imageUrl: photo('terminal'),
    tags: ['Intermunicipal', 'Entrega el mismo día'],
    position: { lat: 9.288, lng: -75.383 },
  },
  {
    id: 'via-tolu',
    name: 'Centro de distribución',
    description: 'Bodega principal: carga pesada, cadena de frío y consolidación.',
    address: 'Kilómetro 2 vía a Tolú',
    imageUrl: photo('via-tolu'),
    tags: ['Carga pesada', 'Cadena de frío', 'Consolidación'],
    position: { lat: 9.326, lng: -75.406 },
  },
]

/** Índice circular: después de la última vuelve a la primera, y antes de la primera va a la última. */
export function wrapIndex(index: number, length: number): number {
  if (length <= 0) return 0
  return ((index % length) + length) % length
}

/** Buscador: sucursales cuyo nombre, dirección o servicios contienen lo escrito (sin tildes). */
export function filterBranches(branches: Branch[], query: string) {
  const q = normalizeText(query)
  return branches
    .map((branch, index) => ({ branch, index }))
    .filter(({ branch }) =>
      normalizeText(`${branch.name} ${branch.address} ${branch.description}`).includes(q),
    )
}
