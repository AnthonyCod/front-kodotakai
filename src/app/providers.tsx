import { useState, type ReactNode } from 'react'
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthGateProvider, expireSessionOn401 } from '@/features/auth'
import { ChatBlockActionsProvider } from '@/features/chat'
import { BlockRegistryProvider } from '@/shared/blocks'
import { blockRegistry } from './block-registry'

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => {
    // Token vencido o revocado en cualquier consulta: vuelve al login.
    const onError = (error: unknown) => expireSessionOn401(error, client)
    const client: QueryClient = new QueryClient({
      queryCache: new QueryCache({ onError }),
      mutationCache: new MutationCache({ onError }),
      defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
    })
    return client
  })

  return (
    <QueryClientProvider client={queryClient}>
      <BlockRegistryProvider registry={blockRegistry}>
        <AuthGateProvider>
          <ChatBlockActionsProvider>{children}</ChatBlockActionsProvider>
        </AuthGateProvider>
      </BlockRegistryProvider>
    </QueryClientProvider>
  )
}
