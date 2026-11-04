import { useCallback, useEffect, useRef, useState } from 'react'

// Web Speech API (voz → texto). No está en lib.dom de TypeScript: tipos mínimos propios.
// Chrome y Edge la soportan (con prefijo webkit); Safari parcial; Firefox no.

interface RecognitionAlternative {
  transcript: string
}
interface RecognitionResult {
  readonly isFinal: boolean
  readonly [index: number]: RecognitionAlternative
}
interface RecognitionEvent {
  readonly resultIndex: number
  readonly results: { readonly length: number; readonly [index: number]: RecognitionResult }
}
interface Recognition {
  lang: string
  interimResults: boolean
  continuous: boolean
  maxAlternatives: number
  onresult: ((event: RecognitionEvent) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}
type RecognitionConstructor = new () => Recognition

function getRecognitionConstructor(): RecognitionConstructor | undefined {
  if (typeof window === 'undefined') return undefined
  const w = window as unknown as {
    SpeechRecognition?: RecognitionConstructor
    webkitSpeechRecognition?: RecognitionConstructor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

export const isSpeechRecognitionSupported = () => getRecognitionConstructor() !== undefined

const ERROR_MESSAGES: Record<string, string> = {
  'not-allowed': 'Permite el uso del micrófono para hablar.',
  'service-not-allowed': 'Permite el uso del micrófono para hablar.',
  'no-speech': 'No te escuché. Intenta de nuevo.',
  'audio-capture': 'No se encontró un micrófono.',
  network: 'El reconocimiento de voz necesita conexión a internet.',
}

interface Options {
  lang?: string
  /** Se llama con la frase completa cuando el usuario termina de hablar. */
  onFinal: (text: string) => void
}

/** Dicta una frase: `start()` escucha hasta que el usuario hace una pausa. */
export function useSpeechRecognition({ lang = 'es-CO', onFinal }: Options) {
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<Recognition | null>(null)
  const onFinalRef = useRef(onFinal)
  useEffect(() => {
    onFinalRef.current = onFinal
  }, [onFinal])

  useEffect(() => () => recognitionRef.current?.abort(), [])

  const start = useCallback(() => {
    const Constructor = getRecognitionConstructor()
    if (!Constructor || recognitionRef.current) return
    const recognition = new Constructor()
    recognition.lang = lang
    recognition.interimResults = true
    recognition.continuous = false
    recognition.maxAlternatives = 1

    let finalText = ''
    recognition.onresult = (event) => {
      let partial = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const transcript = result?.[0]?.transcript ?? ''
        if (result?.isFinal) finalText += transcript
        else partial += transcript
      }
      setInterim(partial)
    }
    recognition.onerror = (event) => {
      if (event.error !== 'aborted')
        setError(ERROR_MESSAGES[event.error] ?? 'No se pudo usar el micrófono.')
    }
    recognition.onend = () => {
      recognitionRef.current = null
      setListening(false)
      setInterim('')
      const text = finalText.trim()
      if (text) onFinalRef.current(text)
    }

    setError(null)
    recognitionRef.current = recognition
    setListening(true)
    try {
      recognition.start()
    } catch {
      recognitionRef.current = null
      setListening(false)
    }
  }, [lang])

  const stop = useCallback(() => recognitionRef.current?.stop(), [])

  return { supported: isSpeechRecognitionSupported(), listening, interim, error, start, stop }
}
