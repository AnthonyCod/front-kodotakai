const STORAGE_KEY = 'tlx.client_id'

let memoryFallback: string | null = null

/**
 * UUID v4 estable del navegador: es la identidad del cliente ante el backend (no hay login).
 * Credencial débil: nunca va en URLs ni en logs.
 */
export function getClientId(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return stored
    const id = crypto.randomUUID()
    localStorage.setItem(STORAGE_KEY, id)
    return id
  } catch {
    // Almacenamiento bloqueado (modo privado estricto): dura lo que dure la pestaña.
    memoryFallback ??= crypto.randomUUID()
    return memoryFallback
  }
}

/**
 * El backend reutiliza la última sesión abierta (< 30 min) de un `client_id` aunque no se le envíe
 * `session_id`, y Web Chat no tiene cómo cerrarla. Para un chat realmente nuevo se cambia de id.
 */
export function rotateClientId(): string {
  const id = crypto.randomUUID()
  memoryFallback = id
  try {
    localStorage.setItem(STORAGE_KEY, id)
  } catch {
    // Sin almacenamiento: queda el de memoria.
  }
  return id
}
