// prisma/seed/common/enums.ts
// ============================================
// ALIAS & RÉ-EXPORT DES ENUMS PRISMA / RBAC
// ============================================
// Centralise les enums utilisés par les factories pour éviter les imports
// fragmentés et garantir la cohérence avec le schéma.

import {
  Role,
  Currency,
  ProductStatus,
  OrderStatusEnum,
  PaymentStatus,
  PaymentMethodType,
  ShipmentStatus,
  TransactionType,
  DiscountType,
  ReturnStatus,
  RefundStatus,
  SupplierType,
} from "@prisma/client";

export {
  Role,
  Currency,
  ProductStatus,
  OrderStatusEnum,
  PaymentStatus,
  PaymentMethodType,
  ShipmentStatus,
  TransactionType,
  DiscountType,
  ReturnStatus,
  RefundStatus,
  SupplierType,
};

/** Niveaux RBAC (1-7) partagés avec @/lib/auth/rbac. */
export const LEVELS = {
  LEVEL_1: 1,
  LEVEL_2: 2,
  LEVEL_3: 3,
  LEVEL_4: 4,
  LEVEL_5: 5,
  LEVEL_6: 6,
  LEVEL_7: 7,
} as const;
