/**
 * Tarifario TransLogix 2026 por trayecto, con la lógica de `/cotizar` (CalculoFlete):
 * flete_base = máx(flete_minimo_cop, peso_facturable_kg × cop_por_kg). (por confirmar)
 * Valores anclados en el tarifario público de Aviaexpress (Grupo Aviatur), vigente desde febrero de
 * 2025: urbano $2.357/kg con mínimo $10.320, nacional terrestre $3.631/kg con mínimo $19.556,
 * trayecto especial $12.676/kg con mínimo $56.884; seguro 2 % del valor declarado (mínimo $550).
 * Entre ciudades, la tarifa crece con la distancia por carretera. Matriz para cargar en el backend:
 * `docs/tarifas-trayectos.csv`; reglas: `docs/tarifas.md`.
 */
import type { CITIES } from '@/features/quote'

export const TARIFF_VERSION = '2026.1'
export const TARIFF_EFFECTIVE_DATE = '2026-11-04'

/** Salario mínimo 2026 (Decreto 1469 de 2025). */
export const SMMLV_2026 = 1_750_905

type City = (typeof CITIES)[number]

/** Coordenadas (lat, lon) de cada ciudad, para la distancia entre ellas. */
export const CITY_COORDS: Record<City, readonly [number, number]> = {
  'Bogotá D.C.': [4.711, -74.072],
  Medellín: [6.244, -75.581],
  Cali: [3.452, -76.532],
  Barranquilla: [10.964, -74.796],
  Cartagena: [10.391, -75.479],
  Bucaramanga: [7.119, -73.123],
  Pereira: [4.813, -75.696],
  Manizales: [5.07, -75.514],
  Armenia: [4.534, -75.681],
  Ibagué: [4.439, -75.232],
  Cúcuta: [7.893, -72.508],
  'Santa Marta': [11.24, -74.199],
  Villavicencio: [4.142, -73.627],
  Neiva: [2.927, -75.282],
  Pasto: [1.214, -77.281],
  Popayán: [2.444, -76.614],
  Tunja: [5.535, -73.368],
  Montería: [8.748, -75.882],
  Sincelejo: [9.305, -75.398],
  Valledupar: [10.463, -73.253],
  Riohacha: [11.544, -72.907],
  Quibdó: [5.694, -76.658],
  Florencia: [1.614, -75.606],
  Yopal: [5.337, -72.395],
  Arauca: [7.084, -70.759],
  Mocoa: [1.152, -76.652],
  Leticia: [-4.215, -69.94],
  'San Andrés': [12.584, -81.701],
  Buenaventura: [3.883, -77.031],
  Barrancabermeja: [7.065, -73.854],
  Cartago: [4.746, -75.912],
  Tuluá: [4.084, -76.195],
  Palmira: [3.539, -76.303],
  Rionegro: [6.155, -75.374],
  Duitama: [5.827, -73.033],
  Sogamoso: [5.715, -72.934],
  Girardot: [4.303, -74.804],
  Aguachica: [8.308, -73.616],
}

/** Sin vía terrestre regular: siempre trayecto especial (aéreo o fluvial). */
export const SPECIAL_CITIES: readonly City[] = ['Leticia', 'San Andrés']

/** Distancia en línea recta × este factor ≈ distancia por carretera en Colombia. */
export const ROAD_FACTOR = 1.5

/** Valores de un trayecto con los nombres de `/cotizar`. */
export interface RouteRates {
  copPorKg: number
  fleteMinimoCop: number
  tiempoEntregaHoras: number
}

export const URBAN: RouteRates = { copPorKg: 2_357, fleteMinimoCop: 10_320, tiempoEntregaHoras: 24 }
export const SPECIAL: RouteRates = {
  copPorKg: 12_676,
  fleteMinimoCop: 56_884,
  tiempoEntregaHoras: 192,
}
/**
 * Entre ciudades, por km de carretera (Bogotá–Cali ≈ nacional terrestre de Aviaexpress).
 * El mínimo equivale a 3 kg: primer kg + 2 kg a la tarifa por kg.
 */
export const INTERCITY = {
  copPorKg: { baseCop: 2_600, perKmCop: 2.3 },
  firstKg: { baseCop: 8_000, perKmCop: 9.5 },
}

