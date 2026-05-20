# SKILL.md — Checkout Flow

Read this before building any part of the checkout experience. The checkout flow is the most critical user journey in Shukky Shoes & More — it connects the cart, delivery details, Flutterwave payment, and order confirmation into a single, reliable sequence.

---

## Flow Overview

```
Cart Review
    ↓
Checkout Page — Buyer fills delivery details
    ↓
POST /api/orders — Backend creates PENDING order, returns orderId + txRef
    ↓
Flutterwave inline widget initializes
    ↓
Buyer completes payment
    ↓
Flutterwave webhook → backend verifies → order updated to SUCCESS or FAILED
    ↓
Buyer redirected to /order-confirmation/:orderId
    ↓
OrderConfirmation page fetches order and renders result
```

> The order is created BEFORE payment. The payment status only changes via the backend webhook. Never create an order after payment completes on the frontend.

---

## Checkout Page Requirements

The Checkout page collects delivery details and hands off to Flutterwave. It must:

- Show a summary of cart items and total before delivery form
- Validate ALL delivery fields before enabling payment
- Disable the "Pay Now" button during submission to prevent double-clicks
- Show a loading state while the order is being created on the backend
- Surface any API error clearly — never silently fail

### Delivery Details Fields (all required)

| Field | Validation |
|---|---|
| Full Name | Non-empty string, trimmed |
| Phone Number | Non-empty, Nigerian format preferred |
| Delivery Address | Non-empty string, trimmed |
| City | Non-empty string, trimmed |
| State | Non-empty string, trimmed |
| Notes | Optional |

### Checkout Form Scaffold

```jsx
// pages/Checkout.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCartStore } from '../store/cartStore'
import { useAuthStore } from '../store/authStore'
import { loadFlutterwaveScript, initializePayment } from '../lib/flutterwave'
import { formatPrice } from '../utils/formatPrice'
import api from '../lib/api'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import styles from './Checkout.module.css'

const INITIAL_FORM = {
  fullName: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  notes: '',
}

export default function Checkout() {
  const { items, total, clearCart } = useCartStore()
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const [form, setForm] = useState(INITIAL_FORM)
  const [error, setError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Guard: redirect to cart if empty
  if (items.length === 0) {
    navigate('/cart')
    return null
  }

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function validate() {
    const required = ['fullName', 'phone', 'address', 'city', 'state']
    for (const field of required) {
      if (!form[field].trim()) {
        return `Please fill in your ${field}.`
      }
    }
    return null
  }

  async function handlePay() {
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    setIsSubmitting(true)

    try {
      // Step 1: Create the order
      const { data } = await api.post('/orders', {
        items: items.map(i => ({ productId: i.id, quantity: i.quantity })),
        deliveryDetails: form,
      })

      const { orderId, txRef, totalAmount } = data.data

      // Step 2: Load Flutterwave and initialize payment
      await loadFlutterwaveScript()

      initializePayment({
        txRef,
        amount: totalAmount, // kobo — initializePayment divides by 100 internally
        email: user?.email || 'guest@shukky.com',
        name: form.fullName,
        phone: form.phone,
        orderId,
        onSuccess: () => {
          clearCart()
          navigate(`/order-confirmation/${orderId}`)
        },
        onClose: () => {
          // Buyer dismissed modal — reset submission state, keep form data
          setIsSubmitting(false)
        },
      })
    } catch (err) {
      setError(err.message)
      setIsSubmitting(false)
    }
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Checkout</h1>

      {/* Cart summary */}
      <section className={styles.summary}>
        {items.map(item => (
          <div key={item.id} className={styles.summaryRow}>
            <span>{item.name} × {item.quantity}</span>
            <span>{formatPrice(item.price * item.quantity)}</span>
          </div>
        ))}
        <div className={styles.total}>
          <span>Total</span>
          <span>{formatPrice(total)}</span>
        </div>
      </section>

      {/* Delivery form */}
      <section className={styles.form}>
        <h2 className={styles.sectionHeading}>Delivery Details</h2>
        <Input label="Full Name" id="fullName" name="fullName"
          value={form.fullName} onChange={handleChange} />
        <Input label="Phone Number" id="phone" name="phone" type="tel"
          value={form.phone} onChange={handleChange} />
        <Input label="Delivery Address" id="address" name="address"
          value={form.address} onChange={handleChange} />
        <Input label="City" id="city" name="city"
          value={form.city} onChange={handleChange} />
        <Input label="State" id="state" name="state"
          value={form.state} onChange={handleChange} />
        <Input label="Additional Notes (optional)" id="notes" name="notes"
          value={form.notes} onChange={handleChange} />
      </section>

      {error && <p className={styles.error}>{error}</p>}

      <Button onClick={handlePay} isLoading={isSubmitting}>
        {isSubmitting ? 'Creating your order...' : `Pay ${formatPrice(total)}`}
      </Button>
    </div>
  )
}
```

