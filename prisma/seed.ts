import { PrismaClient } from '@prisma/client'
import data from '../data/product-data.json'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Amorçage de la base de données...')

  // 1. Aplatir le catalogue d'articles pour un traitement par lots
  const allProducts = Object.values(data.products).flat()

  // 2. Préparer les opérations (sans les exécuter)
  const upsertOperations = allProducts.map((product) => {
    // Validation stricte indispensable
    const parsedPrice = parseInt(String(product.price), 10)
    if (isNaN(parsedPrice)) {
      throw new Error(`Prix invalide détecté pour l'article ID: ${product.id}`)
    }

    return prisma.product.upsert({
      where: { id: String(product.id) },
      update: {
        name: String(product.name),
        description: String(product.description || ""),
        price: parsedPrice,
        images: [String(product.image)], 
        category: String(product.category || "NON-CLASSIFIE"),
        stock: 10, 
      },
      create: {
        id: String(product.id),
        name: String(product.name),
        description: String(product.description || ""),
        price: parsedPrice,
        images: [String(product.image)],
        category: String(product.category || "NON-CLASSIFIE"),
        stock: 10,
      },
    })
  })

  // 3. Exécution optimisée en une seule transaction
  await prisma.$transaction(upsertOperations)

  console.log('✅ Base de données initialisée avec succès')
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