/** Código de 3 letras por ciudad para `codigo_trayecto` (TLX-BOG-MED-001). */
export const CITY_CODES: Record<City, string> = {
  'Bogotá D.C.': 'BOG',
  Medellín: 'MED',
  Cali: 'CAL',
  Barranquilla: 'BAR',
  Cartagena: 'CAR',
  Bucaramanga: 'BUC',
  Pereira: 'PER',
  Manizales: 'MAN',
  Armenia: 'ARM',
  Ibagué: 'IBA',
  Cúcuta: 'CUC',
  'Santa Marta': 'SMR',
  Villavicencio: 'VIL',
  Neiva: 'NEI',
  Pasto: 'PAS',
  Popayán: 'POP',
  Tunja: 'TUN',
  Montería: 'MON',
  Sincelejo: 'SIN',
  Valledupar: 'VAL',
  Riohacha: 'RIO',
  Quibdó: 'QUI',
  Florencia: 'FLO',
  Yopal: 'YOP',
  Arauca: 'ARA',
  Mocoa: 'MOC',
  Leticia: 'LET',
  'San Andrés': 'SAI',
  Buenaventura: 'BUE',
  Barrancabermeja: 'BCB',
  Cartago: 'CRT',
  Tuluá: 'TUL',
  Palmira: 'PAL',
  Rionegro: 'RNG',
  Duitama: 'DUI',
  Sogamoso: 'SOG',
  Girardot: 'GIR',
  Aguachica: 'AGU',
}

/** Peso volumétrico: alto × ancho × largo (cm) ÷ 2.500, equivale a 400 kg/m³. */
export const VOLUMETRIC_DIVISOR = 2_500
/** Seguro: % del valor declarado. */
export const INSURANCE = { rate: 0.02, minCop: 550 }
/** Valor declarado máximo por envío: 4 salarios mínimos. Por encima, póliza especial. */
export const MAX_DECLARED_COP = 4 * SMMLV_2026

export interface ExtraService {
  id: 'CADENA_FRIO' | 'MERCANCIA_PELIGROSA' | 'CONTRA_ENTREGA' | 'DEVOLUCION'
  name: string
  price: string
  conditions: string[]
}

export const EXTRA_SERVICES: ExtraService[] = [
  {
    id: 'CADENA_FRIO',
    name: 'Cadena de frío (2 a 8 °C)',
    price: '+40 % sobre el flete base',
    conditions: [
      'Para alimentos, medicamentos y productos perecederos.',
      'Vehículo con equipo de frío y registro de temperatura (Resolución 2505 de 2004).',
      'Alimentos: requisitos sanitarios de la Resolución 2674 de 2013 (INVIMA).',
      'No disponible en trayectos especiales.',
    ],
  },
  {
    id: 'MERCANCIA_PELIGROSA',
    name: 'Mercancía peligrosa',
    price: '+50 % sobre el flete base',
    conditions: [
      'Según el Decreto 1609 de 2002, compilado en el Decreto 1079 de 2015.',
      'Requiere hoja de seguridad, clase ONU y embalaje homologado.',
      'No se transportan explosivos (clase 1) ni material radiactivo (clase 7).',
      'No disponible en trayectos especiales.',
    ],
  },
  {
    id: 'CONTRA_ENTREGA',
    name: 'Pago contra entrega',
    price: '3 % de lo recaudado (mínimo $3.000)',
    conditions: ['Cobramos al destinatario y te giramos el valor recaudado.'],
  },
  {
    id: 'DEVOLUCION',
    name: 'Devolución al remitente',
    price: 'Flete del trayecto de regreso',
    conditions: ['Aplica si el destinatario no recibe tras dos intentos de entrega.'],
  },
]

/** Condiciones legales que acompañan la tarifa. */
export const TARIFF_TERMS = [
  'Se cobra el mayor entre el peso real y el peso volumétrico. Cada trayecto tiene un flete mínimo: si el peso por la tarifa por kg da menos, se cobra el mínimo.',
  'El seguro es el 2 % del valor declarado (mínimo $550). Declara el valor real: de él depende la indemnización.',
  'Por pérdida, saqueo o avería, la indemnización es de 5 veces la tarifa pagada más el valor asegurado (Ley 1369 de 2009, art. 25).',
  'El valor declarado máximo por envío es de 4 salarios mínimos. Por encima se necesita póliza especial.',
  'IVA y otros impuestos: por confirmar con el área contable.',
]
