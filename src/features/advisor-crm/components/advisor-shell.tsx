import { useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import {
  Bell,
  BookOpen,
  Bot,
  ChevronDown,
  Columns3,
  FileText,
  LayoutGrid,
  ListChecks,
  LogOut,
  ChartColumn,
  Search,
  Truck,
  TriangleAlert,
  Users,
  type LucideProps,
} from 'lucide-react'
import { cn } from 'cn'
import { useLogout, useSession } from '@/features/auth'
import { updateAdvisorStatus, type AdvisorStatus, type FunnelId } from '../api/crm-api'
import { initials } from '../model/contact'
import { FUNNELS, FUNNEL_IDS } from '../model/funnels'
import { ADVISOR_PATHS, useLeadParam } from '../model/routes'
import { crmKeys, useAdvisor } from '../model/use-crm'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { LeadDetailPanel } from './lead-detail'
import { SearchDialog } from './search-dialog'
import { OfflineBanner, ToastViewport } from './ui'

type Icon = ComponentType<LucideProps>
const ICON = { strokeWidth: 1.75, 'aria-hidden': true } as const

/**
 * Layout del asesor. Móvil (PWA 390 px): barra superior compacta y navegación inferior de 4
 * ítems. Escritorio: barra lateral fija y cabecera con búsqueda, estado y notificaciones.
 */
export function AdvisorShell() {
  const { leadId, close } = useLeadParam()
  const [searchOpen, setSearchOpen] = useState(false)

  return (
    <div className="theme-asesor flex h-dvh bg-background text-foreground">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <OfflineBanner />
        <MobileTopBar onSearch={() => setSearchOpen(true)} />
        <DesktopHeader onSearch={() => setSearchOpen(true)} />
        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-4 lg:px-6 lg:py-5">
          <Outlet />
        </main>
        <BottomNav />
      </div>
      {leadId && <LeadDetailPanel key={leadId} leadId={leadId} onClose={close} />}
      {searchOpen && <SearchDialog onClose={() => setSearchOpen(false)} />}
      <ToastViewport />
    </div>
  )
}

// --- Estado del asesor ---

function useStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateAdvisorStatus,
    onSuccess: (data) => queryClient.setQueryData(crmKeys.advisor, data),
  })
}

function StatusSelect({ className, boxed }: { className?: string; boxed?: boolean }) {
  const advisor = useAdvisor()
  const status = useStatus()
  const value = status.variables ?? advisor.data?.estado ?? 'DISPONIBLE'
  const available = value === 'DISPONIBLE'

  return (
    <label
      className={cn(
        'relative inline-flex items-center gap-1.5 text-xs font-medium',
        available ? 'text-success' : 'text-warning-strong',
        boxed && 'h-10 rounded-lg border bg-card px-3 text-sm text-foreground',
        className,
      )}
    >
      {boxed && (
        <span
          aria-hidden
          className={cn('size-2 rounded-full', available ? 'bg-success' : 'bg-warning')}
        />
      )}
      <span className="sr-only">Estado</span>
      <select
        value={value}
        disabled={!advisor.data || status.isPending}
        onChange={(e) => status.mutate(e.target.value as AdvisorStatus)}
        className="appearance-none bg-transparent pr-4 outline-none"
      >
        <option value="DISPONIBLE">Disponible</option>
        <option value="OCUPADO">Ocupado</option>
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-0 size-3.5 text-muted-foreground"
        {...ICON}
      />
    </label>
  )
}

function Avatar({ size = 'md' }: { size?: 'md' | 'sm' }) {
  const advisor = useAdvisor()
  const available = advisor.data?.estado !== 'OCUPADO'
  return (
    <span
      className={cn(
        'relative flex shrink-0 items-center justify-center rounded-full bg-primary-subtle font-semibold text-primary',
        size === 'md' ? 'size-10 text-sm' : 'size-9 text-xs',
      )}
      aria-hidden
    >
      {advisor.data ? initials(advisor.data.nombre) : ''}
      <span
        className={cn(
          'absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2 border-card',
          available ? 'bg-success' : 'bg-warning',
        )}
      />
    </span>
  )
}

function CountBadge({ count, className }: { count: number | undefined; className?: string }) {
  if (!count) return null
  return (
    <span
      className={cn(
        'absolute flex size-4 items-center justify-center rounded-full bg-destructive text-[0.625rem] font-bold text-primary-foreground tabular-nums',
        className,
      )}
    >
      {count > 9 ? '9+' : count}
    </span>
  )
}

function IconCircle({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="relative flex size-10 items-center justify-center rounded-full bg-muted transition hover:bg-border [&_svg]:size-5"
    >
      {children}
    </button>
  )
}

