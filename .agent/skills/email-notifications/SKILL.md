# SKILL.md — Email Notification System

Read this before implementing any email functionality. This skill defines exactly what triggers emails, what each email must contain, how to send them using the Resend SDK, and how to handle failures safely.

---

## When Emails Are Sent

Only ONE event triggers emails: **a successful Flutterwave payment**, verified by the backend webhook.

**Two emails fire simultaneously:**
1. Buyer confirmation email
2. Admin (seller) notification email

Never send emails from the frontend. Never send emails before webhook verification. If email sending fails, log the failure but do NOT roll back the order — the payment is already confirmed.

---

## Email Service Setup (Resend)

```js
// server/services/emailService.js
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendBuyerConfirmation(order) {
  const itemRows = order.items.map(item => `
    <tr>
      <td style="padding: 8px 0; color: #0A0A0A;">${item.product.name}</td>
      <td style="padding: 8px 0; color: #0A0A0A;">x${item.quantity}</td>
      <td style="padding: 8px 0; color: #0A0A0A; font-weight: bold;">
        ₦${(item.price * item.quantity / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
      </td>
    </tr>
  `).join('')

  const html = `
    <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; color: #0A0A0A;">
      <h1 style="font-family: 'Playfair Display', serif; color: #0A0A0A;">
        Your order is confirmed! 🎉
      </h1>
      <p>Thank you for shopping with <strong>Shukky Shoes & More</strong>.</p>
      <p>We have received your order and will be in touch with delivery updates.</p>

      <h2 style="color: #0A0A0A;">Order Summary</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr>
            <th style="text-align: left; padding: 8px 0; border-bottom: 1px solid #E5E7EB;">Item</th>
            <th style="text-align: left; padding: 8px 0; border-bottom: 1px solid #E5E7EB;">Qty</th>
            <th style="text-align: left; padding: 8px 0; border-bottom: 1px solid #E5E7EB;">Price</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
        <tfoot>
          <tr>
            <td colspan="2" style="padding-top: 12px; font-weight: bold;">Total</td>
            <td style="padding-top: 12px; font-weight: bold; color: #C9A96E;">
              ₦${(order.totalAmount / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            </td>
          </tr>
        </tfoot>
      </table>

      <h2 style="color: #0A0A0A;">Delivery Details</h2>
      <p>${order.deliveryDetails.fullName}</p>
      <p>${order.deliveryDetails.phone}</p>
      <p>${order.deliveryDetails.address}, ${order.deliveryDetails.city}, ${order.deliveryDetails.state}</p>
      ${order.deliveryDetails.notes ? `<p>Notes: ${order.deliveryDetails.notes}</p>` : ''}

      <p style="margin-top: 24px; color: #6B7280; font-size: 14px;">
        Order reference: ${order.id}
      </p>
    </div>
  `

  const buyerEmail = order.user?.email
  if (!buyerEmail) {
    console.warn('[Email] No buyer email available — skipping buyer confirmation')
    return
  }

  await resend.emails.send({
    from: `"Shukky Shoes & More" <${process.env.EMAIL_FROM}>`,
    to: buyerEmail,
    subject: 'Your Shukky order is confirmed 🎉',
    html,
  })
}

export async function sendAdminNotification(order) {
  const itemRows = order.items.map(item => `
    <tr>
      <td style="padding: 8px 0;">${item.product.name}</td>
      <td style="padding: 8px 0;">x${item.quantity}</td>
      <td style="padding: 8px 0; font-weight: bold;">
        ₦${(item.price * item.quantity / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
      </td>
    </tr>
  `).join('')

  const html = `
    <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; color: #0A0A0A;">
      <h1 style="color: #0A0A0A;">
        New Order — ₦${(order.totalAmount / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
      </h1>

      <h2>Customer Details</h2>
      <p><strong>Name:</strong> ${order.deliveryDetails.fullName}</p>
      <p><strong>Phone:</strong> ${order.deliveryDetails.phone}</p>
      ${order.user?.email ? `<p><strong>Email:</strong> ${order.user.email}</p>` : ''}

      <h2>Delivery Address</h2>
      <p>${order.deliveryDetails.address}</p>
      <p>${order.deliveryDetails.city}, ${order.deliveryDetails.state}</p>
      ${order.deliveryDetails.notes ? `<p><strong>Notes:</strong> ${order.deliveryDetails.notes}</p>` : ''}

      <h2>Items Ordered</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr>
            <th style="text-align: left; padding: 8px 0; border-bottom: 1px solid #E5E7EB;">Item</th>
            <th style="text-align: left; padding: 8px 0; border-bottom: 1px solid #E5E7EB;">Qty</th>
            <th style="text-align: left; padding: 8px 0; border-bottom: 1px solid #E5E7EB;">Price</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
        <tfoot>
          <tr>
            <td colspan="2" style="padding-top: 12px; font-weight: bold;">Total</td>
            <td style="padding-top: 12px; font-weight: bold;">
              ₦${(order.totalAmount / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            </td>
          </tr>
        </tfoot>
      </table>

      <p style="margin-top: 24px; color: #6B7280; font-size: 14px;">
        Order ID: ${order.id}<br/>
        Payment Ref: ${order.flutterwaveTxRef}
      </p>
    </div>
  `

  await resend.emails.send({
    from: `"Shukky Orders" <${process.env.EMAIL_FROM}>`,
    to: process.env.ADMIN_EMAIL,
    subject: `New order received — ₦${(order.totalAmount / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`,
    html,
  })
}
```

---

## Calling Email Services From the Webhook

Both emails fire inside the webhook handler after successful payment verification. Wrap each in its own try/catch so a failure in one does not block the other.

```js
// Inside webhook handler — after order.paymentStatus updated to SUCCESS
try {
  await sendBuyerConfirmation(order)
} catch (emailError) {
  // Log but never throw — a failed email must not fail the webhook response
  console.error('[Webhook] Buyer email failed:', emailError)
}

try {
  await sendAdminNotification(order)
} catch (emailError) {
  console.error('[Webhook] Admin email failed:', emailError)
}

return res.status(200).json({ success: true })
```

---

## What Each Email Must Include

### Buyer Confirmation Email
| Required | Content |
|---|---|
| Subject | `Your Shukky order is confirmed 🎉` |
| Itemised list | Product name, quantity, line total in Naira |
| Order total | Formatted in Naira (₦X,XXX.XX) |
| Delivery details | Full name, phone, address, city, state, notes |
| Order reference | The order ID |
| Tone | Warm, reassuring — they will be contacted about delivery |

### Admin Notification Email
| Required | Content |
|---|---|
| Subject | `New order received — ₦[total]` |
| Customer name | From delivery details |
| Customer phone | From delivery details |
| Customer email | If authenticated buyer, include — omit if guest |
| Full delivery address | Address, city, state, notes |
| Itemised list | Product name, quantity, line total |
| Order total | Formatted in Naira |
| Order ID | For tracking and reference |
| Payment reference | Flutterwave txRef |

---

## Email HTML Rules

- Use inline styles only — email clients strip external CSS
- Keep max-width at 600px for email client compatibility
- Prices always formatted in Naira as `₦X,XXX.XX`
- Never reference CSS Modules or class names in email templates
- Templates must be readable on mobile — no tiny text
- Use `font-family: Inter, sans-serif` and `font-family: 'Playfair Display', serif` for headings

---

## Environment Variables Required

```
RESEND_API_KEY — The API key from your Resend dashboard
EMAIL_FROM     — Sender address shown to recipient (must be a verified domain in Resend)
ADMIN_EMAIL    — Seller's email address for order notifications
```

---

## Email Checklist

- [ ] Emails only sent after webhook verification succeeds
- [ ] Each email wrapped in its own try/catch
- [ ] Email failure is logged but never throws or rolls back the order
- [ ] Buyer email includes itemised list with Naira prices
- [ ] Admin email includes customer contact info and full delivery address
- [ ] All prices divided by 100 (kobo to Naira) before display in email
- [ ] HTML templates use inline styles only
- [ ] `EMAIL_FROM`, `RESEND_API_KEY`, `ADMIN_EMAIL` all present in `.env`
