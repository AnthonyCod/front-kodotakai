/**
 * Contenido del centro legal. (por confirmar) Son borradores: el texto final lo revisa un abogado
 * y faltan los datos de la empresa (razón social, NIT, dirección). El backend no tiene endpoint de
 * documentos legales; cuando exista (`GET /legal/{slug}`), este archivo deja de ser la fuente.
 */

export interface LegalSection {
  id: string
  title: string
  paragraphs: string[]
  list?: string[]
}

export interface LegalDocument {
  slug: string
  title: string
  description: string
  version: string
  /** Fecha de vigencia (ISO). */
  effectiveDate: string
  draft: boolean
  /** "En 30 segundos": lo esencial en lenguaje simple. */
  summary: string[]
  sections: LegalSection[]
}

export const LEGAL_DOCUMENTS: LegalDocument[] = [
  {
    slug: 'datos-personales',
    title: 'Tratamiento de datos personales',
    description: 'Qué datos pedimos, para qué y cómo ejercer tus derechos.',
    version: '1.0',
    effectiveDate: '2026-11-04',
    draft: true,
    summary: [
      'Pedimos solo los datos necesarios para cotizar, transportar y entregar tu envío.',
      'No vendemos tus datos. Los compartimos solo con quien participa en la entrega.',
      'Puedes conocer, actualizar, corregir o pedir que borremos tus datos cuando quieras.',
    ],
    sections: [
      {
        id: 'responsable',
        title: 'Quién es el responsable',
        paragraphs: [
          'TransLogix es responsable del tratamiento de los datos que entregas en esta aplicación, en WhatsApp y en las llamadas con Logi.',
          'Razón social, NIT, dirección y correo de contacto: por confirmar.',
        ],
      },
      {
        id: 'datos',
        title: 'Qué datos recogemos',
        paragraphs: ['Según lo que hagas con nosotros, podemos recoger:'],
        list: [
          'Datos de contacto: nombre, teléfono y correo.',
          'Datos del envío: origen, destino, medidas, peso, valor declarado y número de guía.',
          'Lo que escribes o dices a Logi, y los archivos que adjuntas en una PQRS.',
        ],
      },
      {
        id: 'finalidades',
        title: 'Para qué los usamos',
        paragraphs: ['Usamos tus datos para:'],
        list: [
          'Cotizar, transportar, rastrear y entregar tus envíos.',
          'Atender tus preguntas, reclamos y solicitudes (PQRS).',
          'Mejorar el servicio y las respuestas de Logi.',
          'Cumplir obligaciones legales y requerimientos de autoridades.',
        ],
      },
      {
        id: 'derechos',
        title: 'Tus derechos',
        paragraphs: ['Según la Ley 1581 de 2012, como titular de tus datos puedes:'],
        list: [
          'Conocer, actualizar y rectificar tus datos.',
          'Pedir prueba de la autorización que nos diste.',
          'Saber qué uso le hemos dado a tus datos.',
          'Revocar la autorización o pedir que suprimamos tus datos.',
          'Presentar quejas ante la Superintendencia de Industria y Comercio.',
          'Acceder gratis a tus datos.',
        ],
      },
      {
        id: 'como-ejercerlos',
        title: 'Cómo ejercerlos',
        paragraphs: [
          'Haz tu solicitud desde PQRS indicando qué necesitas. Respondemos las consultas en máximo 10 días hábiles y los reclamos en máximo 15 días hábiles.',
        ],
      },
    ],
  },
  {
    slug: 'uso-de-logi',
    title: 'Uso de Logi (IA)',
    description: 'Cómo funciona el asistente y qué pasa con tus conversaciones.',
    version: '1.0',
    effectiveDate: '2026-11-04',
    draft: true,
    summary: [
      'Logi es un asistente con inteligencia artificial, no una persona.',
      'Sus respuestas son orientativas: el valor final de un envío es el de la cotización.',
      'Si lo necesitas, un asesor humano puede tomar tu caso.',
    ],
    sections: [
      {
        id: 'que-es',
        title: 'Qué es Logi',
        paragraphs: [
          'Logi responde preguntas sobre envíos, rastrea guías, cotiza y ayuda a radicar PQRS. Usa la información de TransLogix y de la normativa de transporte.',
        ],
      },
      {
        id: 'limites',
        title: 'Lo que debes tener en cuenta',
        paragraphs: ['Logi puede equivocarse. Por eso:'],
        list: [
          'Revisa los datos antes de confirmar un envío o una solicitud.',
          'Sus respuestas no son asesoría legal.',
          'Ante una duda importante, pide hablar con un asesor.',
        ],
      },
      {
        id: 'conversaciones',
        title: 'Tus conversaciones',
        paragraphs: [
          'Guardamos las conversaciones con Logi (chat, WhatsApp y llamadas) para atender tu caso y mejorar el servicio. Se tratan según la política de datos personales.',
        ],
      },
      {
        id: 'asesor',
        title: 'Hablar con un asesor',
        paragraphs: [
          'En cualquier momento puedes pedir un asesor. Logi le pasa tu caso con el contexto de la conversación para que no tengas que repetirlo.',
        ],
      },
    ],
  },
]

/** Documentos previstos que aún no tienen texto. */
export const UPCOMING_DOCUMENTS = [
  {
    title: 'Términos del servicio',
    description: 'Condiciones del transporte, valor declarado y reclamos.',
  },
  {
    title: 'Mercancías prohibidas',
    description: 'Qué no transportamos y qué requiere condiciones especiales.',
  },
]

export const findLegalDocument = (slug: string) => LEGAL_DOCUMENTS.find((doc) => doc.slug === slug)
