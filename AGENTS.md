# AGENT.md — Shukky Shoes & More

> This file is the single source of truth for any AI agent building this project. Read it fully before writing any code, making any architectural decision, or generating any UI.

---

## Project Identity

**Name:** Shukky Shoes & More
**Type:** Mobile-first e-commerce web application
**Purpose:** Replace informal WhatsApp/Instagram-based selling with a structured, trustworthy online storefront for a fashion brand selling shoes and bags.
**Payment:** Flutterwave (only)
**Stage:** Greenfield build — no legacy code exists

---

## Who This Is For

### Buyers
- **Primary:** Young adults aged 18–29, mobile-native, expect fast and smooth experiences
- **Secondary:** Adults 30+, less technical, need clarity and trust signals
- Both groups browse on mobile. Design everything for mobile first.

### Seller (Admin)
- A single business owner managing their own store
- Needs to: add/edit/remove products, view incoming orders, update inventory, and mark orders as fulfilled

---

## Platform Rules (Mobile-First Web)

This is a **mobile-first web app**, not a native app.

- **Base viewport:** 375px. Design and build for this first.
- **Breakpoints:** Scale up at 768px (tablet) and 1024px+ (desktop)
- **Touch targets:** Minimum 44×44px for all interactive elements
- **No hover-only interactions** — every interaction must work on tap
- **Navigation:** Bottom navigation bar on mobile for buyer-facing screens
- **Inputs:** Large, finger-friendly fields. Avoid tiny dropdowns.
- **Safe areas:** Respect top (44px) and bottom (34px) for notched devices using CSS env() variables

---

## Tech Stack
   
| Layer | Choice | Notes |
|---|---|---|
| Frontend | React (Vite) | Component-based, fast dev experience |
| Language | JavaScript (JSX) | No TypeScript allowed |
| Styling | CSS | Utility-first, mobile-first by default | CSS Module + CSS custom properties (theme.css) |
| Routing | React Router v6 | Client-side routing |
| State | Zustand | Simple global cart and auth state |
| Backend | Node.js + Express | REST API |
| Database | PostgreSQL | Relational, matches the data schema |
| ORM | Prisma | Type-safe DB access |
| Auth | JWT (HTTP-only cookies) | Buyer login + admin session |
| Payment | Flutterwave | Inline payment widget |
| Email | Resend | Order confirmation + admin notifications |
| File Storage | Cloudinary | Product image uploads |
| Hosting | Vercel (frontend) + Railway or Render (backend) | |

> Agent: Do not introduce libraries outside this stack without flagging it first with a comment.

---

## Design System

This project already has a defined design system. Follow these rules strictly:

- Do NOT generate, suggest, or redesign color palettes.
- Do NOT introduce new tokens (colors, typography, spacing, shadows).
- Only use the tokens explicitly defined in this file.
- If a token is missing, ask before adding anything.

### Colors
```css
--color-primary: #0A0A0A;        /* Near-black — base text, nav, buttons */
--color-accent: #C9A96E;         /* Gold/tan — luxury feel, CTAs, highlights */
--color-surface: #FAFAFA;        /* Off-white — page background */
--color-card: #FFFFFF;           /* Pure white — product cards */
--color-muted: #6B7280;          /* Gray — labels, secondary text */
--color-border: #E5E7EB;         /* Light gray — dividers, input borders */
--color-success: #16A34A;        /* Green — payment success, stock in */
--color-error: #DC2626;          /* Red — errors, out of stock */
```

### Typography
- **Headings:** Playfair Display — luxury, editorial feel
- **Body & UI:** Inter — clean, readable at small sizes
- **Price text:** Always bold, never ambiguous
- **Scale:** 12 / 14 / 16 / 18 / 24 / 32px

#### Typography Enforcement
- Do not introduce additional fonts unless explicitly requested.
- Do not substitute Playfair Display or Inter with similar fonts.
- If a font is missing in the environment, ask before replacing it.

