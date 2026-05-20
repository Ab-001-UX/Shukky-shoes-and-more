# SKILL.md — Frontend Data Layer & State Management

Read this file before fetching any API data or adding global state to the React client. Shukky Shoes & More strictly separates **server state** (fetched via custom hooks) from **client state** (managed by Zustand).

---

## The Golden Rule

1. **Server Data:** Products, Orders, and Admin Data live in the database. Fetch them per-page using Custom Hooks. **Never** duplicate server data into Zustand.
2. **Client State:** Cart and Auth sessions live in the browser. Manage them with Zustand. **No Cart API exists** — the cart is 100% client-side with localStorage persistence.

---

## 1. Data Fetching (Custom Hooks)

Never call `api.get()` or use `useEffect` directly inside a UI component. Abstract all data fetching into custom hooks located in `src/hooks/`.

### Hook Scaffold

Every hook must return exactly three things: `data` (or the resource name), `isLoading`, and `error`.

```js
// hooks/useProducts.js
import { useState, useEffect, useCallback } from 'react'
import api from '../lib/api'

export function useProducts(category) {
  const [products, setProducts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchProducts = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const { data } = await api.get('/products', { params: { category } })
      setProducts(data.data) // Extract from { success: true, data: [...] } envelope
    } catch (err) {
      // Axios interceptor already formats this error string
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [category])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  return { products, isLoading, error, refetch: fetchProducts }
}
```

---

## 2. Component Implementation (The 3 States)

Every component consuming a data hook **must** explicitly handle loading, error, and empty states before rendering the main UI. 

- **Loading:** Show a `<Spinner />`
- **Error:** Show the error message and a retry button
- **Empty:** Show a user-friendly empty state with an icon (never an empty container)

```jsx
import { ShoppingBag } from 'lucide-react'
import Spinner from './ui/Spinner'
import ProductCard from './product/ProductCard'
import { useProducts } from '../hooks/useProducts'
import styles from './ProductGrid.module.css'

export default function ProductGrid({ category }) {
  const { products, isLoading, error, refetch } = useProducts(category)

  // 1. Loading State
  if (isLoading) return <Spinner />

  // 2. Error State
  if (error) return (
    <div className={styles.stateWrapper}>
      <p className={styles.errorMessage}>{error}</p>
      <button onClick={refetch} className={styles.retryButton}>
        Try again
      </button>
    </div>
  )

  // 3. Empty State
  if (products.length === 0) return (
    <div className={styles.stateWrapper}>
      <ShoppingBag className={styles.stateIcon} />
      <p className={styles.stateMessage}>No products found in this category.</p>
    </div>
  )

  // 4. Success State
  return (
    <div className={styles.grid}>
      {products.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}
```

---

## 3. Global State (Zustand)

Zustand is strictly reserved for `cartStore` and `authStore`. Do not use the React Context API.

### Cart Store Implementation
The cart must persist across browser sessions using Zustand's `persist` middleware.

```js
// store/cartStore.js
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],

      addItem(product) {
        const existing = get().items.find(i => i.id === product.id)
        if (existing) {
          set({
            items: get().items.map(i =>
              i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
            ),
          })
        } else {
          set({ items: [...get().items, { ...product, quantity: 1 }] })
        }
      },

      removeItem(id) {
        set({ items: get().items.filter(i => i.id !== id) })
      },

      clearCart() {
        set({ items: [] })
      },

      get total() {
        // Returns total in kobo
        return get().items.reduce((sum, i) => sum + i.price * i.quantity, 0)
      },

      get count() {
        return get().items.reduce((sum, i) => sum + i.quantity, 0)
      },
    }),
    { name: 'shukky-cart' } // localStorage key
  )
)
```

---

## 4. Axios Layer

All HTTP requests must go through the centralized Axios instance, which handles base URLs, credentials, and error formatting. **Never import `axios` directly into a hook or component.**

```js
// lib/api.js
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true, // Required for HTTP-only cookies (Auth)
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Safely extract the human-readable error from the API envelope
    const message = error.response?.data?.message || 'Something went wrong. Please try again.'
    return Promise.reject(new Error(message))
  }
)

export default api
```

---

## Summary Checklist
- [ ] No `useEffect` for data fetching directly inside components.
- [ ] Data hooks return `{ data, isLoading, error }`.
- [ ] Components handle `isLoading`, `error`, and empty states.
- [ ] Zustand is only used for Cart and Auth.
- [ ] Cart uses `persist` middleware.
- [ ] `lib/api.js` is used for all network calls.
