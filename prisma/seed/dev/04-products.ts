// prisma/seed/dev/04-products.ts
// ============================================
// DÉVELOPPEMENT — CATALOGUE ÉTENDU DE PRODUITS
// ============================================
// Génère des produits avec variantes et images via les factories
// déterministes. Idempotent via upsert sur slug.

import { Seeder } from "../types";
import { buildProductsBatch } from "../factories/product.factory";
import { generateUUIDv7 } from "../utils/uuid";

export const DevProductsSeeder: Seeder = {
  name: "dev:products",
  order: 40,
  async run(ctx) {
    ctx.logger.start(this.name);

    // Récupérer les catégories principales
    const categories = await ctx.prisma.category.findMany({
      where: { parentId: null },
      select: { id: true, slug: true },
    });
    if (categories.length === 0) {
      ctx.logger.warn("Aucune catégorie trouvée — exécuter dev:categories d'abord.");
      return;
    }

    // Trouver un utilisateur admin (créateur de produits)
    const creator = await ctx.prisma.user.findFirst({
      where: { roleAssignment: { role: "ADMIN" } },
      select: { id: true },
    }) ?? await ctx.prisma.user.findFirst({ select: { id: true } });

    if (!creator) {
      ctx.logger.warn("Aucun utilisateur trouvé — exécuter dev:users d'abord.");
      return;
    }

    let productIndex = 0;
    let totalVariants = 0;

    for (const cat of categories) {
      // ~20 produits par catégorie principale
      const products = buildProductsBatch(productIndex, 20, cat.id, creator.id);
      productIndex += products.length;

      for (const p of products) {
        await ctx.prisma.product.upsert({
          where: { slug: p.slug },
          update: {
            name: p.name,
            sku: p.sku,
            description: p.description,
            price: p.price,
            basePrice: p.basePrice,
            currency: "USD",
            categoryId: p.categoryId,
            isActive: true,
            isFeatured: p.isFeatured,
            status: p.status,
            images: p.images,
            seoTitle: p.seoTitle,
            seoDescription: p.seoDescription,
          },
          create: {
            id: p.id,
            name: p.name,
            sku: p.sku,
            slug: p.slug,
            description: p.description,
            price: p.price,
            basePrice: p.basePrice,
            currency: "USD",
            categoryId: p.categoryId,
            userId: creator.id,
            isActive: true,
            isFeatured: p.isFeatured,
            isArchived: false,
            status: p.status,
            images: p.images,
            seoTitle: p.seoTitle,
            seoDescription: p.seoDescription,
          },
        });

        // Variantes
        for (const v of p.variants) {
          await ctx.prisma.productVariant.upsert({
            where: { sku: v.sku },
            update: { attributes: v.attributes, priceOffset: v.priceOffset },
            create: {
              id: v.id,
              productId: p.id,
              sku: v.sku,
              attributes: v.attributes,
              priceOffset: v.priceOffset,
            },
          });
          totalVariants++;
        }
      }
    }

    ctx.logger.info(`✓ Products (${productIndex}) + Variants (${totalVariants})`);
    ctx.logger.end(this.name);
  },
};