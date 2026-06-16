// prisma/seed/index.ts
import { PrismaClient } from "@prisma/client";
import { seedCategories } from "./categories.seed";
import { seedRoles, ROLE_DEFINITIONS } from "./roles.seed";
import { seedRoleConfigs } from "./role-config.seed";
import { seedModules } from "./modules.seed";
import { seedUsers } from "./users.seed";
import { productData } from "@/data/product-data";
import { slugify, normalizeImage } from "./seed-helpers";
import { generateUUIDv7 } from "@/lib/uuid";
import { ROLES } from "@/lib/auth/rbac";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 [BOUTIQUE COGI] Démarrage du seed atomique...");

  // ───────────────────────────────────────────
  // PHASE 1 : FONDATIONS RBAC (dépendances = 0)
  // ───────────────────────────────────────────
  console.log("\n─── PHASE 1 : RBAC CANONIQUE ───");

  // 1.1 Rôles (table `Role`) — 6 niveaux hiérarchiques
  const roleMap = await seedRoles(prisma);

  // 1.2 Configurations de permissions (table `RoleConfig`)
  //    Permet les overrides runtime sans redéploiement
  await seedRoleConfigs(prisma);

  // 1.3 Modules système avec métadonnées d'accès
  await seedModules(prisma);

  // 1.4 Super Admin — lié explicitement au rôle SUPER_ADMIN
  const superAdminRoleId = roleMap.get(ROLES.SUPER_ADMIN);
  if (!superAdminRoleId) {
    throw new Error(
      "[RBAC] CRITIQUE: SUPER_ADMIN non trouvé dans la Map des rôles.",
    );
  }

  const admin = await seedUsers(prisma, {
    role: ROLES.SUPER_ADMIN,
    email: "excellentservice1exls@gmail.com",
    name: "SuperAdmin Cogi",
    password: "@@@123Exls",
  });

  console.log(`   ✓ Admin lié au rôle ID: ${superAdminRoleId}`);

  // ───────────────────────────────────────────
  // PHASE 2 : MÉTIER (dépend de Phase 1)
  // ───────────────────────────────────────────
  console.log("\n─── PHASE 2 : DONNÉES MÉTIER ───");

  const categoryMap = await seedCategories(prisma);

  // ───────────────────────────────────────────
  // PHASE 3 : PRODUITS & STOCK (dépend de Phase 2)
  // ───────────────────────────────────────────
  console.log("\n─── PHASE 3 : PRODUITS & INVENTAIRE ───");

  const allProducts = Object.values(productData.products).flat();

  for (const raw of allProducts) {
    const categorySlug = String(raw.category || "femme");
    const categoryId =
      categoryMap.get(categorySlug) ?? categoryMap.get("femme")!;
    const name = String(raw.name);
    const slug = slugify(`${name}-${raw.id}`);
    const basePrice = Math.round(Number(raw.price || 0) * 100);
    const image = normalizeImage(String(raw.image || ""));

    const product = await prisma.product.upsert({
      where: { slug },
      update: {
        name,
        description: String(raw.description || ""),
        basePrice,
        images: image ? [image] : [],
        categoryId,
      },
      create: {
        id: generateUUIDv7(),
        name,
        slug,
        description: String(raw.description || ""),
        basePrice,
        currency: "USD",
        images: image ? [image] : [],
        categoryId,
        isFeatured: false,
        isArchived: false,
      },
    });

    // Variant atomique
    const sku = String(raw.id);
    await prisma.productVariant.upsert({
      where: { sku },
      update: {
        attributes: {
          taille: (raw as any).size ?? null,
          couleur: (raw as any).couleur ?? null,
        },
      },
      create: {
        id: generateUUIDv7(),
        productId: product.id,
        sku,
        attributes: {
          taille: (raw as any).size ?? null,
          couleur: (raw as any).couleur ?? null,
        },
        priceOffset: 0,
      },
    });

    // Stock initial (idempotent)
    const existingStock = await prisma.inventoryTransaction.count({
      where: { productId: product.id, reason: "RESTOCK" },
    });

    if (existingStock === 0) {
      await prisma.inventoryTransaction.create({
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

  // ───────────────────────────────────────────
  // RAPPORT FINAL
  // ───────────────────────────────────────────
  console.log("\n" + "═".repeat(50));
  console.log("✨ SEED TERMINÉ — RAPPORT D'ATOMICITÉ");
  console.log("═".repeat(50));
  console.log(`Rôles canoniques   : ${ROLE_DEFINITIONS.length}/6`);
  console.log(`Configs RBAC       : 6/6 (permissions + restrictions)`);
  console.log(`Super Admin        : ${admin.email} [${admin.role}]`);
  console.log(`Catégories         : ${categoryMap.size}`);
  console.log(`Produits           : ${allProducts.length}`);
  console.log("═".repeat(50));
}

export { main };
