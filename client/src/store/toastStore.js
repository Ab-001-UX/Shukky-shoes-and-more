import { create } from 'zustand'

export const useToastStore = create((set, get) => ({
  toasts: [],

  showToast(message, type = 'success') {
    const id = Date.now()
    set({ toasts: [...get().toasts, { id, message, type }] })
    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      set({ toasts: get().toasts.filter(t => t.id !== id) })
    }, 4000)
  },

  dismissToast(id) {
    set({ toasts: get().toasts.filter(t => t.id !== id) })
  },
}))
