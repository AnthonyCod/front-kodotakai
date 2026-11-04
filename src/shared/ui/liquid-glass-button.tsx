import { useEffect, useMemo, useRef, useState, type ComponentProps, type ReactNode } from 'react'
import type { GlassConfig } from '@ybouane/liquidglass'
import { cn } from 'cn'
import { buttonVariants } from './button'

interface LiquidGlassButtonProps extends ComponentProps<'button'> {
  /** Opciones del shader: https://github.com/ybouane/liquidglass#available-options */
  config?: Partial<GlassConfig>
  /** Lo que el vidrio refracta. Sobre un fondo liso el efecto casi no se nota. */
  background?: ReactNode
  rootClassName?: string
}

/**
 * Botón con vidrio WebGL real (@ybouane/liquidglass). Pesado: usar solo en 1-2 botones de vitrina.
 * Para el resto, `<Button variant="glass">`. Si WebGL falla, se queda con ese mismo estilo CSS.
 */
export function LiquidGlassButton({
  config,
  background,
  rootClassName,
  className,
  children,
  ...props
}: LiquidGlassButtonProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [webgl, setWebgl] = useState(false)
  // La librería observa `data-config`: cambiarlo actualiza el shader sin reiniciar.
  const dataConfig = useMemo(() => JSON.stringify({ button: true, ...config }), [config])

  useEffect(() => {
    const root = rootRef.current
    const button = buttonRef.current
    if (!root || !button) return

    const controller = new AbortController()
    const glass: { instance?: { destroy: () => void } } = {}

    // Import dinámico: la librería no entra en el bundle principal.
    import('@ybouane/liquidglass')
      .then(({ LiquidGlass }) => LiquidGlass.init({ root, glassElements: [button] }))
      .then((created) => {
        if (controller.signal.aborted) return created.destroy()
        glass.instance = created
        setWebgl(true)
      })
      .catch((error: unknown) => {
        if (import.meta.env.DEV)
          console.warn('[liquid-glass] Sin WebGL, se usa el estilo CSS', error)
      })

    return () => {
      controller.abort()
      glass.instance?.destroy()
      setWebgl(false)
    }
  }, [])

  return (
    // Restricción de la librería: el elemento de vidrio debe ser hijo DIRECTO del root.
    <div ref={rootRef} className={cn('relative isolate', rootClassName)}>
      {background && <div className="absolute inset-0 -z-10">{background}</div>}
      <button
        ref={buttonRef}
        type="button"
        data-config={dataConfig}
        className={cn(
          buttonVariants({ variant: 'glass', size: 'lg' }),
          webgl &&
            'border-transparent bg-transparent shadow-none backdrop-blur-none hover:bg-transparent',
          className,
        )}
        {...props}
      >
        <span className="relative z-10 inline-flex items-center gap-1.5">{children}</span>
      </button>
    </div>
  )
}
