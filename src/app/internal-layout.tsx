import { NavLink, Outlet } from 'react-router'
import { cn } from 'cn'

const ROUTES = [
  { to: '/interno/asesor', label: 'Asesor' },
  { to: '/interno/metricas', label: 'Métricas' },
  { to: '/', label: 'Ir a la app del cliente' },
]

/** Área interna (equipo TransLogix): bandeja de asesor y métricas. Sin diseño de cliente. */
export function InternalLayout() {
  return (
    <div className="flex h-dvh flex-col">
      <nav
        className="flex gap-1 overflow-x-auto border-b px-2 py-2 text-sm"
        aria-label="Área interna"
      >
        {ROUTES.map((route) => (
          <NavLink
            key={route.to}
            to={route.to}
            end
            className={({ isActive }) =>
              cn(
                'shrink-0 rounded border px-3 py-1',
                isActive ? 'font-semibold underline' : 'border-transparent',
              )
            }
          >
            {route.label}
          </NavLink>
        ))}
      </nav>
      <main className="min-h-0 flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
