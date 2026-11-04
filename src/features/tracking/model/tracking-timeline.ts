import type { TrackingCardBlock } from '../api/tracking-card-block'

export type StepStatus = 'done' | 'active' | 'alert' | 'pending'

export interface TimelineStep {
  key: string
  label: string
  detail: string | null
  timestamp: string | null
  status: StepStatus
}

export interface TrackingTimeline {
  steps: TimelineStep[]
  /** Estado general para la etiqueta de la tarjeta. */
  tone: 'progress' | 'alert' | 'delivered'
  completed: number
  inProgress: number
  remaining: number
  /** 0-100 */
  percent: number
}

/** Códigos que cierran el envío (por confirmar: el backend no publica la lista de estados). */
const FINAL_CODES = new Set(['ENTREGADO', 'ENTREGADA', 'DEVUELTO'])
/** Códigos que indican un problema (por confirmar). */
const ALERT_CODES = /RETENIDO|NOVEDAD|DEVUELTO|DANO|SINIESTRO|INCIDENCIA/

/**
 * Convierte los eventos de la guía en pasos de una línea de tiempo: los eventos pasados quedan
 * hechos, el último es el estado actual y, si no se ha entregado, se agrega "Entregado" pendiente.
 */
export function buildTimeline(block: Omit<TrackingCardBlock, 'type'>): TrackingTimeline {
  const code = block.estado.codigo
  const delivered = FINAL_CODES.has(code) && !ALERT_CODES.test(code)
  const alert = ALERT_CODES.test(code)

  const events = [...block.eventos].sort((a, b) => a.timestamp.localeCompare(b.timestamp))
  const steps: TimelineStep[] = events.map((evento, index) => {
    const isLast = index === events.length - 1
    return {
      key: `${evento.timestamp}-${evento.estado}`,
      label: evento.etiqueta,
      detail: [evento.descripcion_cliente, evento.ubicacion].filter(Boolean).join(' · ') || null,
      timestamp: evento.timestamp,
      status: !isLast || delivered ? 'done' : alert ? 'alert' : 'active',
    }
  })

  // Sin eventos: al menos el estado actual.
  if (steps.length === 0)
    steps.push({
      key: code,
      label: block.estado.etiqueta,
      detail: block.estado.explicacion,
      timestamp: null,
      status: delivered ? 'done' : alert ? 'alert' : 'active',
    })

  if (!delivered)
    steps.push({
      key: 'ENTREGADO',
      label: 'Entregado',
      detail: 'Tu envío llegará a su destino',
      timestamp: null,
      status: 'pending',
    })

  const completed = steps.filter((s) => s.status === 'done').length
  const inProgress = steps.filter((s) => s.status === 'active' || s.status === 'alert').length
  const remaining = steps.filter((s) => s.status === 'pending').length
  return {
    steps,
    tone: delivered ? 'delivered' : alert ? 'alert' : 'progress',
    completed,
    inProgress,
    remaining,
    percent: Math.round(((completed + inProgress * 0.5) / steps.length) * 100),
  }
}
