# SKILL.md — Component Builder

Read this before building any UI component for Shukky Shoes & More.

---

## Prerequisite: Semantic Token Layer

`tokens/theme.css` contains raw design tokens with verbose names. Before building components, ensure `src/styles/tokens.css` exists with these semantic aliases. This file imports `theme.css` and adds missing tokens (spacing, radius, shadows, sizing).

```css
/* src/styles/tokens.css — Semantic aliases over theme.css */
@import '../../tokens/theme.css';

:root {
  /* ── Color Aliases ── */
  --color-accent: var(--color-tertiary);
  --color-on-accent: var(--color-on-tertiary);
  --color-card: var(--color-surface-container-lowest);
  --color-muted: var(--color-on-surface-variant);
  --color-border: var(--color-outline-variant);
  --color-success: hsl(142, 76%, 36%);
  --color-success-subtle: hsla(142, 76%, 36%, 0.1);
  --color-error-subtle: hsla(2, 87%, 39%, 0.1);

  /* ── Font Shorthands ── */
  --font-heading: 'Playfair Display', serif;
  --font-body: 'Inter', sans-serif;

  /* ── Text Size Scale ── */
  --text-xs: 12px;
  --text-sm: var(--typography-body-small-font-size);   /* 14px */
  --text-base: var(--typography-body-medium-font-size); /* 16px */
  --text-lg: var(--typography-body-large-font-size);    /* 18px */
  --text-xl: var(--typography-title-medium-font-size);  /* 22px */
  --text-2xl: var(--typography-title-large-font-size);  /* 26px */
  --text-3xl: var(--typography-headline-small-font-size); /* 28px */

  /* ── Spacing (8pt grid) ── */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
  --space-12: 48px;
  --space-16: 64px;

  /* ── Border Radius ── */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-full: 9999px;

  /* ── Sizing ── */
  --height-button: 48px;
  --height-input: 48px;
  --height-touch: 44px;
  --height-header: 56px;
  --height-bottom-nav: 64px;

  /* ── Shadows ── */
  --shadow-card: 0 1px 4px rgba(0, 0, 0, 0.08);
  --shadow-nav: 0 -1px 4px rgba(0, 0, 0, 0.06);
  --shadow-focus-accent: 0 0 0 2px hsla(45, 61%, 28%, 0.25);
}
```

Every CSS variable in component code must trace back to either `theme.css` or this alias layer. If a token does not exist, ask before adding one.

---

## Before You Write a Single Line

Answer these four questions first:

1. Does this component already exist somewhere in `src/components/`?
2. Is this a primitive (Button, Input, Badge, Spinner) or a composed component (ProductCard, CartItem)?
3. What are the exact props this component receives?
4. What states does it need — loading, empty, error, disabled?

If you cannot answer all four, stop and clarify before writing.

---

## Component Checklist

Before marking a component complete, verify every item:

- [ ] `src/styles/tokens.css` exists and is imported in `global.css`
- [ ] Component has a paired `.module.css` file
- [ ] No inline styles anywhere
- [ ] No raw hex or rgba values in CSS — only `var(--token-name)`
- [ ] No raw pixel values outside the 8pt grid
- [ ] Mobile layout works at 375px
- [ ] Touch targets are minimum 44×44px on all interactive elements
- [ ] Loading state handled if the component fetches data
- [ ] Empty state handled if the component renders a list
- [ ] Error state handled if the component makes API calls
- [ ] Every `img` tag has a descriptive `alt` attribute
- [ ] No hardcoded price formatting — `formatPrice()` used
- [ ] No lorem ipsum — realistic Nigerian copy used
- [ ] Labels visible, focus states visible, icon-only buttons have `aria-label`
- [ ] Non-submit buttons have `type="button"`

---

## Component File Template

Every component is two files: a `.jsx` and a `.module.css`. Both required.

```jsx
// src/components/[category]/ComponentName.jsx
import { useState } from 'react'
import { IconName } from 'lucide-react'
import styles from './ComponentName.module.css'

export default function ComponentName({ prop1, prop2, onAction }) {
  const [isLoading, setIsLoading] = useState(false)

  const derivedValue = prop1 && prop2

  async function handleAction() {
    setIsLoading(true)
    try {
      await onAction()
    } catch (error) {
      // surface error to user
    } finally {
      setIsLoading(false)
    }
  }

  if (!prop1) return null

  return (
    <div className={styles.wrapper}>
      {/* content */}
    </div>
  )
}
```

```css
/* src/components/[category]/ComponentName.module.css */
.wrapper {
  background-color: var(--color-card);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
}
```

