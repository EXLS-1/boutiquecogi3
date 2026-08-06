// prisma/seed/common/constants.ts
// ============================================
// CONSTANTES D'ENVIRONNEMENT DE SEED
// ============================================

/** Valeurs par défaut pour les noms de batch. */
export const BATCH = {
  DEFAULT_SIZE: 500,
  LARGE_SIZE: 2000,
  ORDERS: 500,
  ORDER_ITEMS: 1000,
} as const;

/** Clés de configuration système (SystemConfiguration / AppConfig). */
export const SYSTEM_KEYS = {
  STORE_NAME: "store.name",
  STORE_CURRENCY: "store.currency",
  EXCHANGE_RATE: "exchange.rate",
  EXCHANGE_RATE_SOURCE: "exchange.rate.source",
  DEFAULT_COUNTRY: "store.country",
  DEFAULT_CITY: "store.city",
  PAGE_SIZE: "catalog.pageSize",
} as const;

/** Identifiants UUID fixes pour les entités système idempotentes. */
export const SYSTEM_UUIDS = {
  SHIPPING_KINSHASA: "00000000-0000-4000-8000-000000000001",
  CARRIER_KINSHASA: "00000000-0000-4000-8000-000000000002",
  TAX_DEFAULT: "00000000-0000-4000-8000-000000000003",
} as const;

/** Nombre d'éléments par catégorie d'entité en dev. */
export const DEV_COUNTS = {
  USERS: 50,
  ADMINS: 5,
  PRODUCTS: 120,
  VARIANTS_PER_PRODUCT: 2,
  ORDERS: 200,
  REVIEWS: 300,
  COUPONS: 10,
  NOTIFICATIONS: 100,
} as const;

/** Nombre d'éléments en test (petit, déterministe). */
export const TEST_COUNTS = {
  USERS: 3, // 1 super admin + 1 admin + 1 user
  PRODUCTS: 3,
  VARIANTS_PER_PRODUCT: 2,
  ORDERS: 4,
  COUPONS: 2,
} as const;
