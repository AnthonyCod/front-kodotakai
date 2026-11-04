import { createContext, useContext, type ReactNode } from 'react'
import type { BlockDefinition } from './block-definition'

export type BlockRegistry = ReadonlyMap<string, BlockDefinition>

export function createBlockRegistry(definitions: readonly BlockDefinition[]): BlockRegistry {
  const registry = new Map<string, BlockDefinition>()
  for (const definition of definitions) {
    if (registry.has(definition.type)) {
      throw new Error(`Bloque duplicado en el registro: "${definition.type}"`)
    }
    registry.set(definition.type, definition)
  }
  return registry
}

const BlockRegistryContext = createContext<BlockRegistry>(new Map())

export function BlockRegistryProvider({
  registry,
  children,
}: {
  registry: BlockRegistry
  children: ReactNode
}) {
  return <BlockRegistryContext value={registry}>{children}</BlockRegistryContext>
}

export function useBlockRegistry(): BlockRegistry {
  return useContext(BlockRegistryContext)
}
