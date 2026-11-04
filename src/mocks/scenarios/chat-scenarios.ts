import fixtures from '../fixtures/chat.json'

export type ScenarioName = keyof typeof fixtures.replies

/**
 * Elige qué captura real devolver según el texto. Solo para el mock: el backend real decide con
 * su propio clasificador de intención y reglas de escalamiento.
 */
export function pickScenario(text: string, escalated: boolean): ScenarioName {
  const t = text.toLowerCase()
  if (/asesor|humano|persona/.test(t)) return 'pide_asesor'
  if (escalated) return 'esperando_asesor'
  if (/tlx-310482-co/.test(t)) return 'guia_retenida_escala'
  if (/tlx-\d{6}-co|rastre|guía|guia/.test(t)) return 'tracking'
  if (/valor|asegur/.test(t)) return 'cotizacion_resumen'
  if (/cotiz|envío a|envio a/.test(t)) return 'cotizacion_ruta'
  if (/hong kong|contenedor|internacional/.test(t)) return 'rag_fuera_de_corpus'
  if (/peligros|ácido|acido|norma|document/.test(t)) return 'rag_citas'
  if (/roto|rota|daño|dano|novedad|reclam/.test(t)) return 'pqrs_dano'
  return 'saludo'
}

export const chatFixtures = fixtures
