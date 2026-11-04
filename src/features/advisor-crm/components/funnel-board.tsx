import { useState, type ReactNode } from 'react'
import { BarChart3 } from 'lucide-react'
import { cn } from 'cn'
import { ErrorText } from '@/shared/ui/error-text'
import type { FunnelCard, FunnelId, FunnelStage } from '../api/crm-api'
import { FUNNEL_IDS, FUNNELS, STAGE_NOUN } from '../model/funnels'
import { useNow } from '../model/time'
import { useAdvisor, useFunnel, useTakeOver } from '../model/use-crm'
import { FunnelCardView } from './funnel-cards'
import { MoveStageSheet } from './move-stage-sheet'
import { Card, CountPill, EmptyStage, SkeletonCard } from './ui'
import { TONE_TEXT, copLabel } from '../model/tones'

interface BoardProps {
  funnel: FunnelId
  selectedLead: string | null
  onFunnelChange: (id: FunnelId) => void
  onOpenLead: (id: string) => void
}

/** Núcleo del módulo: los 3 embudos. Móvil: pestañas por etapa. Escritorio: Kanban. */
export function FunnelBoard({ funnel, selectedLead, onFunnelChange, onOpenLead }: BoardProps) {
  const query = useFunnel(funnel)
  const advisor = useAdvisor()
  const takeOver = useTakeOver()
  const now = useNow(30_000)
  const [stageByFunnel, setStageByFunnel] = useState<Partial<Record<FunnelId, string>>>({})
  const [moving, setMoving] = useState<FunnelCard | null>(null)

  const data = query.data
  const stages = data?.etapas ?? []
  const activeStage = stageByFunnel[funnel] ?? stages[0]?.id
  const meta = FUNNELS[funnel]

  const renderCard = (card: FunnelCard) => (
    <FunnelCardView
      key={card.lead_id}
      card={card}
      advisorName={advisor.data?.nombre ?? ''}
      now={now}
      selected={selectedLead === card.lead_id}
      onOpen={() => onOpenLead(card.lead_id)}
      onMove={() => setMoving(card)}
      onTakeOver={() => takeOver.mutate(card.lead_id)}
      takingOver={takeOver.isPending && takeOver.variables === card.lead_id}
    />
  )

  return (
    <div className="space-y-4">
      {/* --- Móvil --- */}
      <div className="space-y-4 lg:hidden">
        <FunnelSwitch value={funnel} onChange={onFunnelChange} />
        <header>
          <h1 className="text-lg font-semibold">{meta.mobileTitle}</h1>
          <p className="text-xs text-muted-foreground">{meta.subtitle}</p>
        </header>
        <StageTabs
          stages={stages}
          active={activeStage}
          loading={query.isPending}
          onChange={(id) => setStageByFunnel((s) => ({ ...s, [funnel]: id }))}
        />
        {stages.length > 0 && (
          <StageSummary funnel={funnel} stage={stages.find((s) => s.id === activeStage)} />
        )}
        <ErrorText error={query.error} />
        <div className="space-y-4">
          {query.isPending ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : (
            <StageCards
              cards={data?.tarjetas.filter((c) => c.etapa === activeStage) ?? []}
              funnel={funnel}
              render={renderCard}
            />
          )}
        </div>
      </div>

      {/* --- Escritorio --- */}
      <div className="hidden space-y-4 lg:block">
        <ErrorText error={query.error} />
        <div className="grid grid-cols-3 gap-4">
          {query.isPending
            ? [0, 1, 2].map((i) => <Card key={i} className="h-[86px] animate-pulse" />)
            : data?.indicadores.map((kpi) => (
                <Card key={kpi.etiqueta} className="space-y-0.5 py-3">
                  <p className="text-xs text-muted-foreground">{kpi.etiqueta}</p>
                  <p className="text-lg font-bold tabular-nums">{kpi.valor}</p>
                  <p className={cn('text-xs', TONE_TEXT[kpi.tono])}>{kpi.detalle}</p>
                </Card>
              ))}
        </div>
        <div className="-mx-6 overflow-x-auto px-6 pb-4">
          <div className="flex gap-4">
            {(query.isPending ? PLACEHOLDER_STAGES : stages).map((stage) => (
              <section
                key={stage.id}
                aria-label={stage.nombre}
                className="flex w-[17rem] shrink-0 flex-col gap-3 rounded-xl bg-muted/70 p-3"
              >
                <header className="px-1">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-semibold">{stage.nombre}</h2>
                    <CountPill>{stage.total}</CountPill>
                  </div>
                  {stage.proyectado_cop !== null && (
                    <p className="text-xs text-muted-foreground tabular-nums">
                      Proyectado: {copLabel(stage.proyectado_cop)}
                    </p>
                  )}
                </header>
                {query.isPending ? (
                  <SkeletonCard />
                ) : (
                  <StageCards
                    cards={data?.tarjetas.filter((c) => c.etapa === stage.id) ?? []}
                    funnel={funnel}
                    render={renderCard}
                  />
                )}
              </section>
            ))}
          </div>
        </div>
      </div>

      {moving && (
        <MoveStageSheet
          leadId={moving.lead_id}
          current={moving.etapa}
          version={moving.version}
          stages={stages}
          subtitle={moveSubtitle(moving)}
          client={moving.cliente}
          onClose={() => setMoving(null)}
        />
      )}
    </div>
  )
}

const PLACEHOLDER_STAGES: FunnelStage[] = [0, 1, 2, 3].map((i) => ({
  id: `cargando-${i}`,
  nombre: 'Cargando…',
  total: 0,
  proyectado_cop: null,
}))

function moveSubtitle(card: FunnelCard) {
  if (card.embudo === 'casos') return `${card.cliente.nombre} · #${card.caso_codigo}`
  return `${card.cliente.nombre} · ${card.cotizacion.codigo} · ${copLabel(card.cotizacion.valor_cop)}`
}

function StageCards({
  cards,
  funnel,
  render,
}: {
  cards: FunnelCard[]
  funnel: FunnelId
  render: (card: FunnelCard) => ReactNode
}) {
  if (cards.length === 0) {
    return (
      <EmptyStage
        title={`Sin ${STAGE_NOUN[funnel][1]} en esta etapa`}
        text={FUNNELS[funnel].empty}
      />
    )
  }
  return <>{cards.map(render)}</>
}

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

function StageTabs({
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

function StageSummary({ funnel, stage }: { funnel: FunnelId; stage: FunnelStage | undefined }) {
  if (!stage) return null
  const [one, many] = STAGE_NOUN[funnel]
  return (
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
      <BarChart3 className="size-3.5 text-primary" strokeWidth={1.75} aria-hidden />
      {stage.total} {stage.total === 1 ? one : many}
      {stage.proyectado_cop !== null && ` · ${copLabel(stage.proyectado_cop)} proyectado`}
    </p>
  )
}
