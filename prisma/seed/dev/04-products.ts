// prisma/seed/dev/04-products.ts
// ============================================
// DÉVELOPPEMENT — CATALOGUE ÉTENDU DE PRODUITS
// ============================================
// Génère des produits avec variantes via les factories déterministes.
// Idempotent via upsert sur slug.
//
// Aligné sur le schéma Prisma réel (25/09/2026) :
//   Product (requis) : name/slug/sku/description, productTypeId,
//             userId + createdBy (User.products), price Decimal,
//             currency, images Json (String[]), seoTitle/seoDescription
//             plats, stockQuantity, stockStatus, trackInventory.
//             Catégories via CategoryProduct (@@unique productId).
//   ProductVariant (requis) : productId + sku unique global, price
//             Decimal, stock, stockStatus, attributes Json, images Json.

import { Seeder } from "../types";

import { buildProductsBatch } from "../factories/product.factory";

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
      where: { roleAssignment: { roleConfig: { role: "ADMIN" } } },
      select: { id: true },
    }) ?? await ctx.prisma.user.findFirst({ select: { id: true } });

    if (!creator) {
      ctx.logger.warn("Aucun utilisateur trouvé — exécuter dev:users d'abord.");
      return;
    }

    // Type de produit par défaut (créé en bootstrap:tax-carriers)
    const defaultProductType = await ctx.prisma.productTypeConfig.findFirst({
      where: { type: "PHYSICAL" },
      select: { id: true },
    });
    if (!defaultProductType) {
      ctx.logger.warn("Aucun ProductTypeConfig PHYSICAL — exécuter le bootstrap d'abord.");
      return;
    }

    let productIndex = 0;
    let totalVariants = 0;

    for (const cat of categories) {
      // ~20 produits par catégorie principale
      const products = buildProductsBatch(productIndex, 20, cat.id, creator.id);
      productIndex += products.length;

      for (const p of products) {
        const priceValue = Number.parseFloat(p.priceUSD || "0");
        const seedImages: string[] =
          Array.isArray(p.images) && p.images.length > 0
            ? p.images
            : ["https://storage.boutiquecogi3.cd/products/placeholder-1.webp"];
        await ctx.prisma.product.upsert({
          where: { slug: p.slug },
          update: {
            name: p.name,
            description: p.description,
            productTypeId: defaultProductType.id,
            status: p.status,
            isActive: true,
            isFeatured: p.isFeatured,
            price: priceValue,
            currency: "USD",
            images: seedImages,
            stockQuantity: 100,
            stockStatus: "IN_STOCK",
            seoTitle: p.seoTitle,
            seoDescription: p.seoDescription,
          },
          create: {
            id: p.id,
            name: p.name,
            slug: p.slug,
            sku: p.sku,
            description: p.description,
            productTypeId: defaultProductType.id,
            status: p.status,
            isActive: true,
            isFeatured: p.isFeatured,
            isArchived: false,
            userId: creator.id,
            createdBy: creator.id,
            price: priceValue,
            currency: "USD",
            images: seedImages,
            stockQuantity: 100,
            stockStatus: "IN_STOCK",
            trackInventory: true,
            seoTitle: p.seoTitle,
            seoDescription: p.seoDescription,
            // Liaisons catégorie via la table de jonction (unique productId)
            categoryLinks: { create: { categoryId: cat.id } },
          },
        });

        // Variantes — SKU unique global, rattachées via productId.
        const saved = await ctx.prisma.product.findUnique({
          where: { slug: p.slug },
          select: { id: true },
        });
        if (!saved) continue;

        for (const v of p.variants) {
          const variantPrice = Number.parseFloat(v.priceUSD || "0") || priceValue;
          await ctx.prisma.productVariant.upsert({
            where: { sku: v.sku },
            update: {
              productId: saved.id,
              attributes: v.attributes,
              price: variantPrice,
              stock: 100,
              stockStatus: "IN_STOCK",
              images: [],
            },
            create: {
              id: v.id,
              productId: saved.id,
              sku: v.sku,
              attributes: v.attributes,
              price: variantPrice,
              stock: 100,
              stockStatus: "IN_STOCK",
              images: [],
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