### Spacing
- Use an **8pt grid system** — all spacing in multiples of 4px or 8px
- Mobile horizontal padding: 16px on both sides consistently

### Component Defaults
- **Cards:** 12px border-radius, subtle shadow `box-shadow: 0 1px 4px rgba(0,0,0,0.08)`
- **Buttons (primary):** Full-width on mobile, 48px height, background `--color-primary`, text white
- **Buttons (accent):** Background `--color-accent`, text `--color-primary`
- **Inputs:** 48px height, 1px border `--color-border`, 8px border-radius, focus ring in accent color
- **Icons:** Use Lucide React, outline style

---

## Data Schema

```prisma
model User {
  id        String   @id @default(cuid())
  name      String
  email     String   @unique
  password  String
  role      Role     @default(BUYER)
  orders    Order[]
  createdAt DateTime @default(now())
}

model Product {
  id          String        @id @default(cuid())
  name        String
  price       int    stored in kobo and displayed in naira 
  images      String[]
  description String
  category    Category
  status      ProductStatus @default(ACTIVE)
  stock       Int           @default(0)
  orderItems  OrderItem[]
  createdAt   DateTime      @default(now())
}

model Order {
  id               String          @id @default(cuid())
  user             User?           @relation(fields: [userId], references: [id])
  userId           String?
  items            OrderItem[]
  totalAmount      int
  paymentStatus    PaymentStatus   @default(PENDING)
  flutterwaveTxRef String 
  deliveryDetails  DeliveryDetails  // Every order requires a delivery address
  createdAt        DateTime        @default(now())
}

model OrderItem {
  id        String  @id @default(cuid())
  order     Order   @relation(fields: [orderId], references: [id])
  orderId   String
  product   Product @relation(fields: [productId], references: [id])
  productId String
  quantity  Int
  price     int  stored in kobo and displayed in naira 
}

model DeliveryDetails {
  id       String  @id @default(cuid())
  order    Order   @relation(fields: [orderId], references: [id])
  orderId  String  @unique
  fullName String
  phone    String
  address  String
  city     String
  state    String
  notes    String?
}

enum Role          { BUYER ADMIN }
enum ProductStatus { ACTIVE OUT_OF_STOCK ARCHIVED }
enum PaymentStatus { PENDING SUCCESS FAILED }
enum Category      { SHOES BAGS ACCESSORIES }
```

---

## File Structure

```
shukky/
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/               # Button, Input, Badge
│   │   │   ├── layout/           # BottomNav, Header, PageWrapper
│   │   │   ├── product/          # ProductCard, ProductGrid, ProductDetail
│   │   │   ├── cart/             # CartDrawer, CartItem, CartSummary
│   │   │   └── admin/            # AdminSidebar, OrderTable, ProductForm
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   ├── Shop.jsx
│   │   │   ├── ProductDetail.jsx
│   │   │   ├── Cart.jsx
│   │   │   ├── Checkout.jsx
│   │   │   ├── OrderConfirmation.jsx
│   │   │   ├── Login.jsx
│   │   │   └── admin/
│   │   │       ├── Dashboard.jsx
│   │   │       ├── Products.jsx
│   │   │       ├── Orders.jsx
│   │   │       └── Inventory.jsx
│   │   ├── store/
│   │   │   ├── cartStore.js
│   │   │   └── authStore.js
│   │   ├── hooks/
│   │   ├── lib/
│   │   │   ├── api.js
│   │   │   └── flutterwave.js
│   │   └── utils/
│   │       └── formatPrice.js
│
├── server/
│   ├── routes/
│   │   ├── auth.js
│   │   ├── products.js
│   │   ├── orders.js
│   │   ├── payment.js
│   │   └── admin.js
│   ├── middleware/
│   │   ├── auth.js
│   │   └── adminOnly.js
│   ├── services/
│   │   ├── emailService.js
│   │   └── paymentService.js
│   ├── prisma/
│   │   └── schema.prisma
│   └── index.js
```

