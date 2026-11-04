import type { ComponentType } from 'react'
import { NavLink, Outlet } from 'react-router'
import { Package } from 'lucide-react'
import { cn } from 'cn'
import logiUrl from '@/assets/logi.jpg'
import { LiveClock } from '@/shared/ui/live-clock'
import { LayoutDashboard } from '@/shared/components/animate-ui/icons/hugeicons/layout-dashboard'
import { BotMessageSquare } from '@/shared/components/animate-ui/icons/hugeicons/bot-message-square'
import { MessageCircle } from '@/shared/components/animate-ui/icons/hugeicons/message-circle'

interface Section {
  to: string
  label: string
  /** Etiqueta en las pestañas de móvil. */
  short: string
  hint: string
  Icon: ComponentType<{ size?: number; className?: string; 'aria-hidden'?: boolean }>
}

/** Los 3 módulos del cliente. Asesor y métricas del equipo viven aparte, en `/interno`. */
const SECTIONS: Section[] = [
  {
    to: '/',
    label: 'Chat con Logi',
    short: 'Chat',
    hint: 'Pregunta lo que quieras',
    Icon: BotMessageSquare,
  },
  {
    to: '/consultas',
    label: 'Consultas',
    short: 'Consultas',
    hint: 'Rastrear, cotizar, PQRS',
    Icon: Package,
  },
  {
    to: '/simulador',
    label: 'WhatsApp y llamada',
    short: 'WhatsApp',
    hint: 'Simulador de canales',
    Icon: MessageCircle,
  },
]

/** Sección del administrador, debajo de las del cliente. */
const ADMIN_SECTIONS: Section[] = [
  {
    to: '/admin',
    label: 'Inteligencia de negocio',
    short: 'Admin',
    hint: 'Dashboard por ruta',
    Icon: LayoutDashboard,
  },
]

/** Escritorio: barra lateral de secciones. Móvil: cabecera con las secciones en pestañas. */
export function UserLayout() {
  return (
    <div className="flex h-dvh flex-col bg-background md:flex-row">
      <aside className="flex shrink-0 flex-col gap-3 border-b bg-sidebar px-3 pt-3 pb-2 md:w-64 md:gap-6 md:border-r md:border-b-0 md:px-4 md:py-5">
        <div className="flex items-center gap-3 px-1">
          <img
            src={logiUrl}
            alt=""
            className="size-10 -rotate-6 rounded-[22%] shadow-[0_1px_2px_rgb(0_0_0/0.08),0_8px_20px_rgb(30_58_138/0.18)] md:size-14"
          />
          <p className="text-base font-medium tracking-wide md:text-lg">TRANSLOGIX</p>
        </div>

        <div className="flex gap-1 overflow-x-auto md:flex-col md:gap-6 md:overflow-visible">
          <nav aria-label="Secciones" className="flex gap-1 md:flex-col md:gap-1.5">
            {SECTIONS.map((section) => (
              <SectionLink key={section.to} {...section} />
            ))}
          </nav>

          <nav
            aria-label="Administrador"
            className="flex gap-1 border-l pl-1 md:flex-col md:gap-1.5 md:border-t md:border-l-0 md:pt-4 md:pl-0"
          >
            <p className="hidden px-3 text-xs font-medium tracking-wide text-muted-foreground uppercase md:block">
              Administrador
            </p>
            {ADMIN_SECTIONS.map((section) => (
              <SectionLink key={section.to} {...section} />
            ))}
          </nav>
        </div>
      </aside>

      <main className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 justify-end px-3 pt-3 sm:px-6 sm:pt-4">
          <LiveClock />
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

function SectionLink({ to, label, short, hint, Icon }: Section) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        cn(
          'flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-sm transition md:gap-3 md:rounded-2xl md:py-2.5',
          isActive
            ? 'bg-card font-medium text-brand-deep shadow-card'
            : 'text-muted-foreground hover:bg-card/60 hover:text-foreground',
        )
      }
    >
      <Icon size={20} aria-hidden className="shrink-0" />
      <span className="min-w-0">
        <span className="block truncate md:hidden">{short}</span>
        <span className="hidden truncate md:block">{label}</span>
        <span className="hidden truncate text-xs font-normal text-muted-foreground md:block">
          {hint}
        </span>
      </span>
    </NavLink>
  )
}
