// prisma/seed/dev/02-categories.ts
// ============================================
// DÉVELOPPEMENT — ARBORESCENCE DE CATÉGORIES
// ============================================
// Construit une hiérarchie de catégories riche (parent/enfant) pour le dev.
// Idempotent via upsert sur slug.

import { Seeder } from "../types";
import { generateUUIDv7 } from "../utils/uuid";

interface CatNode {
  slug: string;
  name: string;
  description?: string;
  parent?: string;
  displayOrder?: number;
}

const CATEGORY_TREE: CatNode[] = [
  { slug: "femme", name: "Femme", description: "Mode et élégance pour femmes", displayOrder: 1 },
  { slug: "homme", name: "Homme", description: "Classiques et tendances hommes", displayOrder: 2 },
  { slug: "enfant", name: "Enfant", description: "Confort et couleurs pour enfants", displayOrder: 3 },
  { slug: "chaussures", name: "Chaussures", description: "Tendances pieds", parent: "femme", displayOrder: 4 },
  { slug: "sacs", name: "Sacs", description: "Accessoires de luxe", parent: "femme", displayOrder: 5 },
  { slug: "accessoires", name: "Accessoires", description: "La touche finale", parent: "femme", displayOrder: 6 },
  { slug: "robes", name: "Robes", description: "Robes élégantes", parent: "femme", displayOrder: 7 },
  { slug: "costumes", name: "Costumes", description: "Costumes pour homme", parent: "homme", displayOrder: 8 },
  { slug: "chemises", name: "Chemises", description: "Chemises homme", parent: "homme", displayOrder: 9 },
  { slug: "vetements-enfants", name: "Vêtements enfants", description: "Vêtements pour enfants", parent: "enfant", displayOrder: 10 },
];

export const DevCategoriesSeeder: Seeder = {
  name: "dev:categories",
  order: 20,
  async run(ctx) {
    ctx.logger.start(this.name);

    const idBySlug = new Map<string, string>();

    // 1. Créer d'abord les parents (sans parent)
    for (const node of CATEGORY_TREE) {
      if (node.parent) continue;
      const cat = await ctx.prisma.category.upsert({
        where: { slug: node.slug },
        update: { name: node.name, description: node.description, displayOrder: node.displayOrder ?? 0 },
        create: {
          id: generateUUIDv7(),
          name: node.name,
          slug: node.slug,
          description: node.description ?? `Collection ${node.name}`,
          subtitle: "",
          displayOrder: node.displayOrder ?? 0,
          OrderBy: "displayOrder",
        },
      });
      idBySlug.set(node.slug, cat.id);
    }

    // 2. Créer les enfants (avec parent)
    for (const node of CATEGORY_TREE) {
      if (!node.parent) continue;
      const parentId = idBySlug.get(node.parent);
      const cat = await ctx.prisma.category.upsert({
        where: { slug: node.slug },
        update: { name: node.name, parentId, description: node.description },
        create: {
          id: generateUUIDv7(),
          name: node.name,
          slug: node.slug,
          description: node.description ?? `Collection ${node.name}`,
          subtitle: "",
          displayOrder: node.displayOrder ?? 0,
          OrderBy: "displayOrder",
          parentId,
        },
      });
      idBySlug.set(node.slug, cat.id);
    }

    ctx.logger.info(`✓ Categories (${CATEGORY_TREE.length} hiérarchie)`);
    ctx.logger.end(this.name);
  },
};