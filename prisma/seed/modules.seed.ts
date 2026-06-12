// prisma/seed/modules.seed.ts
import { PrismaClient, Prisma } from "@prisma/client"; // Importez Prisma ici

export async function seedModules(prisma: PrismaClient) {
  console.log("📦 Configuration des modules système...");

  // Configuration des méthodes de livraison
  const shipping = await prisma.shippingMethod.upsert({
    where: { id: "00000000-0000-4000-8000-000000000001" }, // UUID v4/v7 statique pour le seed
    update: {
      isActive: true,
      // Assurez-vous que basePrice est de type Decimal dans votre schema.prisma
      basePrice: new Prisma.Decimal(500),
    },
    create: {
      id: "00000000-0000-4000-8000-000000000001",
      name: "Livraison standard Kinshasa",
      description: "Livraison sécurisée en 2 à 5 jours ouvrés",
      basePrice: new Prisma.Decimal(500), // Cohérence avec l'objet update
      isActive: true,
    },
  });

  return { shipping };
}