---

## Primitive Components

### Button.jsx

Props: `variant` (primary | accent | ghost), `isLoading`, `disabled`, `type`, `onClick`, `children`.

```jsx
import styles from './Button.module.css'

export default function Button({
  variant = 'primary',
  isLoading = false,
  disabled = false,
  type = 'button',
  onClick,
  children,
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`${styles.button} ${styles[variant]}`}
    >
      {isLoading ? 'Please wait...' : children}
    </button>
  )
}
```

```css
/* Button.module.css */
.button {
  display: block;
  width: 100%;
  height: var(--height-button);
  font-family: var(--font-body);
  font-size: var(--text-base);
  font-weight: 500;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.primary {
  background-color: var(--color-primary);
  color: var(--color-on-primary);
}

.primary:disabled {
  background-color: var(--color-muted);
}

.accent {
  background-color: var(--color-accent);
  color: var(--color-on-accent);
}

.ghost {
  background-color: transparent;
  color: var(--color-primary);
  border: 1px solid var(--color-border);
}

.ghost:hover {
  background-color: var(--color-surface);
}
```

### Input.jsx

Always renders label above input. Never placeholder-only.

```jsx
import styles from './Input.module.css'

export default function Input({ label, id, error, ...props }) {
  return (
    <div className={styles.wrapper}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <input
        id={id}
        className={`${styles.input} ${error ? styles.inputError : ''}`}
        aria-describedby={error ? `${id}-error` : undefined}
        {...props}
      />
      {error && (
        <p id={`${id}-error`} className={styles.errorMessage}>
          {error}
        </p>
      )}
    </div>
  )
}
```

```css
/* Input.module.css */
.wrapper {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.label {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-primary);
}

.input {
  height: var(--height-input);
  padding: 0 var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--text-base);
  font-family: var(--font-body);
  color: var(--color-on-surface);
  background-color: var(--color-card);
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.input::placeholder {
  color: var(--color-muted);
}

.input:focus {
  border-color: var(--color-accent);
  box-shadow: var(--shadow-focus-accent);
}

.inputError {
  border-color: var(--color-error);
}

.errorMessage {
  font-size: var(--text-xs);
  color: var(--color-error);
}
```

### Spinner.jsx

```jsx
import styles from './Spinner.module.css'

export default function Spinner() {
  return (
    <div className={styles.wrapper} role="status" aria-label="Loading">
      <div className={styles.spinner} />
    </div>
  )
}
```

```css
/* Spinner.module.css */
.wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-12) 0;
}

.spinner {
  width: var(--space-8);
  height: var(--space-8);
  border: 2px solid var(--color-border);
  border-top-color: var(--color-accent);
  border-radius: var(--radius-full);
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

### Badge.jsx

```jsx
import styles from './Badge.module.css'

export default function Badge({ variant = 'muted', children }) {
  return (
    <span className={`${styles.badge} ${styles[variant]}`}>
      {children}
    </span>
  )
}
```

```css
/* Badge.module.css */
.badge {
  display: inline-flex;
  align-items: center;
  padding: 2px var(--space-2);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: 500;
}

.success {
  background-color: var(--color-success-subtle);
  color: var(--color-success);
}

.error {
  background-color: var(--color-error-subtle);
  color: var(--color-error);
}

.muted {
  background-color: var(--color-border);
  color: var(--color-muted);
}
```

---

## Layout Components

### PageWrapper.jsx

Wraps every buyer-facing page. Handles header offset at top, bottom nav offset on mobile, and safe areas for notched devices.

Props: `children`, `hasBottomNav` (default true).

```jsx
import styles from './PageWrapper.module.css'

export default function PageWrapper({ children, hasBottomNav = true }) {
  return (
    <main className={`${styles.wrapper} ${hasBottomNav ? styles.withNav : ''}`}>
      {children}
    </main>
  )
}
```

```css
/* PageWrapper.module.css */
.wrapper {
  min-height: 100dvh;
  padding-top: calc(var(--height-header) + var(--space-4));
  padding-bottom: var(--space-4);
  padding-left: var(--space-4);
  padding-right: var(--space-4);
  background-color: var(--color-background);
}

.withNav {
  padding-bottom: calc(
    var(--height-bottom-nav) + var(--space-4) +
    env(safe-area-inset-bottom, 0px)
  );
}

