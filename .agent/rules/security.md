---
trigger: always_on
---

# security.md — Shukky Shoes & More

This file defines every security requirement for this project. Follow every rule here for every route, middleware, data operation, and environment configuration you write.

---

## Authentication

### Password handling
- Hash all passwords with bcrypt at exactly 12 rounds before writing to the database
- Never store, log, or transmit plain-text passwords under any circumstance
- Use bcrypt.compare for verification — never compare plain text to hash directly

```js
import bcrypt from 'bcrypt'

// Registration
const hashed = await bcrypt.hash(password, 12)

// Login verification
const isValid = await bcrypt.compare(inputPassword, user.password)
```

### JWT
- Sign tokens with the JWT_SECRET environment variable — never hardcode a secret
- Set expiry to 7 days for buyer sessions, 24 hours for admin sessions
- Store JWTs in HTTP-only cookies only — never in localStorage or sessionStorage
- Cookie settings in production: httpOnly: true, secure: true, sameSite: 'strict'
- Cookie settings in development: httpOnly: true, secure: false, sameSite: 'lax'

```js
res.cookie('token', jwt, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
})
```

---

## Middleware

### authenticate.js
Runs on every protected route. Reads JWT from cookie, verifies it, and attaches user to req.user. Returns 401 if token is missing, invalid, or expired.

```js
import jwt from 'jsonwebtoken'
import prisma from '../lib/prisma.js'

export async function authenticate(req, res, next) {
  const token = req.cookies?.token

  if (!token) {
    return res.status(401).json({ success: false, message: 'Sign in to continue' })
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    const user = await prisma.user.findUnique({ where: { id: payload.userId } })

    if (!user) {
      return res.status(401).json({ success: false, message: 'Account not found' })
    }

    req.user = user
    next()
  } catch {
    return res.status(401).json({ success: false, message: 'Session expired. Sign in again.' })
  }
}
```

### adminOnly.js
Runs after authenticate on all /api/admin/* routes. Returns 403 if the authenticated user is not an ADMIN.

```js
export function adminOnly(req, res, next) {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ success: false, message: 'Access denied' })
  }
  next()
}
```

Apply both in order on admin routes:

```js
router.get('/orders', authenticate, adminOnly, async (req, res) => { ... })
```

---

## Flutterwave Webhook Security

The webhook endpoint at /api/payment/webhook is publicly accessible. Every incoming request must be verified using HMAC-SHA256 signature verification before processing.

> The v4 API uses the `flutterwave-signature` header with HMAC-SHA256 — not the old v3 `verif-hash` plain-text header.

```js
import crypto from 'crypto'

export function verifyFlutterwaveWebhook(req, res, next) {
  const signature = req.headers['flutterwave-signature']
  const secretHash = process.env.FLW_SECRET_HASH

  if (!signature || !secretHash) {
    return res.status(401).json({ success: false, message: 'Invalid webhook signature' })
  }

  const hash = crypto
    .createHmac('sha256', secretHash)
    .update(req.rawBody)
    .digest('base64')

  if (hash !== signature) {
    return res.status(401).json({ success: false, message: 'Invalid webhook signature' })
  }

  next()
}
```

> Express must capture the raw body for HMAC verification. See flutterwave-integration SKILL.md for the `express.json({ verify })` setup.

After signature verification, always verify the transaction status with Flutterwave's v4 verify API before updating the order — never trust the webhook payload alone.

```js
import { getFlutterwaveToken } from '../services/flutterwaveAuth.js'
import { FLW_BASE_URL } from '../config/flutterwave.js'

const token = await getFlutterwaveToken()
const response = await fetch(
  `${FLW_BASE_URL}/charges/${chargeId}`,
  {
    headers: { Authorization: `Bearer ${token}` },
  }
)
const result = await response.json()

if (result.data.status !== 'succeeded') {
  // Mark order as FAILED — do not fulfil
}
```

---

## Input Validation

Validate all incoming request bodies before touching the database. Never pass raw req.body directly into a Prisma query.

Required validation on every write route:
- Check that required fields exist and are the correct type
- Sanitize string inputs — trim whitespace
- Reject unexpected fields — do not spread req.body into Prisma calls
- Return 400 with a descriptive message for invalid input

```js
// Good
const { name, email, password } = req.body

if (!name || !email || !password) {
  return res.status(400).json({ success: false, message: 'All fields are required' })
}

if (typeof email !== 'string' || !email.includes('@')) {
  return res.status(400).json({ success: false, message: 'Enter a valid email address' })
}

// Bad — never do this
await prisma.user.create({ data: req.body })
```

---

## Error Handling

Never expose internal errors, stack traces, or database details to the client.

```js
// Good
try {
  // ...
} catch (error) {
  console.error('[CreateOrder]', error)
  return res.status(500).json({ success: false, message: 'Could not create order. Try again.' })
}

// Bad
} catch (error) {
  return res.status(500).json({ error: error.message }) // exposes internals
}
```

Log errors server-side with context (route name, relevant IDs). Never log passwords, tokens, or payment data.

---

## Environment Variables

- All secrets live in environment variables — never hardcoded in code
- The .env file is in .gitignore — never commit it
- Client-side variables use VITE_ prefix — only VITE_API_BASE_URL and VITE_FLUTTERWAVE_PUBLIC_KEY
- Never pass FLW_CLIENT_SECRET, FLW_SECRET_HASH, JWT_SECRET, database credentials, or any server secret to the client

---

## CORS

In production, restrict CORS to the exact Vercel frontend domain. In development, allow localhost.

```js
import cors from 'cors'

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.FRONTEND_URL
    : 'http://localhost:5173',
  credentials: true,
}))
```

---

## Rate Limiting

Apply rate limiting on auth routes to prevent brute-force attacks.

```js
import rateLimit from 'express-rate-limit'

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { success: false, message: 'Too many attempts. Try again in 15 minutes.' },
})

app.use('/api/auth', authLimiter)
```

---

## Admin Route Checklist

Before writing any admin route, verify all of the following:

- [ ] authenticate middleware is applied
- [ ] adminOnly middleware is applied after authenticate
- [ ] Input is validated before any database write
- [ ] Errors are caught and return user-safe messages
- [ ] No sensitive data (passwords, full tokens) in the response

---

## Payment Data Rules

- Never log full card numbers, CVVs, or raw payment payloads
- Never store Flutterwave transaction data beyond what is needed (txRef, status, amount)
- Always use Flutterwave's verify endpoint to confirm payment — never trust the webhook body alone
- Payment status in the database is only updated by the backend webhook handler — never by frontend input