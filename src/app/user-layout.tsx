import type { ComponentType } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { AnimateIcon } from '@animate-ui/react/icons'
import { Package } from 'lucide-react'
import { cn } from 'cn'
import logiUrl from '@/assets/logi.webp'
import { useChatStore, useSendMessage } from '@/features/chat'
import { UserMenu } from '@/features/auth'
import { LiveClock } from '@/shared/ui/live-clock'
import { GLASS, GLASS_SURFACE } from '@/shared/ui/glass'
import { PRIMARY_PILL } from '@/shared/ui/page'
import { Headphones } from '@/shared/components/animate-ui/icons/hugeicons/headphones'
import { Info } from '@/shared/components/animate-ui/icons/hugeicons/info'
import { Location01 } from '@/shared/components/animate-ui/icons/hugeicons/location-01'
import { Route } from '@/shared/components/animate-ui/icons/hugeicons/route'
import { Upload01 } from '@/shared/components/animate-ui/icons/hugeicons/upload-01'
import { LayoutDashboard } from '@/shared/components/animate-ui/icons/hugeicons/layout-dashboard'
import { BotMessageSquare } from '@/shared/components/animate-ui/icons/hugeicons/bot-message-square'

interface Section {
  to: string
  label: string
  hint: string
  Icon: ComponentType<{ size?: number; className?: string; 'aria-hidden'?: boolean }>
}

/** Los módulos del cliente. */
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

/** Secciones: en la cabecera (escritorio) o en la barra inferior (celular y tablet). */
interface Tab {
  to: string
  label: string
  Icon: Section['Icon']
}
// Iconos animados (Hugeicons de Animate UI): se mueven al pasar el cursor o al tocar la pestaña.
const TABS: Tab[] = [
  { to: '/consultas', label: 'Rastrear', Icon: Route },
  { to: '/sucursales', label: 'Sucursales', Icon: Location01 },
  { to: '/carga-masiva', label: 'Carga masiva', Icon: Upload01 },
  { to: '/info', label: 'Info', Icon: Info },
]

/**
 * Cabecera con el nombre del negocio y la acción principal (hablar con un asesor). En escritorio
 * lleva además las secciones en una pastilla de vidrio; en celular y tablet van en la barra inferior.
 */
export function UserLayout() {
  return (
    <div className="flex h-dvh flex-col bg-background md:flex-row">
      {/* Barra lateral oculta mientras se rehacen las rutas; para volver a mostrarla: `md:flex`. */}
      <aside className="hidden w-64 shrink-0 flex-col gap-6 border-r bg-sidebar px-4 py-5">
        <div className="flex items-center gap-3 px-1">
          <img src={logiUrl} alt="" className="size-14" />
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

      <main className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        {/* Una sola barra de vidrio, compacta y centrada: logo, secciones y la acción principal juntos. */}
        <header className="shrink-0 px-3 pt-3 sm:px-6">
          <div
            className={cn(
              GLASS_SURFACE,
              'mx-auto flex w-full max-w-5xl items-center gap-2 rounded-full p-1.5 pl-2',
            )}
          >
            {/* El logo lleva al inicio (chat con Logi). */}
            <Link
              to="/"
              aria-label="TransLogix Colombia S.A.S, inicio"
              className="shrink-0 rounded-full transition active:scale-95"
            >
              <img src={logiUrl} alt="" className="size-9" />
            </Link>
            <nav
              aria-label="Secciones"
              className="mx-auto hidden items-center gap-0.5 rounded-full bg-muted/80 p-1 lg:flex"
            >
              {TABS.map(({ to, label, Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    cn(
                      'rounded-full text-[13px] transition',
                      isActive
                        ? 'bg-card font-medium text-foreground shadow-card'
                        : 'text-muted-foreground hover:text-foreground',
                    )
                  }
                >
                  <AnimateIcon animateOnHover asChild>
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5">
                      <Icon size={16} aria-hidden />
                      {label}
                    </span>
                  </AnimateIcon>
                </NavLink>
              ))}
            </nav>
            <div className="ml-auto flex shrink-0 items-center gap-2">
              <LiveClock className="hidden sm:inline-flex" />
              <UserMenu />
              <AdvisorButton />
            </div>
          </div>
        </header>
        {/* Celular y tablet: la barra flota sobre el contenido; este margen evita que lo tape. */}
        <div className="min-h-0 flex-1 overflow-y-auto pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-0">
          <Outlet />
        </div>
        <MobileTabBar />
      </main>
    </div>
  )
}

/** Acción principal: lleva al chat y le pide a Logi un asesor (igual que el botón del chat). */
function AdvisorButton() {
  const navigate = useNavigate()
  const { send } = useSendMessage()
  const pending = useChatStore((state) => state.pending)

  return (
    <AnimateIcon animateOnHover asChild>
      <button
        type="button"
        disabled={pending}
        aria-label="Hablar con un asesor"
        onClick={() => {
          void navigate('/')
          void send('Quiero hablar con un asesor')
        }}
        className={cn(PRIMARY_PILL, 'shrink-0')}
      >
        <Headphones size={16} aria-hidden />
        <span className="sm:hidden">Asesor</span>
        <span className="hidden sm:inline">Hablar con un asesor</span>
      </button>
    </AnimateIcon>
  )
}

/** Celular y tablet: barra flotante de vidrio con las secciones y, aparte, el círculo de Logi. */
function MobileTabBar() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const onChat = pathname === '/'

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
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 px-4 pb-[max(env(safe-area-inset-bottom),0.75rem)] sm:px-6 lg:hidden">
      <div className="mx-auto flex max-w-lg items-center gap-2">
        <nav
          aria-label="Secciones"
          className={cn(
            GLASS_SURFACE,
            'pointer-events-auto grid flex-1 grid-cols-4 gap-0.5 rounded-full p-1',
          )}
        >
          {TABS.map((tab) => (
            <TabLink key={tab.to} {...tab} />
          ))}
        </nav>
        <AnimateIcon animateOnHover animateOnTap asChild>
          <button
            type="button"
            onClick={openLogi}
            aria-label="Chat con Logi"
            aria-current={onChat ? 'page' : undefined}
            className={cn(
              GLASS,
              'pointer-events-auto size-14 shrink-0 rounded-full text-brand-deep',
              onChat && 'bg-brand/10 hover:bg-brand/15',
            )}
          >
            <BotMessageSquare size={24} aria-hidden />
          </button>
        </AnimateIcon>
      </div>
    </div>
  )
}

function TabLink({ to, label, Icon }: Tab) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'min-w-0 rounded-full text-[11px] transition',
          isActive
            ? 'bg-card font-medium text-foreground shadow-card'
            : 'text-muted-foreground hover:text-foreground',
        )
      }
    >
      <AnimateIcon animateOnHover animateOnTap asChild>
        <span className="flex flex-col items-center gap-0.5 px-1 py-1.5">
          <Icon size={20} aria-hidden />
          <span className="max-w-full truncate">{label}</span>
        </span>
      </AnimateIcon>
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
