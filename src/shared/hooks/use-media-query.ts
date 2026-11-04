import { useSyncExternalStore } from 'react'

/** `true` mientras la pantalla cumple la media query (p. ej. `(min-width: 64rem)` = `lg`). */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}
