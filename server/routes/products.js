import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { productCache } from '../lib/cache.js'

const router = Router()

function sanitizeLogInput(str) {
  if (typeof str !== 'string') return str
  return str.replace(/[\r\n]/g, '_')
}

router.get('/', async (req, res) => {
  try {
    const { category, search, tags, colors, page = 1, limit = 12 } = req.query
    console.log('[GetProducts] Category: %s, Search: %s', sanitizeLogInput(category), sanitizeLogInput(search))

    const cacheKey = `products:${category || ''}:${search || ''}:${tags || ''}:${colors || ''}:${page}:${limit}`
    const cached = await productCache.get(cacheKey)
    if (cached) {
      console.log(`[GetProducts] Cache hit: ${cacheKey}`)
      return res.json({ success: true, data: cached })
    }

    const where = { status: 'ACTIVE' }
    
    if (category) where.category = category
    if (tags) where.tags = { hasSome: tags.split(',') }
    if (colors) where.colors = { hasSome: colors.split(',') }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    }

    const products = await prisma.product.findMany({
      where,
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
    })

    console.log(`[GetProducts] Success: Found ${products.length} products`)
    await productCache.set(cacheKey, products)
    return res.json({ success: true, data: products })
  } catch (error) {
    console.error('[GetProducts] CRITICAL ERROR:', error)
    return res.status(500).json({ success: false, message: 'Failed to load products. Please try again later.' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const cacheKey = `product:${id}`
    const cached = await productCache.get(cacheKey)
    if (cached) {
      console.log(`[GetProductById] Cache hit: ${cacheKey}`)
      return res.json({ success: true, data: cached })
    }

    const product = await prisma.product.findUnique({
      where: { id, status: 'ACTIVE' },
    })

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' })
    }

    await productCache.set(cacheKey, product)
    return res.json({ success: true, data: product })
  } catch (error) {
    console.error('[GetProductById]', error)
    return res.status(500).json({ success: false, message: 'Failed to load product' })
  }
})

export default router