@media (min-width: 1024px) {
  .wrapper {
    max-width: 1200px;
    margin: 0 auto;
    padding-left: var(--space-8);
    padding-right: var(--space-8);
  }
}
```

### Header.jsx

Fixed top bar. Brand name left, cart icon right on desktop.

Props: `cartCount` (number).

```jsx
import { ShoppingBag } from 'lucide-react'
import { Link } from 'react-router-dom'

import styles from './Header.module.css'

export default function Header({ cartCount = 0 }) {
  return (
    <header className={styles.header}>
      <Link to="/" className={styles.brand}>Shukky</Link>
      <Link
        to="/cart"
        className={styles.cartLink}
        aria-label={`Cart with ${cartCount} items`}
      >
        <ShoppingBag size={20} />
        {cartCount > 0 && (
          <span className={styles.cartBadge}>{cartCount}</span>
        )}
      </Link>
    </header>
  )
}
```

```css
/* Header.module.css */
.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--height-header);
  padding: 0 var(--space-4);
  background-color: var(--color-card);
  border-bottom: 1px solid var(--color-border);
  padding-top: env(safe-area-inset-top, 0px);
}

.brand {
  font-family: var(--font-heading);
  font-size: var(--text-xl);
  font-weight: 700;
  color: var(--color-primary);
  text-decoration: none;
}

.cartLink {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--height-touch);
  height: var(--height-touch);
  color: var(--color-primary);
}

.cartBadge {
  position: absolute;
  top: 4px;
  right: 4px;
  min-width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-accent);
  color: var(--color-on-accent);
  font-size: var(--text-xs);
  font-weight: 700;
  border-radius: var(--radius-full);
  padding: 0 var(--space-1);
}
```

### BottomNav.jsx

Fixed bottom bar on mobile. Four tabs: Home, Shop, Cart, Account. Hidden on desktop.

```jsx
import { Home, Grid3X3, ShoppingCart, User } from 'lucide-react'
import { NavLink } from 'react-router-dom'

import styles from './BottomNav.module.css'

const NAV_ITEMS = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/shop', icon: Grid3X3, label: 'Shop' },
  { to: '/cart', icon: ShoppingCart, label: 'Cart' },
  { to: '/account', icon: User, label: 'Account' },
]

