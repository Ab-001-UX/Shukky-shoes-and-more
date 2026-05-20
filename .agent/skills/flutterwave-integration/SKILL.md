# SKILL.md — Flutterwave Integration

Read this file completely before writing any payment-related code. This skill covers the complete Flutterwave integration for Shukky Shoes & More — from authentication to order creation to webhook verification to email triggering.

> **Source:** Based on the official Flutterwave v4 documentation at https://developer.flutterwave.com/docs
> **Last audited:** May 2026

---

## Overview

Flutterwave is the only payment method. The integration uses:

- **Flutterwave v4 API** with **OAuth 2.0** for server-side authentication
- **Flutterwave Inline v3 widget** (`checkout.flutterwave.com/v3.js`) for client-side payment collection
- **Webhook with HMAC-SHA256 signature verification** as the source of truth — never the frontend redirect

---

## API Versions — Critical Distinction

Flutterwave currently has two API versions in use. This project uses a **hybrid approach**:

| Layer | API Version | Why |
|---|---|---|
| **Client-side widget** | v3 Inline (`checkout.flutterwave.com/v3.js`) | The inline widget is still v3-based, uses `public_key` directly |
| **Server-side verification** | v4 (`developersandbox-api.flutterwave.com` / `f4bexperience.flutterwave.com`) | OAuth 2.0 access tokens, HMAC-SHA256 webhook signatures |

Do not confuse these. The client widget uses the public key directly; the server uses OAuth tokens.

---

## Environments

| Environment | Base URL | Purpose |
|---|---|---|
| **Sandbox (Test)** | `https://developersandbox-api.flutterwave.com` | All development and testing — no real money moves |
| **Production (Live)** | `https://f4bexperience.flutterwave.com` | Real transactions after KYC approval |
| **OAuth Token URL** | `https://idp.flutterwave.com/realms/flutterwave/protocol/openid-connect/token` | Same for both sandbox and production |

> Test data is archived after 30 days and cannot be recovered.

---

## Flow Summary

```
Checkout form filled
      ↓
POST /api/orders → PENDING order created, txRef returned
      ↓
Flutterwave inline widget initialized (client-side, v3)
      ↓
Buyer completes payment in widget
      ↓
Flutterwave → POST /api/payment/webhook (server-side, v4)
Flutterwave → redirect to /order-confirmation/:orderId (client-side)
      ↓
Webhook verifies signature (HMAC-SHA256)
      ↓
Server verifies transaction via Flutterwave v4 Retrieve Charge endpoint
      ↓
Verify: status === 'succeeded', amount matches, currency === 'NGN', reference matches
      ↓
Order updated to SUCCESS or FAILED
Stock decremented, emails sent (on SUCCESS only)
      ↓
OrderConfirmation page fetches order status and renders result
```

---

## Authentication — OAuth 2.0 (Server Only)

Flutterwave v4 uses OAuth 2.0 client credentials. You must generate a short-lived access token before making any server-side API call.

### Token Generation

```js
// server/services/flutterwaveAuth.js
import axios from 'axios'

const TOKEN_URL = 'https://idp.flutterwave.com/realms/flutterwave/protocol/openid-connect/token'

let accessToken = null
let expiresAt = 0

export async function getFlutterwaveToken() {
  const now = Date.now()

  // Refresh if token is missing or expires within 60 seconds
  if (!accessToken || now >= expiresAt - 60000) {
    const response = await axios.post(
      TOKEN_URL,
      new URLSearchParams({
        client_id: process.env.FLW_CLIENT_ID,
        client_secret: process.env.FLW_CLIENT_SECRET,
        grant_type: 'client_credentials',
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    )

    accessToken = response.data.access_token
    // Token is valid for response.data.expires_in seconds (typically 600 = 10 min)
    expiresAt = now + response.data.expires_in * 1000
  }

  return accessToken
}
```

### Key Rules

- Tokens expire in **10 minutes** (`expires_in: 600`)
- Refresh at least **1 minute before expiry** to avoid failed requests
- **Never expose** `FLW_CLIENT_ID` or `FLW_CLIENT_SECRET` to the frontend
- The same OAuth URL works for both sandbox and production — the credentials determine which environment you access
- Store the token **in memory on the server only** — never in a database or cache that could leak

