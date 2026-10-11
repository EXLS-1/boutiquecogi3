// prisma/seed/test/03-minimal-catalog.ts
// ============================================
// TEST — 1 CATÉGORIE + 2 PRODUITS + 1 VARIANTE (DÉTERMINISTE)
// ============================================
// Catalogue minimal et fixe pour les tests E2E.

import { Seeder } from "../types";
import { generateDeterministicUuidV7 } from "../utils/uuid";

export const TestMinimalCatalogSeeder: Seeder = {
  name: "test:minimal-catalog",
  order: 30,
  async run(ctx) {
    ctx.logger.start(this.name);

    const categoryId = generateDeterministicUuidV7("test-category", 0);
    const product1Id = generateDeterministicUuidV7("test-product", 0);
    const product2Id = generateDeterministicUuidV7("test-product", 1);
    const variantId = generateDeterministicUuidV7("test-variant", 0);

    // Créateur (admin test)
    const creator = await ctx.prisma.user.findFirst({
      where: { roleAssignment: { roleConfig: { role: "ADMIN" } } },
      select: { id: true },
    }) ?? await ctx.prisma.user.findFirst({ select: { id: true } });

    if (!creator) {
      ctx.logger.warn("Aucun admin trouvé — exécuter test:minimal-users d'abord.");
      return;
    }

    // 1. Catégorie
    await ctx.prisma.category.upsert({
      where: { slug: "test-category" },
      update: { name: "Catégorie Test" },
      create: {
        id: categoryId,
        name: "Catégorie Test",
        slug: "test-category",
        description: "Catégorie de test",
        subtitle: "",
        displayOrder: 0,
        OrderBy: "displayOrder",
      },
    });

    // 2. Produits
    // `productTypeId` est obligatoire : on retombe sur le type par défaut actif.
    const defaultProductType =
      (await ctx.prisma.productTypeConfig.findFirst({
        where: { isDefault: true, isActive: true },
        select: { id: true },
        orderBy: { createdAt: "asc" },
      })) ??
      (await ctx.prisma.productTypeConfig.findFirst({
        where: { isActive: true },
        select: { id: true },
        orderBy: { createdAt: "asc" },
      }));
    if (!defaultProductType) {
      ctx.logger.warn("Aucun type de produit actif — exécuter d'abord le seed des types.");
      return;
    }

    const products = [
      { id: product1Id, name: "Produit Test 1", sku: "TEST-PROD-1", slug: "produit-test-1", price: 2500, catId: categoryId },
      { id: product2Id, name: "Produit Test 2", sku: "TEST-PROD-2", slug: "produit-test-2", price: 5000, catId: categoryId },
    ];

    for (const p of products) {
      await ctx.prisma.product.upsert({
        where: { slug: p.slug },
        update: { name: p.name, sku: p.sku },
        create: {
          id: p.id,
          name: p.name,
          sku: p.sku,
          slug: p.slug,
          description: `Description ${p.name}`,
          productTypeId: defaultProductType.id,
          currency: "USD",
          categoryId: p.catId,
          userId: creator.id,
          isActive: true,
          status: "PUBLISHED",
          // Le prix vit dans la grille `productPrice` (montant en centimes).
          productPrice: { create: { currency: "USD", amount: p.price } },
        },
      });
    }

    // 3. Variante pour le produit 1
    await ctx.prisma.productVariant.upsert({
      where: { sku: "TEST-PROD-1-NOIR" },
      update: { attributes: { couleur: "Noir", taille: "M" } },
      create: {
        id: variantId,
        productId: product1Id,
        sku: "TEST-PROD-1-NOIR",
        attributes: { couleur: "Noir", taille: "M" },
        priceOffset: 0,
      },
    });

    ctx.logger.info(`✓ Minimal catalog (1 catégorie, 2 produits, 1 variante)`);
    ctx.logger.end(this.name);
  },
};