import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CalendarClock,
  Check,
  ChevronDown,
  ChevronLeft,
  Copy,
  MessageCircle,
  Phone,
  X,
} from 'lucide-react'
import { cn } from 'cn'
import { toPlainText } from '@/shared/lib/plain-text'
import { ErrorText } from '@/shared/ui/error-text'
import { addNote, getLead, type CallResult, type LeadDetail } from '../api/crm-api'
import { caseMessage, quoteMessage, telLink, whatsappLink } from '../model/contact'
import { formatDayTime, formatTime, useNow } from '../model/time'
import { crmKeys, useAdvisor, useFunnel } from '../model/use-crm'
import { shortStage } from '../model/funnels'
import { useToasts } from '../model/toast-store'
import { MoveStageSheet } from './move-stage-sheet'
import { TmsTrackingSection } from './tms-tracking'
import { ActionButton, ActionLink, Badge, Card } from './ui'
import { copLabel } from '../model/tones'

type Tab = 'datos' | 'transcripcion' | 'notas' | 'cotizacion'

const ICON = { strokeWidth: 1.75, 'aria-hidden': true } as const

/**
 * Detalle del lead o caso. Móvil: pantalla completa. Escritorio: inspector lateral de 480 px
 * sobre el Kanban. Sin «resumen IA»: solo los datos que el bot capturó, la transcripción, notas
 * y cotización/tracking.
 */
export function LeadDetailPanel({ leadId, onClose }: { leadId: string; onClose: () => void }) {
  const query = useQuery({ queryKey: crmKeys.lead(leadId), queryFn: () => getLead(leadId) })
  const [tab, setTab] = useState<Tab>('datos')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const lead = query.data
  const tabs: { id: Tab; label: string; desktop: string }[] = [
    { id: 'datos', label: 'Datos', desktop: 'Datos del bot' },
    { id: 'transcripcion', label: 'Transcripción', desktop: 'Transcripción' },
    { id: 'notas', label: 'Notas', desktop: 'Notas y seguimiento' },
    {
      id: 'cotizacion',
      label: lead?.cotizacion ? 'Cotización' : 'Tracking',
      desktop: lead?.cotizacion ? 'Tracking / Cotización' : 'Tracking TMS',
    },
  ]

  return (
    <aside
      aria-label="Detalle del cliente"
      className="fixed inset-0 z-40 flex animate-in flex-col bg-background slide-in-from-right-4 lg:inset-y-0 lg:right-0 lg:left-auto lg:w-[480px] lg:border-l lg:bg-card lg:shadow-xl"
    >
      <div className="shrink-0 border-b bg-card px-4 pt-4 lg:px-5">
        {lead ? (
          <DetailHeader lead={lead} onClose={onClose} />
        ) : (
          <div className="flex items-center gap-3 pb-4">
            <BackButton onClose={onClose} />
            <div className="h-6 w-40 animate-pulse rounded bg-muted" />
          </div>
        )}
        <nav
          role="tablist"
          aria-label="Secciones del detalle"
          className="-mx-4 flex [scrollbar-width:none] gap-5 overflow-x-auto px-4 lg:-mx-5 lg:px-5"
        >
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'shrink-0 border-b-2 pb-2.5 text-sm whitespace-nowrap transition',
                tab === t.id
                  ? 'border-primary font-medium text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              <span className="lg:hidden">{t.label}</span>
              <span className="hidden lg:inline">{t.desktop}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 pb-8 lg:p-5">
        <ErrorText error={query.error} />
        {query.isPending && <div className="h-48 animate-pulse rounded-xl bg-muted" />}
        {lead && tab === 'datos' && <CapturedData lead={lead} />}
        {lead && tab === 'transcripcion' && <Transcript lead={lead} />}
        {lead && tab === 'notas' && <Notes lead={lead} />}
        {lead && tab === 'cotizacion' && <QuoteTab lead={lead} />}
      </div>
    </aside>
  )
}

function BackButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="Volver"
      className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted lg:hidden"
    >
      <ChevronLeft className="size-5" {...ICON} />
    </button>
  )
}

