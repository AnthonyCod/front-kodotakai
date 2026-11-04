import { useEffect, type ReactNode } from 'react'
import { cn } from 'cn'

/** Bottom sheet en móvil (radio 16 px); diálogo centrado en escritorio. Cierra con Escape o el fondo. */
export function Sheet({
  title,
  subtitle,
  onClose,
  children,
  className,
}: {
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  className?: string
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center lg:items-center">
      <button
        type="button"
        aria-label="Cerrar"
        className="absolute inset-0 animate-in bg-foreground/40 fade-in"
        onClick={onClose}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'relative w-full max-w-lg animate-in rounded-t-2xl bg-card px-4 pt-2.5 pb-[max(1rem,env(safe-area-inset-bottom))] slide-in-from-bottom-8 lg:rounded-2xl lg:pt-4',
          className,
        )}
      >
        <div aria-hidden className="mx-auto mb-3 h-1 w-10 rounded-full bg-border lg:hidden" />
        <h2 className="text-lg font-semibold">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground tabular-nums">{subtitle}</p>}
        <div className="mt-3">{children}</div>
      </section>
    </div>
  )
}
