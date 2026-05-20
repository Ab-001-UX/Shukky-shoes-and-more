import { Router } from 'express'
import prisma from '../lib/prisma.js'

const router = Router()

// GET all policies
router.get('/', async (req, res) => {
  try {
    const policies = await prisma.policy.findMany()
    return res.json({ success: true, data: policies })
  } catch (error) {
    console.error('[GetPolicies]', error)
    return res.status(500).json({ success: false, message: 'Failed to fetch policies' })
  }
})

// GET policy by type
router.get('/:type', async (req, res) => {
  try {
    const policy = await prisma.policy.findUnique({
      where: { type: req.params.type }
    })
    return res.json({ success: true, data: policy })
  } catch (error) {
    console.error('[GetPolicyByType]', error)
    return res.status(500).json({ success: false, message: 'Failed to fetch policy' })
  }
})

export default router
