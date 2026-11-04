// Web Speech API (texto → voz). Disponible en todos los navegadores modernos; la calidad depende
// de las voces instaladas en el equipo.

export const isSpeechSynthesisSupported = () =>
  typeof window !== 'undefined' && 'speechSynthesis' in window

function pickVoice(lang: string): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices()
  const base = lang.split('-')[0] ?? lang
  return (
    voices.find((voice) => voice.lang === lang) ??
    voices.find((voice) => voice.lang.startsWith(`${base}-`)) ??
    voices.find((voice) => voice.lang.startsWith(base))
  )
}

/** Lee el texto en voz alta. Corta lo que se estuviera leyendo antes. */
export function speak(
  text: string,
  { lang = 'es-CO', onEnd }: { lang?: string; onEnd?: () => void } = {},
) {
  if (!isSpeechSynthesisSupported() || !text.trim()) return onEnd?.()
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = lang
  const voice = pickVoice(lang)
  if (voice) utterance.voice = voice
  utterance.onend = () => onEnd?.()
  utterance.onerror = () => onEnd?.()
  window.speechSynthesis.speak(utterance)
}

export function stopSpeaking() {
  if (isSpeechSynthesisSupported()) window.speechSynthesis.cancel()
}
