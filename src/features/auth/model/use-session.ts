import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchSessionUser, login, logout, type SessionUser } from '../api/auth-api'

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
