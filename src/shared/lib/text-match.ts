/** Minúsculas y sin tildes: "Bogotá" y "bogota" se comparan igual. */
export const normalizeText = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()

/** Opciones que contienen lo escrito (primero las que empiezan así). Sin texto: las primeras. */
export function matchOptions(options: readonly string[], query: string, limit = 6) {
  const q = normalizeText(query)
  if (!q) return options.slice(0, limit)
  const starts: string[] = []
  const contains: string[] = []
  for (const option of options) {
    const text = normalizeText(option)
    if (text.startsWith(q)) starts.push(option)
    else if (text.includes(q)) contains.push(option)
  }
  return [...starts, ...contains].slice(0, limit)
}

/**
 * La opción a la que se refiere lo escrito, si no hay duda: igual sin tildes/mayúsculas, o la única
 * que empieza así (desde 4 letras). "bogota" → "Bogotá D.C."; "cart" no (Cartagena o Cartago).
 */
export function resolveOption(options: readonly string[], query: string) {
  const q = normalizeText(query)
  if (!q) return undefined
  const exact = options.find((option) => normalizeText(option) === q)
  if (exact) return exact
  if (q.length < 4) return undefined
  const prefixed = options.filter((option) => normalizeText(option).startsWith(q))
  return prefixed.length === 1 ? prefixed[0] : undefined
}
