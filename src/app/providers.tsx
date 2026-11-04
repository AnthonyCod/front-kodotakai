import { useState, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthGateProvider } from '@/features/auth'
import { ChatBlockActionsProvider } from '@/features/chat'
import { BlockRegistryProvider } from '@/shared/blocks'
import { blockRegistry } from './block-registry'

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
      }),
  )

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
