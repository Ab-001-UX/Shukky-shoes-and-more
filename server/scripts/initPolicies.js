import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const policies = [
    {
      type: 'DELIVERY',
      content: `**### Delivery Policy**
- **Rider Fees:** All rider delivery fees are strictly paid by the buyer upon delivery.
- **Immediate Movement:** We do not offer stockpiling services. Items must be delivered or picked up immediately after purchase confirmation.
- **In-Person Pickup:** Items picked up from the store must be inspected at the point of collection.`
    },
    {
      type: 'RETURNS',
      content: `**### Return & Exchange Policy**
- **48-Hour Deadline:** No returns, complaints, or reports will be accepted after 2 days (48 hours) from the time of purchase or delivery.
- **No Damage Policy:** We will not replace or accept any item that was delivered or picked up in good condition but is returned with damages (scuffs, stains, broken straps, etc.).
- **Final Sale:** We operate a strict **NO EXCHANGE** policy unless there is a verifiable manufacturing defect reported within the 48-hour window.
- **Inspection:** By completing your purchase, you agree that you have inspected the product images/description and accept the item in its stated condition.`
    },
    {
      type: 'GENERAL',
      content: `**### General Terms & Security**
- **Payment:** Payment confirms your agreement to all store policies listed here.
- **Stock:** Items are sold on a first-pay, first-served basis.
- **Security:** We prioritize your data safety and use secure payment gateways (Flutterwave) for all transactions.`
    }
  ]

  console.log('Initializing policies with bold formatting...')

  for (const p of policies) {
    await prisma.policy.upsert({
      where: { type: p.type },
      update: { content: p.content },
      create: { type: p.type, content: p.content }
    })
  }

  console.log('Policies initialized successfully!')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
