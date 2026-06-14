// prisma/seed/categories.seed.ts
import { PrismaClient } from "@prisma/client";
import { generateUUIDv7 } from "@/lib/uuid";
import { generateSlug } from "@/lib/utils/slug";

const CATEGORY_DATA = [
  {
    slug: "femme",
    name: "Femme",
    description:
      "Découvrez notre collection exclusive pour femmes, alliant élégance et confort.",
  },
  {
    slug: "homme",
    name: "Homme",
    description:
      "Explorez notre gamme de vêtements et accessoires pour hommes, alliant style et fonctionnalité.",
  },
  {
    slug: "enfant",
    name: "Enfant",
    description:
      "Des tenues adorables et confortables pour les enfants de tous âges.",
  },
  {
    slug: "sac",
    name: "Sacs",
    description:
      "Trouvez le sac parfait pour chaque occasion, du sac à main élégant au sac à dos pratique.",
  },
  {
    slug: "chaussure",
    name: "Chaussures",
    description:
      "Marchez avec style grâce à notre sélection de chaussures pour toutes les saisons.",
  },
  {
    slug: "accessoire",
    name: "Accessoires",
    description:
      "Complétez votre look avec nos accessoires tendance : bijoux, foulards, ceintures et plus encore.",
  },
  {
    slug: "nouveaute",
    name: "Nouveautés",
    description:
      "Découvrez les dernières tendances et nos nouveautés fraîchement arrivées.",
  },
  {
    slug: "promotion",
    name: "Promotions",
    description:
      "Profitez de nos offres spéciales et réductions sur une sélection d'articles.",
  },
  {
    slug: "meilleures-ventes",
    name: "Meilleures Ventes",
    description:
      "Découvrez nos articles les plus populaires et les mieux notés par nos clients.",
  },
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
        description: item.description || `Collection exclusive ${item.name}`,
      },
    });
    categoryMap.set(item.slug, category.id);
  }

  return categoryMap;
}
