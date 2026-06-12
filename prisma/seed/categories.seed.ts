// prisma/seed/categories.seed.ts
import { PrismaClient } from "@prisma/client";
import { generateUUIDv7 } from "./seed-helpers";

const CATEGORY_DATA = [
  { slug: "femme", name: "Femme" },
  { slug: "homme", name: "Homme" },
  { slug: "enfant", name: "Enfant" },
  { slug: "sac", name: "Sacs" },
  { slug: "chaussure", name: "Chaussures" },
  { slug: "accessoire", name: "Accessoires" },
];

export async function seedCategories(prisma: PrismaClient) {
  console.log("📂 Amorçage des catégories...");

  const categoryMap = new Map<string, string>();

  for (const item of CATEGORY_DATA) {
    const category = await prisma.category.upsert({
      where: { slug: item.slug },
      update: { name: item.name },
      create: {
        id: generateUUIDv7(),
        name: item.name,
        slug: item.slug,
        description: `Collection exclusive ${item.name}`,
      },
    });
    categoryMap.set(item.slug, category.id);
  }

  return categoryMap;
}
