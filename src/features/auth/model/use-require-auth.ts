import { createContext, useContext } from 'react'

export interface PendingAuth {
  reason: string
  action: () => void
}

export const AuthGateContext = createContext<((pending: PendingAuth) => void) | null>(null)

/** `requireAuth('Ingresa para guardar tu envío', guardar)`: corre ya o tras ingresar. */
export function useRequireAuth() {
  const request = useContext(AuthGateContext)
  if (!request) throw new Error('useRequireAuth necesita <AuthGateProvider>')
  return (reason: string, action: () => void) => request({ reason, action })
}
