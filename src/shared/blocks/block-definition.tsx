import type { ComponentType, ReactNode } from 'react'
import { z } from 'zod'

/** Lo mínimo que exige el chat de cualquier bloque: un `type`. El resto lo valida cada feature. */
export const rawBlockSchema = z.looseObject({ type: z.string() })
export type RawBlock = z.infer<typeof rawBlockSchema>

/**
 * Definición ya "borrada" de un bloque. El chat solo conoce esta forma,
 * nunca los tipos concretos de cada feature (inversión de dependencias).
 */
export interface BlockDefinition {
  readonly type: string
  readonly schema: z.ZodType
  readonly render: (data: unknown) => ReactNode
}

interface DefineBlockInput<S extends z.ZodObject> {
  type: z.infer<S> extends { type: infer T extends string } ? T : never
  schema: S
  Component: ComponentType<{ block: z.infer<S> }>
}

/**
 * Cada feature declara su bloque con esto. El schema es estricto por defecto:
 * los campos que no declara (p. ej. datos personales) se descartan antes de renderizar.
 */
export function defineBlock<S extends z.ZodObject>({
  type,
  schema,
  Component,
}: DefineBlockInput<S>): BlockDefinition {
  return {
    type,
    schema,
    // `render` solo se llama con datos que ya pasaron `schema.safeParse`.
    render: (data) => <Component block={data as z.infer<S>} />,
  }
}
