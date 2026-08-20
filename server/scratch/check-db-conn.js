import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env') })

import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL
    }
  }
})

async function main() {
  console.log('DATABASE_URL:', process.env.DATABASE_URL)
  console.log('Attempting to connect to database...')
  const products = await prisma.product.findFirst()
  console.log('Query successful! Product found:', products)
}

main().catch((err) => {
  console.error('Connection failed:')
  console.error(err)
}).finally(() => prisma.$disconnect())
