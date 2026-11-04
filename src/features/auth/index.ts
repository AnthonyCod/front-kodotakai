// API pública de la feature auth: sesión, login y permisos por rol (contrato por confirmar).
export { WITH_SESSION, type Role, type SessionUser } from './api/auth-api'
export { useSession } from './model/use-session'
export { AuthGateProvider } from './components/auth-gate'
export { useRequireAuth } from './model/use-require-auth'
export { LoginScreen } from './components/login-screen'
export { RequireRole } from './components/require-role'
export { UserMenu } from './components/user-menu'
