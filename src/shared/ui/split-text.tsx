import { createContext, use, type ElementType } from 'react'

/** Hasta ~1,4 s en total aunque el texto sea largo. */
const MAX_TOTAL_MS = 1400
const MAX_STEP_MS = 45

/**
 * Revela el texto palabra por palabra. Las palabras se pintan en su posición final (solo cambia
 * la opacidad y el desenfoque), así que el texto no se mueve ni empuja lo de abajo.
 */
export function SplitText({
  text,
  as: Tag = 'span',
  className,
  animate = true,
  ...rest
}: {
  text: string
  as?: ElementType
  className?: string
  /** `false` = texto normal (ya se mostró antes). */
  animate?: boolean
  'data-block'?: string
}) {
  if (!animate)
    return (
      <Tag className={className} {...rest}>
        {text}
      </Tag>
    )

  // Posición de cada palabra (los espacios se dejan como texto para no alterar el ajuste de línea).
  const tokens: { text: string; word: number | null }[] = []
  let words = 0
  for (const part of text.split(/(\s+)/))
    if (part) tokens.push({ text: part, word: /^\s+$/.test(part) ? null : words++ })
  const step = Math.min(MAX_STEP_MS, MAX_TOTAL_MS / Math.max(words, 1))

  return (
    <Tag className={className} {...rest}>
      {tokens.map((token, i) =>
        token.word === null ? (
          token.text
        ) : (
          <span
            key={i}
            className="split-word inline-block"
            style={{
              animation: `word-reveal 0.5s cubic-bezier(0.2, 0.7, 0.2, 1) ${token.word * step}ms both`,
            }}
          >
            {token.text}
          </span>
        ),
      )}
    </Tag>
  )
}

/** Lo da quien sabe si el contenido es nuevo (p. ej. una respuesta recién llegada). */
export const RevealContext = createContext(false)
export const useReveal = () => use(RevealContext)