---

## Edge Cases — Required Handling

These are explicitly called out in the PRD and must be handled:

| Scenario | Required Behaviour |
|---|---|
| Cart is empty on Checkout mount | Redirect to `/cart` immediately |
| Delivery form is incomplete | Show inline validation error — do NOT call the API |
| `POST /api/orders` fails | Show error message, reset loading state, keep form data |
| Buyer closes Flutterwave widget | Reset `isSubmitting` to false — let buyer retry without losing form data |
| Payment fails (webhook sets FAILED) | OrderConfirmation renders failure state — show orderId and a support message |
| Product goes out of stock between cart and checkout | Backend `POST /api/orders` checks stock — returns 400 with `"One or more products are unavailable"` — surface this error on the Checkout page |
| Duplicate webhook events | Backend must check if order is already SUCCESS before processing — use idempotency check |

---

## Idempotency Check (Server)

The webhook handler must guard against duplicate Flutterwave webhook events:

```js
// Inside webhook handler, before updating order
const order = await prisma.order.findFirst({
  where: { flutterwaveTxRef: txRef },
})

if (!order) {
  console.error('[Webhook] No order found for txRef:', txRef)
  return
}

// Idempotency: if already processed (SUCCESS or FAILED), skip
if (order.paymentStatus !== 'PENDING') {
  console.log('[Webhook] Order already processed:', order.id)
  return
}
```

---

## OrderConfirmation Page Requirements

```jsx
// pages/OrderConfirmation.jsx
import { useParams } from 'react-router-dom'
import { useOrder } from '../hooks/useOrders'
import Spinner from '../components/ui/Spinner'
import styles from './OrderConfirmation.module.css'

export default function OrderConfirmation() {
  const { orderId } = useParams()
  const { order, isLoading, error } = useOrder(orderId)

  if (isLoading) return <Spinner />

  if (error || !order) return (
    <div className={styles.stateWrapper}>
      <p className={styles.message}>
        Could not load your order. Please contact us with your order reference.
      </p>
    </div>
  )

  if (order.paymentStatus === 'SUCCESS') return (
    <div className={styles.success}>
      <h1 className={styles.heading}>Order Confirmed! 🎉</h1>
      <p className={styles.message}>Thank you for your order. We will be in touch shortly.</p>
      <p className={styles.ref}>Order reference: {order.id}</p>
    </div>
  )

  if (order.paymentStatus === 'FAILED') return (
    <div className={styles.failed}>
      <h1 className={styles.heading}>Payment Failed</h1>
      <p className={styles.message}>
        Your payment could not be completed. Please try again or contact us.
      </p>
      <p className={styles.ref}>Reference: {order.id}</p>
    </div>
  )

  // PENDING — webhook not yet received
  return (
    <div className={styles.pending}>
      <Spinner />
      <p className={styles.message}>Confirming your payment, please wait…</p>
    </div>
  )
}
```

---

## Checkout Checklist

- [ ] Cart is checked for emptiness on mount — redirect to `/cart` if empty
- [ ] All delivery fields validated before calling the API
- [ ] Pay button disabled during submission
- [ ] `POST /api/orders` called before Flutterwave widget initializes
- [ ] Flutterwave script loaded dynamically (not on app init)
- [ ] `onClose` handler resets loading state without losing form data
- [ ] Cart is cleared only after payment widget confirms success (`onSuccess`)
- [ ] OrderConfirmation handles SUCCESS, FAILED, and PENDING states
- [ ] Duplicate webhook events handled idempotently on the server
- [ ] Stock check performed server-side at order creation — not client-side
