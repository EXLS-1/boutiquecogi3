// ============================================================
// HOOKS RBAC SPÉCIALISÉS - Boutiquecogi3
// HIÉRARCHIE DESCENDANTE : Level 1 = SUPER_ADMIN → Level 6 = CLIENT
// ============================================================

// ============================================================
// 2. useOrderStatusRBAC - Statut commande spécifique
// ============================================================
// hooks/rbac/use-order-status-rbac.ts
"use client";

import { useMemo, useCallback } from "react";
import { useRBAC } from "./use-rbac";

export type OrderStatus = 
  | "pending" | "confirmed" | "processing" | "shipped" 
  | "delivered" | "cancelled" | "refunded" | "disputed";

interface OrderStatusMetadata {
  color: string;
  isTerminal: boolean;
  allowedTransitions: OrderStatus[];
  requiresApproval: boolean;
  editableBy: number[]; // RoleLevel[] - plus petit = plus haut
}

interface UseOrderStatusRBACReturn {
  allowed: boolean;
  metadata: OrderStatusMetadata;
  canTransitionTo: (targetStatus: OrderStatus) => boolean;
  canCancel: boolean;
  canRefund: boolean;
  canEdit: boolean;
}

const STATUS_METADATA: Record<OrderStatus, OrderStatusMetadata> = {
  pending: {
    color: "#f59e0b",
    isTerminal: false,
    allowedTransitions: ["confirmed", "cancelled"],
    requiresApproval: false,
    editableBy: [3, 4, 5, 6], // Manager, Moderator, Seller, Client
  },
  confirmed: {
    color: "#3b82f6",
    isTerminal: false,
    allowedTransitions: ["processing", "cancelled"],
    requiresApproval: false,
    editableBy: [3, 4, 5, 6],
  },
  processing: {
    color: "#8b5cf6",
    isTerminal: false,
    allowedTransitions: ["shipped", "cancelled"],
    requiresApproval: true,
    editableBy: [3, 4], // Manager, Moderator (pas Seller ni Client)
  },
  shipped: {
    color: "#06b6d4",
    isTerminal: false,
    allowedTransitions: ["delivered", "disputed"],
    requiresApproval: false,
    editableBy: [3, 4],
  },
  delivered: {
    color: "#10b981",
    isTerminal: true,
    allowedTransitions: ["disputed"],
    requiresApproval: false,
    editableBy: [3, 4], // Manager, Moderator
  },
  cancelled: {
    color: "#ef4444",
    isTerminal: true,
    allowedTransitions: [],
    requiresApproval: false,
    editableBy: [3, 4],
  },
  refunded: {
    color: "#f97316",
    isTerminal: true,
    allowedTransitions: [],
    requiresApproval: true,
    editableBy: [3], // Manager uniquement
  },
  disputed: {
    color: "#dc2626",
    isTerminal: false,
    allowedTransitions: ["refunded", "delivered"],
    requiresApproval: true,
    editableBy: [3], // Manager uniquement
  },
};

export function useOrderStatusRBAC(status: OrderStatus): UseOrderStatusRBACReturn {
  const { level, hasPermission } = useRBAC();

  const metadata = useMemo(() => STATUS_METADATA[status], [status]);

  const allowed = useMemo(() => {
    if (!level) return false;
    // Level doit être dans la liste (plus petit = plus haut)
    const canEditByLevel = metadata.editableBy.includes(level);
    const hasOrderPermission = hasPermission("orders:update");
    return canEditByLevel && hasOrderPermission;
  }, [level, metadata, hasPermission]);

  const canTransitionTo = useCallback((targetStatus: OrderStatus): boolean => {
    if (!allowed) return false;
    return metadata.allowedTransitions.includes(targetStatus);
  }, [allowed, metadata.allowedTransitions]);

  const canCancel = useMemo(() => {
    return allowed && canTransitionTo("cancelled");
  }, [allowed, canTransitionTo]);

  const canRefund = useMemo(() => {
    return allowed && hasPermission("orders:process_refund") && 
           (status === "delivered" || status === "disputed");
  }, [allowed, hasPermission, status]);

  const canEdit = useMemo(() => {
    return allowed && !metadata.isTerminal;
  }, [allowed, metadata.isTerminal]);

  return useMemo(() => ({
    allowed,
    metadata,
    canTransitionTo,
    canCancel,
    canRefund,
    canEdit,
  }), [allowed, metadata, canTransitionTo, canCancel, canRefund, canEdit]);
}


