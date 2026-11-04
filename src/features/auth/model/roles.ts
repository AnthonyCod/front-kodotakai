import type { Role, SessionUser } from '../api/auth-api'

export const ROLE_LABEL: Record<Role, string> = {
  USUARIO: 'Usuario',
  ENCARGADO: 'Encargado',
  ADMIN: 'Administrador',
  ASESOR: 'Asesor',
}

const RANK: Record<Role, number> = { USUARIO: 0, ASESOR: 0, ENCARGADO: 1, ADMIN: 2 }

/**
 * Cada rol incluye los permisos de los de abajo: Admin ⊃ Encargado ⊃ Usuario. El Asesor es
 * personal interno: su módulo lo ven el Asesor y el Admin.
 */
export const hasRole = (user: SessionUser | null | undefined, min: Role) => {
  if (!user) return false
  if (min === 'ASESOR') return user.rol === 'ASESOR' || user.rol === 'ADMIN'
  return RANK[user.rol] >= RANK[min]
}

/** A dónde va al ingresar sin `?next=`: el asesor entra directo a su módulo. */
export const homeFor = (user: SessionUser, next: string) =>
  next === '/' && user.rol === 'ASESOR' ? '/asesor' : next

/** Solo rutas internas de la app (evita redirigir a otro sitio con `?next=`). */
export const safeNext = (next: string | null) =>
  next && next.startsWith('/') && !next.startsWith('//') ? next : '/'
