// prisma/seed/product-config.seed.ts
import { PrismaClient } from "@prisma/client";
import { generateUUIDv7 } from "@/lib/uuid";
import { ROLES, PERMISSIONS } from "@/lib/auth/rbac";

interface ProductTypeConfig {
  type: string; label: string; description: string;
  whoCanCreate: string[]; whoCanEdit: string[]; whoCanDelete: string[];
  requiredPermissionCreate: string; requiredPermissionEdit: string; requiredPermissionDelete: string;
  minRoleLevelCreate: number; minRoleLevelEdit: number; minRoleLevelDelete: number;
  maxVariants: number; requiresApproval: boolean;
}

const PRODUCT_TYPES: ProductTypeConfig[] = [
  {
    type: "STANDARD", label: "Produit standard", description: "Produit classique avec stock géré",
    whoCanCreate: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER],
    whoCanEdit: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.EDITOR],
    whoCanDelete: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
    requiredPermissionCreate: PERMISSIONS.PRODUCTS_CREATE,
    requiredPermissionEdit: PERMISSIONS.PRODUCTS_UPDATE,
    requiredPermissionDelete: PERMISSIONS.PRODUCTS_DELETE,
    minRoleLevelCreate: 3, minRoleLevelEdit: 4, minRoleLevelDelete: 2,
    maxVariants: 50, requiresApproval: false,
  },
  {
    type: "FEATURED", label: "Produit en vedette", description: "Produit mis en avant sur la page d'accueil",
    whoCanCreate: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
    whoCanEdit: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER],
    whoCanDelete: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
    requiredPermissionCreate: PERMISSIONS.PRODUCTS_CREATE,
    requiredPermissionEdit: PERMISSIONS.PRODUCTS_UPDATE,
    requiredPermissionDelete: PERMISSIONS.PRODUCTS_DELETE,
    minRoleLevelCreate: 2, minRoleLevelEdit: 3, minRoleLevelDelete: 2,
    maxVariants: 20, requiresApproval: true,
  },
  {
    type: "BUNDLE", label: "Pack / Bundle", description: "Ensemble de produits vendus ensemble",
    whoCanCreate: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER],
    whoCanEdit: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER],
    whoCanDelete: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
    requiredPermissionCreate: PERMISSIONS.PRODUCTS_CREATE,
    requiredPermissionEdit: PERMISSIONS.PRODUCTS_UPDATE,
    requiredPermissionDelete: PERMISSIONS.PRODUCTS_DELETE,
    minRoleLevelCreate: 3, minRoleLevelEdit: 3, minRoleLevelDelete: 2,
    maxVariants: 10, requiresApproval: true,
  },
  {
    type: "PREORDER", label: "Précommande", description: "Produit disponible en précommande",
    whoCanCreate: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
    whoCanEdit: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER],
    whoCanDelete: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
    requiredPermissionCreate: PERMISSIONS.PRODUCTS_CREATE,
    requiredPermissionEdit: PERMISSIONS.PRODUCTS_UPDATE,
    requiredPermissionDelete: PERMISSIONS.PRODUCTS_DELETE,
    minRoleLevelCreate: 2, minRoleLevelEdit: 3, minRoleLevelDelete: 2,
    maxVariants: 30, requiresApproval: true,
  },
  {
    type: "DIGITAL", label: "Produit numérique", description: "Produit téléchargeable (e-book, guide, etc.)",
    whoCanCreate: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.EDITOR],
    whoCanEdit: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.EDITOR],
    whoCanDelete: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
    requiredPermissionCreate: PERMISSIONS.PRODUCTS_CREATE,
    requiredPermissionEdit: PERMISSIONS.PRODUCTS_UPDATE,
    requiredPermissionDelete: PERMISSIONS.PRODUCTS_DELETE,
    minRoleLevelCreate: 4, minRoleLevelEdit: 4, minRoleLevelDelete: 2,
    maxVariants: 5, requiresApproval: false,
  },
];

