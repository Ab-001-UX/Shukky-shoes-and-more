import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      setIsOpen: (isOpen) => set({ isOpen }),

      addItem(product) {
        if (product.stock === 0 || product.status === 'OUT_OF_STOCK') return

        const cartItemId = product.selectedColor ? `${product.id}-${product.selectedColor}` : product.id

        const existing = get().items.find(i => i.cartItemId === cartItemId)
        if (existing) {
          set({
            items: get().items.map(i =>
              i.cartItemId === cartItemId ? { ...i, quantity: i.quantity + 1 } : i
            ),
          })
        } else {
          set({ items: [...get().items, { ...product, cartItemId, quantity: 1 }] })
        }
      },

      updateQuantity(cartItemId, delta) {
        set({
          items: get().items.map(i => {
            if (i.cartItemId === cartItemId) {
              const newQuantity = Math.max(1, i.quantity + delta)
              return { ...i, quantity: newQuantity }
            }
            return i
          }),
        })
      },

      removeItem(cartItemId) {
        set({ items: get().items.filter(i => i.cartItemId !== cartItemId) })
      },

      clearCart() {
        set({ items: [] })
      },

      get count() {
        return get().items.reduce((sum, i) => sum + i.quantity, 0)
      },

      get total() {
        return get().items.reduce((sum, i) => sum + i.price * i.quantity, 0)
      },
    }),
    { name: 'shukky-cart' }
  )
)
