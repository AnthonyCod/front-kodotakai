import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Square } from 'lucide-react'
import { AnimateIcon } from '@animate-ui/react/icons'
import { cn } from 'cn'
import logiUrl from '@/assets/logi.webp'
import { ATTACHMENT_LIMITS, uploadAttachment } from '@/features/pqrs'
import { API_ERROR_MESSAGES, apiErrorMessage, toApiError } from '@/shared/api'
import { BlockRenderer } from '@/shared/blocks'
import { useSpeechRecognition } from '@/shared/hooks/use-speech-recognition'
import { isSpeechSynthesisSupported, stopSpeaking } from '@/shared/lib/speech-synthesis'
import { Attachment01 } from '@/shared/components/animate-ui/icons/hugeicons/attachment-01'
import { Mic } from '@/shared/components/animate-ui/icons/hugeicons/mic'
import { Refresh } from '@/shared/components/animate-ui/icons/hugeicons/refresh'
import { SendHorizontal } from '@/shared/components/animate-ui/icons/hugeicons/send-horizontal'
import { VolumeHigh } from '@/shared/components/animate-ui/icons/hugeicons/volume-high'
import { VolumeOff } from '@/shared/components/animate-ui/icons/hugeicons/volume-off'
import { GLASS, GLASS_TINT } from '@/shared/ui/glass'
import { SECONDARY_PILL, SURFACE } from '@/shared/ui/page'
import { Reveal } from '@/shared/ui/reveal'
import { RevealContext, SplitText } from '@/shared/ui/split-text'
import { useChatStore } from '../model/chat-store'
import { MAX_MESSAGE_LENGTH, useSendMessage } from '../model/use-send-message'
import { HomeFeatures } from './home-features'

/** El título de bienvenida se revela una sola vez por carga de la página. */
let titleRevealed = false

/** Opciones de la barra de la caja (voz, nuevo chat). */
const TOOL_CHIP = cn(
  SECONDARY_PILL,
  'shrink-0 px-3 py-1 text-xs text-muted-foreground hover:text-foreground aria-pressed:bg-brand/10 aria-pressed:text-brand-deep',
)

/** Chat web: historial sobre fondo claro y, abajo, la caja de texto (blanca, sin borde, con sombra suave). */
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
    // Una columna a escala de la pantalla. En escritorio, antes de empezar, saludo + accesos + caja
    // quedan juntos al centro; al empezar, la caja baja y la conversación ocupa el resto.
    <div
      className={cn(
        'mx-auto flex h-full w-full max-w-3xl flex-col gap-3 px-4 pt-3 pb-3 sm:px-6 sm:pt-5 sm:pb-5',
        !started && 'md:justify-center md:gap-6',
      )}
    >
      <div
        className={cn(
          'min-h-0 flex-1 space-y-5 overflow-y-auto pr-1 sm:space-y-6 [&_[data-block=text]]:text-[15px] [&_[data-block=text]]:leading-relaxed [&_[data-block=text]]:text-foreground/80',
          !started && 'md:flex-initial',
        )}
        aria-live="polite"
      >
        {!started && (
          <div className="flex min-h-full flex-col items-center justify-center gap-3 py-2 text-center">
            <img
              src={logiUrl}
              alt="Logi, asistente de TransLogix"
              className="size-14 drop-shadow-[0_8px_16px_rgb(30_58_138/0.25)] sm:size-16"
            />
            <SplitText
              as="h1"
              animate={revealTitle}
              text="¡Hola! Soy Logi, tu asistente de TransLogix, ¿en qué puedo ayudarte?"
              className="max-w-md text-xl leading-snug font-semibold tracking-tight text-balance sm:text-2xl"
            />
            <Reveal order={2}>
              <p className="max-w-sm text-sm text-muted-foreground">
                Rastrea, cotiza y resuelve tus envíos en un solo chat.
              </p>
            </Reveal>
            <div className="w-full pt-4">
              <HomeFeatures />
            </div>
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
              className="space-y-2 rounded-2xl border border-destructive/30 bg-card p-3 text-sm"
              role="alert"
            >
              <p>{failed.errorMessage ?? API_ERROR_MESSAGES[failed.errorKind]}</p>
              {failed.errorKind !== 'rate_limited' && (
                <button type="button" className={SECONDARY_PILL} onClick={retry}>
                  Reintentar
                </button>
              )}
            </div>
          </AssistantRow>
        )}
        {/* Sin conversación no hay a dónde bajar (y su margen desbordaría el inicio). */}
        {started && <div ref={endRef} />}
      </div>

      <section
        className={cn(
          SURFACE,
          'shrink-0 shadow-[0_1px_2px_rgb(15_23_42/0.04),0_8px_24px_rgb(15_23_42/0.06)]',
        )}
      >
        {/* Solo la pregunta de una sugerencia (p. ej. el número de guía) o el aviso de asesor. */}
        {!started && hint && <p className="px-4 pt-3 text-sm text-muted-foreground">{hint}</p>}
        {started && status === 'ESCALATED' && (
          <p className="px-4 pt-3 text-sm text-brand-deep">
            Tu caso está con un asesor. Puedes seguir escribiendo aquí.
          </p>
        )}
        <Composer
          disabled={pending || blockedUntil !== null}
          onSend={send}
          tools={
            <>
              <VoiceRepliesToggle />
              {started && (
                <AnimateIcon animateOnHover asChild>
                  <button type="button" className={TOOL_CHIP} onClick={startNewChat}>
                    <Refresh size={14} aria-hidden />
                    Nuevo chat
                  </button>
                </AnimateIcon>
              )}
            </>
          }
        />
      </section>
    </div>
  )
}

