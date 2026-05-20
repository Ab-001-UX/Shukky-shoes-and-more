# Shukky Shoes & More 👟✨

A premium, mobile-first e-commerce storefront for a high-end fashion brand. Built with a "liquid glass" design aesthetic and integrated with Flutterwave for secure payments.

## 🚀 Features
- **Mobile-First Design:** Optimized for a smooth shopping experience on any device.
- **Liquid Glass UI:** Modern, magnifying-glass-inspired navigation and product displays.
- **Secure Payments:** Full Flutterwave v4 integration with automatic stock management.
- **Admin Dashboard:** Manage orders, products, and inventory in real-time.
- **Custom Policies:** Easily update Delivery and Return terms from the admin panel.
- **Email Notifications:** Automatic receipts and order alerts via Resend.

## 🛠️ Tech Stack
- **Frontend:** React (Vite), CSS Modules, Lucide Icons, Zustand.
- **Backend:** Node.js, Express, Prisma ORM.
- **Database:** PostgreSQL (Supabase/Railway).
- **Services:** Flutterwave (Payments), Cloudinary (Images), Resend (Emails).

## 📦 Setup Instructions

### 1. Prerequisites
- Node.js (v18+)
- PostgreSQL Database (Supabase recommended)

### 2. Environment Variables
Create a `.env` file in both the `client` and `server` folders using the `.env.example` templates provided.

**Server (.env):**
- `DATABASE_URL`, `JWT_SECRET`, `FLW_CLIENT_ID`, `FLW_CLIENT_SECRET`, `FLW_SECRET_HASH`, `RESEND_API_KEY`, `CLOUDINARY_URL`.

**Client (.env):**
- `VITE_API_BASE_URL`, `VITE_FLW_PUBLIC_KEY`.

### 3. Installation
```bash
# Install dependencies for both
cd client && npm install
cd ../server && npm install
```

### 4. Database Setup
```bash
cd server
npx prisma db push
node scripts/initPolicies.js
node scripts/createAdmin.js
```

### 5. Start Development
```bash
# In one terminal
cd server && npm run dev

# In another terminal
cd client && npm run dev
```

## 📄 License
This project is private and for the exclusive use of Shukky Shoes & More.
