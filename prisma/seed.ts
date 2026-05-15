import { PrismaClient } from "@prisma/client";
import data from "../data/product-data.json";
import { slugify } from "../lib/utils/slug";
import { generateUUIDv7 } from "../lib/uuid";

const prisma = new PrismaClient();

const CATEGORY_LABELS: Record<string, string> = {
  femme: "Femme",
  homme: "Homme",
  enfant: "Enfant",
  sac: "Sacs",
  chaussure: "Chaussures",
  accessoire: "Accessoires",
};

function normalizeImage(path: string) {
  if (!path) return "/media/placeholder.webp";
  if (path.startsWith("/media/")) return path;
  return `/media${path.startsWith("/") ? path : `/${path}`}`;
}

async function main() {
  console.log("🌱 Amorçage de la base de données Boutique COGI...");

  const categoryMap = new Map<string, string>();

  for (const [slug, name] of Object.entries(CATEGORY_LABELS)) {
    const category = await prisma.category.upsert({
      where: { slug },
      update: { name },
      create: {
        id: generateUUIDv7(),
        name,
        slug,
        description: `Collection ${name}`,
      },
    });
    categoryMap.set(slug, category.id);
  }

  const allProducts = Object.values(data.products).flat();

  for (const raw of allProducts) {
    const categorySlug = String(raw.category || "femme");
    const categoryId = categoryMap.get(categorySlug) ?? categoryMap.get("femme")!;
    const name = String(raw.name);
    const slug = slugify(`${name}-${raw.id}`);
    const basePrice = Math.round(Number(raw.price || 0) * 100);
    const image = normalizeImage(String(raw.image || ""));

    const product = await prisma.product.upsert({
      where: { slug },
      update: {
        name,
        description: String(raw.description || ""),
        basePrice,
        images: [image],
        categoryId,
        isArchived: false,
      },
      create: {
        id: generateUUIDv7(),
        name,
        slug,
        description: String(raw.description || ""),
        basePrice,
        currency: "USD",
        images: [image],
        categoryId,
        isFeatured: false,
        isArchived: false,
      },
    });

    const sku = String(raw.id);
    await prisma.productVariant.upsert({
      where: { sku },
      update: {
        attributes: {
          taille: raw.size ?? null,
          couleur: raw.couleur ?? null,
        },
        priceOffset: 0,
      },
      create: {
        id: generateUUIDv7(),
        productId: product.id,
        sku,
        attributes: {
          taille: raw.size ?? null,
          couleur: raw.couleur ?? null,
        },
        priceOffset: 0,
      },
    });

    const existingStock = await prisma.inventoryTransaction.count({
      where: { productId: product.id, reason: "RESTOCK" },
    });

    if (existingStock === 0) {
      await prisma.inventoryTransaction.create({
        data: {
          id: generateUUIDv7(),
          productId: product.id,
          quantity: 10,
          reason: "RESTOCK",
        },
      });
    }
  }

  const express = await prisma.shippingMethod.upsert({
    where: { id: "00000000-0000-4000-8000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-4000-8000-000000000001",
      name: "Livraison standard Kinshasa",
      description: "Livraison en 2 à 5 jours ouvrés",
      basePrice: 500,
      isActive: true,
    },
  });

  console.log(`✅ ${allProducts.length} produits, catégories et livraison « ${express.name} » prêts.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