// ============================================================
// 3. useProductTypeRBAC - Type produit
// ============================================================
// hooks/rbac/use-product-type-rbac.ts
"use client";

import { useMemo } from "react";
import { useRBAC } from "./use-rbac";

export type ProductType = 
  | "physical" | "digital" | "subscription" | "bundle" | "preorder" | "custom";

export type ProductAction = 
  | "create" | "update" | "delete" | "publish" | "duplicate" | "import";

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
    allowedActions: ["create", "update", "delete", "publish", "duplicate", "import"],
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
  action: ProductAction
): UseProductTypeRBACReturn {
  const { level, hasPermission } = useRBAC();

  const config = useMemo(() => PRODUCT_TYPE_CONFIG[type], [type]);

  const allowed = useMemo(() => {
    if (!level) return false;
    // Level doit être <= minRoleLevel (plus petit = plus haut)
    const meetsLevel = level <= config.minRoleLevel;
    const hasProductPermission = hasPermission("products:create") || 
                                  hasPermission("products:update");
    const actionAllowed = config.allowedActions.includes(action);
    return meetsLevel && hasProductPermission && actionAllowed;
  }, [level, config, action, hasPermission]);

  const canPerform = useMemo(() => {
    return (targetAction: ProductAction): boolean => {
      if (!level) return false;
      return level <= config.minRoleLevel && 
             config.allowedActions.includes(targetAction) &&
             hasPermission("products:update");
    };
  }, [level, config, hasPermission]);

  return useMemo(() => ({
    allowed,
    metadata: config,
    canPerform,
    isApprovalRequired: config.requiresApproval,
  }), [allowed, config, canPerform]);
}


// ============================================================
// 4. useMediaTypeRBAC - Type média
// ============================================================
// hooks/rbac/use-media-type-rbac.ts
"use client";

import { useMemo } from "react";
import { useRBAC } from "./use-rbac";

export type MediaType = 
  | "image" | "document" | "audio" | "video" | "archive" | "3d_model";

export type MediaAction = "upload" | "delete" | "organize" | "download" | "replace";

interface MediaTypeMetadata {
  maxFileSize: number;
  allowedExtensions: string[];
  bucket: string;
  requiresCompression: boolean;
  allowedActions: MediaAction[];
  minRoleLevel: number; // Plus petit = plus haut
}

interface UseMediaTypeRBACReturn {
  allowed: boolean;
  metadata: MediaTypeMetadata;
  canPerform: (action: MediaAction) => boolean;
  validateFile: (file: File) => { valid: boolean; error?: string };
}

const BYTES_PER_MB = 1024 * 1024;

const MEDIA_TYPE_CONFIG: Record<MediaType, MediaTypeMetadata> = {
  image: {
    maxFileSize: 10 * BYTES_PER_MB,
    allowedExtensions: ["jpg", "jpeg", "png", "webp", "gif", "svg"],
    bucket: "product-images",
    requiresCompression: true,
    allowedActions: ["upload", "delete", "organize", "download", "replace"],
    minRoleLevel: 5, // Seller+
  },
  document: {
    maxFileSize: 50 * BYTES_PER_MB,
    allowedExtensions: ["pdf", "doc", "docx", "txt", "xls", "xlsx"],
    bucket: "documents",
    requiresCompression: false,
    allowedActions: ["upload", "delete", "download"],
    minRoleLevel: 5,
  },
  audio: {
    maxFileSize: 100 * BYTES_PER_MB,
    allowedExtensions: ["mp3", "wav", "ogg", "aac", "flac"],
    bucket: "audio-files",
    requiresCompression: true,
    allowedActions: ["upload", "delete", "download"],
    minRoleLevel: 4, // Moderator+
  },
  video: {
    maxFileSize: 500 * BYTES_PER_MB,
    allowedExtensions: ["mp4", "mov", "avi", "mkv", "webm"],
    bucket: "video-files",
    requiresCompression: true,
    allowedActions: ["upload", "delete", "download"],
    minRoleLevel: 4,
  },
  archive: {
    maxFileSize: 200 * BYTES_PER_MB,
    allowedExtensions: ["zip", "rar", "7z", "tar", "gz"],
    bucket: "archives",
    requiresCompression: false,
    allowedActions: ["upload", "delete", "download"],
    minRoleLevel: 3, // Manager+
  },
  "3d_model": {
    maxFileSize: 100 * BYTES_PER_MB,
    allowedExtensions: ["obj", "fbx", "gltf", "glb", "stl"],
    bucket: "3d-models",
    requiresCompression: true,
    allowedActions: ["upload", "delete", "download", "replace"],
    minRoleLevel: 3,
  },
};

