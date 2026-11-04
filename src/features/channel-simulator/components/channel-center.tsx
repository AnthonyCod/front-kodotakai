import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router'
import { Mic, PhoneOff, Plus, Search, Square, Trash2, Volume2, VolumeX } from 'lucide-react'
import { cn } from 'cn'
import logiUrl from '@/assets/logi.jpg'
import { BlockActionsProvider, BlockRenderer, type BlockActions } from '@/shared/blocks'
import { MessageCircle } from '@/shared/components/animate-ui/icons/hugeicons/message-circle'
import { PhoneCall } from '@/shared/components/animate-ui/icons/hugeicons/phone-call'
import { SendHorizontal } from '@/shared/components/animate-ui/icons/hugeicons/send-horizontal'
import { useSpeechRecognition } from '@/shared/hooks/use-speech-recognition'
import { StatusDot } from '@/shared/ui/block-card'
import { GLASS, GLASS_TINT } from '@/shared/ui/glass'
import { formatDateTime } from '@/shared/lib/format'
import { InteractiveGradient } from '@/shared/ui/interactive-gradient'
import { stopSpeaking } from '@/shared/lib/speech-synthesis'
import { INTENT_LABELS, SERVICE_LABELS } from '../model/case-info'
import { useSimulatorStore, type SimChannel, type SimConversation } from '../model/simulator-store'
import { useSimulatorSend } from '../model/use-simulator-send'

type Tab = 'list' | 'channel' | 'case'
type Filter = 'ALL' | SimChannel

const FILTERS: [Filter, string][] = [
  ['ALL', 'Todas'],
  ['WHATSAPP', 'WhatsApp'],
  ['PBX', 'Llamadas'],
]

// Objeto estable (igual que en el chat): media resolución = fluido en móvil.
const GRADIENT_OPTIONS = { resolutionScale: 0.6 }

const time = (iso: string) => new Date(iso).toLocaleTimeString('es-CO', { timeStyle: 'short' })

/**
 * Centro de canales (vista tipo CRM): lista de conversaciones simuladas (WhatsApp y llamada),
 * la conversación en vivo y la ficha del caso. En móvil las tres columnas son pestañas.
 */
export function ChannelCenter() {
  const conversations = useSimulatorStore((s) => s.conversations)
  const selectedId = useSimulatorStore((s) => s.selectedId)
  const selected = conversations.find((c) => c.id === selectedId) ?? null
  const [tab, setTab] = useState<Tab>('list')

  return (
    <div className="flex h-full min-h-0 flex-col">
      <nav
        className="mx-3 mt-3 grid grid-cols-3 gap-1 rounded-2xl bg-muted p-1 lg:hidden"
        aria-label="Secciones del simulador"
      >
        {(
          [
            ['list', 'Conversaciones'],
            ['channel', 'Canal'],
            ['case', 'Ficha'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={tab === value}
            onClick={() => setTab(value)}
            className="rounded-xl px-2 py-1.5 text-sm text-muted-foreground transition aria-pressed:bg-card aria-pressed:font-medium aria-pressed:text-foreground aria-pressed:shadow-card"
          >
            {label}
          </button>
        ))}
      </nav>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)] lg:grid-cols-[17rem_minmax(0,1fr)_17rem] lg:divide-x xl:grid-cols-[19rem_minmax(0,1fr)_19rem]">
        <section className={cn('flex min-h-0 flex-col', tab !== 'list' && 'hidden lg:flex')}>
          <ConversationList onOpen={() => setTab('channel')} />
        </section>
        <section className={cn('flex min-h-0 flex-col', tab !== 'channel' && 'hidden lg:flex')}>
          {selected ? (
            <ConversationView key={selected.id} conversation={selected} />
          ) : (
            <Empty>Crea una conversación de WhatsApp o una llamada para empezar.</Empty>
          )}
        </section>
        <section
          className={cn('min-h-0 overflow-y-auto', tab !== 'case' && 'hidden lg:block')}
          aria-label="Ficha del caso"
        >
          {selected ? (
            <CaseCard conversation={selected} onRemoved={() => setTab('list')} />
          ) : (
            <Empty>Aquí verás lo que Logi entendió del caso.</Empty>
          )}
        </section>
      </div>
    </div>
  )
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="grid h-full min-h-40 place-items-center p-6 text-center text-sm text-muted-foreground">
      {children}
    </p>
  )
}

