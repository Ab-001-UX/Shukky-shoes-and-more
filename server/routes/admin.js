import { Router } from 'express'
import crypto from 'crypto'
import prisma from '../lib/prisma.js'
import { productCache } from '../lib/cache.js'

const router = Router()

function sanitizeLogInput(str) {
  if (typeof str !== 'string') return str
  return str.replace(/[\r\n]/g, '_')
}

async function logAdminActivity(req, action, details) {
  try {
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        userEmail: req.user.email,
        action,
        details: typeof details === 'string' ? details : JSON.stringify(details),
        ipAddress
      }
    })
  } catch (err) {
    console.error('[AuditLog] Failed to create audit log:', err)
  }
}

// GET Cloudinary Signature for client-side upload
router.get('/cloudinary-signature', (req, res) => {
  try {
    const timestamp = Math.round((new Date).getTime()/1000)
    const apiSecret = process.env.CLOUDINARY_API_SECRET
    
    if (!apiSecret) {
      return res.status(500).json({ success: false, message: 'Cloudinary not configured' })
    }

    const signature = crypto.createHash('sha1').update(`timestamp=${timestamp}${apiSecret}`).digest('hex')
    
    res.json({ 
      success: true, 
      data: { 
        timestamp, 
        signature, 
        apiKey: process.env.CLOUDINARY_API_KEY, 
        cloudName: process.env.CLOUDINARY_CLOUD_NAME 
      } 
    })
  } catch(e) {
    res.status(500).json({ success: false, message: 'Could not generate signature' })
  }
})

// GET all orders
router.get('/orders', async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        deliveryDetails: true,
        user: true,
        items: { include: { product: true } }
      }
    })
    return res.json({ success: true, data: orders })
  } catch (error) {
    console.error('[AdminGetOrders]', error)
    return res.status(500).json({ success: false, message: 'Failed to fetch orders' })
  }
})

// PATCH order fulfillment or payment status
router.patch('/orders/:id', async (req, res) => {
  try {
    const { fulfillmentStatus, paymentStatus } = req.body
    
    const data = {}
    if (fulfillmentStatus) {
      if (!['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(fulfillmentStatus)) {
        return res.status(400).json({ success: false, message: 'Invalid fulfillment status' })
      }
      data.fulfillmentStatus = fulfillmentStatus
    }

    if (paymentStatus) {
      if (!['PENDING', 'SUCCESS', 'FAILED'].includes(paymentStatus)) {
        return res.status(400).json({ success: false, message: 'Invalid payment status' })
      }
      data.paymentStatus = paymentStatus
    }
    
    const order = await prisma.order.update({
      where: { id: req.params.id },
      data
    })

    // Log admin activity
    logAdminActivity(req, 'UPDATE_ORDER', { orderId: order.id, data })

    return res.json({ success: true, data: order })
  } catch (error) {
    console.error('[AdminUpdateOrder]', error)
    return res.status(500).json({ success: false, message: 'Failed to update order' })
  }
})

// GET all products with complete metadata for admin management
router.get('/products', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { status: { not: 'ARCHIVED' } },
      orderBy: { createdAt: 'desc' },
    })
    return res.json({ success: true, data: products })
  } catch (error) {
    console.error('[AdminGetProducts]', error)
    return res.status(500).json({ success: false, message: 'Failed to fetch products' })
  }
})

// POST create product
router.post('/products', async (req, res) => {
  try {
    const { name, price, images, colors, tags, availableSizes, unavailableSizes, description, category, stock, status } = req.body
    
    if (!name || !price || !description || !category) {
      return res.status(400).json({ success: false, message: 'Missing required product fields' })
    }

    const parsedPrice = parseInt(price, 10)
    const parsedStock = parseInt(stock || 0, 10)

    if (isNaN(parsedPrice) || isNaN(parsedStock)) {
      return res.status(400).json({ success: false, message: 'Price and Stock must be valid numbers' })
    }

    const product = await prisma.product.create({
      data: {
        name: name.trim(),
        price: parsedPrice,
        images: Array.isArray(images) ? images : [],
        colors: Array.isArray(colors) ? colors : [],
        tags: Array.isArray(tags) ? tags : [],
        availableSizes: Array.isArray(availableSizes) ? availableSizes : [],
        unavailableSizes: Array.isArray(unavailableSizes) ? unavailableSizes : [],
        description: description.trim(),
        category,
        stock: parsedStock,
        status: status || 'ACTIVE'
      }
    })

    // Invalidate product list cache
    await productCache.clearPattern('products:')

    // Log admin activity
    logAdminActivity(req, 'CREATE_PRODUCT', { productId: product.id, name: product.name })

    return res.status(201).json({ success: true, data: product })
  } catch (error) {
    console.error('[AdminCreateProduct]', error)
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to create product' 
    })
  }
})