export function useMediaTypeRBAC(
  type: MediaType, 
  action: MediaAction
): UseMediaTypeRBACReturn {
  const { level, hasPermission } = useRBAC();

  const config = useMemo(() => MEDIA_TYPE_CONFIG[type], [type]);

  const allowed = useMemo(() => {
    if (!level) return false;
    const meetsLevel = level <= config.minRoleLevel;
    const hasMediaPermission = hasPermission("media:upload") || hasPermission("media:delete");
    const actionAllowed = config.allowedActions.includes(action);
    return meetsLevel && hasMediaPermission && actionAllowed;
  }, [level, config, action, hasPermission]);

  const canPerform = useMemo(() => {
    return (targetAction: MediaAction): boolean => {
      if (!level) return false;
      return level <= config.minRoleLevel && 
             config.allowedActions.includes(targetAction);
    };
  }, [level, config]);

  const validateFile = useMemo(() => {
    return (file: File): { valid: boolean; error?: string } => {
      if (file.size > config.maxFileSize) {
        return { 
          valid: false, 
          error: `Fichier trop volumineux. Max: ${(config.maxFileSize / BYTES_PER_MB).toFixed(0)}MB` 
        };
      }
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (!ext || !config.allowedExtensions.includes(ext)) {
        return { 
          valid: false, 
          error: `Extension non autorisée. Autorisées: ${config.allowedExtensions.join(", ")}` 
        };
      }
      return { valid: true };
    };
  }, [config]);

  return useMemo(() => ({
    allowed,
    metadata: config,
    canPerform,
    validateFile,
  }), [allowed, config, canPerform, validateFile]);
}


// ============================================================
// 5. useVideoTypeRBAC - Type vidéo
// ============================================================
// hooks/rbac/use-video-type-rbac.ts
"use client";

import { useMemo } from "react";
import { useRBAC } from "./use-rbac";

export type VideoType = 
  | "product_demo" | "tutorial" | "review" | "advertisement" | "live_stream" | "background";

export type VideoAction = "upload" | "edit" | "delete" | "publish" | "stream";

interface VideoTypeMetadata {
  maxDuration: number;
  maxResolution: string;
  allowedFormats: string[];
  requiresTranscoding: boolean;
  allowedActions: VideoAction[];
  minRoleLevel: number;
  maxDailyUploads: number;
}

interface UseVideoTypeRBACReturn {
  allowed: boolean;
  metadata: VideoTypeMetadata;
  canPerform: (action: VideoAction) => boolean;
  checkDuration: (duration: number) => boolean;
  checkResolution: (width: number, height: number) => boolean;
}

