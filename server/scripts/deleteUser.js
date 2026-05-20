import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function deleteUser() {
  const email = 'shodeindeabdulhamid@gmail.com'
  console.log(`Attempting to delete user: ${email}`)
  
  try {
    const deletedUser = await prisma.user.delete({
      where: { email }
    })
    console.log(`Success! Deleted user: ${deletedUser.email}`)
  } catch (error) {
    if (error.code === 'P2025') {
      console.log('User not found in database.')
    } else {
      console.error('Error deleting user:', error)
    }
  } finally {
    await prisma.$disconnect()
  }
}

deleteUser()
