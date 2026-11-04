import { Navigate, useNavigate, useSearchParams } from 'react-router'
import { homeFor, safeNext } from '../model/roles'
import { useSession } from '../model/use-session'
import { LoginForm } from './login-form'

/** `/login`: al ingresar vuelve a la sección que pidió el login (`?next=`). */
export function LoginScreen() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useSession()
  const next = safeNext(params.get('next'))

  if (user) return <Navigate to={homeFor(user, next)} replace />

  return (
    <div className="mx-auto w-full max-w-sm space-y-6 px-3 py-8 sm:py-14">
      <header className="space-y-1">
        <h1 className="text-2xl font-medium">Ingresa a tu cuenta</h1>
        <p className="text-sm text-muted-foreground">
          Para guardar tus envíos y ver las secciones de tu equipo.
        </p>
      </header>
      <div className="rounded-[1.25rem] bg-card p-5 shadow-card">
        <LoginForm onSuccess={(u) => void navigate(homeFor(u, next), { replace: true })} />
      </div>
    </div>
  )
}
