import type { RawBlock } from './block-definition'
import { useBlockRegistry } from './block-registry'

/**
 * Dibuja un bloque según su `type` buscando en el registro.
 * No conoce ningún bloque concreto: agregar uno nuevo no toca este archivo.
 */
export function BlockRenderer({ block }: { block: RawBlock }) {
  const registry = useBlockRegistry()
  const definition = registry.get(block.type)

  if (!definition) {
    if (import.meta.env.DEV)
      console.warn(`[blocks] Bloque sin componente registrado: "${block.type}"`)
    return null
  }

  const parsed = definition.schema.safeParse(block)
  if (!parsed.success) {
    if (import.meta.env.DEV)
      console.error(`[blocks] Bloque "${block.type}" fuera de contrato`, parsed.error)
    return null
  }

  return definition.render(parsed.data)
}
