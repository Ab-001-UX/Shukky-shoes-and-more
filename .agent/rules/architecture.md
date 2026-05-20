---
trigger: always_on
---

#  Rules: Architecture.md — Shukky Shoes & More

This file defines the full technical architecture of the project. Read this before making any structural, routing, or infrastructure decision.

---

## Application Type

Mobile-first e-commerce web application. Two distinct interfaces share one codebase: the buyer-facing storefront and the seller admin panel. Both are served from the same React client. The backend is a separate Express REST API.

---

## Tech Stack

Do not deviate from this stack. Do not upgrade versions mid-build without flagging.

| Layer | Technology | Version |
|---|---|---|
| Frontend framework | React with Vite | React 18, Vite 5 |
| Styling | CSS Modules + CSS custom properties | Native CSS |
| Routing | React Router | v6 |
| Global state | Zustand | v4 |
| HTTP client | Axios | latest |
| Backend | Node.js with Express | Express v4 |
| Database | PostgreSQL | v15 |
| ORM | Prisma | v5 |
| Authentication | JWT in HTTP-only cookies | — |
| Payment | Flutterwave inline widget | v3 |
| Image storage | Cloudinary | — |
| Email | Resend SDK | — |
| Icons | Lucide React | outline style only |

---

## Project Structure

```
shukky/
├── client/
│   ├── index.html
│   ├── vite.config.js
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── styles/
│   │   │   ├── tokens.css        ← all CSS custom properties (colors, spacing, type)
│   │   │   ├── global.css        ← resets, base typography, body defaults
│   │   │   └── breakpoints.css   ← media query variables and shared responsive rules
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   │   ├── Button.jsx
│   │   │   │   ├── Button.module.css
│   │   │   │   ├── Input.jsx
│   │   │   │   ├── Input.module.css
│   │   │   │   ├── Badge.jsx
│   │   │   │   ├── Badge.module.css
│   │   │   │   ├── Spinner.jsx
│   │   │   │   └── Spinner.module.css
│   │   │   ├── layout/
│   │   │   │   ├── BottomNav.jsx
│   │   │   │   ├── BottomNav.module.css
│   │   │   │   ├── Header.jsx
│   │   │   │   ├── Header.module.css
│   │   │   │   ├── PageWrapper.jsx
│   │   │   │   └── PageWrapper.module.css
│   │   │   ├── product/
│   │   │   │   ├── ProductCard.jsx
│   │   │   │   ├── ProductCard.module.css
│   │   │   │   ├── ProductGrid.jsx
│   │   │   │   ├── ProductGrid.module.css
│   │   │   │   ├── ProductImageGallery.jsx
│   │   │   │   └── ProductImageGallery.module.css
│   │   │   ├── cart/
│   │   │   │   ├── CartDrawer.jsx
│   │   │   │   ├── CartDrawer.module.css
│   │   │   │   ├── CartItem.jsx
│   │   │   │   ├── CartItem.module.css
│   │   │   │   ├── CartSummary.jsx
│   │   │   │   └── CartSummary.module.css
│   │   │   └── admin/
│   │   │       ├── AdminHeader.jsx
│   │   │       ├── AdminHeader.module.css
│   │   │       ├── OrderTable.jsx
│   │   │       ├── OrderTable.module.css
│   │   │       ├── ProductForm.jsx
│   │   │       ├── ProductForm.module.css
│   │   │       ├── ImageUploader.jsx
│   │   │       └── ImageUploader.module.css
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   ├── Home.module.css
│   │   │   ├── Shop.jsx
│   │   │   ├── Shop.module.css
│   │   │   ├── ProductDetail.jsx
│   │   │   ├── ProductDetail.module.css
│   │   │   ├── Cart.jsx
│   │   │   ├── Checkout.jsx
│   │   │   ├── OrderConfirmation.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   └── admin/
│   │   │       ├── AdminDashboard.jsx
│   │   │       ├── AdminProducts.jsx
│   │   │       ├── AdminOrders.jsx
│   │   │       └── AdminInventory.jsx
│   │   ├── store/
│   │   │   ├── cartStore.js
│   │   │   └── authStore.js
│   │   ├── lib/
│   │   │   ├── api.js
│   │   │   └── flutterwave.js
│   │   ├── hooks/
│   │   │   ├── useProducts.js
│   │   │   ├── useOrders.js
│   │   │   ├── useAdmin.js
│   │   │   └── useImageUpload.js
│   │   └── utils/
│   │       └── formatPrice.js
│
├── server/
│   ├── index.js
│   ├── prisma/
│   │   └── schema.prisma
│   ├── routes/
│   │   ├── auth.js
│   │   ├── products.js
│   │   ├── orders.js
│   │   ├── payment.js
│   │   └── admin.js
│   ├── middleware/
│   │   ├── authenticate.js
│   │   ├── adminOnly.js
│   │   └── verifyFlutterwaveWebhook.js
│   ├── config/
│   │   └── flutterwave.js
│   ├── lib/
│   │   └── prisma.js
│   └── services/
│       ├── emailService.js
│       ├── flutterwaveAuth.js
│       ├── pendingOrderPoller.js
│       └── paymentService.js
```

Every component has a paired `.module.css` file. Styles are never written inline or in a global file unless they are tokens or resets.

