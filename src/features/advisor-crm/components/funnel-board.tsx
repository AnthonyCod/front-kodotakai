import { useState, type ReactNode } from 'react'
import { BarChart3 } from 'lucide-react'
import { cn } from 'cn'
import { ErrorText } from '@/shared/ui/error-text'
import type { FunnelCard, FunnelId, FunnelStage } from '../api/crm-api'
import { FUNNELS, STAGE_NOUN } from '../model/funnels'
import { useNow } from '../model/time'
import { useAdvisorName, useFunnel, useTakeOver } from '../model/use-crm'
import { FunnelCardView } from './funnel-cards'
import { CasesBoard } from './cases-board'
import { FunnelSwitch, StageTabs } from './funnel-nav'
import { MoveStageSheet } from './move-stage-sheet'
import { Card, CountPill, EmptyStage, SkeletonCard } from './ui'
import { TONE_TEXT, copLabel } from '../model/tones'

interface BoardProps {
  funnel: FunnelId
  selectedLead: string | null
  selectedCase: string | null
  onFunnelChange: (id: FunnelId) => void
  onOpenLead: (id: string) => void
  onOpenCase: (id: string) => void
}

/**
 * Núcleo del módulo: los 3 embudos. Móvil: pestañas por etapa. Escritorio: Kanban. El embudo B
 * usa la bandeja real `/handoffs`; A y C, el CRM simulado (CR-007 pendiente).
 */
export function FunnelBoard(props: BoardProps) {
  if (props.funnel === 'casos')
    return (
      <CasesBoard
        selectedCase={props.selectedCase}
        onFunnelChange={props.onFunnelChange}
        onOpenCase={props.onOpenCase}
      />
    )
  return <CrmFunnelBoard {...props} />
}

function CrmFunnelBoard({ funnel, selectedLead, onFunnelChange, onOpenLead }: BoardProps) {
  const query = useFunnel(funnel)
  const advisorName = useAdvisorName()
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
      advisorName={advisorName}
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