const VIDEO_TYPE_CONFIG: Record<VideoType, VideoTypeMetadata> = {
  product_demo: {
    maxDuration: 300,
    maxResolution: "1080p",
    allowedFormats: ["mp4", "mov"],
    requiresTranscoding: true,
    allowedActions: ["upload", "edit", "delete", "publish"],
    minRoleLevel: 5, // Seller+
    maxDailyUploads: 10,
  },
  tutorial: {
    maxDuration: 1800,
    maxResolution: "1080p",
    allowedFormats: ["mp4", "mov", "mkv"],
    requiresTranscoding: true,
    allowedActions: ["upload", "edit", "delete", "publish"],
    minRoleLevel: 4, // Moderator+
    maxDailyUploads: 5,
  },
  review: {
    maxDuration: 600,
    maxResolution: "4K",
    allowedFormats: ["mp4", "mov", "avi"],
    requiresTranscoding: true,
    allowedActions: ["upload", "edit", "delete", "publish"],
    minRoleLevel: 5,
    maxDailyUploads: 20,
  },
  advertisement: {
    maxDuration: 60,
    maxResolution: "4K",
    allowedFormats: ["mp4", "mov"],
    requiresTranscoding: true,
    allowedActions: ["upload", "edit", "delete", "publish"],
    minRoleLevel: 3, // Manager+
    maxDailyUploads: 3,
  },
  live_stream: {
    maxDuration: 7200,
    maxResolution: "1080p",
    allowedFormats: ["rtmp", "hls"],
    requiresTranscoding: true,
    allowedActions: ["stream", "delete"],
    minRoleLevel: 3, // Manager+
    maxDailyUploads: 1,
  },
  background: {
    maxDuration: 30,
    maxResolution: "720p",
    allowedFormats: ["mp4", "webm"],
    requiresTranscoding: false,
    allowedActions: ["upload", "delete"],
    minRoleLevel: 5,
    maxDailyUploads: 50,
  },
};

const RESOLUTION_MAP: Record<string, { width: number; height: number }> = {
  "720p": { width: 1280, height: 720 },
  "1080p": { width: 1920, height: 1080 },
  "4K": { width: 3840, height: 2160 },
};

export function useVideoTypeRBAC(
  type: VideoType, 
  action: VideoAction
): UseVideoTypeRBACReturn {
  const { level, hasPermission } = useRBAC();

  const config = useMemo(() => VIDEO_TYPE_CONFIG[type], [type]);

  const allowed = useMemo(() => {
    if (!level) return false;
    const meetsLevel = level <= config.minRoleLevel;
    const hasVideoPermission = hasPermission("media:upload");
    const actionAllowed = config.allowedActions.includes(action);
    return meetsLevel && hasVideoPermission && actionAllowed;
  }, [level, config, action, hasPermission]);

  const canPerform = useMemo(() => {
    return (targetAction: VideoAction): boolean => {
      if (!level) return false;
      return level <= config.minRoleLevel && 
             config.allowedActions.includes(targetAction);
    };
  }, [level, config]);

  const checkDuration = useMemo(() => {
    return (duration: number): boolean => {
      return duration <= config.maxDuration;
    };
  }, [config]);

  const checkResolution = useMemo(() => {
    return (width: number, height: number): boolean => {
      const maxRes = RESOLUTION_MAP[config.maxResolution];
      if (!maxRes) return true;
      return width <= maxRes.width && height <= maxRes.height;
    };
  }, [config]);

  return useMemo(() => ({
    allowed,
    metadata: config,
    canPerform,
    checkDuration,
    checkResolution,
  }), [allowed, config, canPerform, checkDuration, checkResolution]);
}


// ============================================================
// 6. useCategoryRBAC - Catégorie
// ============================================================
// hooks/rbac/use-category-rbac.ts
"use client";

import { useMemo } from "react";
import { useRBAC } from "./use-rbac";

export type CategoryAction = "view" | "create" | "update" | "delete" | "reorder" | "manage_subcategories";

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
  allowedActions: ["view", "create", "update", "delete", "reorder", "manage_subcategories"],
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
      const hasCategoryPermission = hasPermission("categories:read") || 
                                     hasPermission("categories:update");
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

  return useMemo(() => ({
    allowed,
    metadata: config,
    canPerform,
    isVisible,
    isEditable,
  }), [allowed, config, canPerform, isVisible, isEditable]);
}


// ============================================================
// 7. usePaymentMethodRBAC - Méthode paiement
// ============================================================
// hooks/rbac/use-payment-method-rbac.ts
"use client";

import { useMemo } from "react";
import { useRBAC } from "./use-rbac";

