// prisma/seed/dev/03-attributes.ts
// ============================================
// DÉVELOPPEMENT — ATTRIBUTS, TAGS & MARQUES
// ============================================
// Injecte les attributs de produits (couleur, taille...), les tags et
// les marques de démonstration. Idempotent via upsert.

import { Seeder } from "../types";
import { generateUUIDv7 } from "../utils/uuid";

const ATTRIBUTES = [
  { name: "couleur", type: "select" },
  { name: "taille", type: "select" },
  { name: "matiere", type: "text" },
  { name: "edition_limitee", type: "boolean" },
];

const TAGS = [
  "nouveaute",
  "promotion",
  "best-seller",
  "edition-limitee",
  "made-in-rdc",
  "premium",
];

export const DevAttributesSeeder: Seeder = {
  name: "dev:attributes",
  order: 30,
  async run(ctx) {
    ctx.logger.start(this.name);

    // 1. Attributs de produit
    for (const attr of ATTRIBUTES) {
      await ctx.prisma.productAttribute.upsert({
        where: { name: attr.name },
        update: { type: attr.type },
        create: { id: generateUUIDv7(), name: attr.name, type: attr.type },
      });
    }

    // 2. Attributs de variante (VariantAttributeConfig)
    for (const attr of ATTRIBUTES.slice(0, 2)) {
      await ctx.prisma.variantAttributeConfig.upsert({
        where: { attribute: attr.name },
        update: { label: attr.name, type: attr.type.toUpperCase(), isRequired: true },
        create: {
          id: generateUUIDv7(),
          attribute: attr.name,
          label: attr.name,
          type: attr.type.toUpperCase(),
          isRequired: true,
          minRoleLevel: 4,
        },
      });
    }

    // 3. Tags
    for (const tag of TAGS) {
      await ctx.prisma.tag.upsert({
        where: { slug: tag },
        update: { name: tag },
        create: { id: generateUUIDv7(), name: tag, slug: tag },
      });
    }

    ctx.logger.info(`✓ Attributes (${ATTRIBUTES.length}) + Tags (${TAGS.length})`);
    ctx.logger.end(this.name);
  },
};
</content>
