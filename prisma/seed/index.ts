// prisma/seed/index.ts

import { PrismaClient } from "@prisma/client";
import { seedRoleConfigs } from "@/prisma/seed/role-config.seed";
import { seedModules } from "@/prisma/seed/modules.seed";
import { seedUsers } from "@/prisma/seed/users.seed";
import { seedCategories } from "@/prisma/seed/categories.seed";
import { seedOrderStatuses, seedCheckoutConfig } from "@/prisma/seed/orders.seed";
import { seedWishlistConfig } from "@/prisma/seed/wishlist.seed";
import { seedProductTypes, seedVariantAttributes } from "@/prisma/seed/product-config.seed";
import { seedAuditEventTypes, seedRetentionPolicies } from "@/prisma/seed/audit.seed";
import { seedPaymentMethods, seedFinancialThresholds } from "@/prisma/seed/treasury.seed";
import { seedMediaTypes, seedStorageQuotas } from "@/prisma/seed/media.seed";
import { seedVideoTypes, seedStreamingConfig } from "@/prisma/seed/video.seed";
import { seedAuditApprovalPolicies } from "@/prisma/seed/audit-approval.seed";
import { productData } from "@/data/product-data";
import { slugify, normalizeImage } from "@/prisma/seed/seed-helpers";
import { generateUUIDv7 } from "@/lib/utils/uuid";
import { prisma } from "@/lib/prisma";

export async function main(client: PrismaClient) {
  console.log("🚀 [BOUTIQUE COGI] Démarrage du seed atomique RBAC...");

  // ═══════════════════════════════════════════
  // PHASE 1 : FONDATIONS RBAC & BOOTSTRAP ROOT
  // ═══════════════════════════════════════════
  console.log("\n" + "═".repeat(60));
  console.log("PHASE 1 : FONDATIONS RBAC CANONIQUE");
  console.log("═".repeat(60));

  await seedRoleConfigs(client);
  await seedModules(client);

  // L'appel utilise désormais la configuration d'environnement sécurisée
  const admin = await seedUsers(client);
  console.log(`   ✓ Admin initialisé : ${admin.email} [${admin.role}]`);

  // ═══════════════════════════════════════════
  // PHASE 2 : CONFIGURATION MÉTIER RBAC
  // ═══════════════════════════════════════════
  console.log("\n" + "═".repeat(60));
  console.log("PHASE 2 : CONFIGURATION MÉTIER RBAC");
  console.log("═".repeat(60));

  await seedOrderStatuses(client);
  await seedCheckoutConfig(client);
  await seedWishlistConfig(client);
  await seedProductTypes(client);
  await seedVariantAttributes(client);
  await seedAuditEventTypes(client);
  await seedRetentionPolicies(client);
  await seedPaymentMethods(client);
  await seedFinancialThresholds(client);
  await seedMediaTypes(client);
  await seedStorageQuotas(client);
  await seedVideoTypes(client);
  await seedStreamingConfig(client);
  await seedAuditApprovalPolicies(client);

  // ═══════════════════════════════════════════
  // PHASE 3 : DONNÉES MÉTIER (CATÉGORIES)
  // ═══════════════════════════════════════════
  console.log("\n" + "═".repeat(60));
  console.log("PHASE 3 : DONNÉES MÉTIER");
  console.log("═".repeat(60));

  const categoryMap = await seedCategories(client);

  // ═══════════════════════════════════════════
  // PHASE 4 : PRODUITS & INVENTAIRE
  // ═══════════════════════════════════════════
  console.log("\n" + "═".repeat(60));
  console.log("PHASE 4 : PRODUITS & INVENTAIRE");
  console.log("═".repeat(60));

  const allProducts = Object.values(productData.products).flat();

  for (const raw of allProducts) {
    const categorySlug = String(raw.category || "femme");
    const categoryId = categoryMap.get(categorySlug) ?? categoryMap.get("femme")!;
    const name = String(raw.name);
    const slug = slugify(`${name}-${raw.id}`);
    const basePrice = Math.round(Number(raw.price || 0) * 100);
    const image = normalizeImage(String(raw.image || ""));
    const priceDecimal = (basePrice / 100).toFixed(2);

    const product = await client.product.upsert({
      where: { slug },
      update: {
        name,
        description: String(raw.description || ""),
        basePrice,
        price: priceDecimal,
        images: image ? [image] : [],
        categoryId,
        status: 'PUBLISHED',
      },
      create: {
        id: generateUUIDv7(),
        name,
        slug,
        description: String(raw.description || ""),
        basePrice,
        price: priceDecimal,
        currency: "USD",
        status: 'PUBLISHED',
        images: image ? [image] : [],
        categoryId,
        isFeatured: false,
        isArchived: false,
        userId: admin.id,
      },
    });

    const sku = String(raw.id);
    await client.productVariant.upsert({
      where: { sku },
      update: {
        attributes: {
          taille: (raw as unknown as Record<string, unknown>).size ?? null,
          couleur: (raw as unknown as Record<string, unknown>).couleur ?? null,
        },
      },
      create: {
        id: generateUUIDv7(),
        productId: product.id,
        sku,
        attributes: {
          taille: (raw as unknown as Record<string, unknown>).size ?? null,
          couleur: (raw as unknown as Record<string, unknown>).couleur ?? null,
        },
        priceOffset: 0,
      },
    });

    const existingStock = await client.inventoryTransaction.count({
      where: { productId: product.id, reason: "RESTOCK" },
    });

    if (existingStock === 0) {
      await client.inventoryTransaction.create({
        data: {
          id: generateUUIDv7(),
          productId: product.id,
          quantity: 20,
          reason: "RESTOCK",
        },
      });
    }
  }

  console.log(`   ✓ ${allProducts.length} produits synchronisés.`);

  // ═══════════════════════════════════════════
  // RAPPORT FINAL
  // ═══════════════════════════════════════════
  console.log("\n" + "═".repeat(60));
  console.log("✨ SEED TERMINÉ — RAPPORT D'ATOMICITÉ RBAC");
  console.log("═".repeat(60));
  console.log(`Super Admin              : ${admin.email} [${admin.role}]`);
  console.log(`Catégories               : ${categoryMap.size}`);
  console.log(`Produits                 : ${allProducts.length}`);
  console.log("═".repeat(60));
}

// Exécution sécurisée du Script CLI
main(prisma)
  .catch((e) => {
    console.error("❌ [SEED ERROR FATAL]", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
  