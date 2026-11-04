import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { ChevronRight, Search, Truck, X } from 'lucide-react'
import { GUIA_PATTERN } from '@/features/tracking'
import { ErrorText } from '@/shared/ui/error-text'
import { searchLeads } from '../api/crm-api'
import { FUNNELS } from '../model/funnels'
import { ADVISOR_PATHS, useOpenLeadInFunnel } from '../model/routes'

const ICON = { strokeWidth: 1.75, 'aria-hidden': true } as const

/** Búsqueda global por guía, teléfono o cliente. */
export function SearchDialog({ onClose }: { onClose: () => void }) {
  const [value, setValue] = useState('')
  const [q, setQ] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const openLead = useOpenLeadInFunnel()

  useEffect(() => input.current?.focus(), [])
  useEffect(() => {
    const id = window.setTimeout(() => setQ(value.trim()), 250)
    return () => window.clearTimeout(id)
  }, [value])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const query = useQuery({
    queryKey: ['asesor', 'buscar', q],
    queryFn: () => searchLeads(q),
    enabled: q.length >= 2,
  })
  const guia = GUIA_PATTERN.test(q.toUpperCase()) ? q.toUpperCase() : null

  const go = (fn: () => void) => {
    fn()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-foreground/40 lg:items-start lg:pt-24">
      <button
        type="button"
        aria-label="Cerrar búsqueda"
        className="absolute inset-0"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Buscar"
        className="relative flex h-full w-full flex-col bg-card lg:h-auto lg:max-h-[70vh] lg:max-w-xl lg:rounded-2xl lg:shadow-xl"
      >
        <div className="flex items-center gap-2 border-b p-3">
          <div className="flex h-11 flex-1 items-center gap-2 rounded-xl border-2 border-primary px-3">
            <Search className="size-4 shrink-0 text-muted-foreground" {...ICON} />
            <label htmlFor="global-search" className="sr-only">
              Buscar guía, teléfono o cliente
            </label>
            <input
              ref={input}
              id="global-search"
              type="search"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Guía, teléfono o cliente"
              className="min-w-0 flex-1 bg-transparent text-base outline-none sm:text-sm"
            />
          </div>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            className="flex size-10 items-center justify-center rounded-full hover:bg-muted"
          >
            <X className="size-5" {...ICON} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {guia && (
            <ResultButton
              onClick={() => go(() => void navigate(`${ADVISOR_PATHS.tools}?guia=${guia}`))}
              title={`Ver guía ${guia} en Tracking TMS`}
              detail="Línea de tiempo del envío"
              icon={<Truck className="size-4 text-primary" {...ICON} />}
            />
          )}
          <ErrorText error={query.error} />
          {query.data?.resultados.map((r) => (
            <ResultButton
              key={r.lead_id}
              onClick={() => go(() => openLead(r.lead_id, r.embudo))}
              title={r.titulo}
              detail={`${r.detalle} · ${FUNNELS[r.embudo].short}`}
            />
          ))}
          {query.data?.resultados.length === 0 && !guia && (
            <p className="p-4 text-sm text-muted-foreground">Sin resultados para «{q}».</p>
          )}
          {q.length < 2 && (
            <p className="p-4 text-sm text-muted-foreground">Escribe al menos 2 caracteres.</p>
          )}
        </div>
      </div>
    </div>
  )
}

function ResultButton({
  title,
  detail,
  icon,
  onClick,
}: {
  title: string
  detail: string
  icon?: ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg p-3 text-left hover:bg-muted"
    >
      {icon}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{title}</span>
        <span className="block truncate text-xs text-muted-foreground tabular-nums">{detail}</span>
      </span>
      <ChevronRight className="size-4 text-muted-foreground" {...ICON} />
    </button>
  )
}
