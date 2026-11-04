import type { ReactNode } from 'react'
import { cn } from 'cn'

/**
 * Tarjeta de un bloque de respuesta (rastreo, cotización, caso…): blanca, muy redondeada, sin
 * borde y con sombra suave. Por dentro un solo nivel de panel gris (`InfoPanel`): nada de
 * tarjetas dentro de tarjetas.
 */
export function BlockCard({
  children,
  className,
  role,
}: {
  children: ReactNode
  className?: string
  role?: string
}) {
  return (
    <section
      role={role}
      className={cn(
        'w-full max-w-md space-y-4 rounded-[1.75rem] bg-card p-4 text-sm text-card-foreground shadow-[0_1px_2px_rgb(0_0_0/0.04),0_10px_30px_rgb(0_0_0/0.06)] sm:p-5',
        className,
      )}
    >
      {children}
    </section>
  )
}

/** Cabecera: icono redondo, título, subtítulo y algo opcional a la derecha. */
export function BlockHeader({
  icon,
  title,
  subtitle,
  aside,
}: {
  icon: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  aside?: ReactNode
}) {
  return (
    <header className="flex items-center gap-3">
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-muted text-foreground/70">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-medium">{title}</p>
        {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {aside}
    </header>
  )
}

/** Panel gris claro dentro de la tarjeta (dirección, totales, aviso). */
export function InfoPanel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('rounded-2xl bg-muted/70 p-3', className)}>{children}</div>
}

/** Estado en texto pequeño con punto de color (sin fondos llamativos). */
export function StatusDot({
  tone,
  children,
}: {
  tone: 'ok' | 'alert' | 'idle'
  children: ReactNode
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span
        aria-hidden
        className={cn(
          'size-2 rounded-full',
          tone === 'ok' && 'bg-success',
          tone === 'alert' && 'bg-warning',
          tone === 'idle' && 'bg-muted-foreground/50',
        )}
      />
      {children}
    </span>
  )
}