// PATCH update product
router.patch('/products/:id', async (req, res) => {
  try {
    const { name, price, images, colors, tags, availableSizes, unavailableSizes, description, category, stock, status } = req.body
    
    const data = {}
    if (name) data.name = name.trim()
    if (description) data.description = description.trim()
    if (category) data.category = category
    if (status) data.status = status
    if (images) data.images = images
    if (colors) data.colors = colors
    if (tags) data.tags = tags
    if (availableSizes !== undefined) data.availableSizes = Array.isArray(availableSizes) ? availableSizes : []
    if (unavailableSizes !== undefined) data.unavailableSizes = Array.isArray(unavailableSizes) ? unavailableSizes : []
    
    if (price !== undefined) {
      const parsedPrice = parseInt(price, 10)
      if (isNaN(parsedPrice)) return res.status(400).json({ success: false, message: 'Invalid price' })
      data.price = parsedPrice
    }

    if (stock !== undefined) {
      const parsedStock = parseInt(stock, 10)
      if (isNaN(parsedStock)) return res.status(400).json({ success: false, message: 'Invalid stock' })
      data.stock = parsedStock
    }

    const product = await prisma.product.update({
      where: { id: req.params.id },
      data
    })

    // Invalidate caches
    await productCache.clearPattern('products:')
    await productCache.delete(`product:${req.params.id}`)

    // Log admin activity
    logAdminActivity(req, 'UPDATE_PRODUCT', { productId: product.id, data })

    return res.json({ success: true, data: product })
  } catch (error) {
    console.error('[AdminUpdateProduct]', error)
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to update product' 
    })
  }
})

// DELETE product
router.delete('/products/:id', async (req, res) => {
  try {
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: { status: 'ARCHIVED' }
    })

    // Invalidate caches
    await productCache.clearPattern('products:')
    await productCache.delete(`product:${req.params.id}`)

    // Log admin activity
    logAdminActivity(req, 'DELETE_PRODUCT', { productId: product.id })

    return res.json({ success: true, data: product })
  } catch (error) {
    console.error('[AdminDeleteProduct]', error)
    return res.status(500).json({ success: false, message: 'Failed to archive product' })
  }
})

// GET inventory
router.get('/inventory', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, stock: true, status: true, images: true, price: true }
    })
    return res.json({ success: true, data: products })
  } catch (error) {
    console.error('[AdminGetInventory]', error)
    return res.status(500).json({ success: false, message: 'Failed to fetch inventory' })
  }
})

// PATCH update inventory (stock)
router.patch('/inventory/:id', async (req, res) => {
  try {
    const { stock } = req.body
    
    if (stock === undefined) {
      return res.status(400).json({ success: false, message: 'Stock value is required' })
    }

    const stockNum = Number(stock)
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: { 
        stock: stockNum,
        status: stockNum > 0 ? 'ACTIVE' : 'OUT_OF_STOCK'
      }
    })

    // Invalidate caches
    await productCache.clearPattern('products:')
    await productCache.delete(`product:${req.params.id}`)

    // Log admin activity
    logAdminActivity(req, 'UPDATE_INVENTORY', { productId: product.id, stock: stockNum })

    return res.json({ success: true, data: product })
  } catch (error) {
    console.error('[AdminUpdateInventory]', error)
    return res.status(500).json({ success: false, message: 'Failed to update stock' })
  }
})

// GET all policies for admin
router.get('/policies', async (req, res) => {
  try {
    const policies = await prisma.policy.findMany()
    return res.json({ success: true, data: policies })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch policies' })
  }
})

// PUT update or create policy
router.put('/policies/:type', async (req, res) => {
  try {
    const { content } = req.body
    const { type } = req.params

    if (!content) {
      return res.status(400).json({ success: false, message: 'Content is required' })
    }

    const policy = await prisma.policy.upsert({
      where: { type: type.toUpperCase() },
      update: { content },
      create: { type: type.toUpperCase(), content }
    })

    // Log admin activity
    logAdminActivity(req, 'UPDATE_POLICY', { type: type.toUpperCase() })

    return res.json({ success: true, data: policy })
  } catch (error) {
    console.error('[AdminUpdatePolicy]', sanitizeLogInput(req.params.type), error)
    return res.status(500).json({ success: false, message: 'Failed to update policy in database' })
  }
})

export default router
