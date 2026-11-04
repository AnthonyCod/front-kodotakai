import { useState, type ComponentType, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Calculator, ChevronRight, History as HistoryIcon, Truck } from 'lucide-react'
import { cn } from 'cn'
import logiUrl from '@/assets/logi.webp'
import mapaUrl from '@/assets/mapa-cobertura.webp'
import { PqrsForm } from '@/features/pqrs'
import { QuoteForm } from '@/features/quote'
import { TrackingLookup } from '@/features/tracking'
import { ClipboardCheck } from '@/shared/components/animate-ui/icons/hugeicons/clipboard-check'
import { formatDateTime } from '@/shared/lib/format'
import { Badge, BadgeDot, BadgeSpinner, type BadgeVariant } from '@/shared/ui/badge'
import { CARD_DIVIDER, PAGE_SUBTITLE, PAGE_TITLE, SECONDARY_PILL, SURFACE } from '@/shared/ui/page'
import { Reveal } from '@/shared/ui/reveal'
import { SearchPill } from '@/shared/ui/search-pill'
import { useQueryHistoryStore, type QueryEntry, type QueryKind } from '../model/query-history-store'

interface Tool {
  kind: QueryKind
  title: string
  /** Pregunta que responde la herramienta (título del panel). */
  heading: string
  description: string
  Icon: ComponentType<{ size?: number; className?: string; 'aria-hidden'?: boolean }>
  /** Color de la herramienta (paleta, sin degradados): badge e icono. */
  badge: BadgeVariant
  tint: string
  eyebrow: string
  /** Mini tarjeta de ejemplo (formato de guía, ruta de la plantilla, estado de un caso). */
  preview: ReactNode
}

const MINI_CARD =
  'rounded-xl bg-card px-2.5 py-2 text-[11px] shadow-[0_1px_2px_rgb(15_23_42/0.06),0_6px_18px_rgb(15_23_42/0.10)]'

const TOOL_PARAMS: Record<string, QueryKind> = {
  rastrear: 'TRACKING',
  cotizar: 'QUOTE',
  pqrs: 'PQRS',
}

const TOOLS: Tool[] = [
  {
    kind: 'TRACKING',
    title: 'Rastrear',
    heading: '¿Dónde va tu envío?',
    description: 'Escribe tu número de guía y mira cada estado.',
    Icon: Truck,
    badge: 'brand',
    tint: 'bg-brand/10 text-brand-deep',
    eyebrow: 'Rastreo',
    preview: (
      <span className={cn(MINI_CARD, 'flex items-center justify-between gap-2')}>
        <span className="truncate font-mono font-medium">TLX-123456-CO</span>
        <Badge variant="brand" className="h-[1.125rem] gap-1 px-1.5 text-[10px]">
          <BadgeSpinner className="size-2.5" />
          Estado
        </Badge>
      </span>
    ),
  },
  {
    kind: 'QUOTE',
    title: 'Cotizar',
    heading: '¿Cuánto cuesta enviar?',
    description: 'Precio y tiempo de entrega entre dos ciudades.',
    Icon: Calculator,
    badge: 'primary',
    tint: 'bg-primary/10 text-primary',
    eyebrow: 'Cotización',
    preview: (
      <span className={cn(MINI_CARD, 'flex items-center justify-between gap-2')}>
        <span className="truncate font-medium">Bogotá → Medellín</span>
        <Badge variant="primary" className="h-[1.125rem] px-1.5 text-[10px]">
          COP
        </Badge>
      </span>
    ),
  },
  {
    kind: 'PQRS',
    title: 'PQRS',
    heading: 'Peticiones, quejas y reclamos',
    description: 'Radica tu caso y recibe un número para seguirlo.',
    Icon: ClipboardCheck,
    badge: 'success',
    tint: 'bg-success/10 text-success',
    eyebrow: 'Atención',
    preview: (
      <span className={cn(MINI_CARD, 'flex items-center justify-between gap-2')}>
        <span className="truncate font-medium">Tu caso</span>
        <Badge variant="success" className="h-[1.125rem] gap-1 px-1.5 text-[10px]">
          <BadgeDot className="size-1" />
          Radicado
        </Badge>
      </span>
    ),
  },
]

