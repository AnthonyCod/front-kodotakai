import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { ResultSummary } from '@/shared/ui/form-styles'

export type QueryKind = 'TRACKING' | 'QUOTE' | 'PQRS'

export interface QueryEntry extends ResultSummary {
  id: string
  kind: QueryKind
  at: string
}

interface QueryHistoryState {
  entries: QueryEntry[]
  add: (kind: QueryKind, result: ResultSummary) => void
  clear: () => void
}

/** Consultas hechas en esta pestaña (el backend no lista el historial de un cliente). */
export const useQueryHistoryStore = create<QueryHistoryState>()(
  persist(
    (set) => ({
      entries: [],
      add: (kind, result) =>
        set((state) => ({
          entries: [
            { ...result, kind, id: crypto.randomUUID(), at: new Date().toISOString() },
            ...state.entries,
          ].slice(0, 50),
        })),
      clear: () => set({ entries: [] }),
    }),
    { name: 'translogix-queries', storage: createJSONStorage(() => sessionStorage) },
  ),
)
