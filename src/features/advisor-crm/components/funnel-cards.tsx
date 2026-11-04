import type { MouseEvent, ReactNode } from 'react'
import {
  ArrowRight,
  Bot,
  ChevronDown,
  Clock,
  MessageCircle,
  Package,
  Phone,
  ShieldCheck,
  Timer,
  Truck,
  User,
} from 'lucide-react'
import { cn } from 'cn'
import type { BotCard, CaseCard, FunnelCard, SalesCard } from '../api/crm-api'
import { quoteMessage, telLink, whatsappLink } from '../model/contact'
import { POSTVENTA_LABEL, STAGE, confidenceLabel, isLockedStage } from '../model/funnels'
import { formatAgo, slaRemaining } from '../model/time'
import { ActionButton, ActionLink, Badge, Card } from './ui'
import { TONE_TEXT, copLabel } from '../model/tones'

const ICON = { strokeWidth: 1.75, 'aria-hidden': true } as const

interface CardProps<T> {
  card: T
  advisorName: string
  now: number
  selected?: boolean
  onOpen: () => void
  onMove: () => void
  onTakeOver?: () => void
  takingOver?: boolean
}

/** Las acciones dentro de la tarjeta no abren el detalle. */
const stop = (event: MouseEvent) => event.stopPropagation()

function CardShell({
  selected,
  onOpen,
  label,
  children,
}: {
  selected?: boolean
  onOpen: () => void
  label: string
  children: ReactNode
}) {
  return (
    <Card
      className={cn(
        'relative cursor-pointer space-y-3 transition hover:border-primary/40',
        selected && 'border-2 border-primary',
      )}
      onClick={onOpen}
    >
      {/* Acceso por teclado al detalle; el clic en cualquier parte de la tarjeta hace lo mismo. */}
      <button type="button" className="sr-only" onClick={onOpen}>
        Abrir {label}
      </button>
      {children}
    </Card>
  )
}

export function FunnelCardView(props: CardProps<FunnelCard>) {
  const { card } = props
  if (card.embudo === 'ventas') return <SalesCardView {...props} card={card} />
  if (card.embudo === 'casos') return <CaseCardView {...props} card={card} />
  return <BotCardView {...props} card={card} />
}

function Phone_({ phone, verified }: { phone: string; verified: boolean }) {
  return (
    <p className="flex items-center gap-1.5 text-sm text-muted-foreground tabular-nums">
      <Phone className="size-4" {...ICON} />
      {phone}
      {verified && (
        <span className="flex items-center gap-1 text-success">
          <ShieldCheck className="size-4" {...ICON} />
          <span className="lg:sr-only">Verificado</span>
        </span>
      )}
    </p>
  )
}

function RouteLine({
  origen,
  destino,
  strong,
}: {
  origen: string
  destino: string
  strong?: boolean
}) {
  return (
    <p className={cn('flex items-center gap-2', strong ? 'font-semibold' : 'font-medium')}>
      {origen}
      <ArrowRight className="size-4 text-primary" {...ICON} />
      <span className="sr-only">a</span>
      {destino}
    </p>
  )
}

