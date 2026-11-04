import { useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Check, Copy, Search, Sparkles, X } from 'lucide-react'
import { GUIA_PATTERN } from '@/features/tracking'
import { ErrorText } from '@/shared/ui/error-text'
import { searchKnowledge, type RagResult } from '../api/crm-api'
import { useTmsTracking } from '../model/use-tms-tracking'
import { TmsTimeline } from './tms-tracking'
import { ActionButton, Badge, Card } from './ui'

const ICON = { strokeWidth: 1.75, 'aria-hidden': true } as const

/** Consulta rápida durante una llamada: guía en el TMS y fragmentos de la base RAG. */
export function QuickTools({ initialGuia = '' }: { initialGuia?: string }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
      <TmsLookup initialGuia={initialGuia} />
      <KnowledgeLookup />
    </div>
  )
}

function SearchField({
  id,
  label,
  value,
  onChange,
  onSubmit,
  placeholder,
  strong,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  placeholder: string
  strong?: boolean
}) {
  const submit = (e: FormEvent) => {
    e.preventDefault()
    onSubmit()
  }
  return (
    <form onSubmit={submit} role="search">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div
        className={
          strong
            ? 'flex h-12 items-center gap-2 rounded-xl border-2 border-primary bg-card px-3'
            : 'flex h-10 items-center gap-2 rounded-lg border bg-card px-3 focus-within:border-primary'
        }
      >
        <Search className="size-4 shrink-0 text-muted-foreground" {...ICON} />
        <input
          id={id}
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent text-base outline-none sm:text-sm [&::-webkit-search-cancel-button]:hidden"
        />
        {value && (
          <button
            type="button"
            aria-label="Borrar"
            onClick={() => onChange('')}
            className="text-muted-foreground"
          >
            <X className="size-4" {...ICON} />
          </button>
        )}
      </div>
    </form>
  )
}

function TmsLookup({ initialGuia }: { initialGuia: string }) {
  const [value, setValue] = useState(initialGuia)
  const [guia, setGuia] = useState(GUIA_PATTERN.test(initialGuia) ? initialGuia : '')
  const query = useTmsTracking(guia || null)
  const invalid = value.trim() !== '' && !GUIA_PATTERN.test(value.trim().toUpperCase())

  return (
    <section className="space-y-3" aria-label="Tracking TMS">
      <SearchField
        id="tms-guia"
        label="Número de guía"
        value={value}
        onChange={setValue}
        onSubmit={() => !invalid && setGuia(value.trim().toUpperCase())}
        placeholder="Guía TLX-000000-CO"
        strong
      />
      {invalid && <p className="text-xs text-muted-foreground">Formato: TLX-123456-CO</p>}
      {guia && (
        <Card>
          {query.isPending && <div className="h-24 animate-pulse rounded-lg bg-muted" />}
          <ErrorText error={query.error} />
          {query.data && <TmsTimeline data={query.data} />}
        </Card>
      )}
    </section>
  )
}

function KnowledgeLookup() {
  const [value, setValue] = useState('')
  const [q, setQ] = useState('')
  const query = useQuery({
    queryKey: ['asesor', 'rag', q],
    queryFn: () => searchKnowledge(q),
    enabled: q.length >= 3,
  })

  return (
    <Card className="space-y-3">
      <h2 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-primary uppercase">
        <Sparkles className="size-4" {...ICON} /> Base de conocimiento (RAG)
      </h2>
      <SearchField
        id="rag-q"
        label="Buscar en la base de conocimiento"
        value={value}
        onChange={setValue}
        onSubmit={() => setQ(value.trim())}
        placeholder="Ej.: requisitos transporte baterías de litio"
      />
      <ErrorText error={query.error} />
      {query.isFetching && <div className="h-32 animate-pulse rounded-lg bg-muted" />}
      {query.data?.resultados.length === 0 && (
        <p className="text-sm text-muted-foreground">Sin resultados para «{q}».</p>
      )}
      {query.data?.resultados.map((r) => (
        <RagFragment key={r.titulo + r.fuente} result={r} />
      ))}
    </Card>
  )
}

function RagFragment({ result }: { result: RagResult }) {
  const [copied, setCopied] = useState(false)
  const source = `${result.fuente}${result.pagina ? ` · pág. ${result.pagina}` : ''}`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`«${result.fragmento}» (${source})`)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      // Sin permiso de portapapeles: el texto sigue seleccionable.
    }
  }

  return (
    <article className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold">{result.titulo}</h3>
        {result.relevancia >= 0.8 && <Badge tone="success">Muy relevante</Badge>}
      </div>
      <blockquote className="space-y-2 rounded-lg bg-muted/70 p-3">
        <p className="text-sm">«{result.fragmento}»</p>
        <footer className="text-xs text-muted-foreground">{source}</footer>
      </blockquote>
      <ActionButton className="w-full" onClick={() => void copy()}>
        {copied ? <Check className="text-success" {...ICON} /> : <Copy {...ICON} />}
        {copied ? 'Copiado' : 'Copiar fragmento'}
      </ActionButton>
    </article>
  )
}
