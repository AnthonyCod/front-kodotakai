import { useEffect, useRef } from 'react'
import { cn } from 'cn'
import {
  DEFAULT_GRADIENT_OPTIONS,
  GradientEngine,
  type GradientColors,
  type GradientOptions,
} from './gradient-engine'

const COLOR_TOKENS = ['--gradient-1', '--gradient-2', '--gradient-3', '--gradient-4'] as const

/** Lee los colores de los tokens de `index.css`, para no repetir hex en el código. */
function readTokenColors(element: HTMLElement): GradientColors {
  const styles = getComputedStyle(element)
  const [c1, c2, c3, c4] = COLOR_TOKENS.map((token) => styles.getPropertyValue(token).trim())
  return [c1 ?? '', c2 ?? '', c3 ?? '', c4 ?? '']
}

interface InteractiveGradientProps {
  className?: string
  /** Ajustes del efecto. Los colores salen de los tokens `--gradient-1..4` si no se pasan. */
  options?: Partial<GradientOptions>
}

/**
 * Fondo con degradado interactivo (sigue el puntero o el dedo). Ocupa todo su contenedor:
 * el padre debe tener `position: relative` y un tamaño definido.
 * Sin WebGL2 se queda con un degradado CSS estático de los mismos colores.
 */
export function InteractiveGradient({ className, options }: InteractiveGradientProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<GradientEngine | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    try {
      engineRef.current = new GradientEngine(container, {
        ...DEFAULT_GRADIENT_OPTIONS,
        colors: readTokenColors(container),
      })
    } catch (error) {
      if (import.meta.env.DEV) console.warn('[interactive-gradient] Se usa el degradado CSS', error)
    }
    return () => {
      engineRef.current?.destroy()
      engineRef.current = null
    }
  }, [])

  useEffect(() => {
    if (options) engineRef.current?.setOptions(options)
  }, [options])

  return (
    <div
      ref={containerRef}
      aria-hidden
      className={cn(
        'absolute inset-0 overflow-hidden bg-[linear-gradient(135deg,var(--gradient-1),var(--gradient-2),var(--gradient-3),var(--gradient-4))]',
        className,
      )}
    />
  )
}
