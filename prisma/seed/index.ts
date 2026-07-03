// prisma/seed/index.ts
// Orchestrateur principal du seed avec RBAC atomique — compatible enum Prisma

import { seedRoleConfigs } from "./role-config.seed";
import { seedModules } from "./modules.seed";
import { seedUsers } from "./users.seed";
import { seedCategories } from "./categories.seed";
import { seedOrderStatuses, seedCheckoutConfig } from "./orders.seed";
import { seedWishlistConfig } from "./wishlist.seed";
import { seedProductTypes, seedVariantAttributes } from "./product-config.seed";
import { seedAuditEventTypes, seedRetentionPolicies } from "./audit.seed";
import { seedPaymentMethods, seedFinancialThresholds } from "./treasury.seed";
import { seedMediaTypes, seedStorageQuotas } from "./media.seed";
import { seedVideoTypes, seedStreamingConfig } from "./video.seed";
import { seedAuditApprovalPolicies } from "./audit-approval.seed";
import { productData } from "@/data/product-data";
import { slugify, normalizeImage } from "./seed-helpers";
import { generateUUIDv7 } from "@/lib/uuid";
import { ROLES, LEVELS } from "@/lib/auth/rbac";
import { prisma } from "@/lib/prisma";

async function main(prisma: unknown) {
  console.log("🚀 [BOUTIQUE COGI] Démarrage du seed atomique RBAC...");

  // ═══════════════════════════════════════════
  // PHASE 1 : FONDATIONS RBAC (dépendances = 0)
  // ═══════════════════════════════════════════
  console.log("\n" + "═".repeat(60));
  console.log("PHASE 1 : FONDATIONS RBAC CANONIQUE");
  console.log("═".repeat(60));

  await seedRoleConfigs(prisma);
  await seedModules(prisma);

  const admin = await seedUsers(prisma, {
    role: ROLES.SUPER_ADMIN,
    email: "excellentservice1exls@gmail.com",
    name: "SuperAdmin Cogi",
    password: "@@@123Exls",
  });
  console.log(`   ✓ Admin créé: ${admin.email} [${admin.role}]`);

  // ═══════════════════════════════════════════
  // PHASE 2 : CONFIGURATION MÉTIER RBAC
  // ═══════════════════════════════════════════
  console.log("\n" + "═".repeat(60));
  console.log("PHASE 2 : CONFIGURATION MÉTIER RBAC");
  console.log("═".repeat(60));

  await seedOrderStatuses(prisma);
  await seedCheckoutConfig(prisma);
  await seedWishlistConfig(prisma);
  await seedProductTypes(prisma);
  await seedVariantAttributes(prisma);
  await seedAuditEventTypes(prisma);
  await seedRetentionPolicies(prisma);
  await seedPaymentMethods(prisma);
  await seedFinancialThresholds(prisma);
  await seedMediaTypes(prisma);
  await seedStorageQuotas(prisma);
  await seedVideoTypes(prisma);
  await seedStreamingConfig(prisma);
  await seedAuditApprovalPolicies(prisma);

  // ═══════════════════════════════════════════
  // PHASE 3 : DONNÉES MÉTIER
  // ═══════════════════════════════════════════
  console.log("\n" + "═".repeat(60));
  console.log("PHASE 3 : DONNÉES MÉTIER");
  console.log("═".repeat(60));

  const categoryMap = await seedCategories(prisma);

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

    const product = await prisma.product.upsert({
      where: { slug },
      update: {
        name, description: String(raw.description || ""),
        basePrice, price: priceDecimal, images: image ? [image] : [], categoryId, status: 'PUBLISHED',
      },
      create: {
        id: generateUUIDv7(), name, slug,
        description: String(raw.description || ""),
        basePrice, price: priceDecimal, currency: "USD",
        status: 'PUBLISHED',
        images: image ? [image] : [], categoryId,
        isFeatured: false, isArchived: false,
        userId: (admin as any).id,
      },
    });

    const sku = String(raw.id);
    await prisma.productVariant.upsert({
      where: { sku },
      update: {
        attributes: {
          taille: (raw as unknown as Record<string, unknown>).size ?? null,
          couleur: (raw as unknown as Record<string, unknown>).couleur ?? null,
        },
      },
      create: {
        id: generateUUIDv7(), productId: product.id, sku,
        attributes: {
          taille: (raw as unknown as Record<string, unknown>).size ?? null,
          couleur: (raw as unknown as Record<string, unknown>).couleur ?? null,
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
          id: generateUUIDv7(), productId: product.id,
          quantity: 20, reason: "RESTOCK",
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
  console.log(`Enum Role Prisma         : 6 valeurs (SUPER_ADMIN → USER)`);
  console.log(`Configs RBAC             : 6/6 (permissions + restrictions)`);
  console.log(`Super Admin              : ${admin.email} [${admin.role}]`);
  console.log(`Statuts de commande      : 8`);
  console.log(`Étapes de checkout       : 4`);
  console.log(`Types de wishlist        : 4`);
  console.log(`Types de produits        : 5`);
  console.log(`Attributs de variante    : 4`);
  console.log(`Types d'audit            : 14 (incl. 4 événements d'audit de rôle)`);
  console.log(`Politiques de rétention  : 5 (incl. audit approval)`);
  console.log(`Méthodes de paiement     : 4`);
  console.log(`Seuils financiers        : 4`);
  console.log(`Types de médias          : 7`);
  console.log(`Quotas de stockage       : 6`);
  console.log(`Types de vidéos          : 5`);
  console.log(`Configs streaming        : 3`);
  console.log(`Politiques audit approval: 1`);
  console.log(`Catégories               : ${categoryMap.size}`);
  console.log(`Produits                 : ${allProducts.length}`);
  console.log("═".repeat(60));
}

export { main };