---

## Environment Variables

```env
# Server — Flutterwave OAuth credentials
FLW_CLIENT_ID=               # From Flutterwave dashboard → API Keys
FLW_CLIENT_SECRET=           # From Flutterwave dashboard → API Keys
FLW_SECRET_HASH=             # Your chosen secret hash — set in Flutterwave dashboard → Webhooks
FLW_BASE_URL=                # https://developersandbox-api.flutterwave.com (test) or https://f4bexperience.flutterwave.com (prod)

# Client (Vite — VITE_ prefix required)
VITE_FLUTTERWAVE_PUBLIC_KEY= # For the inline checkout widget (v3)
```

### Environment Switching

```js
// server/config/flutterwave.js
const isProd = process.env.NODE_ENV === 'production'

export const FLW_BASE_URL = isProd
  ? 'https://f4bexperience.flutterwave.com'
  : 'https://developersandbox-api.flutterwave.com'
```

---

## Step 1 — Creating the Order (Server)

The order is created before payment. Delivery details are saved first, then the order row is created with paymentStatus PENDING and a generated txRef.

```js
// routes/orders.js
import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import prisma from '../lib/prisma.js'
import { authenticate } from '../middleware/authenticate.js'

const router = Router()

router.post('/', authenticate, async (req, res) => {
  try {
    const { items, deliveryDetails } = req.body

    if (!items || !items.length || !deliveryDetails) {
      return res.status(400).json({
        success: false,
        message: 'Order details are incomplete',
      })
    }

    const productIds = items.map(i => i.productId)
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, status: 'ACTIVE' },
    })

    if (products.length !== items.length) {
      return res.status(400).json({
        success: false,
        message: 'One or more products are unavailable',
      })
    }

    // Verify stock availability for each item
    for (const item of items) {
      const product = products.find(p => p.id === item.productId)
      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `${product.name} only has ${product.stock} left in stock`,
        })
      }
    }

    // totalAmount is in kobo (Int)
    const totalAmount = items.reduce((sum, item) => {
      const product = products.find(p => p.id === item.productId)
      return sum + product.price * item.quantity
    }, 0)

    const txRef = `shukky-${uuid()}`

    const delivery = await prisma.deliveryDetails.create({
      data: {
        fullName: deliveryDetails.fullName.trim(),
        phone: deliveryDetails.phone.trim(),
        address: deliveryDetails.address.trim(),
        city: deliveryDetails.city.trim(),
        state: deliveryDetails.state.trim(),
        notes: deliveryDetails.notes?.trim() || null,
      },
    })

    const order = await prisma.order.create({
      data: {
        userId: req.user?.id || null,
        totalAmount,
        flutterwaveTxRef: txRef,
        deliveryDetailsId: delivery.id,
        items: {
          create: items.map(item => {
            const product = products.find(p => p.id === item.productId)
            return {
              productId: item.productId,
              quantity: item.quantity,
              price: product.price,
            }
          }),
        },
      },
    })

    return res.status(201).json({
      success: true,
      data: { orderId: order.id, txRef, totalAmount },
    })
  } catch (error) {
    console.error('[CreateOrder]', error)
    return res.status(500).json({
      success: false,
      message: 'Could not create order. Try again.',
    })
  }
})

export default router
```

---

## Step 2 — Initializing the Widget (Client)

Load the Flutterwave inline v3 script dynamically only on the Checkout page — never on app init.

```js
// lib/flutterwave.js

export function loadFlutterwaveScript() {
  return new Promise((resolve, reject) => {
    if (document.getElementById('flutterwave-script')) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.id = 'flutterwave-script'
    script.src = 'https://checkout.flutterwave.com/v3.js'
    script.onload = resolve
    script.onerror = reject
    document.body.appendChild(script)
  })
}

export function initializePayment({
  txRef,
  amount,
  email,
  name,
  phone,
  orderId,
  onSuccess,
  onClose,
}) {
  // amount comes from the server in kobo — Flutterwave expects Naira
  window.FlutterwaveCheckout({
    public_key: import.meta.env.VITE_FLUTTERWAVE_PUBLIC_KEY,
    tx_ref: txRef,
    amount: amount / 100,
    currency: 'NGN',
    payment_options: 'card,ussd,banktransfer',
    customer: {
      email,
      name,
      phone_number: phone,
    },
    customizations: {
      title: 'Shukky Shoes & More',
      description: 'Complete your order',
      logo: '/logo.png',
    },
    redirect_url: `${window.location.origin}/order-confirmation/${orderId}`,
    callback: onSuccess,
    onclose: onClose,
  })
}
```

