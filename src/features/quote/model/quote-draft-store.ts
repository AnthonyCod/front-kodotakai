import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { QuoteRequest } from '../api/quote-api'

/** F50: lo que el usuario lleva escrito en el formulario no se pierde al navegar o recargar. */
interface QuoteDraftState {
  draft: Partial<QuoteRequest>
  setField: <K extends keyof QuoteRequest>(field: K, value: QuoteRequest[K]) => void
  reset: () => void
}

export const useQuoteDraftStore = create<QuoteDraftState>()(
  persist(
    (set) => ({
      draft: {},
      setField: (field, value) => set((state) => ({ draft: { ...state.draft, [field]: value } })),
      reset: () => set({ draft: {} }),
    }),
    { name: 'translogix-quote-draft', storage: createJSONStorage(() => sessionStorage) },
  ),
)