function SalesCardView({ card, advisorName, now, selected, onOpen, onMove }: CardProps<SalesCard>) {
  const q = card.cotizacion
  const message = quoteMessage({
    cliente: card.cliente.nombre,
    asesor: advisorName,
    codigo: q.codigo,
    origen: q.origen,
    destino: q.destino,
    valor_cop: q.valor_cop,
    peso_kg: q.peso_facturable_kg,
  })

  return (
    <CardShell selected={selected} onOpen={onOpen} label={`cotización de ${card.cliente.nombre}`}>
      <div className="flex items-center justify-between gap-2">
        <Badge tone={card.segmento === 'B2B' ? 'primary' : 'neutral'}>
          {card.segmento === 'B2B' ? 'B2B - Empresa' : 'B2C - Particular'}
        </Badge>
        <span className="flex items-center gap-1 text-xs whitespace-nowrap text-muted-foreground">
          <Clock className="size-3.5 text-warning" {...ICON} />
          {formatAgo(card.creado_at, now)}
        </span>
      </div>
      <div className="space-y-0.5">
        <p className="font-semibold">{card.cliente.nombre}</p>
        <Phone_ phone={card.cliente.telefono} verified={card.cliente.telefono_verificado} />
      </div>
      <div className="space-y-2 rounded-lg bg-muted/70 p-3">
        <div className="flex items-center gap-2">
          <Package className="size-4 text-primary" {...ICON} />
          <RouteLine origen={q.origen} destino={q.destino} strong />
        </div>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1 tabular-nums">
            <Package className="size-3.5" {...ICON} /> {q.peso_facturable_kg} kg
          </span>
          <span className="flex items-center gap-1">
            <Truck className="size-3.5" {...ICON} /> {q.tipo_carga}
          </span>
        </p>
        <p className="flex items-baseline justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            <span className="lg:hidden">Valor cotizado</span>
            <span className="hidden lg:inline">Cotizado</span>
          </span>
          <span className="text-lg font-bold whitespace-nowrap tabular-nums lg:text-base">
            {copLabel(q.valor_cop)}
          </span>
        </p>
      </div>
      <div className="grid grid-cols-[auto_1fr] gap-2" onClick={stop}>
        <ActionLink href={telLink(card.cliente.telefono)} className="px-2.5">
          <Phone {...ICON} />{' '}
          <span>
            Llamar<span className="lg:hidden"> ahora</span>
          </span>
        </ActionLink>
        <ActionLink
          variant="primary"
          href={whatsappLink(card.cliente.telefono, message)}
          target="_blank"
          rel="noreferrer"
          className="px-2.5"
        >
          <MessageCircle {...ICON} />{' '}
          <span>
            <span className="lg:hidden">Contactar </span>WhatsApp
          </span>
        </ActionLink>
      </div>
      {card.numero_guia ? (
        <p className="flex flex-wrap items-center gap-2 text-xs">
          <Badge tone="success" className="font-semibold tabular-nums">
            <Truck className="size-3.5" {...ICON} /> {card.numero_guia}
          </Badge>
          {card.postventa && <Badge tone="neutral">{POSTVENTA_LABEL[card.postventa]}</Badge>}
        </p>
      ) : (
        !isLockedStage(card.etapa) && (
          <ActionButton
            className="w-full"
            onClick={(e) => {
              stop(e)
              onMove()
            }}
          >
            <ChevronDown {...ICON} /> Mover etapa
          </ActionButton>
        )
      )}
    </CardShell>
  )
}

const PRIORITY: Record<
  CaseCard['prioridad'],
  { label: string; tone: 'danger' | 'warning' | 'neutral' }
> = {
  ALTA: { label: 'Prioridad Alta', tone: 'danger' },
  MEDIA: { label: 'Prioridad Media', tone: 'warning' },
  BAJA: { label: 'Prioridad Baja', tone: 'neutral' },
}

const BAR: Record<'danger' | 'warning' | 'success', string> = {
  danger: 'bg-destructive',
  warning: 'bg-warning',
  success: 'bg-success',
}