### Widget Integration Rules

- `amount` must be in **Naira** (divide kobo by 100) — Flutterwave does NOT accept kobo
- `tx_ref` must match the txRef stored in your Order record
- `currency` is always `'NGN'` for this project
- The `redirect_url` is where Flutterwave sends the buyer after payment
- The `callback` fires when payment completes inside the widget (but do NOT trust it for payment confirmation — only the webhook is authoritative)
- The `onclose` fires when the buyer closes the widget without completing — reset loading state, keep form data

---

## Step 3 — Webhook Handler (Server)

### Webhook Signature Verification (HMAC-SHA256)

Flutterwave v4 signs webhook payloads using HMAC-SHA256 with your secret hash. The signature is sent in the `flutterwave-signature` header.

> **CRITICAL:** The old v3 header was `verif-hash` with a plain-text comparison. The v4 header is `flutterwave-signature` with HMAC-SHA256. Your code MUST handle v4.

```js
// middleware/verifyFlutterwaveWebhook.js
import crypto from 'crypto'

export function verifyFlutterwaveWebhook(req, res, next) {
  const signature = req.headers['flutterwave-signature']
  const secretHash = process.env.FLW_SECRET_HASH

  if (!signature || !secretHash) {
    return res.status(401).json({
      success: false,
      message: 'Invalid webhook signature',
    })
  }

  // Compute HMAC-SHA256 of the raw request body
  const hash = crypto
    .createHmac('sha256', secretHash)
    .update(req.rawBody)
    .digest('base64')

  if (hash !== signature) {
    console.error('[Webhook] Signature mismatch — rejecting')
    return res.status(401).json({
      success: false,
      message: 'Invalid webhook signature',
    })
  }

  next()
}
```

### Capturing the Raw Body

Express must be configured to capture the raw body for HMAC verification:

```js
// In server/index.js — BEFORE any other body parser middleware
import express from 'express'

const app = express()

// Capture raw body for webhook signature verification
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString()
  },
}))
```

### Webhook Payload Structure (v4)

```json
{
  "id": "wbk_W5p6ktwU0jQ8RO4By860",
  "timestamp": 1735116884019,
  "type": "charge.completed",
  "data": {
    "id": "chg_Hq4oBRTJ4r",
    "amount": 2500,
    "currency": "NGN",
    "reference": "shukky-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "status": "succeeded",
    "customer": {
      "email": "buyer@example.com",
      "name": { "first": "Ada", "last": "Obi" }
    },
    "processor_response": {
      "type": "approved",
      "code": "00"
    }
  }
}
```

### Key Fields to Extract

| Field | Path | Use |
|---|---|---|
| Charge ID | `data.id` | Used to verify the charge via API |
| Amount | `data.amount` | In Naira — multiply by 100 to compare with kobo |
| Currency | `data.currency` | Must be `'NGN'` |
| Reference | `data.reference` | Your `txRef` — used to find the order |
| Status | `data.status` | `'succeeded'` or `'failed'` |
| Event Type | `type` | Must be `'charge.completed'` |

### Complete Webhook Route

