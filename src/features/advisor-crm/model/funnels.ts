import type { FunnelId } from '../api/crm-api'

/** Textos de cada embudo. Las etapas (ids, nombres y totales) vienen del backend. */
export const FUNNELS: Record<
  FunnelId,
  { short: string; title: string; mobileTitle: string; subtitle: string; empty: string }
> = {
  ventas: {
    short: 'A · Ventas',
    title: 'Embudo de Ventas',
    mobileTitle: 'Embudo A · Cierre de Ventas',
    subtitle: 'Cotizaciones capturadas por el bot con teléfono verificado',
    empty: 'Cuando el bot capture una cotización nueva, aparecerá aquí con sus datos listos.',
  },
  casos: {
    short: 'B · Casos',
    title: 'Embudo de Consultas y Casos',
    mobileTitle: 'Embudo B · Consultas y Casos',
    subtitle: 'Escalamientos cuando el bot no basta, con teléfono del cliente',
    empty: 'Cuando el bot escale una consulta que no pudo resolver, aparecerá aquí.',
  },
  bot: {
    short: 'C · Bot IA',
    title: 'Seguimiento Automatizado del Bot',
    mobileTitle: 'Embudo C · Seguimiento del Bot',
    subtitle: 'Leads que el agente IA persigue antes de pasarlos a un asesor',
    empty: 'No hay leads en seguimiento automático en esta etapa.',
  },
}

export const FUNNEL_IDS: FunnelId[] = ['ventas', 'casos', 'bot']

/** Sustantivo del resumen de etapa: «12 cotizaciones · …». */
export const STAGE_NOUN: Record<FunnelId, [string, string]> = {
  ventas: ['cotización', 'cotizaciones'],
  casos: ['caso', 'casos'],
  bot: ['lead', 'leads'],
}

/** Nivel de confianza del bot en palabras (no se muestra como porcentaje). */
export function confidenceLabel(confianza: number) {
  if (confianza < 0.5)
    return { level: 'Confianza IA baja', hint: 'Requiere humano', tone: 'danger' as const }
  if (confianza < 0.7)
    return { level: 'Confianza IA media', hint: 'Revisión sugerida', tone: 'warning' as const }
  if (confianza < 0.85)
    return {
      level: 'Confianza IA media-alta',
      hint: 'Respuesta sugerida',
      tone: 'success' as const,
    }
  return { level: 'Confianza IA alta', hint: 'Resuelto con asesor', tone: 'success' as const }
}

/** Nombre corto de etapa para espacios estrechos: «En Contacto / Llamada» → «En Contacto». */
export const shortStage = (name: string) => name.split(/ \(| \/ /)[0]

/** Etapas acordadas con el backend (CR-007) que cambian el comportamiento de la UI. */
export const STAGE = {
  ventaCerrada: 'VENTA_CERRADA',
  descartado: 'DESCARTADO',
  casoResuelto: 'RESUELTO',
} as const

/** Desde aquí el asesor ya no mueve el lead: la venta cerrada emitió guía y descartado es final. */
export const isLockedStage = (stage: string) =>
  stage === STAGE.ventaCerrada || stage === STAGE.descartado

export const POSTVENTA_LABEL = {
  ENTREGADO_A_AGENCIA: 'Entregado a agencia',
  CERRADO: 'Cerrado',
} as const
