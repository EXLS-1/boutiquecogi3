// ============================================================
// 8. useWishlistRBAC - Type wishlist
// ============================================================
// hooks/rbac/use-wishlist-rbac.ts
("use client");

import { useMemo } from "react";
import { useRBAC } from "./use-rbac";

export type WishlistFeature =
  | "create_list"
  | "add_item"
  | "remove_item"
  | "share_list"
  | "public_list"
  | "collaborative"
  | "notify_price_drop"
  | "import_products";

interface WishlistMetadata {
  maxItems: number;
  isSharedAllowed: boolean;
  allowedFeatures: WishlistFeature[];
  minRoleLevel: number; // Plus petit = plus haut
  maxLists: number;
  maxCollaborators: number;
  retentionDays: number;
}

interface UseWishlistRBACReturn {
  allowed: boolean;
  metadata: WishlistMetadata;
  canUseFeature: (feature: WishlistFeature) => boolean;
  canAddMoreItems: (currentCount: number) => boolean;
  canCreateMoreLists: (currentCount: number) => boolean;
}

const WISHLIST_CONFIG: Record<string, WishlistMetadata> = {
  default: {
    maxItems: 50,
    isSharedAllowed: false,
    allowedFeatures: [
      "create_list",
      "add_item",
      "remove_item",
      "notify_price_drop",
    ],
    minRoleLevel: 6, // Client (tous)
    maxLists: 3,
    maxCollaborators: 0,
    retentionDays: 365,
  },
  premium: {
    maxItems: 500,
    isSharedAllowed: true,
    allowedFeatures: [
      "create_list",
      "add_item",
      "remove_item",
      "share_list",
      "public_list",
      "collaborative",
      "notify_price_drop",
      "import_products",
    ],
    minRoleLevel: 5, // Seller+
    maxLists: 20,
    maxCollaborators: 10,
    retentionDays: 730,
  },
  business: {
    maxItems: 2000,
    isSharedAllowed: true,
    allowedFeatures: [
      "create_list",
      "add_item",
      "remove_item",
      "share_list",
      "public_list",
      "collaborative",
      "notify_price_drop",
      "import_products",
    ],
    minRoleLevel: 4, // Moderator+
    maxLists: 100,
    maxCollaborators: 50,
    retentionDays: 1095,
  },
};

export function useWishlistRBAC(
  feature: WishlistFeature,
): UseWishlistRBACReturn {
  const { level } = useRBAC();

  const tier = useMemo(() => {
    if (!level) return null;
    if (level <= 4) return "business"; // Moderator+
    if (level <= 5) return "premium"; // Seller+
    return "default"; // Client
  }, [level]);

  const config = useMemo(() => {
    if (!tier) return WISHLIST_CONFIG.default;
    return WISHLIST_CONFIG[tier];
  }, [tier]);

  const allowed = useMemo(() => {
    if (!level) return false;
    return (
      level <= config.minRoleLevel && config.allowedFeatures.includes(feature)
    );
  }, [level, config, feature]);

  const canUseFeature = useMemo(() => {
    return (targetFeature: WishlistFeature): boolean => {
      if (!level) return false;
      return (
        level <= config.minRoleLevel &&
        config.allowedFeatures.includes(targetFeature)
      );
    };
  }, [level, config]);

  const canAddMoreItems = useMemo(() => {
    return (currentCount: number): boolean => {
      return currentCount < config.maxItems;
    };
  }, [config]);

  const canCreateMoreLists = useMemo(() => {
    return (currentCount: number): boolean => {
      return currentCount < config.maxLists;
    };
  }, [config]);

  return useMemo(
    () => ({
      allowed,
      metadata: config,
      canUseFeature,
      canAddMoreItems,
      canCreateMoreLists,
    }),
    [allowed, config, canUseFeature, canAddMoreItems, canCreateMoreLists],
  );
}
