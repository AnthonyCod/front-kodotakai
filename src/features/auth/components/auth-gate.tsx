import { useEffect, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { AuthGateContext, type PendingAuth } from '../model/use-require-auth'
import { useSession } from '../model/use-session'
import { LoginForm } from './login-form'

/**
 * Pide login solo cuando hace falta (al guardar). Si ya hay sesión, la acción corre de una vez;
 * si no, abre la hoja de login y la acción corre al ingresar, sin perder lo que el usuario llenó.
 */
export function AuthGateProvider({ children }: { children: ReactNode }) {
  const { user } = useSession()
  const [pending, setPending] = useState<PendingAuth>()

  function request(next: PendingAuth) {
    if (user) next.action()
    else setPending(next)
  }

  return (
    <AuthGateContext.Provider value={request}>
      {children}
      {pending && (
        <LoginSheet
          reason={pending.reason}
          onClose={() => setPending(undefined)}
          onSuccess={() => {
            setPending(undefined)
            pending.action()
          }}
        />
      )}
    </AuthGateContext.Provider>
  )
}

/** Hoja desde abajo en móvil; ventana centrada en escritorio. */
function LoginSheet({
  reason,
  onClose,
  onSuccess,
}: {
  reason: string
  onClose: () => void
  onSuccess: () => void
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 bg-foreground/40 backdrop-blur-[2px]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-sheet-title"
        className="relative w-full max-w-sm space-y-4 rounded-t-[1.75rem] bg-card p-5 pb-[max(env(safe-area-inset-bottom),1.25rem)] shadow-card sm:rounded-[1.75rem]"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h2 id="login-sheet-title" className="text-lg font-medium">
              Ingresa a tu cuenta
            </h2>
            <p className="text-sm text-muted-foreground">{reason}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-foreground/70"
          >
            <X size={18} aria-hidden />
          </button>
        </div>
        <LoginForm onSuccess={onSuccess} />
      </div>
    </div>
  )
}