function CaseCardView({ card, now, selected, onOpen }: CardProps<CaseCard>) {
  const priority = PRIORITY[card.prioridad]
  const confidence = confidenceLabel(card.confianza)
  const sla = card.sla_vence_at ? slaRemaining(card.sla_vence_at, now) : null
  const resolved = card.etapa === STAGE.casoResuelto

  return (
    <CardShell selected={selected} onOpen={onOpen} label={`caso ${card.caso_codigo}`}>
      <div className="flex items-center justify-between gap-2">
        <Badge tone={priority.tone} dot>
          {priority.label}
        </Badge>
        <span className="text-sm text-muted-foreground tabular-nums">#{card.caso_codigo}</span>
      </div>
      <p className="font-semibold">{card.motivo}</p>
      {card.numero_guia && (
        <Badge tone="primary" className="font-semibold tabular-nums">
          <Truck className="size-3.5" {...ICON} /> {card.numero_guia}
        </Badge>
      )}
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <User className="size-3.5" {...ICON} />
        {card.cliente.nombre} · <span className="tabular-nums">{card.cliente.telefono}</span>
      </p>
      <div className="space-y-2 rounded-lg bg-primary-subtle p-3">
        <p className="flex items-center gap-1.5 text-xs font-medium text-primary">
          <Bot className="size-3.5 shrink-0" {...ICON} />
          {confidence.level} · {confidence.hint}
        </p>
        <div
          className="h-1.5 overflow-hidden rounded-full bg-border"
          role="meter"
          aria-label="Confianza del bot"
          aria-valuemin={0}
          aria-valuemax={1}
          aria-valuenow={card.confianza}
        >
          <div
            className={cn('h-full rounded-full', BAR[confidence.tone])}
            style={{ width: `${card.confianza * 100}%` }}
          />
        </div>
      </div>
      {resolved ? (
        <p className="flex items-center gap-1.5 text-xs font-medium text-success">
          <Timer className="size-3.5" {...ICON} /> SLA cumplido
        </p>
      ) : (
        sla && (
          <p
            className={cn(
              'flex items-center gap-1.5 text-xs font-medium tabular-nums',
              sla.critical
                ? TONE_TEXT.danger
                : card.prioridad === 'BAJA'
                  ? TONE_TEXT.neutral
                  : TONE_TEXT.warning,
            )}
          >
            <Timer className="size-3.5" {...ICON} />
            {sla.expired ? 'SLA vencido' : `SLA ${sla.text} restantes`}
          </p>
        )
      )}
      <div className="grid grid-cols-2 gap-2" onClick={stop}>
        <ActionLink href={telLink(card.cliente.telefono)} className="px-2 lg:text-[0.8125rem]">
          <Phone {...ICON} /> Llamar ahora
        </ActionLink>
        <ActionButton variant="primary" className="px-2 lg:text-[0.8125rem]" onClick={onOpen}>
          Gestionar caso
        </ActionButton>
      </div>
    </CardShell>
  )
}

const BOT_STATE: Record<
  BotCard['estado_bot'],
  { label: string; tone: 'success' | 'primary' | 'neutral' }
> = {
  ACTIVO: { label: 'Agente IA activo', tone: 'success' },
  REACTIVADO: { label: 'Cliente reactivó', tone: 'primary' },
  SIN_RESPUESTA: { label: 'Sin respuesta', tone: 'neutral' },
}

function BotCardView({ card, selected, onOpen, onTakeOver, takingOver }: CardProps<BotCard>) {
  const state = BOT_STATE[card.estado_bot]
  return (
    <CardShell selected={selected} onOpen={onOpen} label={`seguimiento de ${card.cliente.nombre}`}>
      <div className="flex items-center justify-between gap-2">
        <Badge tone={state.tone}>
          <Bot className="size-3.5" {...ICON} />
          <span aria-hidden className="size-1.5 rounded-full bg-current" />
          {state.label}
        </Badge>
        <span className="text-xs whitespace-nowrap text-muted-foreground tabular-nums">
          Intento {card.intento} de {card.intentos_max}
        </span>
      </div>
      <div>
        <p className="font-semibold">{card.cliente.nombre}</p>
        <p className="text-xs text-muted-foreground tabular-nums">
          {card.cotizacion.codigo} · {card.cliente.telefono}
        </p>
      </div>
      <div className="space-y-1 rounded-lg bg-muted/70 p-3">
        <RouteLine origen={card.cotizacion.origen} destino={card.cotizacion.destino} />
        <p className="font-semibold tabular-nums">{copLabel(card.cotizacion.valor_cop)}</p>
      </div>
      <div className="flex gap-2 rounded-lg bg-primary-subtle p-3">
        <Clock className="mt-0.5 size-4 shrink-0 text-primary" {...ICON} />
        <div>
          <p className="text-[0.7rem] font-semibold tracking-wide text-primary uppercase">
            Próxima acción automática
          </p>
          <p className="text-sm">{card.proxima_accion}</p>
        </div>
      </div>
      <TakeOverButton onTakeOver={onTakeOver} pending={takingOver} />
    </CardShell>
  )
}

function TakeOverButton({ onTakeOver, pending }: { onTakeOver?: () => void; pending?: boolean }) {
  return (
    <button
      type="button"
      disabled={pending}
      onClick={(e) => {
        stop(e)
        onTakeOver?.()
      }}
      className="flex w-full flex-col items-center rounded-lg bg-primary px-3 py-2 text-primary-foreground transition hover:bg-primary-deep disabled:opacity-60"
    >
      <span className="text-sm font-semibold">
        {pending ? 'Tomando control…' : 'Tomar control manual'}
      </span>
      <span className="text-xs opacity-85">Pasar a Embudo Ventas</span>
    </button>
  )
}
