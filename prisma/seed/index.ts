// prisma/seed/index.ts

import { PrismaClient } from "@prisma/client";
import { seedCategories } from "./categories.seed";
import { seedRoles } from "./roles.seed";
import { seedModules } from "./modules.seed";
import { seedUsers } from "./users.seed";
import { productData } from "@/data/product-data";
import { slugify, generateUUIDv7, normalizeImage } from "./seed-helpers";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Démarrage du seed Boutique COGI...");

  // 1. Indépendants
  await seedRoles(prisma);
  await seedModules(prisma);
  await seedUsers(prisma);

  // 2. Catégories (nécessaire pour les produits)
  const categoryMap = await seedCategories(prisma);

  // 3. Produits et Stock
  console.log("🛒 Traitement des produits...");
  const allProducts = Object.values(productData.products).flat();

  for (const raw of allProducts) {
    const categorySlug = String(raw.category || "femme");
    const categoryId =
      categoryMap.get(categorySlug) ?? categoryMap.get("femme")!;
    const name = String(raw.name);
    const slug = slugify(`${name}-${raw.id}`);
    const basePrice = Math.round(Number(raw.price || 0) * 100);
    const image = normalizeImage(String(raw.image || ""));

    // Upsert du Produit
    const product = await prisma.product.upsert({
      where: { slug },
      update: {
        name,
        description: String(raw.description || ""),
        basePrice,
        images: image ? [image] : [], // Ensure images is an array of strings
        categoryId,
      },
      create: {
        id: generateUUIDv7(),
        name,
        slug,
        description: String(raw.description || ""),
        basePrice,
        currency: "USD", // Default currency
        images: image ? [image] : [],
        categoryId,
        isFeatured: false,
        isArchived: false,
      },
    });

    // Upsert du Variant (Attributs atomiques)
    const sku = String(raw.id);
    await prisma.productVariant.upsert({
      where: { sku },
      update: {
        attributes: {
          taille: (raw as any).size ?? null,
          couleur: (raw as any).couleur ?? null,
        },
      },
      create: {
        id: generateUUIDv7(),
        productId: product.id,
        sku,
        attributes: {
          taille: (raw as any).size ?? null,
          couleur: (raw as any).couleur ?? null,
        },
        priceOffset: 0,
      },
    });

    // Gestion du Stock initial
    const existingStock = await prisma.inventoryTransaction.count({
      where: { productId: product.id, reason: "RESTOCK" },
    });

    if (existingStock === 0) {
      await prisma.inventoryTransaction.create({
        data: {
          id: generateUUIDv7(),
          productId: product.id,
          quantity: 20,
          reason: "RESTOCK",
        },
      });
    }
  }

  console.log("✨ Amorçage terminé avec succès.");
}

export { main };