---

## Database Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

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
  price       Int
  images      String[]
  description String
  category    Category
  status      ProductStatus @default(ACTIVE)
  stock       Int           @default(0)
  orderItems  OrderItem[]
  createdAt   DateTime      @default(now())
}

model Order {
  id                String            @id @default(cuid())
  user              User?             @relation(fields: [userId], references: [id])
  userId            String?
  items             OrderItem[]
  totalAmount       Int
  paymentStatus     PaymentStatus     @default(PENDING)
  fulfillmentStatus FulfillmentStatus @default(PENDING)
  flutterwaveTxRef  String
  deliveryDetails   DeliveryDetails   @relation(fields: [deliveryDetailsId], references: [id])
  deliveryDetailsId String            @unique
  createdAt         DateTime          @default(now())
}

model OrderItem {
  id        String  @id @default(cuid())
  order     Order   @relation(fields: [orderId], references: [id])
  orderId   String
  product   Product @relation(fields: [productId], references: [id])
  productId String
  quantity  Int
  price     Int
}

model DeliveryDetails {
  id       String  @id @default(cuid())
  fullName String
  phone    String
  address  String
  city     String
  state    String
  notes    String?
  order    Order?
}

enum Role               { BUYER ADMIN }
enum ProductStatus      { ACTIVE OUT_OF_STOCK ARCHIVED }
enum PaymentStatus      { PENDING SUCCESS FAILED }
enum FulfillmentStatus  { PENDING PROCESSING SHIPPED DELIVERED }
enum Category           { SHOES BAGS ACCESSORIES }
```

**Price is stored in kobo (Int).** Divide by 100 before displaying or sending to Flutterwave. See utils/formatPrice.js.

---

## API Endpoints

All responses follow this envelope:

```json
{ "success": true, "data": {} }
{ "success": false, "message": "Human-readable error" }
```

Never send raw Prisma errors to the client. Always catch and return a user-safe message.

```
# Auth
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout

# Products — public
GET    /api/products          ?category=SHOES&page=1&limit=12
GET    /api/products/:id

# Orders — authenticated buyer
POST   /api/orders
GET    /api/orders/:id

# Payment
POST   /api/payment/webhook

# Admin — ADMIN role required on all
GET    /api/admin/orders
PATCH  /api/admin/orders/:id
POST   /api/admin/products
PATCH  /api/admin/products/:id
DELETE /api/admin/products/:id
GET    /api/admin/inventory
PATCH  /api/admin/inventory/:id
```

---

## Authentication Architecture

- Passwords hashed with bcrypt at 12 rounds on registration
- JWT signed with JWT_SECRET, stored in HTTP-only cookie with sameSite strict and secure true in production
- authenticate.js middleware verifies JWT from cookie on all protected routes
- adminOnly.js middleware checks user.role === 'ADMIN' on all /api/admin/* routes
- Frontend authStore holds user object and isAuthenticated boolean
- Protected pages redirect to /login if unauthenticated on mount
- Admin pages redirect non-admins to / on mount

---

## Payment Architecture

1. Buyer submits checkout form — delivery details collected before order creation
2. Frontend POSTs to /api/orders — backend creates DeliveryDetails first, then Order with paymentStatus PENDING, returns orderId and txRef
3. Frontend initializes Flutterwave inline widget with txRef, amount in Naira (totalAmount / 100), currency NGN, customer info, and redirect_url /order-confirmation/:orderId
4. Flutterwave handles payment UI
5. On completion, Flutterwave POSTs to /api/payment/webhook and redirects buyer to redirect_url
6. Webhook handler verifies HMAC-SHA256 signature, then verifies transaction with Flutterwave v4 verify API using an OAuth 2.0 access token (see flutterwaveAuth.js)
7. If verified and successful: update Order.paymentStatus to SUCCESS, decrement stock for each OrderItem, send buyer confirmation email, send admin notification email
8. If failed: update Order.paymentStatus to FAILED
9. OrderConfirmation page fetches order by ID and renders success or failure state from paymentStatus

The frontend never decides whether a payment succeeded. Only the backend webhook does.

---

## State Architecture

- Cart: Zustand with localStorage persistence via persist middleware. No cart API. Cart data never touches the database.
- Auth: Zustand. Holds user object and isAuthenticated. Hydrated from /api/auth/me on app load.
- Server data: fetched per page using custom hooks (useProducts, useOrders, useAdmin). Not stored globally in Zustand.
- Do not duplicate server data into Zustand. Do not use Context API.

---

## Performance Rules

- Product images always served from Cloudinary with transformation params: `?w=400&q=auto&f=auto` for lists; `?w=800&q=auto&f=auto` for detail views
- Product list is paginated at 12 items per page — never fetch all products without a limit
- Flutterwave script loaded dynamically only when buyer reaches Checkout — not on app init
- Images below the fold use loading="lazy"

---

## Hosting

- Frontend: Vercel
- Backend: Railway or Render
- Database: PostgreSQL on Railway or Supabase

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
NODE_ENV=

# Client (VITE_ prefix only)
VITE_API_BASE_URL=
VITE_FLUTTERWAVE_PUBLIC_KEY=
```

Only VITE_ prefixed variables are accessible in the client. Never expose server secrets to the frontend.