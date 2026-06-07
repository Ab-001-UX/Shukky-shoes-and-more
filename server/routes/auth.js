import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import prisma from '../lib/prisma.js'
import { authenticate } from '../middleware/authenticate.js'
import { sendPasswordResetEmail } from '../services/emailService.js'
import rateLimit from 'express-rate-limit'

const router = Router()

function sanitizeLogInput(str) {
  if (typeof str !== 'string') return str
  return str.replace(/[\r\n]/g, '_')
}

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { success: false, message: 'Too many attempts. Try again in 15 minutes.' },
})

router.post('/register', authLimiter, async (req, res) => {
  try {
    const { name, email, password } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required' })
    }

    if (typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ success: false, message: 'Enter a valid email address' })
    }

    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email is already in use' })
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    // Check if this email should be an admin automatically
    const adminEmailsStr = process.env.ADMIN_EMAIL || 'adetomiwaabimbola@gmail.com'
    const adminEmails = adminEmailsStr.split(',').map(e => e.trim().toLowerCase())
    const isMasterAdmin = adminEmails.includes(email.toLowerCase())
    
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: hashedPassword,
        role: isMasterAdmin ? 'ADMIN' : 'BUYER'
      },
    })

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' })

    // Clear any existing session cookie before setting a new one to prevent session fixation
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    })

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })

    const { password: _, ...userWithoutPassword } = user
    return res.status(201).json({ success: true, data: userWithoutPassword })
  } catch (error) {
    console.error('[Register]', error)
    return res.status(500).json({ success: false, message: 'Failed to register account' })
  }
})

router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body
    console.log('[Login] Attempt for: %s', sanitizeLogInput(email))

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' })
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } })
    if (!user) {
      console.log('[Login] Account not found: %s', sanitizeLogInput(email))
      return res.status(401).json({ success: false, message: 'Incorrect email' })
    }

    console.log('[Login] User found: %s, comparing password...', sanitizeLogInput(user.email))
    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) {
      console.log('[Login] Invalid password for: %s', sanitizeLogInput(email))
      return res.status(401).json({ success: false, message: 'Incorrect password. Please try again.' })
    }

    console.log(`[Login] Password valid, signing token...`)
    const expiresIn = user.role === 'ADMIN' ? '24h' : '7d'
    const maxAge = user.role === 'ADMIN' ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000
    
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is missing from environment variables')
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn })

    console.log(`[Login] Token signed, setting cookie...`)
    // Clear any existing session cookie before setting a new one to prevent session fixation
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    })

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge,
    })

    const { password: _, ...userWithoutPassword } = user
    console.log(`[Login] Success: ${user.email}`)
    return res.json({ success: true, data: userWithoutPassword })
  } catch (error) {
    console.error('[Login] CRITICAL ERROR:', error)
    return res.status(500).json({ success: false, message: 'Failed to log in. Please try again.' })
  }
})

router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  })
  return res.json({ success: true, message: 'Logged out successfully' })
})

router.get('/me', authenticate, (req, res) => {
  try {
    if (!req.user) {
      console.log('[AuthMe] No user attached to request')
      return res.status(401).json({ success: false, message: 'Not authenticated' })
    }
    
    const { password: _, ...userWithoutPassword } = req.user
    console.log(`[AuthMe] Success: ${req.user.email}`)
    return res.json({ success: true, data: userWithoutPassword })
  } catch (error) {
    console.error('[AuthMe] CRITICAL ERROR:', error)
    return res.status(500).json({ success: false, message: 'Session check failed' })
  }
})

router.post('/forgot-password', authLimiter, async (req, res) => {
  try {
    const { email } = req.body
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' })
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } })
    if (!user) {
      return res.status(404).json({ success: false, message: 'Account not found with this email address' })
    }

    // Create a unique secret for this user by combining JWT_SECRET and their current password hash
    const secret = process.env.JWT_SECRET + user.password
    const resetToken = jwt.sign({ userId: user.id }, secret, { expiresIn: '1h' })

    await sendPasswordResetEmail(user.email, resetToken)

    return res.json({ success: true, message: 'Reset link sent! Please check your email.' })
  } catch (error) {
    console.error('[ForgotPassword] ERROR:', error)
    return res.status(500).json({ success: false, message: 'Failed to process request' })
  }
})

router.post('/reset-password', authLimiter, async (req, res) => {
  try {
    const { token: resetToken, password } = req.body
    if (!resetToken || !password) {
      return res.status(400).json({ success: false, message: 'Token and password are required' })
    }

    // Decode token without verification to extract userId
    const decoded = jwt.decode(resetToken)
    if (!decoded || !decoded.userId) {
      return res.status(400).json({ success: false, message: 'Invalid or expired token' })
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } })
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired token' })
    }

    // Verify token using the secret that includes the user's current password
    const secret = process.env.JWT_SECRET + user.password
    try {
      jwt.verify(resetToken, secret)
    } catch (err) {
      return res.status(400).json({ success: false, message: 'Invalid or expired token' })
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    })

    return res.json({ success: true, message: 'Password reset successfully' })
  } catch (error) {
    console.error('[ResetPassword] ERROR:', error)
    return res.status(500).json({ success: false, message: 'Failed to reset password' })
  }
})

export default router