const TOOL_BY_KIND = Object.fromEntries(TOOLS.map((t) => [t.kind, t])) as Record<QueryKind, Tool>

const KIND_LABELS: Record<QueryKind, string> = {
  TRACKING: 'Rastreo',
  QUOTE: 'Cotización',
  PQRS: 'PQRS',
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`

/**
 * Consultas directas (sin chat). Tarjetas minimalistas: blancas, sin borde, sombra suave, un badge
 * de color por herramienta, divisor punteado y pie con Logi. Todo aparece con el efecto de los textos.
 */
export function QueriesDashboard() {
  // `?herramienta=pqrs` (o `cotizar`) abre esa pestaña, p. ej. desde "Tus derechos" en /info.
  const [params] = useSearchParams()
  const [active, setActive] = useState<QueryKind>(
    () => TOOL_PARAMS[params.get('herramienta') ?? ''] ?? 'TRACKING',
  )
  const { entries, add } = useQueryHistoryStore()
  const tool = TOOL_BY_KIND[active]
  const countOf = (kind: QueryKind) => entries.filter((e) => e.kind === kind).length
  const activeCount = countOf(active)

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 px-4 py-4 sm:space-y-5 sm:px-6 sm:py-8">
      <Reveal as="header">
        <h1 className={PAGE_TITLE}>Consultas</h1>
        <p className={PAGE_SUBTITLE}>Rastrea una guía, cotiza o radica una PQRS.</p>
      </Reveal>

      {/* Mapa en tarjeta con una mini tarjeta encima (como las del inicio). */}
      <Reveal as="section" order={1} className={cn(SURFACE, 'p-2')}>
        <div className="relative h-28 overflow-hidden rounded-xl bg-muted sm:h-36">
          <img
            src={mapaUrl}
            alt="Mapa de Colombia y la región donde opera TransLogix"
            className="absolute inset-0 size-full object-cover"
          />
          <div className="absolute bottom-2.5 left-2.5 flex max-w-[calc(100%-1.25rem)] items-center gap-2.5 rounded-xl bg-card/95 p-2 pr-3 shadow-[0_1px_2px_rgb(15_23_42/0.06),0_8px_24px_rgb(15_23_42/0.14)] backdrop-blur-sm">
            <img src={logiUrl} alt="" className="size-8 shrink-0" />
            <span className="min-w-0">
              <span className="block truncate text-xs font-medium">
                Consulta tu envío sin esperar
              </span>
              <span className="block truncate text-[11px] text-muted-foreground">
                Sin registrarte, aquí mismo
              </span>
            </span>
          </div>
        </div>
      </Reveal>

      <div role="tablist" aria-label="Tipo de consulta" className="grid grid-cols-3 gap-2 sm:gap-3">
        {TOOLS.map((t, index) => {
          const selected = t.kind === active
          const count = countOf(t.kind)
          return (
            <Reveal key={t.kind} order={2 + index} role="presentation">
              <button
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setActive(t.kind)}
                className={cn(
                  'flex h-full w-full flex-col gap-2.5 rounded-2xl bg-muted/70 p-2.5 text-left transition hover:bg-muted sm:p-3.5',
                  selected &&
                    'bg-card shadow-[0_1px_2px_rgb(15_23_42/0.05),0_6px_20px_rgb(15_23_42/0.07)] ring-2 ring-brand/30 hover:bg-card',
                )}
              >
                <span className="flex items-start justify-between gap-1">
                  <span
                    className={cn(
                      'grid size-8 place-items-center rounded-lg sm:size-9 sm:rounded-xl',
                      t.tint,
                    )}
                  >
                    <t.Icon size={17} aria-hidden />
                  </span>
                  {count > 0 && (
                    <Badge aria-label={plural(count, 'consulta', 'consultas')}>{count}</Badge>
                  )}
                </span>
                <span>
                  <span className="hidden text-[11px] font-medium tracking-wider text-muted-foreground uppercase sm:block">
                    {t.eyebrow}
                  </span>
                  <span className="block text-sm font-semibold sm:text-base">{t.title}</span>
                </span>
                <span aria-hidden className="mt-auto hidden sm:block">
                  {t.preview}
                </span>
              </button>
            </Reveal>
          )
        })}
      </div>

      <Reveal
        as="section"
        order={5}
        role="tabpanel"
        aria-label={tool.title}
        className={cn(SURFACE, 'p-4 sm:p-6')}
      >
        <div className="flex items-center justify-between gap-3">
          <Badge variant={tool.badge}>
            <tool.Icon size={14} aria-hidden />
            {tool.title}
          </Badge>
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <HistoryIcon size={14} aria-hidden />
            {activeCount > 0
              ? `${plural(activeCount, 'consulta', 'consultas')} hoy`
              : 'Sin consultas aún'}
          </span>
        </div>
        <header className="mt-4 mb-4 sm:mb-5">
          <h2 className="text-lg font-semibold tracking-tight">{tool.heading}</h2>
          <p className="text-sm text-muted-foreground">{tool.description}</p>
        </header>
        {/* Las 3 quedan montadas: cada una conserva su resultado al cambiar de pestaña. */}
        <div hidden={active !== 'TRACKING'}>
          <TrackingLookup onResult={(r) => add('TRACKING', r)} />
        </div>
        <div hidden={active !== 'QUOTE'}>
          <QuoteForm onResult={(r) => add('QUOTE', r)} />
        </div>
        <div hidden={active !== 'PQRS'}>
          <PqrsForm onResult={(r) => add('PQRS', r)} />
        </div>

        <div className={cn(CARD_DIVIDER, 'mt-5')} />
        <Link
          to="/"
          className="group mt-4 flex items-center gap-3 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <img src={logiUrl} alt="" className="size-8 shrink-0" />
          <span className="min-w-0 flex-1">
            ¿Prefieres conversar? <span className="font-medium text-foreground">Logi te ayuda</span>
          </span>
          <ChevronRight
            size={16}
            aria-hidden
            className="shrink-0 transition group-hover:translate-x-0.5"
          />
        </Link>
      </Reveal>

      <History entries={entries} />
    </div>
  )
}

function History({ entries }: { entries: QueryEntry[] }) {
  const [query, setQuery] = useState('')
  const clear = useQueryHistoryStore((s) => s.clear)
  const q = query.trim().toLowerCase()
  const rows = q
    ? entries.filter((e) =>
        [KIND_LABELS[e.kind], e.reference, e.summary, e.searchKey ?? ''].some((v) =>
          v.toLowerCase().includes(q),
        ),
      )
    : entries

  return (
    <Reveal as="section" order={6} className={cn(SURFACE, 'p-4 sm:p-6')}>
      <header className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold tracking-tight">Consultas recientes</h2>
          {entries.length > 0 && <Badge>{entries.length}</Badge>}
        </div>
        <div className="flex gap-2">
          <SearchPill
            value={query}
            onChange={setQuery}
            label="Buscar en consultas recientes"
            placeholder="Buscar por código, guía o resultado"
            className="min-w-0 flex-1 sm:w-72 sm:flex-none"
          />
          {entries.length > 0 && (
            <button
              type="button"
              onClick={clear}
              className={cn(SECONDARY_PILL, 'shrink-0 text-muted-foreground')}
            >
              Limpiar
            </button>
          )}
        </div>
      </header>

      {rows.length === 0 ? (
        <p className="rounded-2xl bg-muted/50 p-6 text-center text-sm text-muted-foreground">
          {entries.length === 0
            ? 'Aún no has hecho consultas en esta sesión.'
            : 'Ninguna consulta coincide con la búsqueda.'}
        </p>
      ) : (
        <ul className="divide-y divide-dashed">
          {rows.map((entry) => {
            const kindTool = TOOL_BY_KIND[entry.kind]
            return (
              <li key={entry.id} className="flex items-center gap-3 py-3">
                <span
                  className={cn(
                    'grid size-9 shrink-0 place-items-center rounded-xl',
                    kindTool.tint,
                  )}
                >
                  <kindTool.Icon size={16} aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{entry.reference}</p>
                  <p className="text-xs text-muted-foreground">
                    {KIND_LABELS[entry.kind]} · {formatDateTime(entry.at)}
                  </p>
                </div>
                <Badge variant={entry.alert ? 'warning' : 'success'} className="max-w-[40%]">
                  <BadgeDot />
                  <span className="truncate">{entry.summary}</span>
                </Badge>
              </li>
            )
          })}
        </ul>
      )}
    </Reveal>
  )
}
