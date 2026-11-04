import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/** Lo que el usuario dejó en Sucursales (sucursal elegida, tarjeta abierta) no se pierde al navegar. */
interface BranchesViewState {
  activeIndex: number
  expanded: boolean
  setActiveIndex: (index: number) => void
  toggleExpanded: () => void
}

export const useBranchesViewStore = create<BranchesViewState>()(
  persist(
    (set) => ({
      activeIndex: 0,
      expanded: true,
      setActiveIndex: (activeIndex) => set({ activeIndex }),
      toggleExpanded: () => set((state) => ({ expanded: !state.expanded })),
    }),
    { name: 'translogix-branches-view', storage: createJSONStorage(() => sessionStorage) },
  ),
)