interface VariantAttributeConfig {
  attribute: string; label: string;
  type: "SELECT" | "COLOR" | "SIZE" | "TEXT";
  isRequired: boolean;
  whoCanConfigure: string[];
  minRoleLevel: number;
}

const VARIANT_ATTRIBUTES: VariantAttributeConfig[] = [
  { attribute: "taille", label: "Taille", type: "SIZE", isRequired: true,
    whoCanConfigure: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.EDITOR], minRoleLevel: 4 },
  { attribute: "couleur", label: "Couleur", type: "COLOR", isRequired: true,
    whoCanConfigure: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.EDITOR], minRoleLevel: 4 },
  { attribute: "matiere", label: "Matière", type: "SELECT", isRequired: false,
    whoCanConfigure: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER], minRoleLevel: 3 },
  { attribute: "edition_limitee", label: "Édition limitée", type: "SELECT", isRequired: false,
    whoCanConfigure: [ROLES.SUPER_ADMIN, ROLES.ADMIN], minRoleLevel: 2 },
];

export async function seedProductTypes(prisma: PrismaClient) {
  console.log("🏷️  [RBAC] Configuration des types de produits...");
  for (const config of PRODUCT_TYPES) {
    await prisma.productTypeConfig.upsert({
      where: { type: config.type },
      update: {
        label: config.label, description: config.description,
        whoCanCreate: config.whoCanCreate, whoCanEdit: config.whoCanEdit, whoCanDelete: config.whoCanDelete,
        requiredPermissionCreate: config.requiredPermissionCreate,
        requiredPermissionEdit: config.requiredPermissionEdit,
        requiredPermissionDelete: config.requiredPermissionDelete,
        minRoleLevelCreate: config.minRoleLevelCreate,
        minRoleLevelEdit: config.minRoleLevelEdit,
        minRoleLevelDelete: config.minRoleLevelDelete,
        maxVariants: config.maxVariants, requiresApproval: config.requiresApproval,
      },
      create: {
        id: generateUUIDv7(), type: config.type, label: config.label, description: config.description,
        whoCanCreate: config.whoCanCreate, whoCanEdit: config.whoCanEdit, whoCanDelete: config.whoCanDelete,
        requiredPermissionCreate: config.requiredPermissionCreate,
        requiredPermissionEdit: config.requiredPermissionEdit,
        requiredPermissionDelete: config.requiredPermissionDelete,
        minRoleLevelCreate: config.minRoleLevelCreate,
        minRoleLevelEdit: config.minRoleLevelEdit,
        minRoleLevelDelete: config.minRoleLevelDelete,
        maxVariants: config.maxVariants, requiresApproval: config.requiresApproval,
      },
    });
    console.log(`   ✓ ${config.label} [create:L${config.minRoleLevelCreate}, delete:L${config.minRoleLevelDelete}]`);
  }
  console.log(`🏷️  [RBAC] ${PRODUCT_TYPES.length} types de produits configurés.`);
}

export async function seedVariantAttributes(prisma: PrismaClient) {
  console.log("🔧 [RBAC] Configuration des attributs de variante...");
  for (const attr of VARIANT_ATTRIBUTES) {
    await prisma.variantAttributeConfig.upsert({
      where: { attribute: attr.attribute },
      update: {
        label: attr.label, type: attr.type, isRequired: attr.isRequired,
        whoCanConfigure: attr.whoCanConfigure, minRoleLevel: attr.minRoleLevel,
      },
      create: {
        id: generateUUIDv7(), attribute: attr.attribute, label: attr.label,
        type: attr.type, isRequired: attr.isRequired,
        whoCanConfigure: attr.whoCanConfigure, minRoleLevel: attr.minRoleLevel,
      },
    });
    console.log(`   ✓ ${attr.label} [type:${attr.type}, required:${attr.isRequired}, minLevel:${attr.minRoleLevel}]`);
  }
  console.log(`🔧 [RBAC] ${VARIANT_ATTRIBUTES.length} attributs de variante configurés.`);
}
