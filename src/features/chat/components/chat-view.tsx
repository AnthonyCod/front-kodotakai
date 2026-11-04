import {
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type FormEvent,
  type ReactNode,
} from 'react'
import { Link } from 'react-router'
import { MapPin, Mic, PackagePlus, Square, Truck, Volume2, VolumeX } from 'lucide-react'
import { cn } from 'cn'
import logiUrl from '@/assets/logi.jpg'
import { ATTACHMENT_LIMITS, uploadAttachment } from '@/features/pqrs'
import { API_ERROR_MESSAGES, apiErrorMessage, toApiError } from '@/shared/api'
import { BlockRenderer } from '@/shared/blocks'
import { useSpeechRecognition } from '@/shared/hooks/use-speech-recognition'
import { isSpeechSynthesisSupported, stopSpeaking } from '@/shared/lib/speech-synthesis'
import { Attachment01 } from '@/shared/components/animate-ui/icons/hugeicons/attachment-01'
import { SendHorizontal } from '@/shared/components/animate-ui/icons/hugeicons/send-horizontal'
import { GLASS, GLASS_ON_BRAND, GLASS_TINT } from '@/shared/ui/glass'
import { InteractiveGradient } from '@/shared/ui/interactive-gradient'
import { RevealContext, SplitText } from '@/shared/ui/split-text'
import { useChatStore } from '../model/chat-store'
import { MAX_MESSAGE_LENGTH, useSendMessage } from '../model/use-send-message'

/** El título de bienvenida se revela una sola vez por carga de la página. */
let titleRevealed = false

/** Accesos del inicio. "Hacer envío" arranca el flujo de cotización con Logi; los otros llevan a su página. */
const HOME_BANNERS: {
  label: string
  description: string
  Icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  target: { kind: 'send'; text: string } | { kind: 'link'; to: string }
}[] = [
  {
    label: 'Hacer envío',
    description: 'Logi te cotiza en el chat',
    Icon: PackagePlus,
    target: { kind: 'send', text: 'Quiero cotizar un envío' },
  },
  {
    label: 'Ver sucursales',
    description: 'Dónde estamos',
    Icon: MapPin,
    target: { kind: 'link', to: '/sucursales' },
  },
  {
    label: 'Rastrear envío',
    description: 'Estado de tu guía',
    Icon: Truck,
    target: { kind: 'link', to: '/consultas' },
  },
]

const BANNER =
  'flex aspect-square flex-col justify-between rounded-[1.25rem] bg-card p-3 text-left shadow-card transition hover:-translate-y-0.5 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60 sm:aspect-[4/3] sm:rounded-[1.75rem] sm:p-5'

// Objeto estable: el efecto no se reconfigura en cada render. Media resolución = fluido en móvil.
const GRADIENT_OPTIONS = { resolutionScale: 0.6 }

/** Texto blanco legible sobre el degradado. */
const ON_BRAND = 'text-brand-foreground [text-shadow:0_1px_2px_rgb(0_0_0/0.25)]'

const PANEL_PILL = `${GLASS_ON_BRAND} shrink-0 rounded-full px-3 py-1.5 text-xs sm:text-sm`

