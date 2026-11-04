import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { motion, useReducedMotion } from 'motion/react'
import { Truck } from 'lucide-react'
import { cn } from 'cn'
import { useChatStore } from '@/features/chat'
import { BotMessageSquare } from '@/shared/components/animate-ui/icons/hugeicons/bot-message-square'
import { Route } from '@/shared/components/animate-ui/icons/hugeicons/route'
import { TriangleAlert } from '@/shared/components/animate-ui/icons/hugeicons/triangle-alert'
import { formatCop } from '@/shared/lib/format'
import { BlockHeader, InfoPanel, StatusDot } from '@/shared/ui/block-card'
import { InteractiveGradient } from '@/shared/ui/interactive-gradient'
import { DEMO_CONVERSATION } from '../model/demo-conversation'
import {
  buildRouteInsights,
  type CountItem,
  type RouteInsights,
  type TrackedGuide,
} from '../model/route-insights'

const GRADIENT_OPTIONS = { resolutionScale: 0.6 }

/** Texto blanco legible sobre el degradado (igual que el panel del chat). */
const ON_BRAND = 'text-brand-foreground [text-shadow:0_1px_2px_rgb(0_0_0/0.25)]'

const PANEL_PILL =
  'flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs text-brand-foreground backdrop-blur-md transition sm:text-sm'

/** Tarjeta blanca de las respuestas de Logi, a todo el ancho de su celda. */
const CARD =
  'min-w-0 space-y-5 rounded-[1.75rem] bg-card p-4 text-sm text-card-foreground shadow-[0_1px_2px_rgb(0_0_0/0.04),0_10px_30px_rgb(0_0_0/0.06)] sm:p-6'

const SUBTITLE = 'text-xs font-medium text-muted-foreground'

type Source = 'chat' | 'demo'

const DEMO_INSIGHTS = buildRouteInsights(DEMO_CONVERSATION)

const kg = (value: number) => `${value.toLocaleString('es-CO', { maximumFractionDigits: 1 })} kg`
const percent = (part: number, total: number) => (total ? Math.round((part / total) * 100) : 0)

/**
 * Tablero del administrador: inteligencia de negocio por ruta, armada con los resultados que
 * Logi entregó en el chat (cotizaciones, rastreos y pasos a asesor).
 */
export function RouteInsightsDashboard() {
  const messages = useChatStore((s) => s.messages)
  const chatInsights = useMemo(() => buildRouteInsights(messages), [messages])
  const hasChatData = chatInsights.respuestas > 0
  // Sin resultados del chat se muestra la demostración; el usuario puede cambiar cuando quiera.
  const [picked, setPicked] = useState<Source | null>(null)
  const source: Source = picked ?? (hasChatData ? 'chat' : 'demo')
  const insights = source === 'chat' ? chatInsights : DEMO_INSIGHTS

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 p-3 sm:space-y-5 sm:p-6">
      <Hero insights={insights} source={source} onSourceChange={setPicked} />

      {source === 'chat' && !hasChatData ? (
        <div className="grid min-h-40 place-items-center rounded-[1.75rem] border border-dashed p-6 text-center text-sm text-muted-foreground">
          <span className="space-y-2">
            <span className="block">Este chat todavía no tiene resultados para analizar.</span>
            <Link to="/" className="font-medium text-brand-deep underline underline-offset-4">
              Conversa con Logi (cotiza o rastrea una guía)
            </Link>
          </span>
        </div>
      ) : (
        <>
          <RoutesCard insights={insights} />
          <div className="grid gap-4 sm:gap-5 lg:grid-cols-3">
            <ResolutionCard insights={insights} />
            <GuidesCard insights={insights} />
            <HandoffsCard insights={insights} />
          </div>
        </>
      )}

      <p className="text-xs text-muted-foreground">
        {source === 'demo'
          ? 'Demostración: Bogotá → Medellín, las guías y los pasos a asesor son capturas reales del backend; las demás rutas son ejemplos. '
          : 'Resultados del chat de esta pestaña. '}
        Totales de todos los clientes y canales: requieren un endpoint agregado en el backend (por
        confirmar).
      </p>
    </div>
  )
}

// ─── Panel azul ──────────────────────────────────────────────────────────────────────────────