export default function BottomNav() {
  return (
    <nav className={styles.nav} aria-label="Main navigation">
      {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `${styles.link} ${isActive ? styles.active : ''}`
          }
        >
          <Icon size={20} />
          <span className={styles.label}>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
```

```css
/* BottomNav.module.css */
.nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-around;
  height: var(--height-bottom-nav);
  background-color: var(--color-card);
  border-top: 1px solid var(--color-border);
  box-shadow: var(--shadow-nav);
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

.link {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
  min-width: var(--height-touch);
  min-height: var(--height-touch);
  justify-content: center;
  color: var(--color-muted);
  text-decoration: none;
  transition: color 0.15s ease;
}

.label {
  font-size: var(--text-xs);
  font-weight: 500;
}

.active {
  color: var(--color-accent);
}

@media (min-width: 1024px) {
  .nav {
    display: none;
  }
}
```

---

## Product Components

### ProductCard.jsx

Props: `product`, `onAddToCart`.

```jsx
import { formatPrice } from '../../utils/formatPrice'
import styles from './ProductCard.module.css'

export default function ProductCard({ product, onAddToCart }) {
  const isOutOfStock =
    product.stock === 0 || product.status === 'OUT_OF_STOCK'

  async function handleAddToCart() {
    if (isOutOfStock) return
    await onAddToCart(product)
  }

  return (
    <div className={styles.card}>
      <img
        src={`${product.images[0]}?w=400&q=auto&f=auto`}
        alt={product.name}
        loading="lazy"
        className={styles.image}
      />
      <div className={styles.body}>
        <h3 className={styles.name}>{product.name}</h3>
        <p className={styles.price}>{formatPrice(product.price)}</p>
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={isOutOfStock}
          className={styles.addButton}
        >
          {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
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

.body { padding: var(--space-4); }

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
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.addButton:hover { opacity: 0.9; }
.addButton:disabled {
  background-color: var(--color-muted);
  cursor: not-allowed;
}
```

### ProductGrid.jsx — Data-Fetching Pattern

Components that fetch data use a custom hook — never internal `useEffect`.

```jsx
import { useProducts } from '../../hooks/useProducts'
import Spinner from '../ui/Spinner'
import ProductCard from './ProductCard'
import styles from './ProductGrid.module.css'

export default function ProductGrid({ category }) {
  const { products, isLoading, error, refetch } = useProducts(category)

  if (isLoading) return <Spinner />

  if (error) return (
    <div className={styles.stateWrapper}>
      <p className={styles.stateMessage}>{error}</p>
      <button
        type="button"
        onClick={refetch}
        className={styles.retryBtn}
      >
        Try again
      </button>
    </div>
  )

  if (products.length === 0) return (
    <div className={styles.stateWrapper}>
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

```css
/* ProductGrid.module.css */
.grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-3);
  padding: 0 var(--space-4);
}

@media (min-width: 768px) {
  .grid { grid-template-columns: repeat(3, 1fr); }
}

@media (min-width: 1024px) {
  .grid { grid-template-columns: repeat(4, 1fr); }
}

.stateWrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-12) var(--space-4);
  text-align: center;
}

.stateMessage {
  color: var(--color-muted);
  font-size: var(--text-sm);
}

.retryBtn {
  margin-top: var(--space-3);
  background: none;
  border: none;
  color: var(--color-accent);
  font-size: var(--text-sm);
  font-weight: 500;
  text-decoration: underline;
  cursor: pointer;
  min-height: var(--height-touch);
}
```

The matching hook must expose a `refetch` callback — never use `window.location.reload()` since that destroys client state (cart, auth).

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
      const { data } = await api.get('/products', {
        params: { category },
      })
      setProducts(data.data)
    } catch {
      setError('Could not load products. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [category])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  return { products, isLoading, error, refetch: fetchProducts }
}
```

---

## Cart Components

Cart state lives in Zustand (`store/cartStore.js`), not on the server. These components read from and write to the cart store.

### CartItem.jsx

Props: `item` (product + quantity from cart store).

- Displays product image, name, price via `formatPrice()`, quantity controls
- Calls `useCartStore` actions: `updateQuantity(id, qty)`, `removeItem(id)`
- Quantity buttons must be minimum 44×44px touch targets
- Disable decrement at quantity 1 — show remove button instead

### CartSummary.jsx

Props: none — reads directly from `useCartStore`.

- Shows item count and total via `formatPrice()`
- Renders a "Proceed to Checkout" button (primary variant)
- Empty state: shopping bag icon + "Your cart is empty" + link to `/shop`

### CartDrawer.jsx

A slide-in overlay panel (right side on mobile, right side on desktop).

- Uses a `<dialog>` element or portal with backdrop
- Lists `CartItem` components for each item in the store
- Shows `CartSummary` at the bottom
- Close button with `aria-label="Close cart"`
- Trap focus while open

---

## Admin Components

All admin components live in `src/components/admin/`. Every admin page must be protected:

- **Frontend:** Check `authStore.user.role === 'ADMIN'` on mount. Redirect non-admins to `/`.
- **Backend:** Every `/api/admin/*` route uses both `authenticate` and `adminOnly` middleware.

### AdminHeader.jsx

- Shows "Admin" title and current page name
- Logout button that calls `/api/auth/logout` and clears `authStore`
- No bottom nav — admin uses a simple top header with page links

### OrderTable.jsx

Props: `orders`, `isLoading`, `onUpdateStatus`.

- Renders orders in a scrollable table (mobile: horizontal scroll)
- Columns: Order ID (truncated), Customer, Total (`formatPrice()`), Payment Status (Badge), Fulfillment Status (Badge), Date, Actions
- Empty state: "No orders yet"
- Loading state: Spinner

### ProductForm.jsx

Props: `product` (null for create, object for edit), `onSubmit`, `isSubmitting`.

- Fields: name, price (input in Naira, convert to kobo before submit), description, category (select), stock, images (Cloudinary upload)
- All inputs use the `Input` component
- Submit button uses `Button` with `type="submit"` and `isLoading={isSubmitting}`
- Validate required fields before calling `onSubmit`

---

## Common Mistakes to Avoid

- Do not use inline styles — CSS Modules only
- Do not hardcode hex or rgba values in CSS — always use `var(--token)`
- Do not write raw pixel values outside the 8pt grid
- Do not use placeholder-only inputs — always render a visible label
- Do not render an empty container when a list is empty — always render an empty state with a message and icon
- Do not use `index` as `key` in lists — always use a unique `id`
- Do not import Axios directly in components — use `lib/api.js`
- Do not format prices with string concatenation — always use `formatPrice()`
- Do not use `window.location.reload()` for retry — expose a `refetch` from the hook
- Do not omit `type="button"` on non-submit buttons inside forms
- Do not build admin components without verifying both `authenticate` and `adminOnly` middleware exist on the matching API route
- Do not reference token names that don't exist in `tokens.css` — check the alias layer first
