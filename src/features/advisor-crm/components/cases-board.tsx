import { useState, type MouseEvent } from 'react'
import { BarChart3, Clock, MessageSquare, PhoneOff, Truck } from 'lucide-react'
import { cn } from 'cn'
import { ErrorText } from '@/shared/ui/error-text'
import type { HandoffStatus, HandoffSummary } from '../api/handoffs-api'
import { PRIORITY, channelLabel, queueLabel, shortCaseId } from '../model/case-labels'
import { FUNNELS } from '../model/funnels'
import { formatAgo, useNow } from '../model/time'
import { CASE_STAGES, useCases, useUpdateCase } from '../model/use-cases'
import type { FunnelId } from '../api/crm-api'
import { FunnelSwitch, StageTabs } from './funnel-nav'
import { ActionButton, Badge, Card, ConfirmButton, CountPill, EmptyStage, SkeletonCard } from './ui'

const ICON = { strokeWidth: 1.75, 'aria-hidden': true } as const

/**
 * Embudo B con la bandeja real `/handoffs`: la cola (PENDING), los casos del asesor (ASSIGNED) y
 * los cerrados. Tomar y cerrar van al backend; un caso de otro revisor responde 404.
 */
export function CasesBoard({
  selectedCase,
  onFunnelChange,
  onOpenCase,
}: {
  selectedCase: string | null
  onFunnelChange: (id: FunnelId) => void
  onOpenCase: (id: string) => void
}) {
  const query = useCases()
  const update = useUpdateCase()
  const now = useNow(30_000)
  const [active, setActive] = useState<HandoffStatus>('PENDING')
  const items = query.data?.items ?? []
  const byStage = (id: HandoffStatus) => items.filter((c) => c.status === id)
  const stages = CASE_STAGES.map((s) => ({
    ...s,
    total: byStage(s.id).length,
    proyectado_cop: null,
  }))
  const meta = FUNNELS.casos

  const render = (item: HandoffSummary) => (
    <CaseCard
      key={item.handoff_id}
      item={item}
      now={now}
      selected={selectedCase === item.handoff_id}
      busy={update.isPending && update.variables?.id === item.handoff_id}
      onOpen={() => onOpenCase(item.handoff_id)}
      onUpdate={(status) => update.mutate({ id: item.handoff_id, status })}
    />
  )

  const list = (id: HandoffStatus) => {
    if (query.isPending) return <SkeletonCard />
    const cards = byStage(id)
    if (cards.length === 0) return <EmptyStage title="Sin casos en esta etapa" text={meta.empty} />
    return cards.map(render)
  }

  return (
    <div className="space-y-4">
      {/* --- Móvil --- */}
      <div className="space-y-4 lg:hidden">
        <FunnelSwitch value="casos" onChange={onFunnelChange} />
        <header>
          <h1 className="text-lg font-semibold">{meta.mobileTitle}</h1>
          <p className="text-xs text-muted-foreground">{meta.subtitle}</p>
        </header>
        <StageTabs
          stages={stages}
          active={active}
          loading={query.isPending}
          onChange={(id) => setActive(id as HandoffStatus)}
        />
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
          <BarChart3 className="size-3.5 text-primary" {...ICON} />
          {byStage(active).length} {byStage(active).length === 1 ? 'caso' : 'casos'}
        </p>
        <ErrorText error={query.error} />
        <div className="space-y-4">{list(active)}</div>
      </div>

      {/* --- Escritorio --- */}
      <div className="hidden space-y-4 lg:block">
        <ErrorText error={query.error} />
        <div className="grid grid-cols-3 gap-4">
          {stages.map((s) => (
            <Card key={s.id} className="space-y-0.5 py-3">
              <p className="text-xs text-muted-foreground">{s.nombre}</p>
              <p className="text-lg font-bold tabular-nums">{query.isPending ? '—' : s.total}</p>
              <p className="text-xs text-muted-foreground">Bandeja real del backend</p>
            </Card>
          ))}
        </div>
        <div className="-mx-6 overflow-x-auto px-6 pb-4">
          <div className="flex gap-4">
            {stages.map((s) => (
              <section
                key={s.id}
                aria-label={s.nombre}
                className="flex w-[17rem] shrink-0 flex-col gap-3 rounded-xl bg-muted/70 p-3"
              >
                <header className="flex items-start justify-between gap-2 px-1">
                  <h2 className="font-semibold">{s.nombre}</h2>
                  <CountPill>{s.total}</CountPill>
                </header>
                {list(s.id)}
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

const stop = (event: MouseEvent) => event.stopPropagation()

function CaseCard({
  item,
  now,
  selected,
  busy,
  onOpen,
  onUpdate,
}: {
  item: HandoffSummary
  now: number
  selected: boolean
  busy: boolean
  onOpen: () => void
  onUpdate: (status: 'ASSIGNED' | 'CLOSED') => void
}) {
  const priority = PRIORITY[item.prioridad]
  return (
    <Card
      className={cn(
        'cursor-pointer space-y-3 transition hover:border-primary/40',
        selected && 'border-2 border-primary',
      )}
      onClick={onOpen}
    >
      <button type="button" className="sr-only" onClick={onOpen}>
        Abrir caso {shortCaseId(item.handoff_id)}
      </button>
      <div className="flex items-center justify-between gap-2">
        <Badge tone={priority.tone} dot>
          {priority.label}
        </Badge>
        <span className="text-sm text-muted-foreground tabular-nums">
          {shortCaseId(item.handoff_id)}
        </span>
      </div>
      <p className="font-semibold">Escalado a {queueLabel(item.cola_destino)}</p>
      {item.numero_guia_consultada && (
        <Badge tone="primary" className="font-semibold tabular-nums">
          <Truck className="size-3.5" {...ICON} /> {item.numero_guia_consultada}
        </Badge>
      )}
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <MessageSquare className="size-3.5" {...ICON} /> {channelLabel(item.canal)}
        </span>
        <span className="flex items-center gap-1 whitespace-nowrap">
          <Clock className="size-3.5" {...ICON} /> {formatAgo(item.created_at, now)}
        </span>
      </p>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <PhoneOff className="size-3.5" {...ICON} />
        Sin teléfono: el bot aún no lo pide (CR-007)
      </p>
      <div className="grid gap-2" onClick={stop}>
        {item.status === 'PENDING' && (
          <ActionButton variant="primary" disabled={busy} onClick={() => onUpdate('ASSIGNED')}>
            {busy ? 'Tomando…' : 'Tomar caso'}
          </ActionButton>
        )}
        {item.status === 'ASSIGNED' && (
          <ConfirmButton
            label="Cerrar caso"
            confirmLabel="Sí, cerrar caso"
            disabled={busy}
            onConfirm={() => onUpdate('CLOSED')}
          />
        )}
        {item.status === 'CLOSED' && <ActionButton onClick={onOpen}>Ver detalle</ActionButton>}
      </div>
    </Card>
  )
}
