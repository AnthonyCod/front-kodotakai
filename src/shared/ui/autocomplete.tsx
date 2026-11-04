import { useId, useState, type KeyboardEvent } from 'react'
import { MapPin } from 'lucide-react'
import { cn } from 'cn'
import { matchOptions, normalizeText, resolveOption } from '@/shared/lib/text-match'
import { FIELD } from '@/shared/ui/form-styles'

/**
 * Campo con sugerencias mientras se escribe (combobox accesible). Al salir del campo, si lo escrito
 * corresponde sin duda a una opción ("bogota"), se completa con su forma correcta ("Bogotá D.C.").
 */
export function Autocomplete({
  name,
  value,
  options,
  placeholder,
  invalid,
  onChange,
}: {
  name: string
  value: string
  options: readonly string[]
  placeholder?: string
  invalid?: boolean
  onChange: (value: string) => void
}) {
  const listId = useId()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const matches = matchOptions(options, value)
  // Ya elegida exactamente: no hace falta seguir sugiriendo.
  const chosen = matches.length === 1 && normalizeText(matches[0] ?? '') === normalizeText(value)
  const showList = open && matches.length > 0 && !chosen

  function choose(option: string) {
    onChange(option)
    setOpen(false)
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      setOpen(true)
      const step = event.key === 'ArrowDown' ? 1 : -1
      setActive((current) => (current + step + matches.length) % Math.max(matches.length, 1))
    } else if (event.key === 'Enter' && showList) {
      event.preventDefault()
      const option = matches[active]
      if (option) choose(option)
    } else if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="relative">
      <input
        name={name}
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={listId}
        aria-activedescendant={showList ? `${listId}-${active}` : undefined}
        aria-invalid={invalid}
        className={FIELD}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setOpen(false)
          const resolved = resolveOption(options, value)
          if (resolved && resolved !== value) onChange(resolved)
        }}
        onChange={(event) => {
          onChange(event.target.value)
          setActive(0)
          setOpen(true)
        }}
        onKeyDown={onKeyDown}
      />
      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-20 mt-1 max-h-60 overflow-y-auto rounded-xl border bg-card py-1 shadow-card"
        >
          {matches.map((option, index) => (
            <li
              key={option}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === active}
              // Antes del blur del campo, para que el clic alcance a elegir.
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(option)}
              onMouseEnter={() => setActive(index)}
              className={cn(
                'flex cursor-pointer items-center gap-2 px-3 py-2.5 text-sm',
                index === active && 'bg-muted',
              )}
            >
              <MapPin size={15} aria-hidden className="shrink-0 text-muted-foreground" />
              {option}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