export type PaymentMethod = 
  | "cinetpay_card" | "cinetpay_mobile" | "cinetpay_bank" 
  | "cash_on_delivery" | "bank_transfer" | "crypto";

export type PaymentAction = "process" | "refund" | "configure" | "view_analytics" | "disable";

interface PaymentMethodMetadata {
  maxTransactionAmount: number;
  allowedActions: PaymentAction[];
  minRoleLevel: number; // Plus petit = plus haut
  requires2FA: boolean;
  isEnabled: boolean;
  currencySupport: string[];
  processingFee: number;
}

interface UsePaymentMethodRBACReturn {
  allowed: boolean;
  metadata: PaymentMethodMetadata;
  canPerform: (action: PaymentAction) => boolean;
  canProcessAmount: (amount: number) => boolean;
  isAvailable: boolean;
}

const PAYMENT_METHOD_CONFIG: Record<PaymentMethod, PaymentMethodMetadata> = {
  cinetpay_card: {
    maxTransactionAmount: 1000000,
    allowedActions: ["process", "refund", "configure", "view_analytics", "disable"],
    minRoleLevel: 6, // Tous (Client+)
    requires2FA: false,
    isEnabled: true,
    currencySupport: ["XOF", "XAF", "EUR"],
    processingFee: 2.5,
  },
  cinetpay_mobile: {
    maxTransactionAmount: 500000,
    allowedActions: ["process", "refund", "configure", "view_analytics"],
    minRoleLevel: 6,
    requires2FA: false,
    isEnabled: true,
    currencySupport: ["XOF", "XAF"],
    processingFee: 1.5,
  },
  cinetpay_bank: {
    maxTransactionAmount: 5000000,
    allowedActions: ["process", "refund", "configure", "view_analytics", "disable"],
    minRoleLevel: 3, // Manager+
    requires2FA: true,
    isEnabled: true,
    currencySupport: ["XOF", "XAF", "EUR", "USD"],
    processingFee: 1.0,
  },
  cash_on_delivery: {
    maxTransactionAmount: 200000,
    allowedActions: ["process", "disable"],
    minRoleLevel: 4, // Moderator+
    requires2FA: false,
    isEnabled: true,
    currencySupport: ["XOF"],
    processingFee: 0,
  },
  bank_transfer: {
    maxTransactionAmount: 10000000,
    allowedActions: ["process", "refund", "configure", "view_analytics"],
    minRoleLevel: 3, // Manager+
    requires2FA: true,
    isEnabled: false,
    currencySupport: ["XOF", "EUR", "USD"],
    processingFee: 0.5,
  },
  crypto: {
    maxTransactionAmount: 5000000,
    allowedActions: ["process", "view_analytics"],
    minRoleLevel: 2, // Admin+
    requires2FA: true,
    isEnabled: false,
    currencySupport: ["BTC", "ETH", "USDT"],
    processingFee: 1.0,
  },
};

export function usePaymentMethodRBAC(
  method: PaymentMethod, 
  action: PaymentAction
): UsePaymentMethodRBACReturn {
  const { level, hasPermission } = useRBAC();

  const config = useMemo(() => PAYMENT_METHOD_CONFIG[method], [method]);

  const allowed = useMemo(() => {
    if (!level) return false;
    const meetsLevel = level <= config.minRoleLevel;
    const hasPaymentPermission = hasPermission("payments:read") || 
                                  hasPermission("payments:configure");
    const actionAllowed = config.allowedActions.includes(action);
    return meetsLevel && hasPaymentPermission && actionAllowed && config.isEnabled;
  }, [level, config, action, hasPermission]);

  const canPerform = useMemo(() => {
    return (targetAction: PaymentAction): boolean => {
      if (!level) return false;
      return level <= config.minRoleLevel && 
             config.allowedActions.includes(targetAction) &&
             config.isEnabled;
    };
  }, [level, config]);

  const canProcessAmount = useMemo(() => {
    return (amount: number): boolean => {
      return amount <= config.maxTransactionAmount;
    };
  }, [config]);

  const isAvailable = useMemo(() => {
    return config.isEnabled && !!level && level <= config.minRoleLevel;
  }, [config, level]);

  return useMemo(() => ({
    allowed,
    metadata: config,
    canPerform,
    canProcessAmount,
    isAvailable,
  }), [allowed, config, canPerform, canProcessAmount, isAvailable]);
}


