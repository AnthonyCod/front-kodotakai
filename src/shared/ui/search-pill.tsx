import { useRef } from 'react'
import { AnimateIcon } from '@animate-ui/react/icons'
import { cn } from 'cn'
import { Search01 } from '@/shared/components/animate-ui/icons/hugeicons/search-01'
import { GLASS } from './glass'

/**
 * Buscador en píldora gris con el botón redondo blanco a la derecha (filtra mientras se escribe;
 * el botón lleva el foco a la caja).
 */
export function SearchPill({
  value,
  onChange,
  placeholder,
  label,
  className,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  /** Nombre accesible de la caja (p. ej. «Buscar sucursal»). */
  label: string
  className?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <div
      className={cn(
        'flex items-center gap-1 rounded-full bg-muted/80 p-1 pl-4 transition focus-within:bg-card focus-within:shadow-card focus-within:ring-2 focus-within:ring-brand/20',
        className,
      )}
    >
      <input
        ref={inputRef}
        type="search"
        value={value}
        aria-label={label}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground sm:text-sm"
      />
      <AnimateIcon animateOnHover asChild>
        <button
          type="button"
          tabIndex={-1}
          aria-hidden
          onClick={() => inputRef.current?.focus()}
          className={cn(GLASS, 'size-8 shrink-0 rounded-full bg-card text-foreground/70')}
        >
          <Search01 size={15} />
        </button>
      </AnimateIcon>
    </div>
  )
}
