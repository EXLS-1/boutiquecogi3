import { PrismaClient } from "@prisma/client";
import { generateUUIDv7 } from "@/lib/utils/uuid";
import { ROLES, PERMISSIONS, LEVELS } from "@/lib/auth/rbac";

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
    feature: "PERSONAL_WISHLIST",
    label: "Liste personnelle",
    description: "Liste de souhaits privée de l'utilisateur",
    requiredPermission: PERMISSIONS["products:read"],
    minRoleLevel: LEVELS.LEVEL_6,
    maxItems: 50,
    isSharedAllowed: false,
    requiresAuth: true,
    managedByRoles: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  },
  {
    feature: "SHARED_WISHLIST",
    label: "Liste partagée",
    description: "Liste de souhaits partageable avec un lien public",
    requiredPermission: PERMISSIONS["products:read"],
    minRoleLevel: LEVELS.LEVEL_6,
    maxItems: 100,
    isSharedAllowed: true,
    requiresAuth: true,
    managedByRoles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER],
  },
  {
    feature: "GIFT_REGISTRY",
    label: "Liste de cadeaux",
    description: "Liste de cadeaux pour événements (mariage, anniversaire)",
    requiredPermission: PERMISSIONS["products:read"],
    minRoleLevel: LEVELS.LEVEL_6,
    maxItems: 200,
    isSharedAllowed: true,
    requiresAuth: true,
    managedByRoles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER],
  },
  {
    feature: "FAVORITES",
    label: "Favoris rapides",
    description: "Accès rapide aux produits favoris",
    requiredPermission: PERMISSIONS["products:read"],
    minRoleLevel: LEVELS.LEVEL_6,
    maxItems: 30,
    isSharedAllowed: false,
    requiresAuth: true,
    managedByRoles: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  },
];

export async function seedWishlistConfig(prisma: PrismaClient) {
  console.log("💝 [RBAC] Configuration atomique des listes de souhaits...");

  // Exécution dans une transaction pour garantir l'atomicité.
  await prisma.$transaction(
    WISHLIST_CONFIGS.map((config) =>
      prisma.wishlistConfig.upsert({
        where: { feature: config.feature },
        update: {
          label: config.label,
          description: config.description,
          requiredPermission: config.requiredPermission,
          minRoleLevel: config.minRoleLevel,
          maxItems: config.maxItems,
          isSharedAllowed: config.isSharedAllowed,
          requiresAuth: config.requiresAuth,
          managedByRoles: config.managedByRoles,
        },
        create: {
          id: generateUUIDv7(),
          feature: config.feature,
          label: config.label,
          description: config.description,
          requiredPermission: config.requiredPermission,
          minRoleLevel: config.minRoleLevel,
          maxItems: config.maxItems,
          isSharedAllowed: config.isSharedAllowed,
          requiresAuth: config.requiresAuth,
          managedByRoles: config.managedByRoles,
        },
      })
    )
  );

  console.log(`💝 [RBAC] ${WISHLIST_CONFIGS.length} configurations de wishlist synchronisées.`);
}
