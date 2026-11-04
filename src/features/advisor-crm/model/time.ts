import { useEffect, useState } from 'react'

/** «Hace 8 min», «Hace 1 h 12 min», «Hace 2 h». */
export function formatAgo(iso: string, now: number) {
  const minutes = Math.max(0, Math.floor((now - Date.parse(iso)) / 60_000))
  if (minutes < 1) return 'Hace un momento'
  if (minutes < 60) return `Hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours >= 24) return `Hace ${Math.floor(hours / 24)} d`
  const rest = minutes % 60
  return rest && hours < 2 ? `Hace ${hours} h ${rest} min` : `Hace ${hours} h`
}

const pad = (n: number) => String(n).padStart(2, '0')

/**
 * Tiempo que queda de SLA. Menos de una hora: `mm:ss`; más: `hh:mm h`.
 * `expired` cuando ya venció.
 */
export function slaRemaining(iso: string, now: number) {
  const seconds = Math.floor((Date.parse(iso) - now) / 1000)
  if (seconds <= 0) return { text: '00:00', expired: true, critical: true }
  const critical = seconds < 15 * 60
  if (seconds < 3600) {
    return {
      text: `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`,
      expired: false,
      critical,
    }
  }
  const minutes = Math.floor(seconds / 60)
  return {
    text: `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)} h`,
    expired: false,
    critical,
  }
}

const timeFormat = new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit' })
const dayFormat = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short' })

/** «10:42 a. m.» */
export const formatTime = (iso: string) => timeFormat.format(new Date(iso))

/** «Hoy 3:30 p. m.» o «5 nov · 9:00 a. m.» */
export function formatDayTime(iso: string, now: number) {
  const date = new Date(iso)
  const sameDay = date.toDateString() === new Date(now).toDateString()
  return `${sameDay ? 'Hoy' : dayFormat.format(date)} ${timeFormat.format(date)}`
}

/** Reloj para cronómetros de SLA y «hace x min». */
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])
  return now
}
