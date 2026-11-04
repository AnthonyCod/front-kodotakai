import { useState, type ComponentType } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Calculator, Search, Truck } from 'lucide-react'
import { cn } from 'cn'
import mapaUrl from '@/assets/mapa-cobertura.webp'
import { PqrsForm } from '@/features/pqrs'
import { QuoteForm } from '@/features/quote'
import { TrackingLookup } from '@/features/tracking'
import { BotMessageSquare } from '@/shared/components/animate-ui/icons/hugeicons/bot-message-square'
import { ClipboardCheck } from '@/shared/components/animate-ui/icons/hugeicons/clipboard-check'
import { formatDateTime } from '@/shared/lib/format'
import { GLASS, GLASS_ON_BRAND, GLASS_TINT } from '@/shared/ui/glass'
import { InteractiveGradient } from '@/shared/ui/interactive-gradient'
import { useQueryHistoryStore, type QueryEntry, type QueryKind } from '../model/query-history-store'

interface Tool {
  kind: QueryKind
  title: string
  description: string
  Icon: ComponentType<{ size?: number; className?: string; 'aria-hidden'?: boolean }>
}

const TOOL_PARAMS: Record<string, QueryKind> = {
  rastrear: 'TRACKING',
  cotizar: 'QUOTE',
  pqrs: 'PQRS',
}

const TOOLS: Tool[] = [
  {
    kind: 'TRACKING',
    title: 'Rastrear',
    description: 'Dónde va tu envío, estado por estado',
    Icon: Truck,
  },
  {
    kind: 'QUOTE',
    title: 'Cotizar',
    description: 'Cuánto cuesta y cuánto tarda',
    Icon: Calculator,
  },
  {
    kind: 'PQRS',
    title: 'PQRS',
    description: 'Peticiones, quejas, reclamos y daños',
    Icon: ClipboardCheck,
  },
]

const KIND_LABELS: Record<QueryKind, string> = {
  TRACKING: 'Rastreo',
  QUOTE: 'Cotización',
  PQRS: 'PQRS',
}