```js
// routes/payment.js
import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { verifyFlutterwaveWebhook } from '../middleware/verifyFlutterwaveWebhook.js'
import { getFlutterwaveToken } from '../services/flutterwaveAuth.js'
import { sendBuyerConfirmation, sendAdminNotification } from '../services/emailService.js'
import { FLW_BASE_URL } from '../config/flutterwave.js'

const router = Router()

router.post('/webhook', verifyFlutterwaveWebhook, async (req, res) => {
  // Respond immediately with 200 — Flutterwave requires this within 60 seconds
  res.status(200).end()

  try {
    const { type, data } = req.body

    // Only process charge.completed events
    if (type !== 'charge.completed') return

    const chargeId = data.id
    const txRef = data.reference

    // 1. Find the order by txRef
    const order = await prisma.order.findFirst({
      where: { flutterwaveTxRef: txRef },
      include: {
        items: { include: { product: true } },
        deliveryDetails: true,
        user: true,
      },
    })

    if (!order) {
      console.error('[Webhook] No order found for txRef:', txRef)
      return
    }

    // Skip if already processed (idempotency)
    if (order.paymentStatus !== 'PENDING') {
      console.log('[Webhook] Order already processed:', order.id)
      return
    }

    // 2. Verify the charge with Flutterwave API
    const token = await getFlutterwaveToken()
    const verifyResponse = await fetch(
      `${FLW_BASE_URL}/charges/${chargeId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    )
    const verifyResult = await verifyResponse.json()

    // 3. Validate the verified transaction data
    const verified = verifyResult.data
    const expectedAmountNaira = order.totalAmount / 100

    if (
      verified.status === 'succeeded' &&
      verified.amount === expectedAmountNaira &&
      verified.currency === 'NGN' &&
      verified.reference === txRef
    ) {
      // 4. SUCCESS — Update order and decrement stock
      await prisma.$transaction([
        prisma.order.update({
          where: { id: order.id },
          data: { paymentStatus: 'SUCCESS' },
        }),
        ...order.items.map(item =>
          prisma.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } },
          })
        ),
      ])

      // 5. Send confirmation emails (do not await — fire and forget)
      sendBuyerConfirmation(order).catch(err =>
        console.error('[Email] Buyer email failed:', err)
      )
      sendAdminNotification(order).catch(err =>
        console.error('[Email] Admin email failed:', err)
      )
    } else {
      // FAILED — amount mismatch, wrong currency, or charge not successful
      console.error('[Webhook] Verification failed:', {
        expectedAmount: expectedAmountNaira,
        actualAmount: verified.amount,
        status: verified.status,
        currency: verified.currency,
      })

      await prisma.order.update({
        where: { id: order.id },
        data: { paymentStatus: 'FAILED' },
      })
    }
  } catch (error) {
    console.error('[Webhook] Processing error:', error)
    // Order remains PENDING — will be caught by the fallback polling job
  }
})

export default router
```

### Verification Rules — CRITICAL

1. **Always verify via the API** — never trust the webhook payload alone
2. **Verify endpoint:** `GET {FLW_BASE_URL}/charges/{chargeId}` with Bearer token
3. **Check ALL four values:** `status === 'succeeded'`, `amount` matches, `currency === 'NGN'`, `reference` matches your txRef
4. **Amount conversion:** Flutterwave returns amount in **Naira**. Your database stores in **kobo**. Divide `order.totalAmount` by 100 before comparing
5. **Respond with 200 immediately** — do processing after. Flutterwave times out after 60 seconds
6. **Idempotency:** Check if `order.paymentStatus !== 'PENDING'` before processing — Flutterwave may retry up to 3 times

---

## Step 4 — Order Confirmation Page (Client)

Fetches the order once on mount. Renders based on paymentStatus.

```jsx
import { useParams } from 'react-router-dom'

import Spinner from '../components/ui/Spinner'
import { useOrder } from '../hooks/useOrders'

import styles from './OrderConfirmation.module.css'

