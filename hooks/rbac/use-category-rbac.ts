// ============================================================
// 6. useCategoryRBAC - Catégorie
// ============================================================
// hooks/rbac/use-category-rbac.ts
("use client");

import { useMemo } from "react";
import { useRBAC } from "./use-rbac";

export type CategoryAction =
  | "view"
  | "create"
  | "update"
  | "delete"
  | "reorder"
  | "manage_subcategories";

interface CategoryMetadata {
  isNavigable: boolean;
  minRoleLevel: number; // Plus petit = plus haut
  allowedActions: CategoryAction[];
  maxDepth: number;
  maxProducts: number;
  requiresApproval: boolean;
  isSystem: boolean;
}

interface UseCategoryRBACReturn {
  allowed: boolean;
  metadata: CategoryMetadata;
  canPerform: (action: CategoryAction) => boolean;
  isVisible: boolean;
  isEditable: boolean;
}

const DEFAULT_CATEGORY_CONFIG: CategoryMetadata = {
  isNavigable: true,
  minRoleLevel: 4, // Moderator+
  allowedActions: [
    "view",
    "create",
    "update",
    "delete",
    "reorder",
    "manage_subcategories",
  ],
  maxDepth: 3,
  maxProducts: 1000,
  requiresApproval: false,
  isSystem: false,
};

export function useCategoryRBAC(slug: string): UseCategoryRBACReturn {
  const { level, hasPermission } = useRBAC();

  const config = useMemo(() => {
    if (slug.startsWith("system/")) {
      return {
        ...DEFAULT_CATEGORY_CONFIG,
        isSystem: true,
        minRoleLevel: 2, // Admin+
        allowedActions: ["view", "update"] as CategoryAction[],
        requiresApproval: true,
      };
    }
    return DEFAULT_CATEGORY_CONFIG;
  }, [slug]);

  const allowed = useMemo(() => {
    if (!level) return false;
    return level <= config.minRoleLevel;
  }, [level, config]);

  const canPerform = useMemo(() => {
    return (action: CategoryAction): boolean => {
      if (!level) return false;
      const meetsLevel = level <= config.minRoleLevel;
      const hasCategoryPermission =
        hasPermission("categories:read") || hasPermission("categories:update");
      const actionAllowed = config.allowedActions.includes(action);
      return meetsLevel && hasCategoryPermission && actionAllowed;
    };
  }, [level, config, hasPermission]);

  const isVisible = useMemo(() => {
    return config.isNavigable && allowed;
  }, [config, allowed]);

  const isEditable = useMemo(() => {
    return !config.isSystem && canPerform("update");
  }, [config, canPerform]);

  return useMemo(
    () => ({
      allowed,
      metadata: config,
      canPerform,
      isVisible,
      isEditable,
    }),
    [allowed, config, canPerform, isVisible, isEditable],
  );
}
