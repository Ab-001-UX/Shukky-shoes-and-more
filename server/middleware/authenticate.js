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