export default function OrderConfirmation() {
  const { orderId } = useParams()
  const { order, isLoading, error } = useOrder(orderId)

  if (isLoading) return <Spinner />

  if (error || !order) return (
    <div className={styles.errorWrapper}>
      <p className={styles.errorMessage}>
        Could not load your order. Contact us for help.
      </p>
    </div>
  )

  if (order.paymentStatus === 'SUCCESS') return (
    <OrderSuccess order={order} />
  )

  if (order.paymentStatus === 'FAILED') return (
    <OrderFailed orderId={orderId} />
  )

  // PENDING — webhook may not have arrived yet
  return <OrderPending />
}
```

### Handling the PENDING State

The buyer may reach the confirmation page before the webhook fires. Implement polling:

```js
// Poll every 3 seconds for up to 30 seconds
useEffect(() => {
  if (order?.paymentStatus !== 'PENDING') return

  const interval = setInterval(() => {
    refetch()
  }, 3000)

  const timeout = setTimeout(() => {
    clearInterval(interval)
  }, 30000)

  return () => {
    clearInterval(interval)
    clearTimeout(timeout)
  }
}, [order?.paymentStatus, refetch])
```

---

## Email Triggers

Both emails are sent inside the webhook handler after successful verification.

**Buyer email:**
- Subject: `Your Shukky order is confirmed 🎉`
- Content: order ID, itemised list with quantities and prices in Naira, total, delivery address, message that seller will contact with shipping info

**Admin email:**
- Subject: `New order received — ₦{total in Naira}`
- Content: order ID, customer name and phone, full delivery address, itemised list, total

Use HTML templates — not plain text. Keep them readable on mobile.

Email sending failures must **never** roll back the order. Log the failure and continue.

---

## Error Scenarios to Handle

| Scenario | Behaviour |
|---|---|
| Buyer closes the widget | `onclose` fires — reset loading state, keep form data, let buyer retry |
| Webhook signature mismatch | Return 401 immediately — do not process |
| Flutterwave verify returns failed | Update order to FAILED, do not decrement stock |
| Amount mismatch (Naira vs kobo) | Log discrepancy, mark order FAILED, alert admin |
| Currency mismatch | Log, mark FAILED |
| Reference not found | Return 200 (to stop retries), log the txRef |
| Order already processed | Skip — idempotent (check `paymentStatus !== 'PENDING'`) |
| Email sending fails | Log failure but do NOT roll back the order |
| OAuth token expired mid-request | `getFlutterwaveToken()` auto-refreshes — no manual handling needed |
| Flutterwave API is down | Leave order as PENDING — fallback polling job picks it up |

---

## Fallback: Transaction Polling

Flutterwave's best practices explicitly state: **"Don't rely solely on webhooks."** Implement a background job that polls pending orders.

```js
// services/pendingOrderPoller.js
// Run every 30 minutes via setInterval or a cron job

import prisma from '../lib/prisma.js'
import { getFlutterwaveToken } from './flutterwaveAuth.js'
import { FLW_BASE_URL } from '../config/flutterwave.js'

