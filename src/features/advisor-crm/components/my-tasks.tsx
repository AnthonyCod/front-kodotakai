import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Phone } from 'lucide-react'
import { cn } from 'cn'
import { ErrorText } from '@/shared/ui/error-text'
import { getTasks, setTaskDone, type FunnelId, type Task } from '../api/crm-api'
import { formatDayTime, slaRemaining, useNow } from '../model/time'
import { crmKeys } from '../model/use-crm'
import { ActionButton, Card } from './ui'
import { TONE_TEXT } from '../model/tones'

/** Agenda de llamadas y recordatorios del asesor, con sus métricas de SLA. */
export function MyTasks({ onOpenLead }: { onOpenLead: (id: string, funnel: FunnelId) => void }) {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: crmKeys.tasks, queryFn: getTasks })
  const now = useNow()
  const toggle = useMutation({
    mutationFn: (t: Task) => setTaskDone(t.id, !t.hecha),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['asesor'] }),
  })

  const data = query.data
  const pending = data?.tareas.filter((t) => !t.hecha) ?? []
  const done = data?.tareas.filter((t) => t.hecha) ?? []

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-semibold lg:text-2xl">Mis tareas</h1>
        <p className="text-xs text-muted-foreground lg:text-sm">
          Agenda de llamadas y métricas SLA
        </p>
      </header>
      <ErrorText error={query.error} />

      {data && (
        <div className="grid grid-cols-3 gap-3">
          <Metric
            label="Cumplimiento SLA"
            value={`${data.sla.cumplimiento_pct}%`}
            note={`Meta ${data.sla.meta_pct}%`}
            tone={data.sla.cumplimiento_pct >= data.sla.meta_pct ? 'success' : 'danger'}
          />
          <Metric
            label="Vencidas hoy"
            value={String(data.sla.vencidas_hoy)}
            note={data.sla.vencidas_hoy ? 'Revisar' : 'Al día'}
            tone={data.sla.vencidas_hoy ? 'danger' : 'success'}
          />
          <Metric
            label="Primer contacto"
            value={`${data.sla.primer_contacto_promedio_min} min`}
            note="Promedio"
            tone="neutral"
          />
        </div>
      )}

      <section className="space-y-3">
        <h2 className="font-semibold">Pendientes ({pending.length})</h2>
        {query.isPending && <Card className="h-24 animate-pulse" />}
        {data && pending.length === 0 && (
          <p className="text-sm text-muted-foreground">No tienes llamadas pendientes.</p>
        )}
        <ul className="grid gap-3 lg:grid-cols-2">
          {pending.map((task) => {
            const sla = slaRemaining(task.vence_at, now)
            return (
              <li key={task.id}>
                <Card className="flex items-start gap-3">
                  <DoneBox task={task} onToggle={() => toggle.mutate(task)} />
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="font-semibold">{task.titulo}</p>
                    <p className="text-xs text-muted-foreground">{task.detalle}</p>
                    <p
                      className={cn(
                        'flex items-center gap-1 text-xs font-medium tabular-nums',
                        sla.expired || sla.critical ? TONE_TEXT.danger : TONE_TEXT.neutral,
                      )}
                    >
                      <Phone className="size-3.5" strokeWidth={1.75} aria-hidden />
                      {formatDayTime(task.vence_at, now)}
                      {sla.expired ? ' · Vencida' : sla.critical ? ` · en ${sla.text}` : ''}
                    </p>
                  </div>
                  <ActionButton
                    variant="primary"
                    onClick={() => onOpenLead(task.lead_id, task.embudo)}
                  >
                    Gestionar
                  </ActionButton>
                </Card>
              </li>
            )
          })}
        </ul>
      </section>

      {done.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold text-muted-foreground">Hechas ({done.length})</h2>
          <ul className="space-y-2">
            {done.map((task) => (
              <li key={task.id} className="flex items-center gap-3 rounded-xl border px-4 py-3">
                <DoneBox task={task} onToggle={() => toggle.mutate(task)} />
                <p className="text-sm text-muted-foreground line-through">{task.titulo}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function DoneBox({ task, onToggle }: { task: Task; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={task.hecha}
      aria-label={task.hecha ? `Marcar pendiente: ${task.titulo}` : `Marcar hecha: ${task.titulo}`}
      onClick={onToggle}
      className={cn(
        'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border-2 transition',
        task.hecha
          ? 'border-success bg-success text-primary-foreground'
          : 'border-border hover:border-primary',
      )}
    >
      {task.hecha && <Check className="size-3.5" strokeWidth={2.5} aria-hidden />}
    </button>
  )
}

function Metric({
  label,
  value,
  note,
  tone,
}: {
  label: string
  value: string
  note: string
  tone: keyof typeof TONE_TEXT
}) {
  return (
    <Card className="space-y-0.5 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold tabular-nums">{value}</p>
      <p className={cn('text-xs', TONE_TEXT[tone])}>{note}</p>
    </Card>
  )
}