function Bell_() {
  const advisor = useAdvisor()
  const navigate = useNavigate()
  const count = advisor.data?.notificaciones_sin_leer
  return (
    <IconCircle
      label={count ? `Notificaciones: ${count} sin leer` : 'Notificaciones'}
      onClick={() => void navigate(ADVISOR_PATHS.tasks)}
    >
      <Bell {...ICON} />
      <CountBadge count={count} className="-top-0.5 -right-0.5" />
    </IconCircle>
  )
}

/** Avatar con la cuenta de la sesión y «Cerrar sesión». */
function AccountMenu({ up, children }: { up?: boolean; children: ReactNode }) {
  const { user } = useSession()
  const logout = useLogout()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) =>
      !ref.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('pointerdown', onPointer)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onPointer)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Mi cuenta"
        onClick={() => setOpen((v) => !v)}
        className="block rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
      >
        {children}
      </button>
      {open && (
        <div
          role="menu"
          className={cn(
            'absolute left-0 z-50 w-60 rounded-xl border bg-card p-1.5 shadow-lg',
            up ? 'bottom-full mb-2' : 'top-full mt-2',
          )}
        >
          {user && (
            <div className="px-3 py-2">
              <p className="truncate text-sm font-semibold">{user.nombre}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
          )}
          <button
            type="button"
            role="menuitem"
            disabled={logout.isPending}
            onClick={() => logout.mutate()}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/5"
          >
            <LogOut className="size-4" {...ICON} />
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  )
}

// --- Móvil ---

function MobileTopBar({ onSearch }: { onSearch: () => void }) {
  const advisor = useAdvisor()
  return (
    <header className="flex h-[60px] shrink-0 items-center gap-3 border-b bg-card px-4 lg:hidden">
      <AccountMenu>
        <Avatar />
      </AccountMenu>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{advisor.data?.nombre ?? 'Asesor'}</p>
        <StatusSelect />
      </div>
      <IconCircle label="Buscar guía, teléfono o cliente" onClick={onSearch}>
        <Search {...ICON} />
      </IconCircle>
      <Bell_ />
    </header>
  )
}

const BOTTOM_ITEMS: {
  to: string
  label: string
  Icon: Icon
  end?: boolean
  badge?: 'tasks'
  match?: string
}[] = [
  { to: ADVISOR_PATHS.dashboard, label: 'Resumen', Icon: LayoutGrid, end: true },
  {
    to: ADVISOR_PATHS.funnel('ventas'),
    label: 'Embudos',
    Icon: Columns3,
    match: '/asesor/embudos',
  },
  { to: ADVISOR_PATHS.tools, label: 'Consulta TMS/RAG', Icon: BookOpen },
  { to: ADVISOR_PATHS.tasks, label: 'Mis Tareas', Icon: ListChecks, badge: 'tasks' },
]

function BottomNav() {
  const advisor = useAdvisor()
  const { pathname } = useLocation()
  return (
    <nav
      aria-label="Secciones del asesor"
      className="grid shrink-0 grid-cols-4 border-t bg-card px-2 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden"
    >
      {BOTTOM_ITEMS.map(({ to, label, Icon, end, badge, match }) => {
        const active = match
          ? pathname.startsWith(match)
          : end
            ? pathname === to
            : pathname.startsWith(to)
        return (
          <NavLink
            key={to}
            to={to}
            end={end}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex flex-col items-center gap-1 text-center text-xs leading-tight',
              active ? 'font-medium text-primary' : 'text-muted-foreground',
            )}
          >
            <span
              className={cn(
                'relative flex h-7 w-14 items-center justify-center rounded-full',
                active && 'bg-primary-subtle',
              )}
            >
              <Icon className="size-5" {...ICON} />
              {badge && (
                <CountBadge count={advisor.data?.tareas_pendientes} className="-top-1 right-1" />
              )}
            </span>
            {label}
          </NavLink>
        )
      })}
    </nav>
  )
}

// --- Escritorio ---

function headerFor(pathname: string) {
  const funnel = FUNNEL_IDS.find((id) => pathname === ADVISOR_PATHS.funnel(id))
  if (funnel)
    return { title: FUNNELS[funnel].title, subtitle: `${FUNNELS[funnel].subtitle} · Vista Kanban` }
  if (pathname.startsWith(ADVISOR_PATHS.tools))
    return { title: 'Tracking TMS y Base RAG', subtitle: 'Consulta rápida durante la llamada' }
  if (pathname.startsWith(ADVISOR_PATHS.tasks))
    return { title: 'Mis Tareas', subtitle: 'Agenda de llamadas y métricas SLA' }
  return { title: 'Dashboard', subtitle: 'Resumen operativo del turno' }
}