export async function pollPendingOrders() {
  const pendingOrders = await prisma.order.findMany({
    where: {
      paymentStatus: 'PENDING',
      createdAt: {
        // Only check orders older than 5 minutes (give webhook time to arrive)
        lt: new Date(Date.now() - 5 * 60 * 1000),
      },
    },
  })

  for (const order of pendingOrders) {
    try {
      const token = await getFlutterwaveToken()
      // Search for the charge by reference
      const response = await fetch(
        `${FLW_BASE_URL}/charges?reference=${order.flutterwaveTxRef}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      const result = await response.json()

      if (result.data?.length > 0) {
        const charge = result.data[0]
        // Process the charge status the same way as the webhook
        // ... (reuse verification logic)
      }
    } catch (error) {
      console.error('[Poller] Failed to check order:', order.id, error)
    }
  }
}
```

---

## Testing in Sandbox

### Sandbox Dashboard

1. Sign up at https://developersandbox.flutterwave.com
2. Get your `Client-Id` and `Client-Secret` from the dashboard
3. Set webhook URL in Settings → Webhooks (use https://webhook.site for quick testing)
4. Set your secret hash in the same webhook settings page

### Test Scenarios

Use the `X-Scenario-Key` header when making direct API calls to simulate different outcomes:

| Scenario Key | Effect |
|---|---|
| `scenario:auth_3ds&issuer:approved` | Successful 3DS card payment |
| `scenario:auth_pin&issuer:approved` | Successful PIN-based payment |
| `scenario:auth_pin&issuer:insufficient_funds` | Declined — insufficient funds |
| `scenario:auth_3ds&issuer:expired_card` | Declined — expired card |
| `scenario:auth_pin&issuer:incorrect_pin` | Declined — wrong PIN |
| `scenario:noauth` | Default — no authentication required |

> Note: When using the **inline widget** for testing, you don't control the `X-Scenario-Key` header. The widget uses mock card numbers and flows internally. These scenario keys are for direct API testing only.

### Mock Card Numbers

Use Flutterwave's sandbox test card numbers (from dashboard documentation). Always use the test credentials — no real money moves in sandbox.

---

## Flutterwave Dashboard Setup Checklist

Before your integration can work, complete these steps in the Flutterwave dashboard:

- [ ] Create a developer account at https://developersandbox.flutterwave.com
- [ ] Copy Client-Id and Client-Secret from the dashboard
- [ ] Navigate to Settings → Webhooks
- [ ] Set your webhook URL to `https://your-backend-url.com/api/payment/webhook`
- [ ] Set a strong, random secret hash (this becomes `FLW_SECRET_HASH`)
- [ ] Enable webhook retries (recommended — retries 3 times at 30-min intervals)
- [ ] Check all webhook event boxes (at minimum: `charge.completed`)

### Going Live Checklist

- [ ] Create a production account at https://onboarding.flutterwave.com
- [ ] Complete KYC verification
- [ ] Switch credentials from sandbox to production in your `.env`
- [ ] Update `FLW_BASE_URL` to `https://f4bexperience.flutterwave.com`
- [ ] Re-configure webhook URL and secret hash in the production dashboard
- [ ] Test with a real small payment before launching

---

## Files This Skill Covers

| File | Purpose |
|---|---|
| `server/config/flutterwave.js` | Environment-aware base URL and config |
| `server/services/flutterwaveAuth.js` | OAuth 2.0 token generation and refresh |
| `server/services/pendingOrderPoller.js` | Fallback polling for pending orders |
| `server/middleware/verifyFlutterwaveWebhook.js` | HMAC-SHA256 webhook signature verification |
| `server/routes/orders.js` | POST /api/orders — creates PENDING order |
| `server/routes/payment.js` | POST /api/payment/webhook — processes payment |
| `client/src/lib/flutterwave.js` | Loads inline widget, initializes payment |
| `client/src/pages/Checkout.jsx` | Collects delivery details, triggers payment |
| `client/src/pages/OrderConfirmation.jsx` | Displays payment result to buyer |

---

## Security Rules (Flutterwave-Specific)

1. **Never trust the frontend** for payment confirmation — only the webhook handler decides
2. **Always verify via API** after receiving a webhook — never trust the webhook payload alone
3. **Never log** full card numbers, CVVs, or raw payment payloads
4. **Never expose** `FLW_CLIENT_SECRET` or `FLW_SECRET_HASH` to the client
5. **Only `VITE_FLUTTERWAVE_PUBLIC_KEY`** goes to the frontend
6. **Respond to webhooks with 200 immediately** — process in the background
7. **Make webhook processing idempotent** — check order status before modifying
8. **Amount verification is mandatory** — compare Naira (Flutterwave) to kobo (database) correctly
9. **Use HMAC-SHA256** for webhook signature verification — not plain-text comparison

---

## Common Mistakes to Avoid

| Mistake | Why It's Wrong | Correct Approach |
|---|---|---|
| Comparing `data.amount` directly to `order.totalAmount` | FW returns Naira, DB stores kobo | Divide `totalAmount` by 100 first |
| Using `verif-hash` header for webhook verification | That's v3 — v4 uses `flutterwave-signature` with HMAC-SHA256 | Use `crypto.createHmac('sha256', secretHash)` |
| Using `FLUTTERWAVE_SECRET_KEY` for server auth | v4 uses OAuth 2.0 with `FLW_CLIENT_ID` + `FLW_CLIENT_SECRET` | Generate access tokens via OAuth |
| Sending `amount` in kobo to the inline widget | Widget expects Naira | Divide by 100 before passing |
| Not responding to webhook with 200 before processing | Flutterwave times out at 60 seconds | Send 200 immediately, then process |
| Processing duplicate webhooks | Flutterwave retries up to 3 times | Check `order.paymentStatus !== 'PENDING'` first |