/** Avatar del cliente: el icono de su canal (no hay fotos ni datos personales). */
function ChannelAvatar({ channel, size = 'md' }: { channel: SimChannel; size?: 'md' | 'lg' }) {
  const Icon = channel === 'WHATSAPP' ? MessageCircle : PhoneCall
  return (
    <span
      className={cn(
        'grid shrink-0 place-items-center rounded-full bg-muted text-foreground/70',
        size === 'lg' ? 'size-14' : 'size-11',
      )}
    >
      <Icon size={size === 'lg' ? 26 : 20} aria-hidden />
    </span>
  )
}

function conversationStatus(c: SimConversation): string {
  if (c.channel === 'PBX' && c.case.transferred) return 'Transferida a un asesor'
  if (c.channel === 'PBX' && c.endedAt) return 'Llamada finalizada'
  if (c.case.escalated) return 'Escalada a un asesor'
  if (c.channel === 'PBX') return 'En llamada'
  return c.turns.length ? 'Atendida por Logi' : 'Nueva'
}

/** Color del punto de estado: activa, con asesor o cerrada. */
function statusTone(c: SimConversation): string {
  if (c.case.escalated || c.case.transferred) return 'bg-warning'
  if (c.endedAt) return 'bg-muted-foreground'
  return 'bg-success'
}

