// prisma/seed/dev/index.ts
// ============================================
// REGISTRE DÉVELOPPEMENT — RICHES DONNÉES DE TEST
// ============================================
// Exécuté uniquement en NODE_ENV=development. Ordre respecté par
// dépendances (users -> categories -> products -> inventory -> ...).

import { SeedRegistry } from "../types";
import { DevUsersSeeder } from "./01-users";
import { DevCategoriesSeeder } from "./02-categories";
import { DevAttributesSeeder } from "./03-attributes";
import { DevProductsSeeder } from "./04-products";
import { DevInventorySeeder } from "./05-inventory";
import { DevCouponsSeeder } from "./06-coupons";
import { DevCartsWishlistsSeeder } from "./07-carts-wishlists";
import { DevOrdersSeeder } from "./08-orders";
import { DevPaymentsSeeder } from "./09-payments";
import { DevReviewsSeeder } from "./10-reviews";
import { DevNotificationsSeeder } from "./11-notifications";
import { DevAuditLogsSeeder } from "./12-audit-logs";

export const devRegistry: SeedRegistry = [
  DevUsersSeeder,
  DevCategoriesSeeder,
  DevAttributesSeeder,
  DevProductsSeeder,
  DevInventorySeeder,
  DevCouponsSeeder,
  DevCartsWishlistsSeeder,
  DevOrdersSeeder,
  DevPaymentsSeeder,
  DevReviewsSeeder,
  DevNotificationsSeeder,
  DevAuditLogsSeeder,
];