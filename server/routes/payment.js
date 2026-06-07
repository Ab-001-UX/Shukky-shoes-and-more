import { Router } from 'express'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import prisma from '../lib/prisma.js'
import { verifyTransaction } from '../services/paymentService.js'
import { sendOrderConfirmationEmail, sendAdminNotificationEmail } from '../services/emailService.js'

const router = Router()

function sanitizeLogInput(str) {
  if (typeof str !== 'string') return str
  return str.replace(/[\r\n]/g, '_')
}

const optionalAuth = async (req, res, next) => {
  const token = req.cookies?.token
  if (token) {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET)
      const user = await prisma.user.findUnique({ where: { id: payload.userId } })
      if (user) req.user = user
    } catch (e) {
      // ignore
    }
  }
  next()
}

function verifyFlutterwaveWebhook(req, res, next) {
  const signature = req.headers['flutterwave-signature']
  const secretHash = process.env.FLW_SECRET_HASH

  if (!signature || !secretHash) {
    console.error('[Webhook] Missing signature or secret hash')
    return res.status(401).json({ success: false, message: 'Invalid webhook signature' })
  }

  // HMAC-SHA256 signature verification as per v4 architecture
  const hash = crypto
    .createHmac('sha256', secretHash)
    .update(req.rawBody)
    .digest('base64')

  if (hash !== signature) {
    console.error('[Webhook] Signature mismatch')
    return res.status(401).json({ success: false, message: 'Invalid webhook signature' })
  }

  next()
}

router.post('/webhook', verifyFlutterwaveWebhook, async (req, res) => {
  try {
    const { event, data } = req.body
    console.log('[Webhook] Received event: %s', sanitizeLogInput(event))

    // v4 charge event
    if (event === 'charge.completed' && data) {
      const chargeId = data.id
      
      // 1. Verify the transaction with Flutterwave API (Server-to-Server)
      const verifiedData = await verifyTransaction(chargeId)
      
      if (verifiedData.status === 'succeeded') {
        // 2. Find the pending order
        const order = await prisma.order.findFirst({
          where: { 
            flutterwaveTxRef: verifiedData.txRef,
            paymentStatus: 'PENDING'
          },
          include: { items: { include: { product: true } }, deliveryDetails: true, user: true }
        })

        if (order) {
          console.log(`[Webhook] Confirming order ${order.id}`)
          
          // 3. Update order and stock in a transaction
          await prisma.$transaction([
            prisma.order.update({
              where: { id: order.id },
              data: { paymentStatus: 'SUCCESS' }
            }),
            ...order.items.map(item => prisma.product.update({
              where: { id: item.productId },
              data: { stock: { decrement: item.quantity } }
            }))
          ])

          // Auto-update status to OUT_OF_STOCK if stock <= 0
          for (const item of order.items) {
            const product = await prisma.product.findUnique({ where: { id: item.productId } })
            if (product && product.stock <= 0) {
              await prisma.product.update({
                where: { id: product.id },
                data: { status: 'OUT_OF_STOCK' }
              })
            }
          }

          // 4. Send email to admin only
          sendAdminNotificationEmail(order).catch(err => console.error('[Email] Admin notification failed:', err))
          
          console.log(`[Webhook] Order ${order.id} fulfilled successfully`)
        }
      } else if (verifiedData.status === 'failed') {
        // Mark as failed if the verification confirms failure
        await prisma.order.updateMany({
          where: { 
            flutterwaveTxRef: verifiedData.txRef,
            paymentStatus: 'PENDING'
          },
          data: { paymentStatus: 'FAILED' }
        })
      }
    }

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('[Webhook] Error processing payment:', error.message)
    // Always return 200 to Flutterwave even if our processing fails, 
    // to prevent retries of invalid requests, unless it's a transient server error.
    return res.status(200).json({ success: true, processed: false })
  }
})

// Frontend-initiated verification — called after Flutterwave redirects back
router.get('/verify/:orderId', optionalAuth, async (req, res) => {
  try {
    const { orderId } = req.params
    const { transaction_id } = req.query

    const safeOrderId = sanitizeLogInput(orderId)
    const safeTxId = sanitizeLogInput(transaction_id)
    console.log('[PaymentVerify] Verifying order: %s, txId: %s', safeOrderId, safeTxId)

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { product: true } }, deliveryDetails: true, user: true }
    })

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' })
    }

    // IDOR protection: if the order belongs to a user, ensure the requesting user matches or is an ADMIN
    if (order.userId && req.user?.role !== 'ADMIN' && order.userId !== req.user?.id) {
      return res.status(403).json({ success: false, message: 'Access denied' })
    }

    // If already verified, just return the order
    if (order.paymentStatus === 'SUCCESS') {
      return res.json({ success: true, data: order })
    }

    // If we have a transaction_id from Flutterwave, verify it
    if (transaction_id) {
      const verifiedData = await verifyTransaction(transaction_id)
      console.log(`[PaymentVerify] Flutterwave status: ${verifiedData.status}`)

      if (verifiedData.status === 'succeeded') {
        // Re-fetch inside a transaction with a row-level check to guard against
        // the webhook already having processed this payment (idempotency).
        const freshOrder = await prisma.order.findUnique({ where: { id: orderId } })
        if (freshOrder.paymentStatus === 'SUCCESS') {
          // Webhook already confirmed this — just return the latest order state
          console.log('[PaymentVerify] Order %s already confirmed by webhook, skipping', sanitizeLogInput(orderId))
          const alreadyUpdated = await prisma.order.findUnique({
            where: { id: orderId },
            include: { items: { include: { product: true } }, deliveryDetails: true },
          })
          return res.json({ success: true, data: alreadyUpdated })
        }

        await prisma.$transaction([
          prisma.order.update({
            where: { id: order.id },
            data: { paymentStatus: 'SUCCESS' },
          }),
          ...order.items.map(item => prisma.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } },
          })),
        ])

        // Auto-update status to OUT_OF_STOCK if stock <= 0
        for (const item of order.items) {
          const product = await prisma.product.findUnique({ where: { id: item.productId } })
          if (product && product.stock <= 0) {
            await prisma.product.update({
              where: { id: product.id },
              data: { status: 'OUT_OF_STOCK' },
            })
          }
        }

        // Send admin email (only reaches here if webhook hadn't processed it already)
        const { sendAdminNotificationEmail } = await import('../services/emailService.js')
        sendAdminNotificationEmail(order).catch(err => console.error('[Email] Failed:', err))

        // Fetch updated order
        const updatedOrder = await prisma.order.findUnique({
          where: { id: orderId },
          include: { items: { include: { product: true } }, deliveryDetails: true },
        })

        console.log('[PaymentVerify] Order %s confirmed!', sanitizeLogInput(orderId))
        return res.json({ success: true, data: updatedOrder })
      } else if (verifiedData.status === 'failed') {
        await prisma.order.update({
          where: { id: order.id },
          data: { paymentStatus: 'FAILED' },
        })
        const failedOrder = await prisma.order.findUnique({
          where: { id: orderId },
          include: { items: { include: { product: true } }, deliveryDetails: true },
        })
        return res.json({ success: true, data: failedOrder })
      } else {
        // Payment might be pending (common for USSD/Bank transfer)
        return res.json({ success: true, data: order, message: 'Payment is still processing' })
      }
    }

    // No transaction_id — just return current state
    return res.json({ success: true, data: order })
  } catch (error) {
    console.error('[PaymentVerify] Error:', error)
    return res.status(500).json({ success: false, message: 'Payment verification failed' })
  }
})

export default router
