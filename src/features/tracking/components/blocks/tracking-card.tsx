import { MapPin, Snowflake, Truck } from 'lucide-react'
import { cn } from 'cn'
import { defineBlock } from '@/shared/blocks'
import { CheckmarkCircle02 } from '@/shared/components/animate-ui/icons/hugeicons/checkmark-circle-02'
import { TriangleAlert } from '@/shared/components/animate-ui/icons/hugeicons/triangle-alert'
import { formatDateTime } from '@/shared/lib/format'
import { BlockCard, BlockHeader, InfoPanel, StatusDot } from '@/shared/ui/block-card'
import { trackingCardBlockSchema, type TrackingCardBlock } from '../../api/tracking-card-block'
import { buildTimeline, type StepStatus } from '../../model/tracking-timeline'

const STEP_NOTE: Record<StepStatus, string> = {
  done: 'Hecho',
  active: 'En curso',
  alert: 'Novedad',
  pending: 'Pendiente',
}

/** Tarjeta de seguimiento: estado, línea de tiempo y avance, en tonos neutros. */
export function TrackingCard(block: Omit<TrackingCardBlock, 'type'>) {
  const timeline = buildTimeline(block)
  const { flags } = block

  return (
    <BlockCard>
      <BlockHeader
        icon={<Truck size={20} aria-hidden />}
        title="Seguimiento del envío"
        subtitle={<span className="font-mono">{block.numero_guia}</span>}
        aside={
          <StatusDot tone={timeline.tone === 'alert' ? 'alert' : 'ok'}>
            {block.estado.etiqueta}
          </StatusDot>
        }
      />

      <p className="text-[15px] leading-relaxed text-foreground/80">{block.estado.explicacion}</p>

      <ol>
        {timeline.steps.map((step, index) => {
          const last = index === timeline.steps.length - 1
          return (
            <li key={step.key} className="relative flex gap-3 pb-4 last:pb-0">
              {!last && (
                <span aria-hidden className="absolute top-6 bottom-0 left-[11px] w-px bg-border" />
              )}
              <StepIcon status={step.status} index={index} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p
                    className={cn(
                      'font-medium',
                      step.status === 'pending' && 'text-muted-foreground',
                    )}
                  >
                    {step.label}
                  </p>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {step.timestamp ? formatDateTime(step.timestamp) : STEP_NOTE[step.status]}
                  </span>
                </div>
                {step.detail && (
                  <p className="mt-0.5 text-xs text-muted-foreground">{step.detail}</p>
                )}
              </div>
            </li>
          )
        })}
      </ol>

      {(block.ubicacion_referencia ||
        block.eta ||
        flags.requiere_refrigeracion ||
        flags.mercancia_peligrosa) && (
        <InfoPanel className="space-y-2">
          {block.ubicacion_referencia && (
            <p className="flex gap-2">
              <MapPin size={16} aria-hidden className="mt-0.5 shrink-0 text-muted-foreground" />
              <span>{block.ubicacion_referencia}</span>
            </p>
          )}
          {block.eta && (
            <p className="text-xs text-muted-foreground">
              Entrega estimada: {formatDateTime(block.eta)}
            </p>
          )}
          {(flags.requiere_refrigeracion || flags.mercancia_peligrosa) && (
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              {flags.requiere_refrigeracion && (
                <span className="inline-flex items-center gap-1">
                  <Snowflake size={13} aria-hidden /> Cadena de frío
                </span>
              )}
              {flags.mercancia_peligrosa && (
                <span className="inline-flex items-center gap-1">
                  <TriangleAlert size={13} aria-hidden className="text-warning" /> Mercancía
                  peligrosa
                </span>
              )}
            </div>
          )}
        </InfoPanel>
      )}

      <div className="space-y-1.5">
        <div
          className="h-1.5 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={timeline.percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Avance del envío"
        >
          <div
            className={cn(
              'h-full rounded-full transition-[width]',
              timeline.tone === 'alert' ? 'bg-warning' : 'bg-brand-deep/80',
            )}
            style={{ width: `${timeline.percent}%` }}
          />
        </div>
        <p className="flex justify-between gap-2 text-[11px] text-muted-foreground">
          <span>
            {timeline.completed} hechas · {timeline.inProgress} en curso · {timeline.remaining}{' '}
            pendiente{timeline.remaining === 1 ? '' : 's'}
          </span>
          <span className="shrink-0">{timeline.percent}%</span>
        </p>
      </div>
    </BlockCard>
  )
}

function StepIcon({ status, index }: { status: StepStatus; index: number }) {
  if (status === 'done')
    return (
      <CheckmarkCircle02 size={24} aria-hidden className="relative shrink-0 text-foreground/60" />
    )
  if (status === 'alert')
    return <TriangleAlert size={24} aria-hidden className="relative shrink-0 text-warning" />
  if (status === 'active')
    return (
      <span
        aria-hidden
        className="relative size-6 shrink-0 animate-spin rounded-full border-2 border-brand-deep/15 border-t-brand-deep/70 bg-card [animation-duration:2s]"
      />
    )
  return (
    <span
      aria-hidden
      className="relative grid size-6 shrink-0 place-items-center rounded-full border bg-card text-[11px] text-muted-foreground"
    >
      {index + 1}
    </span>
  )
}

export const trackingCardBlock = defineBlock({
  type: 'TRACKING_CARD',
  schema: trackingCardBlockSchema,
  Component: ({ block }) => <TrackingCard {...block} />,
})
