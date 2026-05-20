import { Router } from 'express'
import prisma from '../lib/prisma.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const { category, search, tags, colors, page = 1, limit = 12 } = req.query
    console.log(`[GetProducts] Category: ${category}, Search: ${search}`)

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
    return res.json({ success: true, data: products })
  } catch (error) {
    console.error('[GetProducts] CRITICAL ERROR:', error)
    return res.status(500).json({ success: false, message: 'Failed to load products. Please try again later.' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id, status: 'ACTIVE' },
    })

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' })
    }

    return res.json({ success: true, data: product })
  } catch (error) {
    console.error('[GetProductById]', error)
    return res.status(500).json({ success: false, message: 'Failed to load product' })
  }
})

export default router
