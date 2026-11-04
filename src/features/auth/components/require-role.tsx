import type { ReactNode } from 'react'
import { Link, Navigate, useLocation } from 'react-router'
import { GLASS } from '@/shared/ui/glass'
import { EmptyResult } from '@/shared/ui/metric'
import type { Role } from '../api/auth-api'
import { hasRole, ROLE_LABEL } from '../model/roles'
import { useSession } from '../model/use-session'

/**
 * Protege una ruta por rol. Es solo para la interfaz: el backend debe validar el rol en cada
 * endpoint.
 */
export function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { user, isLoading } = useSession()
  const location = useLocation()

  if (isLoading) return <p className="p-6 text-center text-sm text-muted-foreground">Cargando…</p>

  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?next=${next}`} replace />
  }

  if (!hasRole(user, role))
    return (
      <div className="mx-auto w-full max-w-3xl px-3 py-6 sm:px-6">
        <EmptyResult>
          <div className="space-y-3">
            <p>Para entrar aquí necesitas el rol {ROLE_LABEL[role]} o superior.</p>
            <Link to="/" className={`${GLASS} rounded-full px-4 py-2 text-foreground`}>
              Volver al inicio
            </Link>
          </div>
        </EmptyResult>
      </div>
    )

  return children
}
