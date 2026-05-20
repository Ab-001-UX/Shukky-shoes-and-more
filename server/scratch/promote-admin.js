import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: { in: ['adetomiwaabimbola@gmail.com', 'Shukkyshoes@gmail.com'] } }
  })
  
  if (user) {
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { role: 'ADMIN' }
    })
    console.log(`Success: ${updated.email} is now an ADMIN.`)
  } else {
    console.log('No user found with those emails. Please register first!')
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
