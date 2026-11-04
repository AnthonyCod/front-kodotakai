import { useEffect, useState } from 'react'
import { cn } from 'cn'
import { Clock01 } from '@/shared/components/animate-ui/icons/hugeicons/clock-01'
import { GLASS } from '@/shared/ui/glass'

const TIME_FORMAT = new Intl.DateTimeFormat('es-CO', {
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit',
})

/** Hora local del usuario, actualizada cada segundo, en una pastilla de vidrio. */
export function LiveClock({ className }: { className?: string }) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  return (
    <span
      className={cn(
        GLASS,
        'gap-2 rounded-full px-4 py-2 text-xs font-medium tabular-nums sm:text-sm',
        className,
      )}
    >
      <time dateTime={now.toISOString()}>{TIME_FORMAT.format(now)}</time>
      <Clock01 size={18} aria-hidden animateOnHover className="text-foreground/70" />
    </span>
  )
}
