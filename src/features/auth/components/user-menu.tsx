import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { LogOut, UserRound } from 'lucide-react'
import { cn } from 'cn'
import { GLASS } from '@/shared/ui/glass'
import type { Role } from '../api/auth-api'
import { hasRole, ROLE_LABEL } from '../model/roles'
import { useLogout, useSession } from '../model/use-session'

/** Secciones según el rol. */
const TEAM_LINKS: { to: string; label: string; role: Role }[] = [
  { to: '/mis-envios', label: 'Mis envíos', role: 'USUARIO' },
  { to: '/admin', label: 'Inteligencia de negocio', role: 'ADMIN' },
  { to: '/admin/tarifas', label: 'Tarifas', role: 'ADMIN' },
]

const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('')

/** Cabecera: "Ingresar" sin sesión; con sesión, iniciales y menú con lo que su rol permite. */
export function UserMenu() {
  const { user, isLoading } = useSession()
  const logout = useLogout()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false)
    window.addEventListener('pointerdown', onPointer)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onPointer)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (isLoading) return <span className="size-9 shrink-0" aria-hidden />

  if (!user) {
    if (location.pathname === '/login') return null
    const next = encodeURIComponent(location.pathname + location.search)
    return (
      <Link
        to={`/login?next=${next}`}
        aria-label="Ingresar"
        className={cn(
          GLASS,
          'flex size-9 shrink-0 items-center justify-center gap-1.5 rounded-full text-sm sm:w-auto sm:px-3',
        )}
      >
        <UserRound size={16} aria-hidden />
        <span className="hidden sm:inline">Ingresar</span>
      </Link>
    )
  }

  const links = TEAM_LINKS.filter((link) => hasRole(user, link.role))

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Cuenta de ${user.nombre}`}
        className="grid size-9 place-items-center rounded-full bg-brand-deep text-sm font-medium text-brand-foreground shadow-card"
      >
        {initials(user.nombre)}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-2 w-64 space-y-1 rounded-[1.25rem] bg-card p-2 shadow-card"
        >
          <div className="px-3 py-2">
            <p className="truncate font-medium">{user.nombre}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            <span className="mt-1.5 inline-block rounded-full bg-muted px-2.5 py-0.5 text-xs text-foreground/75">
              {ROLE_LABEL[user.rol]}
            </span>
          </div>
          {links.length > 0 && (
            <div className="border-t pt-1">
              {links.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="block rounded-xl px-3 py-2 text-sm hover:bg-muted"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          )}
          <div className="border-t pt-1">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                logout.mutate()
              }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/5"
            >
              <LogOut size={16} aria-hidden />
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
