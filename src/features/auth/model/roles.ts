import type { Role, SessionUser } from '../api/auth-api'

export const ROLE_LABEL: Record<Role, string> = {
  USUARIO: 'Usuario',
  ENCARGADO: 'Encargado',
  ADMIN: 'Administrador',
}

const RANK: Record<Role, number> = { USUARIO: 0, ENCARGADO: 1, ADMIN: 2 }

/** Cada rol incluye los permisos de los de abajo: Admin ⊃ Encargado ⊃ Usuario. */
export const hasRole = (user: SessionUser | null | undefined, min: Role) =>
  !!user && RANK[user.rol] >= RANK[min]

/** Solo rutas internas de la app (evita redirigir a otro sitio con `?next=`). */
export const safeNext = (next: string | null) =>
  next && next.startsWith('/') && !next.startsWith('//') ? next : '/'