/** Fila de Logi: avatar a la izquierda y sus bloques (texto plano y tarjetas) a la derecha. */
function AssistantRow({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 sm:gap-4">
      <img src={logiUrl} alt="" className="size-8 shrink-0 sm:size-10" />
      <div className="max-w-full min-w-0 flex-1 space-y-3 sm:max-w-[85%]">{children}</div>
    </div>
  )
}

// Botones redondos de vidrio; el icono se anima al pasar el cursor por todo el botón.
const ICON_BUTTON = cn(
  GLASS,
  'size-9 shrink-0 rounded-full text-muted-foreground hover:text-foreground aria-pressed:bg-brand/10 aria-pressed:text-brand-deep',
)
const SEND_BUTTON = cn(GLASS_TINT, 'size-9 shrink-0 rounded-full disabled:opacity-35')

function Composer({
  disabled,
  onSend,
  tools,
}: {
  disabled: boolean
  onSend: ReturnType<typeof useSendMessage>['send']
  /** Opciones a la izquierda de la barra (voz, nuevo chat). */
  tools?: ReactNode
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
    <form onSubmit={submit} className="p-2.5 pl-4 sm:p-3 sm:pl-4">
      <label htmlFor="composer" className="sr-only">
        Mensaje para Logi
      </label>
      <textarea
        id="composer"
        ref={inputRef}
        rows={1}
        value={text}
        maxLength={MAX_MESSAGE_LENGTH}
        placeholder={
          dictation.listening
            ? dictation.interim || 'Te escucho…'
            : (hint ?? '¿Qué paquete movemos hoy? Dime en qué puedo ayudarte')
        }
        className="block [field-sizing:content] max-h-40 min-h-9 w-full resize-none bg-transparent pt-1 text-base outline-none placeholder:text-muted-foreground sm:min-h-11 sm:text-[15px]"
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
      <div className="mt-1 flex items-center gap-1.5">
        <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto">{tools}</div>
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf,image/jpeg"
          className="hidden"
          onChange={(event) => void attach(event.target.files?.[0])}
        />
        {dictation.supported && (
          <AnimateIcon animateOnHover asChild>
            <button
              type="button"
              aria-label={dictation.listening ? 'Dejar de escuchar' : 'Hablar'}
              aria-pressed={dictation.listening}
              disabled={disabled}
              className={cn(ICON_BUTTON, dictation.listening && 'animate-pulse')}
              onClick={() => {
                stopSpeaking()
                if (dictation.listening) dictation.stop()
                else dictation.start()
              }}
            >
              {dictation.listening ? (
                <Square size={15} aria-hidden />
              ) : (
                <Mic size={18} aria-hidden />
              )}
            </button>
          </AnimateIcon>
        )}
        <AnimateIcon animateOnHover asChild>
          <button
            type="button"
            aria-label="Adjuntar archivo (PDF o JPG)"
            disabled={disabled || uploading}
            className={ICON_BUTTON}
            onClick={() => fileRef.current?.click()}
          >
            <Attachment01
              size={18}
              aria-hidden
              className={uploading ? 'animate-pulse' : undefined}
            />
          </button>
        </AnimateIcon>
        <AnimateIcon animateOnHover asChild>
          <button
            type="submit"
            aria-label="Enviar"
            disabled={disabled || !text.trim()}
            className={SEND_BUTTON}
          >
            <SendHorizontal size={17} aria-hidden />
          </button>
        </AnimateIcon>
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
    <AnimateIcon animateOnHover asChild>
      <button
        type="button"
        aria-pressed={voiceReplies}
        className={TOOL_CHIP}
        onClick={() => {
          if (voiceReplies) stopSpeaking()
          setVoiceReplies(!voiceReplies)
        }}
      >
        {voiceReplies ? <VolumeHigh size={14} aria-hidden /> : <VolumeOff size={14} aria-hidden />}
        {voiceReplies ? 'Voz activada' : 'Voz'}
      </button>
    </AnimateIcon>
  )
}
