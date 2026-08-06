// prisma/seed/prod/02-base-categories.ts
// ============================================
// PRODUCTION — STRUCTURE DE BASE DU CATALOGUE
// ============================================
// Injecte uniquement les catégories racines métier (pas de produits).
// Idempotent via slug unique.

import { Seeder } from "../types";
import { generateUUIDv7 } from "../utils/uuid";

const BASE_CATEGORIES = [
  { name: "Femme", slug: "femme", description: "Mode et élégance pour femmes" },
  { name: "Homme", slug: "homme", description: "Classiques et tendances hommes" },
  { name: "Enfant", slug: "enfant", description: "Confort et couleurs pour enfants" },
  { name: "Chaussures", slug: "chaussures", description: "Tendances pieds" },
  { name: "Sacs", slug: "sacs", description: "Accessoires de luxe" },
  { name: "Accessoires", slug: "accessoires", description: "La touche finale" },
] as const;

export const ProdBaseCategoriesSeeder: Seeder = {
  name: "prod:base-categories",
  order: 20,
  async run(ctx) {
    ctx.logger.start(this.name);

    for (const c of BASE_CATEGORIES) {
      await ctx.prisma.category.upsert({
        where: { slug: c.slug },
        update: { name: c.name, description: c.description },
        create: {
          id: generateUUIDv7(),
          name: c.name,
          slug: c.slug,
          description: c.description,
          subtitle: "",
          displayOrder: 0,
          OrderBy: "displayOrder",
        },
      });
    }

    ctx.logger.info(`✓ Base categories (${BASE_CATEGORIES.length})`);
    ctx.logger.end(this.name);
  },
};

