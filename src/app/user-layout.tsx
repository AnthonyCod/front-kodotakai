import type { ComponentType } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router'
import { FileUp, Info, MapPin, Package, Truck } from 'lucide-react'
import { cn } from 'cn'
import logiUrl from '@/assets/logi.jpg'
import { GLASS } from '@/shared/ui/glass'
import { LiveClock } from '@/shared/ui/live-clock'
import { LayoutDashboard } from '@/shared/components/animate-ui/icons/hugeicons/layout-dashboard'
import { BotMessageSquare } from '@/shared/components/animate-ui/icons/hugeicons/bot-message-square'
import { MessageCircle } from '@/shared/components/animate-ui/icons/hugeicons/message-circle'

interface Section {
  to: string
  label: string
  hint: string
  Icon: ComponentType<{ size?: number; className?: string; 'aria-hidden'?: boolean }>
}

/** Los 3 módulos del cliente. Asesor y métricas del equipo viven aparte, en `/interno`. */
const SECTIONS: Section[] = [
  {
    to: '/',
    label: 'Chat con Logi',
    hint: 'Pregunta lo que quieras',
    Icon: BotMessageSquare,
  },
  {
    to: '/consultas',
    label: 'Consultas',
    hint: 'Rastrear, cotizar, PQRS',
    Icon: Package,
  },
  {
    to: '/simulador',
    label: 'WhatsApp y llamada',
    hint: 'Simulador de canales',
    Icon: MessageCircle,
  },
]

/** Sección del administrador, debajo de las del cliente. */
const ADMIN_SECTIONS: Section[] = [
  {
    to: '/admin',
    label: 'Inteligencia de negocio',
    hint: 'Dashboard por ruta',
    Icon: LayoutDashboard,
  },
]

const LOGO_SHADOW = 'shadow-[0_1px_2px_rgb(0_0_0/0.08),0_8px_20px_rgb(30_58_138/0.18)]'

/** Barra inferior en móvil (estilo app): Logi al centro, destacado. */
interface Tab {
  to: string
  label: string
  Icon: Section['Icon']
}
const LEFT_TABS: Tab[] = [
  { to: '/consultas', label: 'Rastrear', Icon: Truck },
  { to: '/sucursales', label: 'Sucursales', Icon: MapPin },
]
const RIGHT_TABS: Tab[] = [
  { to: '/carga-masiva', label: 'Carga masiva', Icon: FileUp },
  { to: '/info', label: 'Info', Icon: Info },
]

/** Escritorio: barra lateral de secciones. Móvil: cabecera con logo y hora, y barra inferior. */
export function UserLayout() {
  return (
    <div className="flex h-dvh flex-col bg-background md:flex-row">
      {/* Barra lateral oculta mientras se rehacen las rutas; para volver a mostrarla: `md:flex`. */}
      <aside className="hidden w-64 shrink-0 flex-col gap-6 border-r bg-sidebar px-4 py-5">
        <div className="flex items-center gap-3 px-1">
          <img
            src={logiUrl}
            alt=""
            className={cn('size-14 -rotate-6 rounded-[22%]', LOGO_SHADOW)}
          />
          <p className="text-lg font-medium tracking-wide">TRANSLOGIX</p>
        </div>

        <nav aria-label="Secciones" className="flex flex-col gap-1.5">
          {SECTIONS.map((section) => (
            <SectionLink key={section.to} {...section} />
          ))}
        </nav>

        <nav aria-label="Administrador" className="flex flex-col gap-1.5 border-t pt-4">
          <p className="px-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Administrador
          </p>
          {ADMIN_SECTIONS.map((section) => (
            <SectionLink key={section.to} {...section} />
          ))}
        </nav>
      </aside>

      <main className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-3 px-3 pt-3 sm:px-6 sm:pt-4">
          <Link to="/" aria-label="Inicio" className="flex shrink-0 items-center gap-2.5">
            <img
              src={logiUrl}
              alt=""
              className={cn('size-9 -rotate-6 rounded-[22%]', LOGO_SHADOW)}
            />
            <span className="font-medium tracking-wide">TRANSLOGIX</span>
          </Link>
          {/* Escritorio: las mismas opciones de la barra inferior (el logo hace de inicio/chat). */}
          <nav aria-label="Secciones" className="hidden items-center gap-1 md:flex">
            {[...LEFT_TABS, ...RIGHT_TABS].map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'rounded-full px-4 py-2 text-sm transition',
                    isActive
                      ? `${GLASS} font-medium text-brand-deep`
                      : 'text-muted-foreground hover:text-foreground',
                  )
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <LiveClock />
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <Outlet />
        </div>
        <MobileTabBar />
      </main>
    </div>
  )
}

function MobileTabBar() {
  const navigate = useNavigate()

  /** Logi: lleva al inicio y deja lista la caja de texto del chat. */
  function openLogi() {
    void navigate('/')
    // El chat se monta tras la navegación: se reintenta un momento hasta encontrar la caja.
    let tries = 10
    const focusComposer = () => {
      const composer = document.getElementById('composer')
      if (composer) composer.focus()
      else if (--tries > 0) window.setTimeout(focusComposer, 30)
    }
    window.setTimeout(focusComposer, 0)
  }

  return (
    <nav
      aria-label="Secciones"
      className="grid shrink-0 grid-cols-5 items-end border-t bg-card/85 px-1 pt-1.5 pb-[max(env(safe-area-inset-bottom),0.5rem)] backdrop-blur-md md:hidden"
    >
      {LEFT_TABS.map((tab) => (
        <TabLink key={tab.to} {...tab} />
      ))}
      <button
        type="button"
        onClick={openLogi}
        className="flex flex-col items-center gap-1 text-[11px] font-medium text-brand-deep"
      >
        <img
          src={logiUrl}
          alt=""
          className={cn('-mt-5 size-12 rounded-[28%] ring-4 ring-card', LOGO_SHADOW)}
        />
        Logi
      </button>
      {RIGHT_TABS.map((tab) => (
        <TabLink key={tab.to} {...tab} />
      ))}
    </nav>
  )
}

function TabLink({ to, label, Icon }: Tab) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        cn(
          'flex flex-col items-center gap-1 py-1 text-[11px] transition',
          isActive ? 'font-medium text-brand-deep' : 'text-muted-foreground',
        )
      }
    >
      <Icon size={22} aria-hidden />
      {label}
    </NavLink>
  )
}

function SectionLink({ to, label, hint, Icon }: Section) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition',
          isActive
            ? 'bg-card font-medium text-brand-deep shadow-card'
            : 'text-muted-foreground hover:bg-card/60 hover:text-foreground',
        )
      }
    >
      <Icon size={20} aria-hidden className="shrink-0" />
      <span className="min-w-0">
        <span className="block truncate">{label}</span>
        <span className="block truncate text-xs font-normal text-muted-foreground">{hint}</span>
      </span>
    </NavLink>
  )
}
