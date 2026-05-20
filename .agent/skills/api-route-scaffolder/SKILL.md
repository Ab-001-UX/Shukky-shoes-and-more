# SKILL.md — API Route Scaffolder

Read this before creating any Express route in this project. Every route in Shukky follows the same structure, response envelope, and error handling pattern. This skill gives you the exact scaffold to use.

---

## Before Writing a Route

Answer these questions first:

1. What HTTP method and path does this route use?
2. Is it public, buyer-authenticated, or admin-only?
3. What does it receive in the request body or query params?
4. What does it return on success?
5. What can go wrong, and what error message does the user see?

---

## Route Checklist

Before marking a route complete:

- [ ] Read security.md — auth middleware applied correctly
- [ ] Rate limiting applied to public authentication routes (via `express-rate-limit`)
- [ ] Input validated before any database operation
- [ ] All Prisma calls wrapped in try/catch
- [ ] Errors return user-safe messages — no internal details exposed
- [ ] Success response uses the standard envelope: `{ success: true, data: {} }`
- [ ] Error response uses: `{ success: false, message: '' }`
- [ ] Correct HTTP status codes used
- [ ] Raw req.body never spread directly into a Prisma call
- [ ] Console.error called in catch with route context and error

---

## Standard Response Envelope

Every route returns this shape. No exceptions.

```js
// Success
res.json({ success: true, data: result })

// Created
res.status(201).json({ success: true, data: result })

// Client error
res.status(400).json({ success: false, message: 'Descriptive, user-safe message' })

// Unauthenticated
res.status(401).json({ success: false, message: 'Sign in to continue' })

// Unauthorized
res.status(403).json({ success: false, message: 'Access denied' })

// Not found
res.status(404).json({ success: false, message: 'Resource not found' })

// Server error
res.status(500).json({ success: false, message: 'Something went wrong. Try again.' })
```

---

## Route File Template

```js
// server/routes/resourceName.js
import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { authenticate } from '../middleware/authenticate.js'
import { adminOnly } from '../middleware/adminOnly.js'

const router = Router()

// GET all — public example (with pagination)
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 12 } = req.query

    const [items, total] = await Promise.all([
      prisma.resource.findMany({
        where: { status: 'ACTIVE' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.resource.count({ where: { status: 'ACTIVE' } })
    ])

    return res.json({ 
      success: true, 
      data: { items, total, page: Number(page), limit: Number(limit) } 
    })
  } catch (error) {
    console.error('[GET /resources]', error)
    return res.status(500).json({ success: false, message: 'Could not load items. Try again.' })
  }
})

// GET one — public example
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const item = await prisma.resource.findUnique({ where: { id } })

    if (!item) {
      return res.status(404).json({ success: false, message: 'Not found' })
    }

    return res.json({ success: true, data: item })
  } catch (error) {
    console.error('[GET /resources/:id]', error)
    return res.status(500).json({ success: false, message: 'Could not load item. Try again.' })
  }
})

// POST — authenticated example
router.post('/', authenticate, async (req, res) => {
  try {
    const { fieldOne, fieldTwo } = req.body

    if (!fieldOne || !fieldTwo) {
      return res.status(400).json({ success: false, message: 'All fields are required' })
    }

    const item = await prisma.resource.create({
      data: {
        fieldOne: fieldOne.trim(),
        fieldTwo: fieldTwo.trim(),
        userId: req.user.id,
      },
    })

    return res.status(201).json({ success: true, data: item })
  } catch (error) {
    console.error('[POST /resources]', error)
    return res.status(500).json({ success: false, message: 'Could not create item. Try again.' })
  }
})

// PATCH — admin only example
router.patch('/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const { id } = req.params
    const { fieldOne } = req.body

    const existing = await prisma.resource.findUnique({ where: { id } })

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Not found' })
    }

    const updated = await prisma.resource.update({
      where: { id },
      data: { ...(fieldOne && { fieldOne: fieldOne.trim() }) },
    })

    return res.json({ success: true, data: updated })
  } catch (error) {
    console.error('[PATCH /resources/:id]', error)
    return res.status(500).json({ success: false, message: 'Could not update item. Try again.' })
  }
})

// DELETE — admin only example
router.delete('/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const { id } = req.params

    const existing = await prisma.resource.findUnique({ where: { id } })

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Not found' })
    }

    await prisma.resource.delete({ where: { id } })

    return res.json({ success: true, data: { id } })
  } catch (error) {
    console.error('[DELETE /resources/:id]', error)
    return res.status(500).json({ success: false, message: 'Could not delete item. Try again.' })
  }
})

export default router
```

---

## Registering Routes in index.js

```js
// server/index.js
import authRoutes    from './routes/auth.js'
import productRoutes from './routes/products.js'
import orderRoutes   from './routes/orders.js'
import paymentRoutes from './routes/payment.js'
import adminRoutes   from './routes/admin.js'

app.use('/api/auth',     authRoutes)
app.use('/api/products', productRoutes)
app.use('/api/orders',   orderRoutes)
app.use('/api/payment',  paymentRoutes)
app.use('/api/admin',    adminRoutes)
```

---

## Authentication Middleware Usage

| Route type | Middleware |
|---|---|
| Public | No middleware |
| Buyer-authenticated | authenticate |
| Admin only | authenticate, adminOnly — in that order |

```js
// Public
router.get('/', async (req, res) => { ... })

// Buyer
router.post('/orders', authenticate, async (req, res) => { ... })

// Admin
router.get('/admin/orders', authenticate, adminOnly, async (req, res) => { ... })
```

Never check role inside a route handler. That is adminOnly.js's job.

---

## Input Validation Rules

- Destructure only the fields you expect — never spread req.body into Prisma
- Always trim string inputs
- Return 400 with a clear field-level message for missing required fields
- For numeric fields, use Number() to cast and check isNaN before using
- For price values remember the project stores prices in kobo (Int) — validate that input is a valid integer

```js
// Price validation example
const priceInKobo = Number(req.body.price)

if (!priceInKobo || isNaN(priceInKobo) || priceInKobo <= 0) {
  return res.status(400).json({ success: false, message: 'Enter a valid price' })
}
```

---

## HTTP Status Code Reference

| Code | When to use |
|---|---|
| 200 | Successful GET or PATCH |
| 201 | Successful POST (resource created) |
| 400 | Missing or invalid input from the client |
| 401 | No valid session / not logged in |
| 403 | Logged in but not allowed (wrong role) |
| 404 | Resource not found |
| 500 | Unexpected server or database error |
