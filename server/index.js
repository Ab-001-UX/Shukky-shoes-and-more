// Triggering restart for .env changes
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'


import authRoutes from './routes/auth.js'
import productRoutes from './routes/products.js'
import orderRoutes from './routes/orders.js'
import paymentRoutes from './routes/payment.js'
import adminRoutes from './routes/admin.js'
import policyRoutes from './routes/policies.js'
import { authenticate } from './middleware/authenticate.js'
import { adminOnly } from './middleware/adminOnly.js'
import { securityHeaders } from './middleware/securityHeaders.js'

dotenv.config()

const app = express()

const isAllowedOrigin = (origin) => {
  if (!origin) return true
  if (origin === 'http://localhost:5173') return true
  if (origin === process.env.FRONTEND_URL) return true
  // Dynamically allow all Vercel preview and production subdomains
  if (origin.endsWith('.vercel.app')) return true
  return false
}

app.use(cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true
}))



app.use(securityHeaders)

// Capture raw body for Flutterwave webhook signature verification
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf
  }
}))
app.use(cookieParser())

app.use('/api/auth', authRoutes)
app.use('/api/products', productRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/payment', paymentRoutes)
app.use('/api/policies', policyRoutes)
app.use('/api/admin', authenticate, adminOnly, adminRoutes)

app.get('/health', (req, res) => {
  res.json({ success: true, message: 'Server is running' })
})

// Cron job endpoint to keep Supabase from pausing
app.get('/api/cron/ping', async (req, res) => {
  try {
    // Fetch 1 item to force a database connection
    await import('./lib/prisma.js').then(({ default: prisma }) => {
      return prisma.product.findFirst()
    })
    res.json({ status: 'alive', message: 'Database connection successful' })
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Database connection failed' })
  }
})

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Global Error Handler]', err)
  res.status(500).json({ success: false, message: 'An unexpected server error occurred' })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on all interfaces at port ${PORT}`)
})