/** Chat web: historial sobre fondo claro y, abajo, el panel azul con el saludo y la caja de texto. */
export function ChatView() {
  const { messages, pending, failed, status, blockedUntil, startNewChat } = useChatStore()
  const hint = useChatStore((s) => s.composerHint)
  const { send, retry } = useSendMessage()
  const endRef = useRef<HTMLDivElement>(null)
  const started = messages.length > 0

  // Lo que ya estaba al montar (sesión guardada, volver a la pestaña) no se vuelve a animar.
  const [seenIds] = useState(() => new Set(messages.map((m) => m.id)))
  const [revealTitle] = useState(() => !titleRevealed)
  useEffect(() => {
    titleRevealed = true
  }, [])

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' })
  }, [messages.length, pending, failed])

  return (
    <div className="mx-auto flex h-full w-full max-w-5xl flex-col gap-3 px-3 pt-3 pb-3 sm:px-6 sm:pt-6 sm:pb-5">
      <div
        className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-1 sm:space-y-7 [&_[data-block=text]]:text-[15px] [&_[data-block=text]]:leading-relaxed [&_[data-block=text]]:text-foreground/80 sm:[&_[data-block=text]]:text-base"
        aria-live="polite"
      >
        {!started && (
          <div className="flex min-h-full flex-col items-center justify-center gap-4 py-2 text-center">
            <img
              src={logiUrl}
              alt="Logi, asistente de TransLogix"
              className="size-14 rounded-[22%] shadow-card sm:size-16"
            />
            <SplitText
              as="h1"
              animate={revealTitle}
              text="¡Hola! Soy Logi, tu asistente de TransLogix, ¿en qué puedo ayudarte?"
              className="max-w-2xl text-xl leading-snug font-medium text-balance sm:text-3xl"
            />
            <ul className="grid w-full max-w-3xl grid-cols-3 gap-2 pt-2 sm:gap-4">
              {HOME_BANNERS.map(({ label, description, Icon, target }) => {
                const content = (
                  <>
                    <span className="grid size-10 place-items-center rounded-full bg-muted text-foreground/70 sm:size-12">
                      <Icon className="size-5 sm:size-6" aria-hidden />
                    </span>
                    <span>
                      <span className="block text-sm leading-tight font-medium sm:text-lg">
                        {label}
                      </span>
                      <span className="hidden text-sm text-muted-foreground sm:block">
                        {description}
                      </span>
                    </span>
                  </>
                )
                return (
                  <li key={label}>
                    {target.kind === 'send' ? (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => void send(target.text)}
                        className={cn(BANNER, 'w-full')}
                      >
                        {content}
                      </button>
                    ) : (
                      <Link to={target.to} className={BANNER}>
                        {content}
                      </Link>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {messages.map((message) =>
          message.role === 'user' ? (
            <div
              key={message.id}
              className="ml-auto w-fit max-w-[85%] rounded-3xl bg-user-bubble px-4 py-2.5 text-[15px] text-user-bubble-foreground sm:px-5 sm:py-3 sm:text-base"
            >
              {message.text && <p className="break-words whitespace-pre-wrap">{message.text}</p>}
              {message.attachments && message.attachments.length > 0 && (
                <p className="text-xs opacity-80">📎 {message.attachments.length} adjunto(s)</p>
              )}
            </div>
          ) : (
            <RevealContext key={message.id} value={!seenIds.has(message.id)}>
              <AssistantRow>
                {message.blocks.map((block, index) => (
                  <BlockRenderer key={index} block={block} />
                ))}
              </AssistantRow>
            </RevealContext>
          ),
        )}

        {pending && (
          <AssistantRow>
            <p className="animate-pulse pt-2 text-sm text-muted-foreground" role="status">
              Logi está escribiendo…
            </p>
          </AssistantRow>
        )}
        {failed && (
          <AssistantRow>
            <div
              className="space-y-2 rounded-2xl border border-destructive/30 bg-card p-3 text-sm shadow-card"
              role="alert"
            >
              <p>{failed.errorMessage ?? API_ERROR_MESSAGES[failed.errorKind]}</p>
              {failed.errorKind !== 'rate_limited' && (
                <button
                  type="button"
                  className={`${GLASS} rounded-full px-3 py-1.5`}
                  onClick={retry}
                >
                  Reintentar
                </button>
              )}
            </div>
          </AssistantRow>
        )}
        <div ref={endRef} />
      </div>

      <section className="relative shrink-0 overflow-hidden rounded-[1.75rem] bg-brand-deep p-2 shadow-card sm:rounded-[2.25rem] sm:p-3">
        <InteractiveGradient options={GRADIENT_OPTIONS} />
        {/* Viñeta: bordes azul profundo y brillo al centro, como el diseño de Logi. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_80%,transparent_10%,var(--brand-deep)_100%)] opacity-90"
        />

        <div className="relative flex flex-col gap-2 px-2 pt-1 pb-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:px-3 sm:pt-2 sm:pb-3">
          {/* Solo la pregunta de una sugerencia (p. ej. el número de guía); si no, solo botones. */}
          {!started && hint && <p className={cn('text-sm sm:text-base', ON_BRAND)}>{hint}</p>}
          {started && status === 'ESCALATED' && (
            <p className={cn('text-sm sm:text-base', ON_BRAND)}>
              Tu caso está con un asesor. Puedes seguir escribiendo aquí.
            </p>
          )}
          <div className="flex shrink-0 gap-2 overflow-x-auto sm:ml-auto">
            <VoiceRepliesToggle />
            <button
              type="button"
              className={PANEL_PILL}
              disabled={pending}
              onClick={() => void send('Quiero hablar con un asesor')}
            >
              Hablar con un asesor
            </button>
            {started && (
              <button type="button" className={PANEL_PILL} onClick={startNewChat}>
                Nuevo chat
              </button>
            )}
          </div>
        </div>

        <Composer disabled={pending || blockedUntil !== null} onSend={send} />
      </section>
    </div>
  )
}

/** Fila de Logi: avatar a la izquierda y sus bloques (texto plano y tarjetas) a la derecha. */
function AssistantRow({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 sm:gap-4">
      <img src={logiUrl} alt="" className="size-9 shrink-0 rounded-[22%] shadow-card sm:size-11" />
      <div className="max-w-full min-w-0 flex-1 space-y-3 sm:max-w-[85%]">{children}</div>
    </div>
  )
}

const ACTION_BUTTON = `${GLASS_TINT} size-11 shrink-0 rounded-xl sm:size-12 sm:rounded-2xl`

function Composer({
  disabled,
  onSend,
}: {
  disabled: boolean
  onSend: ReturnType<typeof useSendMessage>['send']
}) {
  const [text, setText] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const hint = useChatStore((s) => s.composerHint)
  const setHint = useChatStore((s) => s.setComposerHint)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const voiceReplies = useChatStore((s) => s.voiceReplies)

  // Dictado: con "Voz" activa la frase se envía sola (conversación hablada);
  // si no, se agrega a la caja para revisarla antes de enviar.
  const dictation = useSpeechRecognition({
    onFinal: (spoken) => {
      if (voiceReplies && !disabled) return void onSend(spoken)
      setText((current) => (current.trim() ? `${current.trim()} ${spoken}` : spoken))
      inputRef.current?.focus()
    },
  })

  useEffect(() => {
    if (hint) inputRef.current?.focus()
  }, [hint])

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!text.trim() || disabled) return
    void onSend(text)
    setText('')
    setHint(null)
  }

  /** Sube el archivo (`POST /attachments`) y lo envía en el chat junto con lo escrito. */
  async function attach(file: File | undefined) {
    if (fileRef.current) fileRef.current.value = ''
    if (!file) return
    setUploadError(null)
    if (!(ATTACHMENT_LIMITS.mimeTypes as readonly string[]).includes(file.type))
      return setUploadError('Solo se aceptan archivos PDF o JPG.')
    if (file.size > ATTACHMENT_LIMITS.maxBytes) return setUploadError('El archivo supera 10 MB.')
    setUploading(true)
    try {
      const { attachment_id } = await uploadAttachment(file)
      void onSend(text, { attachments: [{ attachment_id }] })
      setText('')
    } catch (error) {
      setUploadError(apiErrorMessage(toApiError(error)))
    } finally {
      setUploading(false)
    }
  }

  return (
    <form
      onSubmit={submit}
      className="relative mt-1 rounded-[1.25rem] bg-card p-3 text-card-foreground shadow-card sm:rounded-[1.75rem] sm:p-4"
    >
      <label htmlFor="composer" className="sr-only">
        Mensaje para Logi
      </label>
      <textarea
        id="composer"
        ref={inputRef}
        rows={2}
        value={text}
        maxLength={MAX_MESSAGE_LENGTH}
        placeholder={
          dictation.listening
            ? dictation.interim || 'Te escucho…'
            : (hint ?? '¿Qué paquete movemos hoy? Dime en qué puedo ayudarte')
        }
        className="block max-h-40 min-h-12 w-full resize-none bg-transparent text-base outline-none placeholder:text-muted-foreground sm:text-lg"
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) submit(event)
        }}
      />
      {dictation.error && (
        <p className="text-sm text-destructive" role="alert">
          {dictation.error}
        </p>
      )}
      {uploadError && (
        <p className="text-sm text-destructive" role="alert">
          {uploadError}
        </p>
      )}
      <div className="mt-2 flex items-center justify-end gap-2 sm:gap-3">
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf,image/jpeg"
          className="hidden"
          onChange={(event) => void attach(event.target.files?.[0])}
        />
        {dictation.supported && (
          <button
            type="button"
            aria-label={dictation.listening ? 'Dejar de escuchar' : 'Hablar'}
            aria-pressed={dictation.listening}
            disabled={disabled}
            className={cn(ACTION_BUTTON, dictation.listening && 'animate-pulse')}
            onClick={() => {
              stopSpeaking()
              if (dictation.listening) dictation.stop()
              else dictation.start()
            }}
          >
            {dictation.listening ? <Square size={18} /> : <Mic size={22} />}
          </button>
        )}
        <button
          type="button"
          aria-label="Adjuntar archivo (PDF o JPG)"
          disabled={disabled || uploading}
          className={ACTION_BUTTON}
          onClick={() => fileRef.current?.click()}
        >
          <Attachment01
            size={22}
            animateOnHover
            className={uploading ? 'animate-pulse' : undefined}
          />
        </button>
        <button
          type="submit"
          aria-label="Enviar"
          disabled={disabled || !text.trim()}
          className={ACTION_BUTTON}
        >
          <SendHorizontal size={22} animateOnHover />
        </button>
      </div>
    </form>
  )
}

/** Activa o desactiva que Logi lea sus respuestas en voz alta. */
function VoiceRepliesToggle() {
  const voiceReplies = useChatStore((s) => s.voiceReplies)
  const setVoiceReplies = useChatStore((s) => s.setVoiceReplies)
  if (!isSpeechSynthesisSupported()) return null

  return (
    <button
      type="button"
      aria-pressed={voiceReplies}
      className={PANEL_PILL}
      onClick={() => {
        if (voiceReplies) stopSpeaking()
        setVoiceReplies(!voiceReplies)
      }}
    >
      {voiceReplies ? <Volume2 size={16} /> : <VolumeX size={16} />}
      {voiceReplies ? 'Voz activada' : 'Voz'}
    </button>
  )
}
