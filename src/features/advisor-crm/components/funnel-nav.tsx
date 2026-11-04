import { cn } from 'cn'
import type { FunnelId, FunnelStage } from '../api/crm-api'
import { FUNNEL_IDS, FUNNELS } from '../model/funnels'
import { CountPill } from './ui'

export function FunnelSwitch({
  value,
  onChange,
}: {
  value: FunnelId
  onChange: (id: FunnelId) => void
}) {
  return (
    <div
      role="tablist"
      aria-label="Embudo"
      className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1"
    >
      {FUNNEL_IDS.map((id) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={value === id}
          onClick={() => onChange(id)}
          className={cn(
            'h-9 rounded-lg text-sm transition',
            value === id ? 'bg-card font-medium text-primary shadow-card' : 'text-muted-foreground',
          )}
        >
          {FUNNELS[id].short}
        </button>
      ))}
    </div>
  )
}

export function StageTabs({
  stages,
  active,
  loading,
  onChange,
}: {
  stages: FunnelStage[]
  active: string | undefined
  loading: boolean
  onChange: (id: string) => void
}) {
  if (loading) return <div className="h-9 w-56 animate-pulse rounded-full bg-muted" />
  return (
    <div
      role="tablist"
      aria-label="Etapa"
      className="-mx-4 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4"
    >
      {stages.map((stage) => {
        const selected = stage.id === active
        return (
          <button
            key={stage.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(stage.id)}
            className={cn(
              'flex h-9 shrink-0 items-center gap-2 rounded-full border px-3 text-sm whitespace-nowrap transition',
              selected
                ? 'border-primary bg-primary font-medium text-primary-foreground'
                : 'bg-card text-foreground/80',
            )}
          >
            {stage.nombre}
            <CountPill active={selected}>{stage.total}</CountPill>
          </button>
        )
      })}
    </div>
  )
}
