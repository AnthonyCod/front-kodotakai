import { mergeProps } from '@base-ui/react/merge-props'
import { useRender } from '@base-ui/react/use-render'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from 'cn'

// Badge de shadcn (registro, estilo base-nova) con variantes de la paleta, estilo píldora suave:
// fondo tenue del color, sin aro, texto del color oscurecido para que se lea. Estados con punto
// (`<BadgeDot />`, «● Lista») o con el círculo punteado que gira (`<BadgeSpinner />`, «En proceso»).
// `tag` es la píldora blanca con sombra suave (etiquetas y filtros).

/** Texto del color de la paleta, oscurecido lo justo para contrastar sobre su fondo tenue. */
const DEEP_SUCCESS = 'text-[color-mix(in_oklab,var(--success),black_32%)]'
const DEEP_WARNING = 'text-[color-mix(in_oklab,var(--warning),black_42%)]'

const badgeVariants = cva(
  'group/badge inline-flex w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-full font-medium whitespace-nowrap transition-all focus-visible:ring-[3px] focus-visible:ring-ring/50 [&>svg]:pointer-events-none',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground [a]:hover:bg-primary/80',
        secondary: 'bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80',
        brand: 'bg-brand/10 text-brand-deep',
        primary: 'bg-primary/10 text-primary',
        success: `bg-success/15 ${DEEP_SUCCESS}`,
        warning: `bg-warning/20 ${DEEP_WARNING}`,
        destructive: 'bg-destructive/10 text-destructive',
        neutral: 'bg-muted text-muted-foreground',
        tag: 'bg-card font-normal text-muted-foreground shadow-[0_1px_2px_rgb(15_23_42/0.06),0_2px_8px_rgb(15_23_42/0.06)]',
        outline: 'text-foreground ring-1 ring-border [a]:hover:bg-muted',
        ghost: 'hover:bg-muted hover:text-muted-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-6 px-2.5 text-xs [&>svg]:size-3.5!',
        md: 'h-8 px-3 text-[13px] [&>svg]:size-4!',
      },
    },
    defaultVariants: {
      variant: 'neutral',
      size: 'sm',
    },
  },
)

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>

function Badge({
  className,
  variant = 'neutral',
  size = 'sm',
  render,
  ...props
}: useRender.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: 'span',
    props: mergeProps<'span'>(
      { className: cn(badgeVariants({ variant, size }), className) },
      props,
    ),
    render,
    state: { slot: 'badge', variant },
  })
}

/** Punto de estado («● Lista»): toma el color del badge. */
function BadgeDot({ className }: { className?: string }) {
  return <span aria-hidden className={cn('size-1.5 shrink-0 rounded-full bg-current', className)} />
}

/** Círculo punteado que gira (algo en curso). Quieto con «reducir movimiento». */
function BadgeSpinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'size-3.5 shrink-0 rounded-full border-2 border-dashed border-current motion-safe:animate-spin motion-safe:[animation-duration:2.4s]',
        className,
      )}
    />
  )
}

export { Badge, BadgeDot, BadgeSpinner, badgeVariants, type BadgeVariant }