function Hero({
  insights,
  source,
  onSourceChange,
}: {
  insights: RouteInsights
  source: Source
  onSourceChange: (source: Source) => void
}) {
  const topRoute = insights.rutas[0]
  return (
    <section className="relative overflow-hidden rounded-[1.75rem] bg-brand-deep p-4 shadow-card sm:rounded-[2.25rem] sm:p-6">
      <InteractiveGradient options={GRADIENT_OPTIONS} />
      {/* Viñeta: bordes azul profundo y brillo al centro, como el panel del chat. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_80%,transparent_10%,var(--brand-deep)_100%)] opacity-90"
      />
      <div className="relative space-y-5 sm:space-y-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <p className={cn('text-xs tracking-wide uppercase opacity-90', ON_BRAND)}>
              Administrador{source === 'demo' && ' · Datos de demostración'}
            </p>
            <h1 className={cn('text-xl font-medium text-balance sm:text-3xl', ON_BRAND)}>
              Inteligencia de negocio por ruta
            </h1>
            <p className={cn('text-sm sm:text-base', ON_BRAND)}>
              {topRoute
                ? `Ruta más cotizada: ${topRoute.origen} → ${topRoute.destino}`
                : 'Así van los resultados de tu chat con Logi.'}
            </p>
          </div>
          <div role="group" aria-label="Origen de los datos" className="flex shrink-0 gap-2">
            {(
              [
                ['chat', 'Mi chat'],
                ['demo', 'Demostración'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={source === value}
                className={cn(
                  PANEL_PILL,
                  source === value ? 'bg-card/35 font-medium' : 'bg-card/15 hover:bg-card/25',
                )}
                onClick={() => onSourceChange(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          <HeroStat label="Consultas a Logi" value={insights.consultas} />
          <HeroStat
            label="Resueltas por la IA"
            value={`${percent(insights.resueltasPorIa, insights.respuestas)} %`}
            hint={`${insights.resueltasPorIa} de ${insights.respuestas} respuestas`}
          />
          <HeroStat
            label="Flete cotizado"
            value={formatCop(insights.fleteCotizadoCop)}
            hint={`${insights.cotizaciones} cotizaciones`}
          />
          <HeroStat
            label="Guías rastreadas"
            value={insights.guias.length}
            hint={`${insights.guias.filter((g) => g.tono === 'alert').length} con novedad`}
          />
        </dl>
      </div>
    </section>
  )
}

function HeroStat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/20 bg-card/15 p-3 shadow-[inset_0_1px_0_rgb(255_255_255/0.25)] backdrop-blur-md sm:p-4">
      <dt className={cn('truncate text-xs sm:text-sm', ON_BRAND)}>{label}</dt>
      <dd className={cn('truncate text-xl font-semibold tabular-nums sm:text-3xl', ON_BRAND)}>
        {value}
      </dd>
      {hint && <dd className={cn('truncate text-xs opacity-90', ON_BRAND)}>{hint}</dd>}
    </div>
  )
}

// ─── Rutas ───────────────────────────────────────────────────────────────────────────────────

function RoutesCard({ insights }: { insights: RouteInsights }) {
  const { rutas } = insights
  const pesoTotal = rutas.reduce((sum, r) => sum + r.pesoTotalKg, 0)
  const horasPonderadas = rutas.reduce((sum, r) => sum + r.tiempoPromedioHoras * r.cotizaciones, 0)
  const label = (r: (typeof rutas)[number]) => `${r.origen} → ${r.destino}`

  return (
    <section className={CARD}>
      <BlockHeader
        icon={<Route size={20} aria-hidden />}
        title="Rutas cotizadas"
        subtitle="Origen → destino de las cotizaciones de Logi"
        aside={
          <span className="shrink-0 text-xs text-muted-foreground">
            {rutas.length} {rutas.length === 1 ? 'ruta' : 'rutas'}
          </span>
        }
      />

      {rutas.length === 0 ? (
        <InfoPanel className="text-muted-foreground">
          Aún no hay cotizaciones. Pídele a Logi que cotice un envío.
        </InfoPanel>
      ) : (
        <>
          <dl className="grid grid-cols-3 gap-2 sm:gap-3">
            <PanelStat
              label="Flete promedio"
              value={formatCop(Math.round(insights.fleteCotizadoCop / insights.cotizaciones))}
            />
            <PanelStat
              label="Entrega promedio"
              value={`${Math.round(horasPonderadas / insights.cotizaciones)} h`}
            />
            <PanelStat label="Peso cotizado" value={kg(pesoTotal)} />
          </dl>

          <div className="grid gap-6 md:grid-cols-2 md:gap-8">
            <div className="space-y-3">
              <p className={SUBTITLE}>Cotizaciones por ruta</p>
              <Bars
                items={rutas.map((r) => ({ label: label(r), count: r.cotizaciones }))}
                format={(n) => `${n} ${n === 1 ? 'cotización' : 'cotizaciones'}`}
                display={(n) => String(n)}
              />
            </div>
            <div className="space-y-3">
              <p className={SUBTITLE}>Flete promedio por ruta (COP)</p>
              <Bars
                items={rutas.map((r) => ({ label: label(r), count: r.fletePromedioCop }))}
                format={formatCop}
                display={formatCop}
                tone="deep"
              />
            </div>
          </div>

          <div className="-mx-1 overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <caption className="sr-only">Detalle por ruta</caption>
              <thead className="text-xs text-muted-foreground">
                <tr className="[&>th]:bg-muted/70 [&>th]:px-3 [&>th]:py-2.5 [&>th]:font-medium [&>th:first-child]:rounded-l-xl [&>th:last-child]:rounded-r-xl">
                  <th>Ruta</th>
                  <th>Trayecto</th>
                  <th className="text-right">Cotizaciones</th>
                  <th className="text-right">Flete promedio</th>
                  <th className="text-right">Entrega prom.</th>
                  <th className="text-right">Peso total</th>
                </tr>
              </thead>
              <tbody className="[&>tr:not(:last-child)]:border-b">
                {rutas.map((r) => (
                  <tr key={r.key} className="transition hover:bg-muted/40 [&>td]:px-3 [&>td]:py-3">
                    <td className="font-medium">{label(r)}</td>
                    <td className="font-mono text-xs text-muted-foreground">{r.codigoTrayecto}</td>
                    <td className="text-right tabular-nums">{r.cotizaciones}</td>
                    <td className="text-right tabular-nums">{formatCop(r.fletePromedioCop)}</td>
                    <td className="text-right tabular-nums">{r.tiempoPromedioHoras} h</td>
                    <td className="text-right tabular-nums">{kg(r.pesoTotalKg)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  )
}

function PanelStat({ label, value }: { label: string; value: string }) {
  return (
    <InfoPanel className="min-w-0 space-y-0.5">
      <dt className="truncate text-xs text-muted-foreground">{label}</dt>
      <dd className="truncate text-base font-semibold tabular-nums sm:text-lg">{value}</dd>
    </InfoPanel>
  )
}

// ─── Qué resuelve Logi ───────────────────────────────────────────────────────────────────────

function ResolutionCard({ insights }: { insights: RouteInsights }) {
  const total = insights.temas.reduce((sum, t) => sum + t.count, 0)
  return (
    <section className={CARD}>
      <BlockHeader
        icon={<BotMessageSquare size={20} aria-hidden />}
        title="Qué resuelve Logi"
        subtitle="Resultados en sus respuestas"
      />
      <Donut resolved={insights.resueltasPorIa} escalated={insights.escaladas} />
      <div className="space-y-3">
        <p className={SUBTITLE}>Por tipo de resultado</p>
        <Bars
          items={insights.temas}
          format={(n) => `${n} (${percent(n, total)} %)`}
          display={(n) => `${percent(n, total)} %`}
          empty="Solo hubo respuestas de texto."
        />
      </div>
    </section>
  )
}

/** Anillo de dos partes: resueltas por la IA (marca) y pasadas a asesor (aviso). */
function Donut({ resolved, escalated }: { resolved: number; escalated: number }) {
  const total = resolved + escalated
  const radius = 42
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - (total ? resolved / total : 0))
  const reduce = useReducedMotion()

  return (
    <div className="flex items-center gap-5">
      <div className="relative size-28 shrink-0">
        <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden>
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            strokeWidth="10"
            className={total ? 'stroke-warning' : 'stroke-muted'}
          />
          <motion.circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            strokeWidth="10"
            className="stroke-brand"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: reduce ? offset : circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <span>
            <span className="block text-xl font-semibold tabular-nums">
              {percent(resolved, total)} %
            </span>
            <span className="block text-[11px] text-muted-foreground">por la IA</span>
          </span>
        </div>
      </div>
      <ul className="min-w-0 flex-1 space-y-2 text-sm">
        <LegendItem swatch="bg-brand" label="Resueltas por Logi" value={resolved} />
        <LegendItem swatch="bg-warning" label="Pasadas a asesor" value={escalated} />
      </ul>
    </div>
  )
}

function LegendItem({ swatch, label, value }: { swatch: string; label: string; value: number }) {
  return (
    <li className="flex items-center gap-2">
      <span aria-hidden className={cn('size-2.5 shrink-0 rounded-full', swatch)} />
      <span className="min-w-0 truncate text-muted-foreground">{label}</span>
      <span className="ml-auto pl-2 font-medium tabular-nums">{value}</span>
    </li>
  )
}

// ─── Guías ───────────────────────────────────────────────────────────────────────────────────

const GUIDE_TONE: Record<TrackedGuide['tono'], 'ok' | 'alert'> = {
  progress: 'ok',
  delivered: 'ok',
  alert: 'alert',
}

function GuidesCard({ insights }: { insights: RouteInsights }) {
  const especiales = insights.guias.filter((g) => g.cargaEspecial).length
  return (
    <section className={CARD}>
      <BlockHeader
        icon={<Truck size={20} aria-hidden />}
        title="Estado de las guías"
        subtitle={especiales ? `${especiales} con carga especial` : 'Última consulta de cada guía'}
      />
      {insights.guias.length === 0 ? (
        <InfoPanel className="text-muted-foreground">
          Aún no se ha rastreado ninguna guía.
        </InfoPanel>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-2">
            {insights.estadosGuia.map((estado) => (
              <InfoPanel key={estado.label} className="min-w-0 space-y-1">
                <dt className="truncate">
                  <StatusDot tone={GUIDE_TONE[estado.tono]}>{estado.label}</StatusDot>
                </dt>
                <dd className="text-2xl font-semibold tabular-nums">{estado.count}</dd>
              </InfoPanel>
            ))}
          </dl>
          <ul className="divide-y">
            {insights.guias.map((g) => (
              <li key={g.numeroGuia} className="space-y-1 py-3 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-medium">{g.numeroGuia}</span>
                  <StatusDot tone={GUIDE_TONE[g.tono]}>{g.estado}</StatusDot>
                </div>
                {g.ubicacion && (
                  <p className="line-clamp-2 text-xs text-muted-foreground">{g.ubicacion}</p>
                )}
                {g.cargaEspecial && (
                  <p className="text-xs font-medium text-foreground/70">Carga especial</p>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

// ─── Pasos a asesor ──────────────────────────────────────────────────────────────────────────

function HandoffsCard({ insights }: { insights: RouteInsights }) {
  return (
    <section className={CARD}>
      <BlockHeader
        icon={<TriangleAlert size={20} aria-hidden />}
        title="Pasos a asesor"
        subtitle={`${insights.escaladas} de ${insights.respuestas} respuestas`}
      />
      {insights.escaladas === 0 ? (
        <InfoPanel className="text-muted-foreground">
          Logi resolvió todo sin pasar a un asesor.
        </InfoPanel>
      ) : (
        <>
          <dl className="grid grid-cols-3 gap-2">
            {(['Urgente', 'Alta', 'Normal'] as const).map((prioridad) => (
              <InfoPanel key={prioridad} className="min-w-0 space-y-0.5 text-center">
                <dt className="truncate text-xs text-muted-foreground">{prioridad}</dt>
                <dd className="text-xl font-semibold tabular-nums">
                  {insights.escalamientosPorPrioridad.find((p) => p.label === prioridad)?.count ??
                    0}
                </dd>
              </InfoPanel>
            ))}
          </dl>
          <div className="space-y-3">
            <p className={SUBTITLE}>Por área</p>
            <Bars
              items={insights.escalamientosPorCola}
              format={(n) => `${n} ${n === 1 ? 'caso' : 'casos'}`}
              display={(n) => String(n)}
              tone="deep"
            />
          </div>
        </>
      )}
    </section>
  )
}

// ─── Barras ──────────────────────────────────────────────────────────────────────────────────

/**
 * Barras horizontales de una sola serie. El valor va en texto junto a la etiqueta (nunca solo
 * color) y al pasar o enfocar cada fila aparece el detalle.
 */
function Bars({
  items,
  format,
  display,
  empty,
  tone = 'brand',
}: {
  items: CountItem[]
  /** Texto del detalle al pasar el puntero. */
  format: (value: number) => string
  /** Valor visible a la derecha. */
  display: (value: number) => string
  empty?: string
  tone?: 'brand' | 'deep'
}) {
  const reduce = useReducedMotion()
  if (items.length === 0) return <InfoPanel className="text-muted-foreground">{empty}</InfoPanel>
  const max = Math.max(...items.map((i) => i.count))

  return (
    <ul className="space-y-3">
      {items.map((item) => {
        const width = `${Math.max((item.count / max) * 100, 3)}%`
        return (
          <li
            key={item.label}
            tabIndex={0}
            aria-label={`${item.label}: ${format(item.count)}`}
            className="group relative space-y-1.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate text-foreground/80">{item.label}</span>
              <span className="shrink-0 font-medium tabular-nums">{display(item.count)}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-muted" aria-hidden>
              <motion.div
                className={cn(
                  'h-full rounded-full transition-opacity group-hover:opacity-80',
                  tone === 'brand' ? 'bg-brand' : 'bg-brand-deep',
                )}
                initial={{ width: reduce ? width : 0 }}
                animate={{ width }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>
            <span
              aria-hidden
              className="pointer-events-none absolute -top-9 right-0 z-10 rounded-xl bg-foreground px-2.5 py-1.5 text-xs whitespace-nowrap text-background opacity-0 shadow-card transition group-hover:opacity-100 group-focus-visible:opacity-100"
            >
              {item.label}: {format(item.count)}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
