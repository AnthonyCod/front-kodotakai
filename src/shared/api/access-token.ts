import type { CallOptions } from './http-client'

/**
 * Token personal del backend 1.7.0 (`tlxs_…` del personal, `tlx_…` de un cliente B2B) con el
 * correo con el que se ingresó. Vive en sessionStorage: se borra al cerrar la pestaña. Nunca va en
 * el bundle ni en variables `VITE_`.
 */
export interface Access {
  token: string
  email: string
}

const KEY = 'tlx.access'

export function getAccess(): Access | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    const value = JSON.parse(raw) as Partial<Access>
    return typeof value.token === 'string' && typeof value.email === 'string'
      ? { token: value.token, email: value.email }
      : null
  } catch {
    return null
  }
}

export function setAccess(access: Access | null) {
  try {
    if (access) sessionStorage.setItem(KEY, JSON.stringify(access))
    else sessionStorage.removeItem(KEY)
  } catch {
    // Sin sessionStorage (modo privado estricto): la sesión dura lo que dure la página.
  }
}

/** Cabecera `Authorization: Bearer` para las rutas protegidas. */
export const bearer = (token = getAccess()?.token): CallOptions =>
  token ? { headers: { Authorization: `Bearer ${token}` } } : {}
