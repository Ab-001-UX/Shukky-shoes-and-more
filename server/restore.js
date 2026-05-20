import { PrismaClient } from '@prisma/client'
import fs from 'fs'

const prisma = new PrismaClient()

async function restore() {
  console.log('--- Starting Restore ---')
  try {
    const data = JSON.parse(fs.readFileSync('backup_data.json', 'utf8'))

    // Restore Users
    for (const user of data.users) {
      await prisma.user.upsert({
        where: { id: user.id },
        update: user,
        create: user,
      })
    }
    console.log('Users restored.')

    // Restore Products
    for (const product of data.products) {
      // Ensure new array fields are initialized if they don't exist in backup
      const productData = {
        ...product,
        colors: product.colors || [],
        tags: product.tags || [],
        availableSizes: product.availableSizes || [],
        unavailableSizes: product.unavailableSizes || [],
      }
      await prisma.product.upsert({
        where: { id: product.id },
        update: productData,
        create: productData,
      })
    }
    console.log('Products restored.')

    // Note: Restore for Orders/OrderItems/DeliveryDetails might be more complex 
    // due to foreign key constraints. We'll handle them if needed, 
    // but Products/Users are the most important.
    
    console.log('--- Restore Complete ---')
  } catch (error) {
    console.error('Restore failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

restore()
