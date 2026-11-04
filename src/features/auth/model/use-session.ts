import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { toApiError } from '@/shared/api'
import { fetchSessionUser, forgetAccess, login, logout, type SessionUser } from '../api/auth-api'

const SESSION_KEY = ['auth', 'session'] as const

/** Usuario con sesión, o `null`. Si `/auth/me` falla (401, sin backend), se trata como sin sesión. */
export function useSession() {
  const query = useQuery({
    queryKey: SESSION_KEY,
    queryFn: () => fetchSessionUser().catch((): SessionUser | null => null),
    retry: false,
    staleTime: 5 * 60_000,
  })
  return { user: query.data ?? null, isLoading: query.isPending }
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: login,
    onSuccess: (user) => queryClient.setQueryData(SESSION_KEY, user),
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: logout,
    // Aunque el backend falle, en este dispositivo la sesión se cierra.
    onSettled: () => queryClient.setQueryData(SESSION_KEY, null),
  })
}

/**
 * Para la caché de consultas: un 401 con token personal significa que venció o fue revocado.
 * Se olvida el token y la sesión queda vacía, así `RequireRole` manda al login.
 */
export function expireSessionOn401(error: unknown, queryClient: QueryClient) {
  if (toApiError(error).status !== 401) return
  const user = queryClient.getQueryData<SessionUser | null>(SESSION_KEY)
  if (!user?.staff_user_id && !user?.roles) return
  forgetAccess()
  queryClient.setQueryData(SESSION_KEY, null)
}
