import { PrismaClient } from "@prisma/client";
import { generateUUIDv7 } from "@/lib/utils/uuid";
import { ROLES, PERMISSIONS } from "@/lib/auth/rbac";

interface WishlistConfig {
  feature: string;
  label: string;
  description: string;
  requiredPermission: string;
  minRoleLevel: number;
  maxItems: number;
  isSharedAllowed: boolean;
  requiresAuth: boolean;
  managedByRoles: string[];
}

const WISHLIST_CONFIGS: WishlistConfig[] = [
  {
    feature: "PERSONAL_WISHLIST", label: "Liste personnelle",
    description: "Liste de souhaits privée de l'utilisateur",
    requiredPermission: PERMISSIONS.PRODUCTS_READ, minRoleLevel: 6,
    maxItems: 50, isSharedAllowed: false, requiresAuth: true,
    managedByRoles: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  },
  {
    feature: "SHARED_WISHLIST", label: "Liste partagée",
    description: "Liste de souhaits partageable avec un lien public",
    requiredPermission: PERMISSIONS.PRODUCTS_READ, minRoleLevel: 6,
    maxItems: 100, isSharedAllowed: true, requiresAuth: true,
    managedByRoles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER],
  },
  {
    feature: "GIFT_REGISTRY", label: "Liste de cadeaux",
    description: "Liste de cadeaux pour événements (mariage, anniversaire)",
    requiredPermission: PERMISSIONS.PRODUCTS_READ, minRoleLevel: 6,
    maxItems: 200, isSharedAllowed: true, requiresAuth: true,
    managedByRoles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER],
  },
  {
    feature: "FAVORITES", label: "Favoris rapides",
    description: "Accès rapide aux produits favoris",
    requiredPermission: PERMISSIONS.PRODUCTS_READ, minRoleLevel: 6,
    maxItems: 30, isSharedAllowed: false, requiresAuth: true,
    managedByRoles: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  },
];

export async function seedWishlistConfig(prisma: PrismaClient) {
  console.log("💝 [RBAC] Configuration des listes de souhaits...");
  for (const config of WISHLIST_CONFIGS) {
    await prisma.wishlistConfig.upsert({
      where: { feature: config.feature },
      update: {
        label: config.label, description: config.description,
        requiredPermission: config.requiredPermission, minRoleLevel: config.minRoleLevel,
        maxItems: config.maxItems, isSharedAllowed: config.isSharedAllowed,
        requiresAuth: config.requiresAuth, managedByRoles: config.managedByRoles,
      },
      create: {
        id: generateUUIDv7(), feature: config.feature, label: config.label,
        description: config.description, requiredPermission: config.requiredPermission,
        minRoleLevel: config.minRoleLevel, maxItems: config.maxItems,
        isSharedAllowed: config.isSharedAllowed, requiresAuth: config.requiresAuth,
        managedByRoles: config.managedByRoles,
      },
    });
    console.log(`   ✓ ${config.label} [max:${config.maxItems}, shared:${config.isSharedAllowed}]`);
  }
  console.log(`💝 [RBAC] ${WISHLIST_CONFIGS.length} configurations de wishlist synchronisées.`);
}