function ConversationList({ onOpen }: { onOpen: () => void }) {
  const { conversations, selectedId, create, select } = useSimulatorStore()
  const [filter, setFilter] = useState<Filter>('ALL')
  const [query, setQuery] = useState('')

  const q = query.trim().toLowerCase()
  const visible = conversations.filter(
    (c) =>
      (filter === 'ALL' || c.channel === filter) &&
      (!q ||
        [c.label, c.case.guia ?? '', c.turns.at(-1)?.text ?? ''].some((v) =>
          v.toLowerCase().includes(q),
        )),
  )

  return (
    <>
      <div className="space-y-3 border-b p-3 sm:p-4">
        <h2 className="text-lg font-semibold">Conversaciones</h2>
        <div className="grid grid-cols-2 gap-2">
          <div className="contents">
            <button
              type="button"
              className={`${GLASS} rounded-xl px-2.5 py-2 text-xs font-medium`}
              onClick={() => (create('WHATSAPP'), onOpen())}
            >
              <Plus size={14} aria-hidden /> WhatsApp
            </button>
            <button
              type="button"
              className={`${GLASS} rounded-xl px-2.5 py-2 text-xs font-medium`}
              onClick={() => (create('PBX'), onOpen())}
            >
              <Plus size={14} aria-hidden /> Llamada
            </button>
          </div>
        </div>
        <label className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2">
          <Search size={16} aria-hidden className="text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por cliente, guía o mensaje"
            aria-label="Buscar conversaciones"
            className="min-w-0 flex-1 bg-transparent text-base outline-none sm:text-sm"
          />
        </label>
        <div
          className="flex gap-1 rounded-full bg-muted p-1"
          role="tablist"
          aria-label="Filtrar por canal"
        >
          {FILTERS.map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={filter === value}
              onClick={() => setFilter(value)}
              className="flex-1 rounded-full px-3 py-1 text-xs text-muted-foreground transition aria-selected:bg-card aria-selected:text-foreground aria-selected:shadow-card"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <Empty>
          {conversations.length === 0 ? 'Sin conversaciones todavía.' : 'Nada coincide.'}
        </Empty>
      ) : (
        <ul className="min-h-0 flex-1 overflow-y-auto">
          {visible.map((c) => {
            const last = c.turns.at(-1)
            return (
              <li key={c.id}>
                <button
                  type="button"
                  aria-pressed={c.id === selectedId}
                  onClick={() => (select(c.id), onOpen())}
                  className="flex w-full items-center gap-3 border-b px-3 py-3 text-left transition hover:bg-muted/60 aria-pressed:bg-muted/70 sm:px-4"
                >
                  <span className="relative">
                    <ChannelAvatar channel={c.channel} />
                    <span
                      aria-hidden
                      className={cn(
                        'absolute right-0 bottom-0 size-3 rounded-full border-2 border-card',
                        statusTone(c),
                      )}
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate font-medium">{c.label}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {time(last?.createdAt ?? c.startedAt)}
                      </span>
                    </span>
                    <span className="block truncate text-sm text-muted-foreground">
                      {c.pending
                        ? 'Logi está respondiendo…'
                        : (last?.text ?? conversationStatus(c))}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}

/** Los botones rápidos de un turno responden en esta misma conversación, no en el chat web. */
function TurnBlocks({
  conversation,
  blocks,
}: {
  conversation: SimConversation
  blocks: SimConversation['turns'][number]['blocks']
}) {
  const send = useSimulatorSend()
  const actions = useMemo<BlockActions>(
    () => ({
      sendMessage: (text) => void send(conversation.id, text),
      disabled: conversation.pending || conversation.endedAt !== null,
    }),
    [send, conversation.id, conversation.pending, conversation.endedAt],
  )
  // El texto ya se muestra como mensaje del canal.
  const extra = blocks?.filter((block) => block.type !== 'TEXT') ?? []
  if (!extra.length) return null
  return (
    <BlockActionsProvider value={actions}>
      <div className="space-y-2 pt-2">
        {extra.map((block, index) => (
          <BlockRenderer key={index} block={block} />
        ))}
      </div>
    </BlockActionsProvider>
  )
}

/** Conversación: cabecera (y controles de llamada), mensajes y caja de texto. */
function ConversationView({ conversation }: { conversation: SimConversation }) {
  const isCall = conversation.channel === 'PBX'
  const botLabel = isCall ? 'Logi (voz)' : 'Logi'

  return (
    <>
      <header className="flex flex-wrap items-center gap-3 border-b px-3 py-3 sm:px-5">
        <ChannelAvatar channel={conversation.channel} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{conversation.label}</p>
          <p className="truncate text-xs text-muted-foreground">
            {isCall ? 'Llamada simulada' : 'WhatsApp simulado'} · no se envía nada real
          </p>
        </div>
        {isCall && <CallControls conversation={conversation} />}
      </header>

      <ol
        className="min-h-0 flex-1 space-y-5 overflow-y-auto px-3 py-4 sm:space-y-7 sm:px-6"
        aria-live="polite"
      >
        {conversation.turns.length === 0 && (
          <li className="text-center text-sm text-muted-foreground">
            {isCall
              ? 'La llamada está conectada. Habla o escribe lo que diría quien llama.'
              : 'Escribe como si fueras el cliente que llega por WhatsApp.'}
          </li>
        )}
        {conversation.turns.map((t) =>
          t.role === 'customer' ? (
            <li key={t.id} className="ml-auto w-fit max-w-[85%]">
              <p className="rounded-3xl bg-user-bubble px-4 py-2.5 text-[15px] whitespace-pre-wrap text-user-bubble-foreground sm:px-5 sm:py-3 sm:text-base">
                {t.text}
              </p>
              <p className="mt-1 pr-2 text-right text-[11px] text-muted-foreground">
                Cliente · {time(t.createdAt)}
              </p>
            </li>
          ) : (
            <LogiRow key={t.id}>
              <p className="text-[15px] leading-relaxed whitespace-pre-wrap text-foreground/80 sm:text-base">
                {t.text}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {botLabel} · {time(t.createdAt)}
              </p>
              <TurnBlocks conversation={conversation} blocks={t.blocks} />
            </LogiRow>
          ),
        )}
        {conversation.pending && (
          <LogiRow>
            <p className="animate-pulse pt-2 text-sm text-muted-foreground" role="status">
              {botLabel} está respondiendo…
            </p>
          </LogiRow>
        )}
        {conversation.error && (
          <LogiRow>
            <p
              className="rounded-2xl border border-destructive/30 bg-card p-3 text-sm shadow-card"
              role="alert"
            >
              {conversation.error}
            </p>
          </LogiRow>
        )}
      </ol>

      <Composer conversation={conversation} />
    </>
  )
}

/** Fila de Logi como en el chat web: avatar a la izquierda y la respuesta en texto plano. */
function LogiRow({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-3 sm:gap-4">
      <img src={logiUrl} alt="" className="size-9 shrink-0 rounded-[22%] shadow-card sm:size-11" />
      <div className="max-w-full min-w-0 flex-1 space-y-1.5 sm:max-w-[85%]">{children}</div>
    </li>
  )
}

function useElapsed(startedAt: string, endedAt: string | null) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (endedAt) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [endedAt])
  const end = endedAt ? new Date(endedAt).getTime() : now
  const seconds = Math.max(0, Math.floor((end - new Date(startedAt).getTime()) / 1000))
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}

/** Llamada (PBX): duración, estado, voz de Logi (`speech_text`) y colgar. */
function CallControls({ conversation }: { conversation: SimConversation }) {
  const { endCall, voiceEnabled, setVoiceEnabled } = useSimulatorStore()
  const elapsed = useElapsed(conversation.startedAt, conversation.endedAt)
  const ended = conversation.endedAt !== null

  useEffect(() => () => stopSpeaking(), [])

  return (
    <div className="flex w-full items-center gap-2 sm:w-auto">
      <span
        className={cn(
          'shrink-0 rounded-full px-2.5 py-1 text-xs',
          ended ? 'bg-muted text-muted-foreground' : 'bg-muted font-mono text-foreground/70',
        )}
        role="status"
      >
        {ended ? conversationStatus(conversation) : `● ${elapsed}`}
      </span>
      <button
        type="button"
        aria-pressed={voiceEnabled}
        aria-label={voiceEnabled ? 'Silenciar la voz de Logi' : 'Activar la voz de Logi'}
        title="Voz de Logi"
        className={`${GLASS} ml-auto size-9 rounded-xl text-muted-foreground sm:ml-0`}
        onClick={() => {
          if (voiceEnabled) stopSpeaking()
          setVoiceEnabled(!voiceEnabled)
        }}
      >
        {voiceEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
      </button>
      {!ended && (
        <button
          type="button"
          className={`${GLASS} rounded-xl px-3 py-2 text-sm font-medium text-destructive`}
          onClick={() => {
            stopSpeaking()
            endCall(conversation.id)
          }}
        >
          <PhoneOff size={16} aria-hidden /> Colgar
        </button>
      )}
    </div>
  )
}

/**
 * Caja de texto. En WhatsApp el micrófono dicta en la caja; en la llamada cada frase dicha se
 * envía sola como un turno (quien llama habla y Logi responde en voz alta).
 */
function Composer({ conversation }: { conversation: SimConversation }) {
  const send = useSimulatorSend()
  const isCall = conversation.channel === 'PBX'
  const [text, setText] = useState('')
  const disabled = conversation.pending || conversation.endedAt !== null
  const dictation = useSpeechRecognition({
    onFinal: (spoken) =>
      isCall
        ? void send(conversation.id, spoken)
        : setText((current) => (current ? `${current} ${spoken}` : spoken)),
  })

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!text.trim() || disabled) return
    void send(conversation.id, text)
    setText('')
  }

  const placeholder = conversation.endedAt
    ? 'La llamada terminó'
    : dictation.listening
      ? dictation.interim || 'Te escucho…'
      : isCall
        ? 'Habla con el micrófono o escribe lo que dice quien llama'
        : 'Escribe como el cliente…'

  return (
    <div className="p-3 sm:px-6 sm:pb-5">
      <section className="relative overflow-hidden rounded-[1.75rem] bg-brand-deep p-2 shadow-card sm:rounded-[2.25rem] sm:p-3">
        <InteractiveGradient options={GRADIENT_OPTIONS} />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_80%,transparent_10%,var(--brand-deep)_100%)] opacity-90"
        />
        <form
          onSubmit={submit}
          className="relative rounded-[1.25rem] bg-card p-2 text-card-foreground shadow-card sm:rounded-[1.75rem] sm:p-3"
        >
          {dictation.error && (
            <p className="px-2 pb-1 text-xs text-destructive" role="alert">
              {dictation.error}
            </p>
          )}
          <div className="flex items-center gap-2">
            <input
              aria-label="Mensaje del cliente"
              value={text}
              disabled={disabled}
              onChange={(e) => setText(e.target.value)}
              placeholder={placeholder}
              className="min-w-0 flex-1 bg-transparent px-2 py-2 text-base outline-none placeholder:text-muted-foreground"
            />
            {dictation.supported && (
              <button
                type="button"
                aria-pressed={dictation.listening}
                aria-label={dictation.listening ? 'Dejar de escuchar' : 'Hablar'}
                disabled={disabled}
                className={cn(
                  `${GLASS_TINT} size-11 shrink-0 rounded-xl sm:size-12 sm:rounded-2xl`,
                  dictation.listening && 'animate-pulse',
                )}
                onClick={() => {
                  stopSpeaking()
                  if (dictation.listening) dictation.stop()
                  else dictation.start()
                }}
              >
                {dictation.listening ? <Square size={18} /> : <Mic size={20} />}
              </button>
            )}
            <button
              type="submit"
              aria-label="Enviar"
              disabled={disabled || !text.trim()}
              className={`${GLASS_TINT} size-11 shrink-0 rounded-xl sm:size-12 sm:rounded-2xl`}
            >
              <SendHorizontal size={20} animateOnHover />
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

/** Ficha del caso: lo que la IA entendió en el último turno. */
function CaseCard({
  conversation,
  onRemoved,
}: {
  conversation: SimConversation
  onRemoved: () => void
}) {
  const remove = useSimulatorStore((s) => s.remove)
  const { case: info } = conversation
  const rows: [string, ReactNode][] = [
    [
      'Estado',
      <span key="estado" className="flex items-center justify-end gap-1.5">
        <span className={cn('size-2 rounded-full', statusTone(conversation))} />
        {conversationStatus(conversation)}
      </span>,
    ],
    ['Intención', info.intent ? (INTENT_LABELS[info.intent] ?? info.intent) : '—'],
    ['Guía', info.guia ?? '—'],
    ['Mensajes', conversation.turns.length],
    ['Inicio', formatDateTime(conversation.startedAt)],
  ]

  return (
    <div className="space-y-6 p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <ChannelAvatar channel={conversation.channel} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-semibold">{conversation.label}</p>
          <p className="truncate text-xs text-muted-foreground">
            {conversation.channel === 'WHATSAPP'
              ? `WhatsApp · ${conversation.externalId}`
              : 'Llamada (PBX)'}
          </p>
        </div>
        <button
          type="button"
          aria-label="Eliminar conversación"
          title="Eliminar conversación"
          className={`${GLASS} size-9 shrink-0 rounded-xl text-muted-foreground hover:text-destructive`}
          onClick={() => {
            stopSpeaking()
            remove(conversation.id)
            onRemoved()
          }}
        >
          <Trash2 size={16} />
        </button>
      </div>

      <dl className="space-y-2">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="flex items-center justify-between gap-3 rounded-xl bg-muted/60 px-3 py-2.5 text-sm"
          >
            <dt className="font-medium">{label}</dt>
            <dd className="min-w-0 truncate text-right text-muted-foreground">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="space-y-2">
        <p className="text-sm font-semibold">Lo que usó Logi</p>
        {info.services.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía nada.</p>
        ) : (
          <ul className="flex flex-wrap gap-1.5">
            {info.services.map((s) => (
              <li key={s} className="rounded-full bg-muted px-2.5 py-1 text-xs text-foreground/70">
                {SERVICE_LABELS[s] ?? s}
              </li>
            ))}
          </ul>
        )}
      </div>

      {info.escalated && (
        <div className="space-y-3 rounded-2xl bg-muted/70 p-3 text-sm">
          <StatusDot tone="alert">
            {info.transferred ? 'Llamada transferida a un asesor' : 'Caso escalado a un asesor'}
          </StatusDot>
          <Link to="/interno/asesor" className={`${GLASS_TINT} w-full rounded-xl px-3 py-2`}>
            Ver en la bandeja del asesor
          </Link>
        </div>
      )}
    </div>
  )
}
