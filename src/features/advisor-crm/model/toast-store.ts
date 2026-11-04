import { create } from 'zustand'

export interface Toast {
  id: string
  text: string
  /** «Deshacer»: revierte el cambio que mostró el toast. */
  undo?: () => void
}

interface ToastState {
  toasts: Toast[]
  show: (toast: Omit<Toast, 'id'>) => void
  dismiss: (id: string) => void
}

const TOAST_MS = 6000

/** Confirmaciones al mover de etapa o cerrar una venta. Máximo 2 a la vez, como en el diseño. */
export const useToasts = create<ToastState>((set, get) => ({
  toasts: [],
  show: (toast) => {
    const id = crypto.randomUUID()
    set((state) => ({ toasts: [...state.toasts.slice(-1), { ...toast, id }] }))
    window.setTimeout(() => get().dismiss(id), TOAST_MS)
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}))
