import { useEffect, type ReactNode } from 'react'
import { ChevronLeft, PhoneOff, X } from 'lucide-react'
import { cn } from 'cn'
import { toPlainText } from '@/shared/lib/plain-text'
import { ErrorText } from '@/shared/ui/error-text'
import type { HandoffDetail } from '../api/handoffs-api'
import {
  PRIORITY,
  STATUS_LABEL,
  channelLabel,
  queueLabel,
  sentimentLabel,
  shortCaseId,
} from '../model/case-labels'
import { confidenceLabel } from '../model/funnels'
import { formatDayTime, formatTime, useNow } from '../model/time'
import { isGoneCase, useCase, useUpdateCase } from '../model/use-cases'
import { TmsTrackingSection } from './tms-tracking'
import { ActionButton, Badge, Card, ConfirmButton } from './ui'

const ICON = { strokeWidth: 1.75, 'aria-hidden': true } as const

/**
 * Detalle de un caso real (`GET /handoffs/{id}`): motivo del escalamiento, cómo llegó, la
 * transcripción exacta y el tracking de la guía. Sin «resumen IA».
 */
export function CaseDetailPanel({ caseId, onClose }: { caseId: string; onClose: () => void }) {
  const query = useCase(caseId)
  const update = useUpdateCase()
  const now = useNow(60_000)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const data = query.data
  const busy = update.isPending

  return (
    <aside
      aria-label="Detalle del caso"
      className="fixed inset-0 z-40 flex animate-in flex-col bg-background slide-in-from-right-4 lg:inset-y-0 lg:right-0 lg:left-auto lg:w-[480px] lg:border-l lg:bg-card lg:shadow-xl"
    >
      <header className="flex shrink-0 items-start gap-3 border-b bg-card p-4 lg:px-5">
        <button
          type="button"
          onClick={onClose}
          aria-label="Volver"
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted lg:hidden"
        >
          <ChevronLeft className="size-5" {...ICON} />
        </button>
        <div className="min-w-0 flex-1 space-y-1.5">
          <h2 className="text-lg font-semibold tabular-nums lg:text-xl">
            Caso {shortCaseId(caseId)}
          </h2>
          {data && (
            <p className="flex flex-wrap gap-2">
              <Badge tone={PRIORITY[data.prioridad].tone} dot>
                {PRIORITY[data.prioridad].label}
              </Badge>
              <Badge tone={data.status === 'CLOSED' ? 'success' : 'primary'}>
                {STATUS_LABEL[data.status]}
              </Badge>
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar detalle"
          className="hidden size-10 shrink-0 items-center justify-center rounded-full bg-muted lg:flex"
        >
          <X className="size-5" {...ICON} />
        </button>
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 pb-8 lg:p-5">
        {query.isPending && <div className="h-48 animate-pulse rounded-xl bg-muted" />}
        {query.error &&
          (isGoneCase(query.error) ? (
            <Card className="text-sm">
              Este caso ya no está disponible: no existe o lo tomó otro asesor.
            </Card>
          ) : (
            <ErrorText error={query.error} />
          ))}

        {data && (
          <>
            {data.status !== 'CLOSED' && (
              <div className="grid gap-2">
                {data.status === 'PENDING' && (
                  <ActionButton
                    variant="primary"
                    className="h-11"
                    disabled={busy}
                    onClick={() => update.mutate({ id: caseId, status: 'ASSIGNED' })}
                  >
                    {busy ? 'Tomando…' : 'Tomar caso'}
                  </ActionButton>
                )}
                <ConfirmButton
                  className="[&_button]:h-11"
                  label="Cerrar caso"
                  confirmLabel="Sí, cerrar caso"
                  disabled={busy}
                  onConfirm={() => update.mutate({ id: caseId, status: 'CLOSED' })}
                />
              </div>
            )}

            <Card className="space-y-3">
              <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Motivo del escalamiento
              </h3>
              <ul className="space-y-2 text-sm">
                {data.triggers.map((t) => (
                  <li key={t.id_criterio + t.evidencia}>
                    <span className="font-semibold">{t.id_criterio}</span> ·{' '}
                    {toPlainText(t.evidencia)}
                  </li>
                ))}
              </ul>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <Field label="Cola" value={queueLabel(data.cola_destino)} />
                <Field label="Canal" value={channelLabel(data.canal)} />
                <Field
                  label="Sentimiento"
                  value={sentimentLabel(data.sentimiento_detectado)}
                  strong={data.sentimiento_detectado === 'MUY_NEGATIVO'}
                />
                <Field
                  label="Confianza del bot"
                  value={
                    data.confidence_score_promedio === null
                      ? 'Sin dato'
                      : confidenceLabel(data.confidence_score_promedio).level.replace(
                          'Confianza IA ',
                          '',
                        )
                  }
                />
                <Field label="Intentos previos" value={String(data.intentos_previos)} />
                <Field label="Escalado" value={formatDayTime(data.created_at, now)} />
              </dl>
            </Card>

            <Card className="flex gap-2 text-sm text-muted-foreground">
              <PhoneOff className="mt-0.5 size-4 shrink-0" {...ICON} />
              Sin teléfono del cliente: el bot todavía no lo pide (CR-007). Por ahora el contacto se
              hace por el chat del cliente.
            </Card>

            <Section title="Transcripción del bot">
              <Transcript items={data.historial} />
            </Section>

            {data.numero_guia_consultada && (
              <Section title="Tracking TMS">
                <Card>
                  <TmsTrackingSection guia={data.numero_guia_consultada} />
                </Card>
              </Section>
            )}
          </>
        )}
      </div>
    </aside>
  )
}

function Field({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn('font-semibold', strong && 'text-destructive')}>{value}</dd>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="font-semibold">{title}</h3>
      {children}
    </section>
  )
}

const SPEAKER: Record<HandoffDetail['historial'][number]['rol'], string> = {
  USUARIO: 'Cliente',
  ASISTENTE: 'Bot Web',
  ASESOR: 'Asesor',
  SISTEMA: 'Sistema',
}

function Transcript({ items }: { items: HandoffDetail['historial'] }) {
  if (items.length === 0)
    return <p className="text-sm text-muted-foreground">El bot no guardó mensajes.</p>
  return (
    <ol className="space-y-3">
      {items.map((m, i) => {
        const client = m.rol === 'USUARIO'
        return (
          <li key={i} className={cn('flex flex-col gap-1', client ? 'items-end' : 'items-start')}>
            <span className="text-xs text-muted-foreground">
              {SPEAKER[m.rol]} · {formatTime(m.timestamp)}
            </span>
            <p
              className={cn(
                'max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm whitespace-pre-wrap',
                client ? 'bg-primary text-primary-foreground' : 'border bg-card',
                m.rol === 'SISTEMA' && 'bg-muted text-muted-foreground',
              )}
            >
              {toPlainText(m.texto)}
            </p>
          </li>
        )
      })}
    </ol>
  )
}
