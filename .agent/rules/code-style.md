---
trigger: always_on
---

# code-style.md — Shukky Shoes & More

This file defines every coding convention for this project. Follow it for every file you write. No exceptions.

---

## General Rules

- Use single quotes for strings in JavaScript and JSX
- Use 2-space indentation — no tabs
- No semicolons
- Trailing commas in multiline objects and arrays
- Max line length 90 characters — break long lines for readability
- Named exports for utilities and hooks. Default exports for components and pages.
- Files named in PascalCase for components (ProductCard.jsx). camelCase for everything else (formatPrice.js, useProducts.js).

---

## Styling Rules

- All styles are written in CSS Modules — one `.module.css` file per component
- All color, spacing, and typography values come from CSS custom properties defined in `src/styles/tokens.css`
- Never write inline styles
- Never write styles in a global CSS file unless they are resets, base typography, or token definitions
- Never hardcode hex values in component CSS — always reference a token variable
- Never hardcode pixel values that are not on the 8pt grid (multiples of 4px or 8px)
- Class names in CSS Modules use camelCase: `styles.productCard`, `styles.addToCartButton`

```css
/* Good — tokens.css values referenced */
.card {
  background-color: var(--color-card);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
}

/* Bad — hardcoded values */
.card {
  background-color: #ffffff;
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
}
```

---

## React Components

Every component follows this exact structure — in this order:

1. Imports (React, third-party, internal components, hooks/utils, styles)
2. Component function with destructured props
3. Internal state and refs
4. Derived values
5. Handler functions (prefixed with handle)
6. Early returns for loading, error, empty states
7. Main JSX return

```jsx
import { useState } from 'react'
import { ShoppingBag } from 'lucide-react'
import { formatPrice } from '../utils/formatPrice'
import styles from './ProductCard.module.css'

export default function ProductCard({ product, onAddToCart }) {
  const [isAdding, setIsAdding] = useState(false)

  const isOutOfStock = product.stock === 0 || product.status === 'OUT_OF_STOCK'
  const coverImage = product.images[0]

  async function handleAddToCart() {
    if (isOutOfStock) return
    setIsAdding(true)
    await onAddToCart(product)
    setIsAdding(false)
  }

  return (
    <div className={styles.card}>
      <img
        src={`${coverImage}?w=400&q=auto&f=auto`}
        alt={product.name}
        loading="lazy"
        className={styles.image}
      />
      <div className={styles.body}>
        <h3 className={styles.name}>{product.name}</h3>
        <p className={styles.price}>{formatPrice(product.price)}</p>
        <button
          onClick={handleAddToCart}
          disabled={isOutOfStock || isAdding}
          className={styles.addButton}
        >
          {isOutOfStock ? 'Out of Stock' : isAdding ? 'Adding...' : 'Add to Cart'}
        </button>
      </div>
    </div>
  )
}
```

```css
/* ProductCard.module.css */
.card {
  background-color: var(--color-card);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  overflow: hidden;
}

.image {
  width: 100%;
  height: 192px;
  object-fit: cover;
}

.body {
  padding: var(--space-4);
}

.name {
  font-family: var(--font-heading);
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--color-primary);
}

.price {
  font-weight: 700;
  color: var(--color-accent);
  margin-top: var(--space-1);
}

.addButton {
  width: 100%;
  height: var(--height-button);
  margin-top: var(--space-4);
  background-color: var(--color-primary);
  color: var(--color-on-primary);
  font-size: var(--text-base);
  font-weight: 500;
  border: none;
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.addButton:hover {
  opacity: 0.9;
}

.addButton:disabled {
  background-color: var(--color-muted);
  cursor: not-allowed;
}
```

### Component rules

- Props are always destructured in the function signature — never use props.x
- Boolean props use is or has prefix: isLoading, hasError, isOutOfStock
- Event handlers use handle prefix: handleSubmit, handleAddToCart, handleDelete
- Never use index as a key in lists — always use a unique id
- Never mutate state directly — always use the setter
- Avoid useEffect unless absolutely necessary. Fetch data in custom hooks.