function DetailHeader({ lead, onClose }: { lead: LeadDetail; onClose: () => void }) {
  const advisor = useAdvisor()
  const funnel = useFunnel(lead.embudo)
  const [moving, setMoving] = useState(false)
  const [copied, setCopied] = useState(false)
  const stages = funnel.data?.etapas
  const stageName = stages?.find((s) => s.id === lead.etapa)?.nombre ?? lead.etapa
  const advisorName = advisor.data?.nombre ?? ''

  const message = lead.cotizacion
    ? quoteMessage({
        cliente: lead.cliente.nombre,
        asesor: advisorName,
        codigo: lead.cotizacion.codigo,
        origen: lead.cotizacion.origen,
        destino: lead.cotizacion.destino,
        valor_cop: lead.cotizacion.total_cop,
        peso_kg: lead.cotizacion.peso_facturable_kg,
      })
    : caseMessage(lead.cliente.nombre, advisorName, lead.referencia, lead.numero_guia)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(lead.cliente.telefono)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      // Sin permiso de portapapeles: el número sigue visible para copiarlo a mano.
    }
  }

  return (
    <div className="space-y-3 pb-3">
      <div className="flex items-start gap-3">
        <BackButton onClose={onClose} />
        <div className="min-w-0 flex-1">
          <h2 className="text-lg leading-tight font-semibold lg:text-xl">{lead.cliente.nombre}</h2>
          <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {lead.segmento && (
              <Badge tone="primary">
                {lead.segmento === 'B2B' ? 'B2B - Empresa' : 'B2C - Particular'}
              </Badge>
            )}
            {lead.cliente.empresa && (
              <span className="hidden lg:inline">{lead.cliente.empresa}</span>
            )}
          </p>
        </div>
        <button
          type="button"
          disabled={!stages}
          onClick={() => setMoving(true)}
          aria-label={`Etapa: ${stageName}. Cambiar etapa`}
          className="flex h-10 max-w-[10rem] shrink-0 items-center gap-1.5 rounded-lg border bg-card px-3 text-sm font-medium lg:max-w-[13rem]"
        >
          <span className="truncate">
            <span className="lg:hidden">{shortStage(stageName)}</span>
            <span className="hidden lg:inline">{stageName}</span>
          </span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" {...ICON} />
        </button>
        {moving && stages && (
          <MoveStageSheet
            leadId={lead.lead_id}
            current={lead.etapa}
            stages={stages}
            subtitle={`${lead.cliente.nombre} · ${lead.referencia}`}
            onClose={() => setMoving(false)}
          />
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar detalle"
          className="hidden size-10 shrink-0 items-center justify-center rounded-full bg-muted lg:flex"
        >
          <X className="size-5" {...ICON} />
        </button>
      </div>

      <div className="flex gap-2">
        <div className="flex h-10 min-w-0 flex-1 items-center gap-1.5 rounded-lg bg-muted px-2.5 text-sm tabular-nums">
          <Phone className="size-4 shrink-0 text-muted-foreground" {...ICON} />
          <span className="flex-1 whitespace-nowrap">{lead.cliente.telefono}</span>
          <button
            type="button"
            onClick={() => void copy()}
            aria-label="Copiar teléfono"
            className="text-muted-foreground hover:text-foreground"
          >
            {copied ? (
              <Check className="size-4 text-success" {...ICON} />
            ) : (
              <Copy className="size-4" {...ICON} />
            )}
          </button>
        </div>
        <ActionLink
          variant="primary"
          href={telLink(lead.cliente.telefono)}
          aria-label="Llamar"
          className="w-10 px-0 lg:w-auto lg:px-3"
        >
          <Phone {...ICON} />
          <span className="hidden lg:inline">Llamar ahora</span>
        </ActionLink>
        <ActionLink
          href={whatsappLink(lead.cliente.telefono, message)}
          target="_blank"
          rel="noreferrer"
          aria-label="Contactar por WhatsApp"
          className="w-10 px-0 lg:w-auto lg:px-3"
        >
          <MessageCircle className="text-success lg:text-foreground" {...ICON} />
          <span className="hidden lg:inline">WhatsApp</span>
        </ActionLink>
      </div>
    </div>
  )
}

function CapturedData({ lead }: { lead: LeadDetail }) {
  return (
    <Card className="space-y-3">
      <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        Datos capturados por el bot
      </h3>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
        {lead.cliente.correo && <Field label="Correo" value={lead.cliente.correo} wide />}
        {lead.datos_bot.map((d) => (
          <Field key={d.etiqueta} label={d.etiqueta} value={d.valor} />
        ))}
      </dl>
    </Card>
  )
}

function Field({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={cn('min-w-0', wide && 'col-span-2')}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-semibold break-words">{toPlainText(value)}</dd>
    </div>
  )
}

function Transcript({ lead }: { lead: LeadDetail }) {
  const firstName = lead.cliente.nombre.split(' ')[0]
  if (lead.transcripcion.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        El bot no guardó mensajes de esta conversación.
      </p>
    )
  }
  return (
    <ol className="space-y-3">
      {lead.transcripcion.map((m, i) => {
        const bot = m.rol === 'BOT'
        return (
          <li key={i} className={cn('flex flex-col gap-1', bot ? 'items-start' : 'items-end')}>
            <span className="text-xs text-muted-foreground">
              {bot ? 'Bot Web' : firstName} · {formatTime(m.timestamp)}
            </span>
            <p
              className={cn(
                'max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm whitespace-pre-wrap',
                bot ? 'border bg-card' : 'bg-primary text-primary-foreground',
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

const RESULTS: { id: CallResult; label: string }[] = [
  { id: 'CONTESTO', label: 'Contestó' },
  { id: 'NO_CONTESTO', label: 'No contestó' },
  { id: 'BUZON', label: 'Buzón de voz' },
]

function Notes({ lead }: { lead: LeadDetail }) {
  const queryClient = useQueryClient()
  const show = useToasts((s) => s.show)
  const now = useNow(60_000)
  const [result, setResult] = useState<CallResult | null>('CONTESTO')
  const [text, setText] = useState('')
  const [reminder, setReminder] = useState('')

  const save = useMutation({
    mutationFn: () =>
      addNote(lead.lead_id, {
        resultado: result,
        texto: text.trim(),
        recordatorio_at: reminder ? new Date(reminder).toISOString() : null,
      }),
    onSuccess: () => {
      setText('')
      setReminder('')
      void queryClient.invalidateQueries({ queryKey: crmKeys.lead(lead.lead_id) })
      void queryClient.invalidateQueries({ queryKey: crmKeys.tasks })
      show({ text: reminder ? 'Nota guardada y recordatorio programado' : 'Nota guardada' })
    },
  })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (text.trim()) save.mutate()
  }

  return (
    <div className="space-y-5">
      <Card>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <h3 className="font-semibold">Registrar llamada</h3>
            <p className="text-xs text-muted-foreground">Qué hablaste con el cliente</p>
          </div>
          <div
            role="radiogroup"
            aria-label="Resultado de la llamada"
            className="flex flex-wrap gap-2"
          >
            {RESULTS.map((r) => (
              <button
                key={r.id}
                type="button"
                role="radio"
                aria-checked={result === r.id}
                onClick={() => setResult(result === r.id ? null : r.id)}
                className={cn(
                  'flex h-7 items-center gap-1 rounded-md px-2.5 text-xs font-medium transition',
                  result === r.id ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground',
                )}
              >
                {result === r.id && <Check className="size-3.5" {...ICON} />}
                {r.label}
              </button>
            ))}
          </div>
          <label className="sr-only" htmlFor="note-text">
            Nota
          </label>
          <textarea
            id="note-text"
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ej.: Cliente confirma 3 cajas. Pide descuento por volumen y recogida hoy."
            className="w-full resize-none rounded-lg border bg-muted/60 p-3 text-base outline-none focus:border-primary sm:text-sm"
          />
          <label className="flex h-11 items-center gap-2 rounded-lg border px-3 text-sm focus-within:border-primary">
            <CalendarClock className="size-4 shrink-0 text-muted-foreground" {...ICON} />
            <span className="sr-only">Recordatorio</span>
            <input
              type="datetime-local"
              value={reminder}
              onChange={(e) => setReminder(e.target.value)}
              className="min-w-0 flex-1 bg-transparent outline-none"
            />
          </label>
          {save.isError && (
            <p role="alert" className="text-sm text-destructive">
              No se pudo guardar la nota.
            </p>
          )}
          <ActionButton
            type="submit"
            variant="primary"
            className="h-11 w-full"
            disabled={!text.trim() || save.isPending}
          >
            <Check {...ICON} />
            {save.isPending
              ? 'Guardando…'
              : reminder
                ? 'Guardar nota y programar recordatorio'
                : 'Guardar nota'}
          </ActionButton>
        </form>
      </Card>

      <section className="space-y-2">
        <h3 className="font-semibold">Historial</h3>
        {lead.notas.length === 0 && (
          <p className="text-sm text-muted-foreground">Todavía no hay notas.</p>
        )}
        {lead.notas.map((note) => (
          <Card key={note.id} className="space-y-1 py-3">
            <p
              className={cn(
                'text-xs font-medium',
                note.tipo === 'SISTEMA' ? 'text-muted-foreground' : 'text-primary',
              )}
            >
              {note.autor} · {formatTime(note.timestamp)}
              {note.tipo === 'LLAMADA' && ' · Llamada'}
              {note.resultado &&
                ` (${RESULTS.find((r) => r.id === note.resultado)?.label.toLowerCase()})`}
            </p>
            <p className="text-sm whitespace-pre-wrap">{toPlainText(note.texto)}</p>
            {note.recordatorio_at && (
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <CalendarClock className="size-3.5" {...ICON} /> Recordatorio:{' '}
                {formatDayTime(note.recordatorio_at, now)}
              </p>
            )}
          </Card>
        ))}
      </section>
    </div>
  )
}

const kg = (n: number) => `${n.toLocaleString('es-CO')} kg`

function QuoteTab({ lead }: { lead: LeadDetail }) {
  const q = lead.cotizacion
  return (
    <div className="space-y-4">
      {q && (
        <>
          <Card className="space-y-3">
            <div>
              <h3 className="font-semibold tabular-nums">Desglose de tarifa · {q.codigo}</h3>
              <p className="text-xs text-muted-foreground">
                {q.origen} a {q.destino} · {kg(q.peso_facturable_kg)} facturables
              </p>
            </div>
            <dl className="space-y-2.5 text-sm">
              {q.conceptos.map((c) => (
                <div key={c.concepto} className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{c.concepto}</dt>
                  <dd className="font-medium tabular-nums">{copLabel(c.valor_cop, false)}</dd>
                </div>
              ))}
            </dl>
            <div className="flex items-baseline justify-between gap-3 border-t pt-3">
              <span className="font-semibold">Total cotizado</span>
              <span className="text-xl font-bold text-primary tabular-nums">
                {copLabel(q.total_cop)}
              </span>
            </div>
          </Card>
          <Card className="space-y-2.5 text-sm">
            <h3 className="font-semibold">Peso facturable</h3>
            <Row label="Peso real" value={kg(q.peso_real_kg)} />
            <Row
              label={`Peso volumétrico (${q.volumen_cm3.toLocaleString('es-CO')} cm³ ÷ ${q.divisor_volumetrico.toLocaleString('es-CO')})`}
              value={kg(q.peso_volumetrico_kg)}
            />
            <Row label="Se factura el mayor" value={kg(q.peso_facturable_kg)} />
          </Card>
        </>
      )}
      <Card className="space-y-2">
        <h3 className="font-semibold">Tracking TMS</h3>
        <TmsTrackingSection guia={lead.numero_guia} />
      </Card>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium whitespace-nowrap tabular-nums">{value}</span>
    </div>
  )
}
