import { useState, type ComponentProps, type ReactNode } from 'react'
import { CircleCheck, CloudOff, Inbox, X } from 'lucide-react'
import { cn } from 'cn'
import type { Tone } from '../api/crm-api'
import { useOnline } from '../model/use-online'
import { useToasts } from '../model/toast-store'

const TONE_BADGE: Record<Tone | 'primary', string> = {
  neutral: 'bg-muted text-muted-foreground',
  primary: 'bg-primary-subtle text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/15 text-warning-strong',
  danger: 'bg-destructive/10 text-destructive',
}

export function Badge({
  tone = 'neutral',
  dot,
  className,
  children,
}: {
  tone?: Tone | 'primary'
  dot?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex h-6 shrink-0 items-center gap-1 rounded-md px-2 text-xs font-medium',
        TONE_BADGE[tone],
        className,
      )}
    >
      {dot && <span aria-hidden className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}

export function Card({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('rounded-xl border bg-card p-4 shadow-card', className)} {...props} />
}

/** Botones del módulo: alto de 40 px, radio 8 px (diseño). */
export function ActionButton({
  variant = 'outline',
  className,
  ...props
}: ComponentProps<'button'> & { variant?: 'primary' | 'outline' | 'ghost' }) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex h-10 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium whitespace-nowrap transition outline-none focus-visible:ring-3 focus-visible:ring-ring/40 disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
        variant === 'primary' && 'bg-primary text-primary-foreground hover:bg-primary-deep',
        variant === 'outline' && 'border bg-card hover:bg-muted',
        variant === 'ghost' && 'text-muted-foreground hover:bg-muted hover:text-foreground',
        className,
      )}
      {...props}
    />
  )
}

/** Igual que `ActionButton` pero como enlace (`tel:`, `wa.me`). */
export function ActionLink({
  variant = 'outline',
  className,
  ...props
}: ComponentProps<'a'> & { variant?: 'primary' | 'outline' }) {
  return (
    <a
      className={cn(
        'inline-flex h-10 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium whitespace-nowrap transition outline-none focus-visible:ring-3 focus-visible:ring-ring/40 [&_svg]:size-4 [&_svg]:shrink-0',
        variant === 'primary'
          ? 'bg-primary text-primary-foreground hover:bg-primary-deep'
          : 'border bg-card hover:bg-muted',
        className,
      )}
      {...props}
    />
  )
}

export function CountPill({ active, children }: { active?: boolean; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold tabular-nums',
        active ? 'bg-primary-deep text-primary-foreground' : 'bg-muted text-muted-foreground',
      )}
    >
      {children}
    </span>
  )
}

export function SkeletonCard() {
  return (
    <Card aria-hidden className="animate-pulse space-y-3">
      <div className="flex justify-between">
        <div className="h-5 w-24 rounded bg-muted" />
        <div className="h-4 w-16 rounded bg-muted" />
      </div>
      <div className="h-4 w-36 rounded bg-muted" />
      <div className="h-3 w-28 rounded bg-muted" />
      <div className="space-y-2 rounded-lg bg-muted/60 p-3">
        <div className="h-3 w-40 rounded bg-muted" />
        <div className="h-3 w-52 rounded bg-muted" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="h-10 rounded-lg bg-muted" />
        <div className="h-10 rounded-lg bg-muted" />
      </div>
    </Card>
  )
}

export function EmptyStage({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-8 text-center">
      <span className="flex size-10 items-center justify-center rounded-full bg-muted">
        <Inbox className="size-5 text-muted-foreground" strokeWidth={1.75} aria-hidden />
      </span>
      <p className="font-semibold">{title}</p>
      <p className="text-xs text-muted-foreground">{text}</p>
    </div>
  )
}

/** Banner superior en modo offline (PWA). Se muestran los últimos datos cargados. */
export function OfflineBanner() {
  const online = useOnline()
  if (online) return null
  return (
    <div
      role="status"
      className="flex items-center gap-2 bg-warning/20 px-4 py-2 text-xs text-warning-strong"
    >
      <CloudOff className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
      Sin conexión · Modo offline. Mostrando los últimos datos cargados.
    </div>
  )
}

/** Confirmaciones (mover etapa, venta cerrada) con «Deshacer». */
export function ToastViewport() {
  const { toasts, dismiss } = useToasts()
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-24 z-50 flex flex-col items-center gap-2 lg:right-6 lg:bottom-6 lg:left-auto lg:items-end"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex w-full max-w-sm animate-in items-center gap-3 rounded-xl bg-foreground px-4 py-3 text-sm text-background shadow-lg fade-in slide-in-from-bottom-2"
        >
          <CircleCheck className="size-5 shrink-0 text-success" strokeWidth={1.75} aria-hidden />
          <p className="flex-1">{toast.text}</p>
          {toast.undo ? (
            <button
              type="button"
              className="font-semibold text-primary-subtle/90 hover:underline"
              onClick={() => {
                toast.undo?.()
                dismiss(toast.id)
              }}
            >
              Deshacer
            </button>
          ) : (
            <button type="button" aria-label="Cerrar" onClick={() => dismiss(toast.id)}>
              <X className="size-4" aria-hidden />
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

/** Acción que no se puede deshacer: el primer toque pide confirmación. */
export function ConfirmButton({
  label,
  confirmLabel,
  onConfirm,
  disabled,
  className,
}: {
  label: ReactNode
  confirmLabel: string
  onConfirm: () => void
  disabled?: boolean
  className?: string
}) {
  const [asking, setAsking] = useState(false)
  if (!asking)
    return (
      <ActionButton className={className} disabled={disabled} onClick={() => setAsking(true)}>
        {label}
      </ActionButton>
    )
  return (
    <div className={cn('grid grid-cols-[1fr_auto] gap-2', className)}>
      <ActionButton
        variant="primary"
        disabled={disabled}
        onClick={() => {
          setAsking(false)
          onConfirm()
        }}
      >
        {confirmLabel}
      </ActionButton>
      <ActionButton onClick={() => setAsking(false)}>No</ActionButton>
    </div>
  )
}
