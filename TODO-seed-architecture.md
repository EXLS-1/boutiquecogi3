# TODO — Architecture de Seed modulaire BoutiqueCOGI3

## Phase 1 — Infrastructure cœur ✅
- [x] prisma/seed/types.ts (SeedContext, Seeder)
- [x] prisma/seed/logger.ts
- [x] prisma/seed/transaction.ts (executeInBatches, withRetry)
- [x] prisma/seed/context.ts
- [x] prisma/seed/utils/uuid.ts (UUID v7 déterministe)
- [x] prisma/seed/utils/hash.ts (hash statique cache)
- [x] prisma/seed/utils/currency.ts (USD/CDF)
- [x] prisma/seed/utils/slug.ts
- [x] prisma/seed/utils/random.ts (PRNG déterministe)
- [x] prisma/seed/utils/image.ts
- [x] prisma/seed/utils/batch.ts
- [x] prisma/seed/common/constants.ts
- [x] prisma/seed/common/enums.ts
- [x] prisma/seed/common/validation.ts

## Phase 2 — Factories ✅
- [x] prisma/seed/factories/user.factory.ts
- [x] prisma/seed/factories/address.factory.ts
- [x] prisma/seed/factories/product.factory.ts
- [x] prisma/seed/factories/variant.factory.ts
- [x] prisma/seed/factories/inventory.factory.ts
- [x] prisma/seed/factories/review.factory.ts
- [x] prisma/seed/factories/coupon.factory.ts
- [x] prisma/seed/factories/order.factory.ts
- [x] prisma/seed/factories/shipment.factory.ts
- [x] prisma/seed/factories/payment.factory.ts

## Phase 3 — Shared ✅
- [x] prisma/seed/shared/images.ts
- [x] prisma/seed/shared/drc-geography.ts
- [x] prisma/seed/shared/currencies.ts
- [x] prisma/seed/shared/languages.ts
- [x] prisma/seed/shared/permissions.ts
- [x] prisma/seed/shared/role-config.ts

## Phase 4 — Bootstrap ✅
- [x] prisma/seed/bootstrap/index.ts
- [x] prisma/seed/bootstrap/00-system-config.ts
- [x] prisma/seed/bootstrap/01-permissions.ts
- [x] prisma/seed/bootstrap/02-role-config.ts
- [x] prisma/seed/bootstrap/03-currencies.ts
- [x] prisma/seed/bootstrap/04-geography.ts
- [x] prisma/seed/bootstrap/05-tax-carriers.ts

## Phase 5 — Dev ✅
- [x] prisma/seed/dev/index.ts
- [x] prisma/seed/dev/01-users.ts
- [x] prisma/seed/dev/02-categories.ts
- [x] prisma/seed/dev/03-attributes.ts
- [x] prisma/seed/dev/04-products.ts
- [x] prisma/seed/dev/05-inventory.ts
- [x] prisma/seed/dev/06-coupons.ts
- [x] prisma/seed/dev/07-carts-wishlists.ts
- [x] prisma/seed/dev/08-orders.ts
- [x] prisma/seed/dev/09-payments.ts
- [x] prisma/seed/dev/10-reviews.ts
- [x] prisma/seed/dev/11-notifications.ts
- [x] prisma/seed/dev/12-audit-logs.ts

## Phase 6 — Test ✅
- [x] prisma/seed/test/index.ts
- [x] prisma/seed/test/01-super-admin.ts
- [x] prisma/seed/test/02-minimal-users.ts
- [x] prisma/seed/test/03-minimal-catalog.ts
- [x] prisma/seed/test/04-deterministic-data.ts

## Phase 7 — Prod ✅
- [x] prisma/seed/prod/01-super-admin.ts
- [x] prisma/seed/prod/02-base-categories.ts
- [x] prisma/seed/prod/03-notification-templates.ts
- [x] prisma/seed/prod/index.ts (CORRIGÉ)

## Phase 8 — Scenarios ✅
- [x] prisma/seed/scenarios/index.ts
- [x] prisma/seed/scenarios/high-volume-orders.ts
- [x] prisma/seed/scenarios/inventory-conflict.ts
- [x] prisma/seed/scenarios/rbac-matrix-test.ts
- [x] prisma/seed/scenarios/dual-currency-checkout.ts

## Phase 9 — Fixtures JSON ✅
- [x] prisma/seed/fixtures/system-config.json
- [x] prisma/seed/fixtures/permissions.json
- [x] prisma/seed/fixtures/roles.json
- [x] prisma/seed/fixtures/drc-provinces.json
- [x] prisma/seed/fixtures/drc-cities.json
- [x] prisma/seed/fixtures/base-categories.json
- [x] prisma/seed/fixtures/currencies.json
- [x] prisma/seed/fixtures/carriers.json
- [x] prisma/seed/fixtures/email-templates.json
- [x] prisma/seed/fixtures/sms-templates.json

## Phase 10 — Entrée & config ✅
- [x] prisma/seed/registry.ts (inscrire les seeds)
- [x] prisma/seed/index.ts (réécriture orchestrateur)
- [x] prisma/seed.ts (point d'entrée Prisma CLI — déjà compatible)
- [x] package.json (scripts db:seed:*)
- [x] prisma.config.ts (déjà configuré: seed → npx tsx prisma/seed.ts)
