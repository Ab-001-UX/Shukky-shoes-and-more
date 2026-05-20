# SKILL.md — Auth Flow

Read this before building any authentication, login, registration, or role-based access feature. This skill covers the full auth system for Shukky Shoes & More — from registration to protected routes, for both buyers and the admin.

---

## Overview

The project uses two roles: `BUYER` and `ADMIN`. JWTs are issued on login and stored in HTTP-only cookies. The frontend never stores tokens in localStorage. Role-based protection exists on both the frontend (redirect) and backend (middleware).

---

## Registration — `POST /api/auth/register`

```js
// server/routes/auth.js
import { Router } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import prisma from '../lib/prisma.js'

const router = Router()

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required' })
    }

    if (typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ success: false, message: 'Enter a valid email address' })
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' })
    }

    const existing = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } })
    if (existing) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists' })
    }

    const hashed = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: hashed,
        role: 'BUYER', // All self-registered users are buyers
      },
    })

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' })

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })

    return res.status(201).json({
      success: true,
      data: { id: user.id, name: user.name, email: user.email, role: user.role },
    })
  } catch (error) {
    console.error('[POST /auth/register]', error)
    return res.status(500).json({ success: false, message: 'Could not create account. Try again.' })
  }
})
```

---

## Login — `POST /api/auth/login`

```js
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' })
    }

    const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } })

    if (!user) {
      // Use the same message for both "not found" and "wrong password" — prevents email enumeration
      return res.status(401).json({ success: false, message: 'Incorrect email or password' })
    }

    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Incorrect email or password' })
    }

    // Admin tokens expire sooner — 24 hours
    const expiresIn = user.role === 'ADMIN' ? '24h' : '7d'
    const maxAge = user.role === 'ADMIN'
      ? 24 * 60 * 60 * 1000
      : 7 * 24 * 60 * 60 * 1000

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn })

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge,
    })

    return res.json({
      success: true,
      data: { id: user.id, name: user.name, email: user.email, role: user.role },
    })
  } catch (error) {
    console.error('[POST /auth/login]', error)
    return res.status(500).json({ success: false, message: 'Could not sign in. Try again.' })
  }
})
```

---

## Logout — `POST /api/auth/logout`

```js
router.post('/logout', (req, res) => {
  res.clearCookie('token')
  return res.json({ success: true, data: null })
})

export default router
```

---

## Session Check — `GET /api/auth/me`

Used by the frontend to hydrate the auth store on app load.

```js
import { authenticate } from '../middleware/authenticate.js'

router.get('/me', authenticate, (req, res) => {
  const { id, name, email, role } = req.user
  return res.json({ success: true, data: { id, name, email, role } })
})
```

---

## Auth Store (Frontend)

```js
// store/authStore.js
import { create } from 'zustand'
import api from '../lib/api'

export const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true, // true until /me resolves on app load

  async hydrate() {
    try {
      const { data } = await api.get('/auth/me')
      set({ user: data.data, isAuthenticated: true, isLoading: false })
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false })
    }
  },

  setUser(user) {
    set({ user, isAuthenticated: true })
  },

  logout() {
    set({ user: null, isAuthenticated: false })
  },
}))
```

Call `hydrate()` once in `App.jsx` on mount:

```jsx
// App.jsx
import { useEffect } from 'react'
import { useAuthStore } from './store/authStore'

export default function App() {
  const hydrate = useAuthStore(state => state.hydrate)

  useEffect(() => {
    hydrate()
  }, [hydrate])

  // ... routes
}
```

---

## Frontend Route Protection

### Buyer-only pages (e.g. Checkout, OrderConfirmation)

Redirect to `/login` if not authenticated.

```jsx
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import Spinner from '../components/ui/Spinner'

export default function RequireAuth({ children }) {
  const { isAuthenticated, isLoading } = useAuthStore()

  if (isLoading) return <Spinner />
  if (!isAuthenticated) return <Navigate to="/login" replace />

  return children
}
```

### Admin-only pages

Redirect non-admins to `/` on mount.

```jsx
export default function RequireAdmin({ children }) {
  const { user, isLoading } = useAuthStore()

  if (isLoading) return <Spinner />
  if (!user || user.role !== 'ADMIN') return <Navigate to="/" replace />

  return children
}
```

### Usage in router

```jsx
// App.jsx route definitions
<Route path="/checkout" element={
  <RequireAuth><Checkout /></RequireAuth>
} />

<Route path="/admin/*" element={
  <RequireAdmin><AdminDashboard /></RequireAdmin>
} />
```

---

## Login Page

```jsx
// pages/Login.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import api from '../lib/api'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import styles from './Login.module.css'

export default function Login() {
  const navigate = useNavigate()
  const setUser = useAuthStore(state => state.setUser)

  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const { data } = await api.post('/auth/login', form)
      setUser(data.data)

      // Redirect admin to dashboard, buyers to home
      navigate(data.data.role === 'ADMIN' ? '/admin' : '/')
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Sign In</h1>
      <form onSubmit={handleSubmit} className={styles.form}>
        <Input label="Email" id="email" name="email" type="email"
          value={form.email} onChange={handleChange} />
        <Input label="Password" id="password" name="password" type="password"
          value={form.password} onChange={handleChange} />
        {error && <p className={styles.error}>{error}</p>}
        <Button type="submit" isLoading={isLoading}>Sign In</Button>
      </form>
    </div>
  )
}
```

---

## Auth Security Rules (Summary)

| Rule | Detail |
|---|---|
| Password hashing | bcrypt at 12 rounds — always |
| JWT storage | HTTP-only cookie only — never localStorage |
| Token expiry | Buyer: 7 days, Admin: 24 hours |
| Error messages | Never distinguish "email not found" from "wrong password" |
| Never expose password | Never return the `password` field from any route |
| Admin creation | Admin accounts created only via seed script or direct DB — never via public registration |
| Role check | Always checked server-side via `adminOnly` middleware — never trust frontend role alone |

---

## Auth Checklist

- [ ] `/api/auth/me` called on app load to hydrate `authStore`
- [ ] JWT stored in HTTP-only cookie — never localStorage
- [ ] bcrypt used at 12 rounds for hashing
- [ ] Login error message does not distinguish between wrong email and wrong password
- [ ] `RequireAuth` wrapper used on buyer-protected pages
- [ ] `RequireAdmin` wrapper used on all `/admin/*` pages
- [ ] `authenticate` middleware applied on all protected backend routes
- [ ] `adminOnly` middleware applied after `authenticate` on all `/api/admin/*` routes
- [ ] `password` field never included in any API response
- [ ] Admin accounts never creatable via `/api/auth/register`