function DesktopHeader({ onSearch }: { onSearch: () => void }) {
  const { pathname } = useLocation()
  const { title, subtitle } = headerFor(pathname)
  return (
    <header className="hidden h-[72px] shrink-0 items-center gap-4 border-b bg-card px-6 lg:flex">
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-xl font-semibold">{title}</h1>
        <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <button
        type="button"
        onClick={onSearch}
        className="flex h-10 w-80 items-center gap-2 rounded-lg bg-muted px-3 text-sm text-muted-foreground transition hover:bg-border"
      >
        <Search className="size-4" {...ICON} />
        Buscar guía, teléfono o cliente
      </button>
      <StatusSelect boxed />
      <Bell_ />
    </header>
  )
}

interface SideItem {
  label: string
  Icon: Icon
  to?: string
  count?: (a: NonNullable<ReturnType<typeof useAdvisor>['data']>) => number
  end?: boolean
}

const FUNNEL_ICONS: Record<FunnelId, Icon> = { ventas: Columns3, casos: TriangleAlert, bot: Bot }
const FUNNEL_NAV: Record<FunnelId, string> = {
  ventas: 'Embudo de Ventas',
  casos: 'Embudo de Consultas',
  bot: 'Embudo Automatizado Bot',
}

const SIDE_GROUPS: { title: string; items: SideItem[] }[] = [
  {
    title: 'Operación',
    items: [{ label: 'Dashboard', Icon: LayoutGrid, to: ADVISOR_PATHS.dashboard, end: true }],
  },
  {
    title: 'Embudos',
    items: FUNNEL_IDS.map((id) => ({
      label: FUNNEL_NAV[id],
      Icon: FUNNEL_ICONS[id],
      to: ADVISOR_PATHS.funnel(id),
      count: (a) => a.embudos_abiertos[id],
    })),
  },
  {
    title: 'Herramientas',
    items: [
      // Sin diseño todavía: quedan visibles pero deshabilitados.
      { label: 'Directorio de Clientes', Icon: Users },
      { label: 'Tracking TMS', Icon: Truck, to: ADVISOR_PATHS.tools },
      { label: 'Cotizaciones', Icon: FileText },
      { label: 'Base RAG', Icon: BookOpen, to: `${ADVISOR_PATHS.tools}#rag` },
    ],
  },
  {
    title: 'Mi trabajo',
    items: [
      {
        label: 'Mis Tareas',
        Icon: ListChecks,
        to: ADVISOR_PATHS.tasks,
        count: (a) => a.tareas_pendientes,
      },
      { label: 'Reportes', Icon: ChartColumn },
    ],
  },
]

function Sidebar() {
  const advisor = useAdvisor()
  return (
    <aside className="hidden w-[280px] shrink-0 flex-col border-r bg-card lg:flex">
      <div className="flex h-[72px] items-center gap-2.5 px-4">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Truck className="size-[18px]" {...ICON} />
        </span>
        <div>
          <p className="text-sm font-semibold">TransLogix AI</p>
          <p className="text-xs text-muted-foreground">Módulo Asesor</p>
        </div>
      </div>
      <nav aria-label="Módulo asesor" className="flex-1 space-y-1 overflow-y-auto px-2">
        {SIDE_GROUPS.map((group) => (
          <div key={group.title} className="space-y-0.5">
            <p className="px-2 pt-3 pb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {group.title}
            </p>
            {group.items.map((item) => (
              <SideLink
                key={item.label}
                item={item}
                count={advisor.data && item.count?.(advisor.data)}
              />
            ))}
          </div>
        ))}
      </nav>
      <div className="flex items-center gap-3 border-t px-4 py-4">
        <AccountMenu up>
          <Avatar size="sm" />
        </AccountMenu>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{advisor.data?.nombre ?? 'Asesor'}</p>
          <StatusSelect />
        </div>
      </div>
    </aside>
  )
}

function SideLink({ item, count }: { item: SideItem; count: number | undefined }) {
  const { Icon } = item
  const base = 'flex h-10 items-center gap-2.5 rounded-lg px-2.5 text-sm transition'
  if (!item.to) {
    return (
      <span
        aria-disabled
        className={cn(base, 'cursor-not-allowed text-muted-foreground/70')}
        title="Próximamente"
      >
        <Icon className="size-[18px]" {...ICON} />
        {item.label}
      </span>
    )
  }
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        cn(
          base,
          isActive
            ? 'bg-primary-subtle font-medium text-primary'
            : 'text-foreground/85 hover:bg-muted',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon className="size-[18px]" {...ICON} />
          <span className="flex-1">{item.label}</span>
          {count !== undefined && (
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums',
                isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
              )}
            >
              {count}
            </span>
          )}
        </>
      )}
    </NavLink>
  )
}
