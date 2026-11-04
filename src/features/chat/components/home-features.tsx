import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Check, ChevronRight, MapPin } from 'lucide-react'
import { cn } from 'cn'
import mapaUrl from '@/assets/mapa-cobertura.webp'
import { Badge, BadgeDot, BadgeSpinner } from '@/shared/ui/badge'
import { Reveal } from '@/shared/ui/reveal'

/** Mini tarjeta blanca que flota sobre la vista previa (solo desde `sm`: en celular no cabe). */
const MINI_CARD =
  'absolute hidden rounded-xl bg-card p-2 text-left shadow-[0_1px_2px_rgb(15_23_42/0.06),0_8px_24px_rgb(15_23_42/0.12)] sm:block'

interface Feature {
  eyebrow: string
  title: string
  to: string
  cta: string
  points: [string, string]
  preview: ReactNode
}

/**
 * Accesos del inicio: tarjetas de producto (rótulo, título, vista previa con mini tarjeta y puntos
 * con ✓). Las tres siempre a la vista, una al lado de la otra: en celular se recortan a rótulo,
 * título y una vista previa pequeña. Las vistas previas ilustran el flujo real, sin datos inventados.
 */
const FEATURES: Feature[] = [
  {
    eyebrow: 'Envíos',
    title: 'Envía con Logi, paso a paso',
    to: '/hacer-envio',
    cta: 'Hacer envío',
    points: ['Logi te pide los datos', 'Ves la cotización antes'],
    preview: (
      <PreviewFrame>
        <img src={mapaUrl} alt="" className="absolute inset-0 size-full object-cover" />
        <Badge
          variant="brand"
          className="absolute bottom-1.5 left-1.5 h-5 bg-card px-1.5 sm:hidden"
        >
          <BadgeSpinner className="size-3" />
        </Badge>
        <div className={cn(MINI_CARD, 'inset-x-2 bottom-2')}>
          <ul className="space-y-1 text-[11px]">
            <li className="flex items-center justify-between gap-1">
              Medidas y peso <Check className="size-3 text-success" aria-hidden />
            </li>
            <li className="flex items-center justify-between gap-1">
              Cotización
              <Badge variant="brand" className="h-[1.125rem] gap-1 px-1.5 text-[10px]">
                <BadgeSpinner className="size-2.5" />
                En curso
              </Badge>
            </li>
          </ul>
        </div>
      </PreviewFrame>
    ),
  },
  {
    eyebrow: 'Sucursales',
    title: 'Encuentra tu punto más cercano',
    to: '/sucursales',
    cta: 'Ver mapa',
    points: ['Todas en el mapa', 'Dirección y servicios'],
    preview: (
      <PreviewFrame>
        <img
          src={mapaUrl}
          alt=""
          className="absolute inset-0 size-full scale-150 object-cover object-[35%_70%]"
        />
        {/* Puntos como los del mapa de Sucursales. */}
        <span className="absolute top-3 left-4 size-2.5 rounded-full border-2 border-card bg-foreground shadow-card" />
        <span className="absolute top-6 right-5 size-2.5 rounded-full border-2 border-card bg-foreground shadow-card" />
        <span className="absolute top-3 left-1/2 size-3.5 rounded-full border-[3px] border-card bg-brand shadow-card ring-4 ring-brand/20" />
        <div className={cn(MINI_CARD, 'inset-x-2 bottom-2 flex items-center gap-1.5')}>
          <span className="grid size-6 shrink-0 place-items-center rounded-md bg-brand/10 text-brand-deep">
            <MapPin className="size-3" aria-hidden />
          </span>
          <span className="min-w-0 truncate text-[11px] font-medium">Más cercana</span>
        </div>
      </PreviewFrame>
    ),
  },
  {
    eyebrow: 'Empresas',
    title: 'Muchos envíos desde un Excel',
    to: '/carga-masiva',
    cta: 'Subir archivo',
    points: ['Revisas cada fila', 'Guía por cada envío'],
    preview: (
      <PreviewFrame className="bg-muted">
        <span className="absolute inset-x-1.5 top-1.5 flex flex-col gap-1 sm:hidden">
          <span className="h-2 rounded-full bg-success/30" />
          <span className="h-2 rounded-full bg-success/30" />
          <span className="h-2 rounded-full bg-destructive/25" />
        </span>
        <div className={cn(MINI_CARD, 'inset-x-2 top-2 space-y-1')}>
          {[
            ['PED-1001', 'success', 'Lista'],
            ['PED-1002', 'success', 'Lista'],
            ['PED-1003', 'destructive', 'Error'],
          ].map(([reference, variant, label]) => (
            <div key={reference} className="flex items-center justify-between gap-1 text-[11px]">
              <span className="truncate font-medium">{reference}</span>
              <Badge
                variant={variant as 'success' | 'destructive'}
                className="h-[1.125rem] gap-1 px-1.5 text-[10px]"
              >
                <BadgeDot className="size-1" />
                {label}
              </Badge>
            </div>
          ))}
        </div>
      </PreviewFrame>
    ),
  },
]

function PreviewFrame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      aria-hidden
      className={cn('relative h-16 overflow-hidden rounded-lg sm:h-28 sm:rounded-xl', className)}
    >
      {children}
    </div>
  )
}

/** Los tres accesos del inicio, siempre a la vista (sin carrusel). */
export function HomeFeatures() {
  return (
    <ul aria-label="Accesos rápidos" className="grid w-full grid-cols-3 gap-2 text-left sm:gap-3">
      {FEATURES.map((feature, position) => (
        <Reveal as="li" key={feature.to} order={3 + position}>
          <Link
            to={feature.to}
            className="group flex h-full flex-col gap-2 rounded-2xl bg-muted/70 p-2.5 transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:outline-none sm:gap-2.5 sm:p-3.5"
          >
            <span>
              <span className="block truncate text-[10px] font-medium tracking-wider text-muted-foreground uppercase sm:text-[11px]">
                {feature.eyebrow}
              </span>
              <span className="mt-0.5 line-clamp-2 block text-[13px] leading-snug font-medium tracking-tight sm:text-sm">
                {feature.title}
              </span>
            </span>
            {feature.preview}
            <ul className="hidden space-y-1 text-[11px] text-muted-foreground sm:block">
              {feature.points.map((point) => (
                <li key={point} className="flex items-start gap-1.5">
                  <Check className="mt-px size-3 shrink-0" aria-hidden />
                  <span className="truncate">{point}</span>
                </li>
              ))}
            </ul>
            <span className="mt-auto hidden items-center gap-0.5 text-xs font-medium text-brand-deep sm:inline-flex">
              {feature.cta}
              <ChevronRight
                className="size-3.5 transition group-hover:translate-x-0.5"
                aria-hidden
              />
            </span>
          </Link>
        </Reveal>
      ))}
    </ul>
  )
}
