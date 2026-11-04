import { copLabel } from './tones'

/** Solo dígitos, con indicativo: `+57 310 456 7890` → `573104567890`. */
export const phoneDigits = (phone: string) => phone.replace(/\D/g, '')

export const telLink = (phone: string) => `tel:+${phoneDigits(phone)}`

/** Sin API de WhatsApp: se abre WhatsApp del asesor con el mensaje pre-armado (`wa.me`). */
export const whatsappLink = (phone: string, message: string) =>
  `https://wa.me/${phoneDigits(phone)}?text=${encodeURIComponent(message)}`

interface QuoteMessage {
  cliente: string
  asesor: string
  codigo: string
  origen: string
  destino: string
  valor_cop: number
  peso_kg?: number
}

/** Mensaje inicial con los datos de la cotización que el cliente ya hizo con el bot. */
export function quoteMessage(q: QuoteMessage) {
  const firstName = q.cliente.split(' ')[0]
  const advisor = q.asesor.split(' ')[0]
  const weight = q.peso_kg ? ` (${q.peso_kg} kg)` : ''
  return (
    `Hola ${firstName}, soy ${advisor} de TransLogix. Te escribo por tu cotización ${q.codigo} ` +
    `de ${q.origen} a ${q.destino}${weight} por ${copLabel(q.valor_cop)}. ¿Seguimos con el envío?`
  )
}

export function caseMessage(cliente: string, asesor: string, caso: string, guia: string | null) {
  const ref = guia ? `el caso ${caso} de la guía ${guia}` : `el caso ${caso}`
  return `Hola ${cliente.split(' ')[0]}, soy ${asesor.split(' ')[0]} de TransLogix. Te escribo por ${ref}.`
}

export const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