---

## Loading, Error, and Empty States

Every component that fetches data must handle all three:

```jsx
import styles from './ProductGrid.module.css'

export default function ProductGrid() {
  const { products, isLoading, error, refetch } = useProducts()

  if (isLoading) return <Spinner />

  if (error) return (
    <div className={styles.stateWrapper}>
      <p className={styles.stateMessage}>{error}</p>
      <button onClick={refetch} className={styles.retryButton}>
        Try again
      </button>
    </div>
  )

  if (products.length === 0) return (
    <div className={styles.stateWrapper}>
      <ShoppingBag className={styles.stateIcon} />
      <p className={styles.stateMessage}>No products found</p>
    </div>
  )

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

## Responsive Styles

Mobile is always the base style. Tablet and desktop styles are added inside media queries below the mobile styles in the same `.module.css` file.

```css
/* Mobile first — base styles */
.grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-3);
  padding: 0 var(--space-4);
}

/* Tablet */
@media (min-width: 768px) {
  .grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
```

---

## Custom Hooks

All data fetching happens in custom hooks inside src/hooks/. Never fetch directly inside a component.

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
      setProducts(data.data)
    } catch {
      setError('Could not load products. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [category])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  // Always return refetch so components can retry without reloading the page
  return { products, isLoading, error, refetch: fetchProducts }
}
```

---

## API Layer

All HTTP calls go through the Axios instance in lib/api.js. Never call fetch() directly. Never import Axios directly into a component or hook.

```js
// lib/api.js
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || 'Something went wrong'
    return Promise.reject(new Error(message))
  }
)

export default api
```

---

## Price Formatting

Never format price inline. Always use formatPrice().

```js
// utils/formatPrice.js
export function formatPrice(amountInKobo) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
  }).format(amountInKobo / 100)
}
```

When sending price to Flutterwave, divide by 100 — Flutterwave expects Naira, not kobo.

---

## Zustand Stores

Stores live in src/store/. Each store is one file. Use the persist middleware for cart.

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
        return get().items.reduce((sum, i) => sum + i.price * i.quantity, 0)
      },

      get count() {
        return get().items.reduce((sum, i) => sum + i.quantity, 0)
      },
    }),
    { name: 'shukky-cart' }
  )
)
```

---

## Express Route Structure

Every Express route file follows this pattern. Business logic goes in services or Prisma calls inside the handler — not in separate controller files.

```js
// routes/products.js
import { Router } from 'express'
import prisma from '../lib/prisma.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const { category, page = 1, limit = 12 } = req.query
    const where = category ? { category, status: 'ACTIVE' } : { status: 'ACTIVE' }

    const products = await prisma.product.findMany({
      where,
      skip: (page - 1) * limit,
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
    })

    return res.json({ success: true, data: products })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ success: false, message: 'Failed to load products' })
  }
})

export default router
```

### Route rules

- Always wrap handler body in try/catch
- Always return after sending a response
- Never send Prisma errors directly to the client
- Error messages must be human-readable and safe to show in the UI
- Use 201 for resource creation, 200 for everything else, 400 for bad input, 401 for unauthenticated, 403 for unauthorized, 404 for not found, 500 for server errors

---

## TypeScript Note

This project uses JavaScript with JSX, not TypeScript. Do not introduce .ts or .tsx files or type annotations unless explicitly instructed.

---

## Comments

- Write comments only when the why is not obvious from the code
- Do not comment what the code does — comment why it does it that way
- Remove all TODO and FIXME comments before marking a task complete

---

## Imports Order

1. React and React ecosystem (react, react-router-dom)
2. Third-party libraries (lucide-react, axios)
3. Internal components (relative paths)
4. Internal hooks and utils (relative paths)
5. Store imports
6. CSS Module import (always last)

Separate each group with a blank line.