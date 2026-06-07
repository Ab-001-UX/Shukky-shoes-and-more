import { Router } from 'express'
import jwt from 'jsonwebtoken'
import prisma from '../lib/prisma.js'

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

router.post('/', optionalAuth, async (req, res) => {
  console.log('[CreateOrder] Received request:', JSON.stringify(req.body, null, 2))
  try {
    const { items, deliveryDetails, totalAmount } = req.body

    if (!items || items.length === 0 || !deliveryDetails) {
      console.log('[CreateOrder] Invalid data: missing items or details')
      return res.status(400).json({ success: false, message: 'Invalid order data' })
    }

    const productIds = items.map(i => i.id)
    const dbProducts = await prisma.product.findMany({
      where: { id: { in: productIds } }
    })

    console.log('[CreateOrder] Found products in DB:', dbProducts.length)

    let calculatedTotal = 0
    for (const item of items) {
      const dbProduct = dbProducts.find(p => p.id === item.id)
      if (!dbProduct || dbProduct.status !== 'ACTIVE' || dbProduct.stock < item.quantity) {
        console.log('[CreateOrder] Product unavailable or low stock: %s', sanitizeLogInput(item.name))
        return res.status(400).json({ success: false, message: `Product ${item.name} is unavailable or out of stock` })
      }
      calculatedTotal += dbProduct.price * item.quantity
    }

    if (calculatedTotal !== totalAmount) {
      console.log('[CreateOrder] Price mismatch: calculatedTotal=%d, totalAmount=%s', calculatedTotal, sanitizeLogInput(String(totalAmount)))
      return res.status(400).json({ success: false, message: 'Price mismatch' })
    }

    const txRef = `shukky_${Date.now()}_${Math.random().toString(36).substring(7)}`
    console.log('[CreateOrder] Generating order with txRef:', txRef)

    const order = await prisma.order.create({
      data: {
        user: req.user?.id ? { connect: { id: req.user.id } } : undefined,
        totalAmount: calculatedTotal,
        paymentStatus: 'PENDING',
        flutterwaveTxRef: txRef,
        deliveryDetails: {
          create: {
            fullName: deliveryDetails.fullName,
            email: deliveryDetails.email, // Saved for notifications
            phone: deliveryDetails.phone,
            address: deliveryDetails.address,
            city: deliveryDetails.city,
            state: deliveryDetails.state,
            method: deliveryDetails.method,
            paymentMethod: deliveryDetails.paymentMethod,
            pickupPerson: deliveryDetails.pickupPerson,
            pickerName: deliveryDetails.pickerName,
            pickerPhone: deliveryDetails.pickerPhone,
            pickerGender: deliveryDetails.pickerGender,
            notes: deliveryDetails.notes,
          }
        },
        items: {
          create: items.map(item => ({
            productId: item.id,
            color: item.color || null,
            size: item.size || null,
            quantity: item.quantity,
            price: dbProducts.find(p => p.id === item.id).price
          }))
        }
      },
      include: {
        items: { include: { product: true } },
        deliveryDetails: true
      }
    })

    console.log('[CreateOrder] Order created successfully:', order.id)
    
    // For "Pay on Delivery" orders, notify admin immediately since there is no payment webhook.
    // For online payments, the webhook in payment.js sends the admin email after verifying the transaction.
    if (order.deliveryDetails.paymentMethod === 'ON_DELIVERY') {
      const { sendAdminNotificationEmail } = await import('../services/emailService.js')
      sendAdminNotificationEmail(order).catch(err => console.error('[Email] Admin notification failed:', err))
    }

    return res.status(201).json({ success: true, data: { orderId: order.id, txRef } })
  } catch (error) {
    console.error('[CreateOrder] CRITICAL ERROR:', error)
    
    // Check for Prisma validation errors
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, message: 'An order with this reference already exists.' })
    }
    
    return res.status(500).json({ success: false, message: 'Server Error. Failed to create order.' })
  }
})

// Get most recent order for logged-in user
router.get('/recent/mine', optionalAuth, async (req, res) => {
  try {
    if (!req.user) {
      return res.json({ success: true, data: null })
    }

    const order = await prisma.order.findFirst({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        items: { include: { product: true } },
        deliveryDetails: true
      }
    })

    return res.json({ success: true, data: order })
  } catch (error) {
    console.error('[GetRecentOrder]', error)
    return res.status(500).json({ success: false, message: 'Failed to fetch recent order' })
  }
})

router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        items: { include: { product: true } },
        deliveryDetails: true
      }
    })

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' })
    }

    if (req.user?.role !== 'ADMIN' && order.userId && order.userId !== req.user?.id) {
       return res.status(403).json({ success: false, message: 'Access denied' })
    }

    return res.json({ success: true, data: order })
  } catch (error) {
    console.error('[GetOrder]', error)
    return res.status(500).json({ success: false, message: 'Failed to fetch order' })
  }
})

// Customer confirms they received the package
router.patch('/:id/confirm-delivery', optionalAuth, async (req, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id }
    })

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' })
    }

    // Only allow confirmation if currently SHIPPED
    if (order.fulfillmentStatus !== 'SHIPPED') {
      return res.status(400).json({ success: false, message: 'Order cannot be confirmed yet' })
    }

    // Verify the user owns this order
    if (req.user && order.userId && order.userId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' })
    }

    const updated = await prisma.order.update({
      where: { id: req.params.id },
      data: { fulfillmentStatus: 'DELIVERED' }
    })

    console.log(`[ConfirmDelivery] Order ${order.id} confirmed by customer`)
    return res.json({ success: true, data: updated })
  } catch (error) {
    console.error('[ConfirmDelivery]', error)
    return res.status(500).json({ success: false, message: 'Failed to confirm delivery' })
  }
})

export default router