// ============================================================
// 8. useWishlistRBAC - Type wishlist
// ============================================================
// hooks/rbac/use-wishlist-rbac.ts
"use client";

import { useMemo } from "react";
import { useRBAC } from "./use-rbac";

export type WishlistFeature = 
  | "create_list" | "add_item" | "remove_item" | "share_list" 
  | "public_list" | "collaborative" | "notify_price_drop" | "import_products";

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
    allowedFeatures: ["create_list", "add_item", "remove_item", "notify_price_drop"],
    minRoleLevel: 6, // Client (tous)
    maxLists: 3,
    maxCollaborators: 0,
    retentionDays: 365,
  },
  premium: {
    maxItems: 500,
    isSharedAllowed: true,
    allowedFeatures: [
      "create_list", "add_item", "remove_item", "share_list", 
      "public_list", "collaborative", "notify_price_drop", "import_products"
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
      "create_list", "add_item", "remove_item", "share_list", 
      "public_list", "collaborative", "notify_price_drop", "import_products"
    ],
    minRoleLevel: 4, // Moderator+
    maxLists: 100,
    maxCollaborators: 50,
    retentionDays: 1095,
  },
};

export function useWishlistRBAC(feature: WishlistFeature): UseWishlistRBACReturn {
  const { level } = useRBAC();

  const tier = useMemo(() => {
    if (!level) return null;
    if (level <= 4) return "business";   // Moderator+
    if (level <= 5) return "premium";    // Seller+
    return "default";                     // Client
  }, [level]);

  const config = useMemo(() => {
    if (!tier) return WISHLIST_CONFIG.default;
    return WISHLIST_CONFIG[tier];
  }, [tier]);

  const allowed = useMemo(() => {
    if (!level) return false;
    return level <= config.minRoleLevel && config.allowedFeatures.includes(feature);
  }, [level, config, feature]);

  const canUseFeature = useMemo(() => {
    return (targetFeature: WishlistFeature): boolean => {
      if (!level) return false;
      return level <= config.minRoleLevel && config.allowedFeatures.includes(targetFeature);
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

  return useMemo(() => ({
    allowed,
    metadata: config,
    canUseFeature,
    canAddMoreItems,
    canCreateMoreLists,
  }), [allowed, config, canUseFeature, canAddMoreItems, canCreateMoreLists]);
}


// ============================================================
// 9. useAuditRBAC - Événement audit
// ============================================================
// hooks/rbac/use-audit-rbac.ts
"use client";

import { useMemo } from "react";
import { useRBAC } from "./use-rbac";

export type AuditEvent = 
  | "user_login" | "user_logout" | "password_change" | "permission_change" 
  | "data_export" | "data_import" | "settings_change" | "payment_processed" 
  | "refund_issued" | "product_deleted" | "bulk_operation";

export type AuditAction = "view" | "export" | "delete" | "configure" | "alert";

interface AuditMetadata {
  severity: "low" | "medium" | "high" | "critical";
  retentionDays: number;
  isImmutable: boolean;
  allowedActions: AuditAction[];
  minRoleLevel: number; // Plus petit = plus haut
  requiresJustification: boolean;
  realTimeAlert: boolean;
}

interface UseAuditRBACReturn {
  allowed: boolean;
  metadata: AuditMetadata;
  canPerform: (action: AuditAction) => boolean;
  canViewSeverity: (severity: AuditMetadata["severity"]) => boolean;
  isLogImmutable: boolean;
}

const AUDIT_EVENT_CONFIG: Record<AuditEvent, AuditMetadata> = {
  user_login: {
    severity: "low",
    retentionDays: 90,
    isImmutable: true,
    allowedActions: ["view", "export"],
    minRoleLevel: 3, // Manager+
    requiresJustification: false,
    realTimeAlert: false,
  },
  user_logout: {
    severity: "low",
    retentionDays: 90,
    isImmutable: true,
    allowedActions: ["view", "export"],
    minRoleLevel: 3,
    requiresJustification: false,
    realTimeAlert: false,
  },
  password_change: {
    severity: "medium",
    retentionDays: 365,
    isImmutable: true,
    allowedActions: ["view", "export", "alert"],
    minRoleLevel: 2, // Admin+
    requiresJustification: false,
    realTimeAlert: true,
  },
  permission_change: {
    severity: "high",
    retentionDays: 730,
    isImmutable: true,
    allowedActions: ["view", "export", "alert"],
    minRoleLevel: 1, // Super Admin uniquement
    requiresJustification: true,
    realTimeAlert: true,
  },
  data_export: {
    severity: "high",
    retentionDays: 730,
    isImmutable: true,
    allowedActions: ["view", "export", "alert"],
    minRoleLevel: 1,
    requiresJustification: true,
    realTimeAlert: true,
  },
  data_import: {
    severity: "medium",
    retentionDays: 365,
    isImmutable: true,
    allowedActions: ["view", "export"],
    minRoleLevel: 2,
    requiresJustification: true,
    realTimeAlert: false,
  },
  settings_change: {
    severity: "high",
    retentionDays: 730,
    isImmutable: true,
    allowedActions: ["view", "export", "alert"],
    minRoleLevel: 1,
    requiresJustification: true,
    realTimeAlert: true,
  },
  payment_processed: {
    severity: "medium",
    retentionDays: 2555,
    isImmutable: true,
    allowedActions: ["view", "export"],
    minRoleLevel: 2,
    requiresJustification: false,
    realTimeAlert: false,
  },
  refund_issued: {
    severity: "high",
    retentionDays: 2555,
    isImmutable: true,
    allowedActions: ["view", "export", "alert"],
    minRoleLevel: 2,
    requiresJustification: true,
    realTimeAlert: true,
  },
  product_deleted: {
    severity: "medium",
    retentionDays: 365,
    isImmutable: true,
    allowedActions: ["view", "export"],
    minRoleLevel: 2,
    requiresJustification: false,
    realTimeAlert: false,
  },
  bulk_operation: {
    severity: "critical",
    retentionDays: 1095,
    isImmutable: true,
    allowedActions: ["view", "export", "alert", "configure"],
    minRoleLevel: 1,
    requiresJustification: true,
    realTimeAlert: true,
  },
};

const SEVERITY_LEVELS: Record<AuditMetadata["severity"], number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

export function useAuditRBAC(
  event: AuditEvent, 
  action: AuditAction
): UseAuditRBACReturn {
  const { level, hasPermission } = useRBAC();

  const config = useMemo(() => AUDIT_EVENT_CONFIG[event], [event]);

  const allowed = useMemo(() => {
    if (!level) return false;
    const meetsLevel = level <= config.minRoleLevel;
    const hasAuditPermission = hasPermission("analytics:read") || 
                                hasPermission("settings:system_config");
    const actionAllowed = config.allowedActions.includes(action);
    return meetsLevel && hasAuditPermission && actionAllowed;
  }, [level, config, action, hasPermission]);

  const canPerform = useMemo(() => {
    return (targetAction: AuditAction): boolean => {
      if (!level) return false;
      return level <= config.minRoleLevel && config.allowedActions.includes(targetAction);
    };
  }, [level, config]);

  const canViewSeverity = useMemo(() => {
    return (targetSeverity: AuditMetadata["severity"]): boolean => {
      if (!level) return false;
      // Level 1 = tout voir, Level 2 = high et below, etc.
      const requiredLevel = config.minRoleLevel + (SEVERITY_LEVELS[targetSeverity] - 1);
      return level <= Math.min(requiredLevel, 6);
    };
  }, [level, config]);

  return useMemo(() => ({
    allowed,
    metadata: config,
    canPerform,
    canViewSeverity,
    isLogImmutable: config.isImmutable,
  }), [allowed, config, canPerform, canViewSeverity]);
}
