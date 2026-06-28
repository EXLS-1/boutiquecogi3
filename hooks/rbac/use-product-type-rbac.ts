// hooks/rbac/use-product-type-rbac.ts
/**
 * Expliquer en detail ce que fait ce fichier
 */

"use client";

import { useMemo } from "react";
import { useRBAC } from "./use-rbac";

export type ProductType =
  | "physical"
  | "digital"
  | "subscription"
  | "bundle"
  | "preorder"
  | "custom";

export type ProductAction =
  | "create"
  | "update"
  | "delete"
  | "publish"
  | "duplicate"
  | "import";

interface ProductTypeMetadata {
  maxVariants: number;
  requiresApproval: boolean;
  allowedActions: ProductAction[];
  minRoleLevel: number; // Plus petit = plus haut (1 = Super Admin)
  restrictions: {
    maxImages: number;
    allowReviews: boolean;
    allowDiscounts: boolean;
  };
}

interface UseProductTypeRBACReturn {
  allowed: boolean;
  metadata: ProductTypeMetadata;
  canPerform: (action: ProductAction) => boolean;
  isApprovalRequired: boolean;
}

const PRODUCT_TYPE_CONFIG: Record<ProductType, ProductTypeMetadata> = {
  physical: {
    maxVariants: 100,
    requiresApproval: false,
    allowedActions: [
      "create",
      "update",
      "delete",
      "publish",
      "duplicate",
      "import",
    ],
    minRoleLevel: 5, // Seller et au-dessus (5, 4, 3, 2, 1)
    restrictions: { maxImages: 10, allowReviews: true, allowDiscounts: true },
  },
  digital: {
    maxVariants: 1,
    requiresApproval: false,
    allowedActions: ["create", "update", "delete", "publish", "duplicate"],
    minRoleLevel: 5,
    restrictions: { maxImages: 5, allowReviews: true, allowDiscounts: true },
  },
  subscription: {
    maxVariants: 5,
    requiresApproval: true,
    allowedActions: ["create", "update", "delete", "publish"],
    minRoleLevel: 4, // Moderator et au-dessus (4, 3, 2, 1)
    restrictions: { maxImages: 3, allowReviews: false, allowDiscounts: false },
  },
  bundle: {
    maxVariants: 0,
    requiresApproval: true,
    allowedActions: ["create", "update", "delete", "publish", "duplicate"],
    minRoleLevel: 4,
    restrictions: { maxImages: 8, allowReviews: true, allowDiscounts: true },
  },
  preorder: {
    maxVariants: 50,
    requiresApproval: true,
    allowedActions: ["create", "update", "delete", "publish"],
    minRoleLevel: 4,
    restrictions: { maxImages: 10, allowReviews: false, allowDiscounts: false },
  },
  custom: {
    maxVariants: 20,
    requiresApproval: true,
    allowedActions: ["create", "update", "delete"],
    minRoleLevel: 2, // Admin et au-dessus (2, 1)
    restrictions: { maxImages: 15, allowReviews: true, allowDiscounts: true },
  },
};

export function useProductTypeRBAC(
  type: ProductType,
  action: ProductAction,
): UseProductTypeRBACReturn {
  const { level, hasPermission } = useRBAC();

  const config = useMemo(() => PRODUCT_TYPE_CONFIG[type], [type]);

  const allowed = useMemo(() => {
    if (!level) return false;
    // Level doit être <= minRoleLevel (plus petit = plus haut)
    const meetsLevel = level <= config.minRoleLevel;
    const hasProductPermission =
      hasPermission("products:create") || hasPermission("products:update");
    const actionAllowed = config.allowedActions.includes(action);
    return meetsLevel && hasProductPermission && actionAllowed;
  }, [level, config, action, hasPermission]);

  const canPerform = useMemo(() => {
    return (targetAction: ProductAction): boolean => {
      if (!level) return false;
      return (
        level <= config.minRoleLevel &&
        config.allowedActions.includes(targetAction) &&
        hasPermission("products:update")
      );
    };
  }, [level, config, hasPermission]);

  return useMemo(
    () => ({
      allowed,
      metadata: config,
      canPerform,
      isApprovalRequired: config.requiresApproval,
    }),
    [allowed, config, canPerform],
  );
}
