import { PrismaClient } from '@prisma/client'
import data from '../public/data.json'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Créer les produits
  for (const category of Object.keys(data.products)) {
    const products = data.products[category as keyof typeof data.products]

    for (const product of products) {
      await prisma.product.upsert({
        where: { id: product.id },
        update: {
          name: product.name,
          description: product.description,
          price: product.price,
          images: [product.image], // Pour l'instant une seule image
          category: product.category,
          stock: 10, // Stock par défaut
        },
        create: {
          id: product.id,
          name: product.name,
          description: product.description,
          price: product.price,
          images: [product.image],
          category: product.category,
          stock: 10,
        },
      })
    }
  }

  console.log('✅ Database seeded successfully')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })