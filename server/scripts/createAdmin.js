import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'

dotenv.config()

const prisma = new PrismaClient()

async function main() {
  const name = 'Store Owner'
  const email = process.env.ADMIN_EMAIL || 'admin@shukkyshoes.com'
  const password = 'adminpassword123' 
  
  console.log('--- Creating Admin User ---')
  
  const hashedPassword = await bcrypt.hash(password, 12)
  
  try {
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        role: 'ADMIN',
        password: hashedPassword
      },
      create: {
        name,
        email,
        password: hashedPassword,
        role: 'ADMIN'
      }
    })
    
    console.log(`Success! Admin account created/updated:`)
    console.log(`Email: ${user.email}`)
    console.log(`Password: ${password}`)
    console.log(`\nYou can now log in at /login and you will be redirected to the Admin Dashboard.`)
    
  } catch (error) {
    console.error('Error creating admin:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