/** Consultas directas (sin chat) con aspecto de tablero: banner, accesos, herramienta e historial. */
export function QueriesDashboard() {
  // `?herramienta=pqrs` (o `cotizar`) abre esa pestaña, p. ej. desde "Tus derechos" en /info.
  const [params] = useSearchParams()
  const [active, setActive] = useState<QueryKind>(
    () => TOOL_PARAMS[params.get('herramienta') ?? ''] ?? 'TRACKING',
  )
  const { entries, add } = useQueryHistoryStore()
  const tool = TOOLS.find((t) => t.kind === active) ?? TOOLS[0]!

  return (
    <div className="w-full space-y-5 px-3 py-3 sm:space-y-7 sm:px-6 sm:py-6 lg:px-8">
      <Banner />

      {/* Mapa de fondo con las 3 herramientas encima en vidrio. */}
      <section className="relative flex min-h-[8.5rem] items-end overflow-hidden rounded-[1.5rem] p-2 shadow-card sm:min-h-[13rem] sm:rounded-[2.25rem] sm:p-5">
        <img
          src={mapaUrl}
          alt="Mapa de Colombia y la región donde opera TransLogix"
          className="absolute inset-0 size-full object-cover"
        />
        <div className="relative grid w-full grid-cols-3 gap-2 sm:gap-4" role="tablist">
          {TOOLS.map((t) => {
            const selected = t.kind === active
            return (
              <button
                key={t.kind}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setActive(t.kind)}
                className={cn(
                  selected ? GLASS_TINT : GLASS,
                  'justify-center rounded-2xl text-center sm:justify-start sm:text-left',
                )}
              >
                <div className="flex w-full flex-col items-center gap-1.5 px-1 py-2.5 sm:flex-row sm:gap-3 sm:px-4 sm:py-3.5">
                  <span
                    className={cn(
                      'grid size-9 shrink-0 place-items-center rounded-xl sm:size-10',
                      selected ? 'bg-white/15' : 'bg-white/60 text-foreground/70',
                    )}
                  >
                    <t.Icon size={20} aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium sm:text-lg">{t.title}</span>
                    <span className="hidden truncate text-xs opacity-70 sm:block">
                      {t.description}
                    </span>
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </section>

      <section role="tabpanel" aria-label={tool.title}>
        <header className="mb-5">
          <p className="text-sm text-muted-foreground">{tool.description}</p>
          <h2 className="text-xl font-semibold sm:text-2xl">{tool.title}</h2>
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
      </section>

      <History entries={entries} />
    </div>
  )
}

// Objeto estable (igual que en el chat): media resolución = fluido en móvil.
const GRADIENT_OPTIONS = { resolutionScale: 0.6 }

function Banner() {
  return (
    <section className="relative flex items-center gap-3 overflow-hidden rounded-[1.5rem] bg-brand-deep p-3 pl-4 text-brand-foreground shadow-card sm:gap-4 sm:rounded-[2.25rem] sm:p-5">
      {/* Mismo fondo que el panel de la caja de texto del chat: degradado interactivo y viñeta. */}
      <InteractiveGradient options={GRADIENT_OPTIONS} />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_80%,transparent_10%,var(--brand-deep)_100%)] opacity-90"
      />
      <span
        className={`${GLASS_ON_BRAND} relative hidden size-14 shrink-0 rounded-full sm:inline-flex`}
      >
        <BotMessageSquare size={24} aria-hidden />
      </span>
      <div className="relative min-w-0 flex-1">
        <p className="text-[15px] leading-snug font-medium [text-shadow:0_1px_2px_rgb(0_0_0/0.25)] sm:text-lg">
          Consulta tu envío sin esperar
        </p>
        <p className="hidden text-sm opacity-90 [text-shadow:0_1px_2px_rgb(0_0_0/0.25)] sm:block">
          Rastrea una guía, cotiza o radica una PQRS. Si prefieres conversar, Logi te ayuda.
        </p>
      </div>
      <Link
        to="/"
        className={`${GLASS_ON_BRAND} relative w-fit shrink-0 rounded-full px-3.5 py-2 text-sm font-medium sm:px-4 sm:py-2.5`}
      >
        Hablar con Logi
      </Link>
    </section>
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
    <section className="border-t pt-5 sm:pt-7">
      <header className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold">Consultas recientes</h2>
        <div className="flex gap-2">
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-muted px-3 py-2 sm:w-64 sm:flex-none">
            <Search size={16} aria-hidden className="text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por código, guía o resultado"
              aria-label="Buscar en consultas recientes"
              className="min-w-0 flex-1 bg-transparent text-base outline-none sm:text-sm"
            />
          </label>
          {entries.length > 0 && (
            <button
              type="button"
              onClick={clear}
              className={`${GLASS} shrink-0 rounded-xl px-3 text-sm text-muted-foreground`}
            >
              Limpiar
            </button>
          )}
        </div>
      </header>

      {rows.length === 0 ? (
        <p className="p-6 text-center text-sm text-muted-foreground">
          {entries.length === 0
            ? 'Aún no has hecho consultas en esta sesión.'
            : 'Ninguna consulta coincide con la búsqueda.'}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b">
                <th className="py-3 pr-4 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Referencia</th>
                <th className="px-4 py-3 font-medium">Resultado</th>
                <th className="py-3 pr-4 font-medium">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((entry) => (
                <tr key={entry.id} className="border-b last:border-0">
                  <td className="py-3 pr-4">{KIND_LABELS[entry.kind]}</td>
                  <td className="px-4 py-3 font-medium">{entry.reference}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-medium',
                        entry.alert ? 'bg-warning/15 text-warning' : 'bg-success/10 text-success',
                      )}
                    >
                      {entry.summary}
                    </span>
                  </td>
                  <td className="py-3 whitespace-nowrap text-muted-foreground">
                    {formatDateTime(entry.at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