---

## User Flows

### Buyer Flow
```
Home / Shop → Product Detail → Add to Cart → Cart Review
→ Checkout (delivery details) → Flutterwave Payment → Order Confirmation
```

### Admin Flow
```
Admin Login → Dashboard (order summary) → Orders (view + fulfill)
→ Products (add / edit / archive) → Inventory (stock levels)
```

---

## Payment Flow (Flutterwave)

1. Buyer fills delivery details on the Checkout page
2. Frontend calls `/api/orders` to create a PENDING order, receives `orderId` + `txRef`
3. Flutterwave inline widget initializes with: `tx_ref`, `amount`, `currency: "NGN"`, customer name/email, `redirect_url`
4. On payment, Flutterwave sends a webhook to `/api/payment/webhook`
5. Backend verifies the transaction via Flutterwave's verify endpoint
6. If verified: update `Order.paymentStatus` to `SUCCESS`, trigger confirmation emails
7. If failed: update to `FAILED`, show error state to buyer
8. Frontend redirects to `/order-confirmation/:orderId`

> Never trust the frontend alone for payment confirmation. Always verify via backend webhook.

---

## API Endpoints

```
# Auth
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout

# Products (public)
GET    /api/products
GET    /api/products/:id

# Orders
POST   /api/orders
GET    /api/orders/:id

# Payment
POST   /api/payment/webhook

# Admin (ADMIN role required on all)
GET    /api/admin/orders
PATCH  /api/admin/orders/:id
POST   /api/admin/products
PATCH  /api/admin/products/:id
DELETE /api/admin/products/:id
GET    /api/admin/inventory
```

---

## Email Notifications

Two emails trigger on successful payment:

**To Buyer** — Subject: `Your Shukky order is confirmed 🎉`
Content: order summary, items purchased, total amount, delivery note

**To Admin** — Subject: `New order received — ₦[amount]`
Content: full order details, delivery address, customer contact info

---

## Environment Variables

```env
# Server
DATABASE_URL=
JWT_SECRET=
FLW_CLIENT_ID=
FLW_CLIENT_SECRET=
FLW_SECRET_HASH=
FLW_BASE_URL=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
RESEND_API_KEY=
EMAIL_FROM=
ADMIN_EMAIL=

# Client
VITE_API_BASE_URL=
VITE_FLW_PUBLIC_KEY=
```

---

## Agent Rules

1. **Mobile-first always.** Build base styles for mobile first, then layer in desktop styles using `@media (min-width: 768px)` inside your CSS Modules. No Tailwind allowed.
2. **Price formatting.** All prices display as `₦1,200.00` using the shared `formatPrice()` util — never inline.
3. **Images.** Always Cloudinary URLs. Always include `alt` text on every `<img>`.
4. **Empty states.** Every list (products, orders, cart) must render an empty state — never an empty container.
5. **Loading states.** Every async action must show a loading indicator. No silent fetches.
6. **Error handling.** All API calls must catch errors and surface a user-facing message. Never `console.log` and continue.
7. **Admin protection.** Every admin page checks role on the frontend (redirect) and backend (middleware).
8. **Cart is client-side.** No cart API. Cart lives in Zustand with localStorage persistence.
9. **No lorem ipsum.** All placeholder text must be realistic — real product names, real Nigerian cities, real error messages.
10. **Stock awareness.** If `product.status === "OUT_OF_STOCK"` or `product.stock === 0`, disable Add to Cart and label it "Out of Stock".

---

## Out of Scope — Do Not Build

- Buyer reviews or ratings
- Wishlist or saved items
- Discount codes or coupon system
- Multiple seller accounts
- Live chat
- SMS notifications
- Any payment method other than Flutterwave

If a proposed change would violate any of the above rules, ask for clarification before proceeding. 

---

*Last updated: April 2026 | Project: Shukky Shoes & More*