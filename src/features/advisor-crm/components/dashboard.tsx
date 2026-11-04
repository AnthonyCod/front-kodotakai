import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart3, Inbox, Phone, Timer, TriangleAlert } from 'lucide-react'
import { cn } from 'cn'
import { ErrorText } from '@/shared/ui/error-text'
import { getDashboard, type FunnelId } from '../api/crm-api'
import { formatTime, slaRemaining, useNow } from '../model/time'
import { crmKeys, useAdvisor, useAdvisorName } from '../model/use-crm'
import { useCases } from '../model/use-cases'
import { ActionButton, Card } from './ui'
import { TONE_TEXT } from '../model/tones'

const ICON = { strokeWidth: 1.75, 'aria-hidden': true } as const

const greeting = (hour: number) =>
  hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches'
const longDate = new Intl.DateTimeFormat('es-CO', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

/** Pantalla «Resumen»: KPIs del turno y acciones próximas a vencer. */
export function AdvisorDashboard({
  onOpenLead,
  onSeeAll,
}: {
  onOpenLead: (id: string, funnel: FunnelId) => void
  onSeeAll: () => void
}) {
  const advisor = useAdvisor()
  const name = useAdvisorName()
  const query = useQuery({
    queryKey: crmKeys.dashboard,
    queryFn: getDashboard,
    refetchInterval: 30_000,
  })
  const now = useNow()
  const kpis = query.data?.kpis
  // Casos escalados: bandeja real `/handoffs` (cola + en gestión).
  const cases = useCases()
  const openCases = cases.data?.items.filter((c) => c.status !== 'CLOSED')
  const escalated = openCases?.length ?? kpis?.consultas_escaladas ?? 0
  const highPriority =
    openCases?.filter((c) => c.prioridad !== 'NORMAL').length ?? kpis?.consultas_prioridad_alta ?? 0
  const today = longDate.format(now)

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-semibold lg:text-2xl">
          {greeting(new Date(now).getHours())}
          {name && `, ${name.split(' ')[0]}`}
        </h1>
        <p className="text-xs text-muted-foreground first-letter:uppercase lg:text-sm">
          {today}
          {advisor.data && ` · ${advisor.data.turno}`}
        </p>
      </header>

      <ErrorText error={query.error} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {kpis ? (
          <>
            <Kpi
              icon={<Inbox {...ICON} />}
              label="Leads de cotización hoy"
              value={kpis.leads_cotizacion_hoy}
              note={diffNote(kpis.leads_cotizacion_hoy - kpis.leads_cotizacion_ayer)}
              tone={kpis.leads_cotizacion_hoy >= kpis.leads_cotizacion_ayer ? 'success' : 'warning'}
            />
            <Kpi
              icon={<TriangleAlert {...ICON} />}
              iconTone="danger"
              label="Consultas escaladas"
              value={escalated}
              note={`${highPriority} de prioridad alta`}
              tone={highPriority > 0 ? 'danger' : 'neutral'}
            />
            <Kpi
              icon={<Phone {...ICON} />}
              iconTone="warning"
              label="Llamadas pendientes"
              value={kpis.llamadas_pendientes}
              note={
                kpis.proxima_llamada_at
                  ? `Próxima a las ${formatTime(kpis.proxima_llamada_at)}`
                  : 'Sin llamadas agendadas'
              }
              tone="warning"
            />
            <Kpi
              icon={<BarChart3 {...ICON} />}
              label="Cumplimiento SLA"
              value={`${kpis.sla_cumplimiento_pct}%`}
              note={`Meta mensual: ${kpis.sla_meta_pct}%`}
              tone={kpis.sla_cumplimiento_pct >= kpis.sla_meta_pct ? 'success' : 'danger'}
            />
          </>
        ) : (
          [0, 1, 2, 3].map((i) => <Card key={i} className="h-[142px] animate-pulse" />)
        )}
      </div>

      <section className="space-y-3">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-lg font-semibold">Acciones prioritarias</h2>
            <p className="text-xs text-muted-foreground">Próximas a vencer</p>
          </div>
          <button
            type="button"
            onClick={onSeeAll}
            className="text-sm font-medium text-primary hover:underline"
          >
            Ver todas
          </button>
        </div>
        <ul className="grid gap-3 lg:grid-cols-2">
          {query.data?.acciones.map((action) => {
            const sla = slaRemaining(action.sla_vence_at, now)
            return (
              <li key={action.lead_id}>
                <Card className="relative flex items-center gap-3 overflow-hidden pl-5">
                  <span
                    aria-hidden
                    className={cn(
                      'absolute inset-y-3 left-3 w-1 rounded-full',
                      sla.critical ? 'bg-destructive' : 'bg-warning',
                    )}
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="font-semibold">{action.titulo}</p>
                    <p className="text-xs text-muted-foreground tabular-nums">{action.detalle}</p>
                    <span
                      className={cn(
                        'inline-flex h-6 items-center gap-1 rounded-md px-2 text-xs font-semibold tabular-nums',
                        sla.critical
                          ? 'bg-destructive/10 text-destructive'
                          : 'bg-warning/15 text-warning-strong',
                      )}
                    >
                      <Timer className="size-3.5" {...ICON} />
                      {sla.expired ? 'SLA vencido' : `SLA ${sla.text}`}
                    </span>
                  </div>
                  <ActionButton
                    variant="primary"
                    onClick={() => onOpenLead(action.lead_id, action.embudo)}
                  >
                    Gestionar
                  </ActionButton>
                </Card>
              </li>
            )
          })}
        </ul>
        {query.data?.acciones.length === 0 && (
          <p className="text-sm text-muted-foreground">Nada por vencer. Buen trabajo.</p>
        )}
      </section>
    </div>
  )
}

const diffNote = (diff: number) =>
  diff === 0 ? 'Igual que ayer' : `${diff > 0 ? '+' : ''}${diff} vs. ayer`

function Kpi({
  icon,
  iconTone = 'primary',
  label,
  value,
  note,
  tone,
}: {
  icon: ReactNode
  iconTone?: 'primary' | 'danger' | 'warning'
  label: string
  value: ReactNode
  note: string
  tone: keyof typeof TONE_TEXT
}) {
  return (
    <Card className="space-y-1">
      <span
        className={cn(
          'mb-2 flex size-8 items-center justify-center rounded-lg [&_svg]:size-4',
          iconTone === 'primary' && 'bg-primary-subtle text-primary',
          iconTone === 'danger' && 'bg-destructive/10 text-destructive',
          iconTone === 'warning' && 'bg-warning/15 text-warning-strong',
        )}
      >
        {icon}
      </span>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <p className={cn('text-xs', TONE_TEXT[tone])}>{note}</p>
    </Card>
  )
}
