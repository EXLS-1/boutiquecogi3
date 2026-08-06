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

## Phase 2 — Factories
- [ ] prisma/seed/factories/user.factory.ts
- [ ] prisma/seed/factories/address.factory.ts
- [ ] prisma/seed/factories/product.factory.ts
- [ ] prisma/seed/factories/variant.factory.ts
- [ ] prisma/seed/factories/inventory.factory.ts
- [ ] prisma/seed/factories/review.factory.ts
- [ ] prisma/seed/factories/coupon.factory.ts
- [ ] prisma/seed/factories/order.factory.ts
- [ ] prisma/seed/factories/shipment.factory.ts
- [ ] prisma/seed/factories/payment.factory.ts

## Phase 3 — Shared
- [ ] prisma/seed/shared/images.ts
- [ ] prisma/seed/shared/drc-geography.ts
- [ ] prisma/seed/shared/currencies.ts
- [ ] prisma/seed/shared/languages.ts
- [ ] prisma/seed/shared/permissions.ts
- [ ] prisma/seed/shared/role-config.ts

## Phase 4 — Bootstrap
- [ ] prisma/seed/bootstrap/index.ts
- [ ] prisma/seed/bootstrap/00-system-config.ts
- [ ] prisma/seed/bootstrap/01-permissions.ts
- [ ] prisma/seed/bootstrap/02-role-config.ts
- [ ] prisma/seed/bootstrap/03-currencies.ts
- [ ] prisma/seed/bootstrap/04-geography.ts
- [ ] prisma/seed/bootstrap/05-tax-carriers.ts

## Phase 5 — Dev
- [ ] prisma/seed/dev/index.ts
- [ ] prisma/seed/dev/01-users.ts
- [ ] prisma/seed/dev/02-categories.ts
- [ ] prisma/seed/dev/03-attributes.ts
- [ ] prisma/seed/dev/04-products.ts
- [ ] prisma/seed/dev/05-inventory.ts
- [ ] prisma/seed/dev/06-coupons.ts
- [ ] prisma/seed/dev/07-carts-wishlists.ts
- [ ] prisma/seed/dev/08-orders.ts
- [ ] prisma/seed/dev/09-payments.ts
- [ ] prisma/seed/dev/10-reviews.ts
- [ ] prisma/seed/dev/11-notifications.ts
- [ ] prisma/seed/dev/12-audit-logs.ts

## Phase 6 — Test
- [ ] prisma/seed/test/index.ts
- [ ] prisma/seed/test/01-super-admin.ts
- [ ] prisma/seed/test/02-minimal-users.ts
- [ ] prisma/seed/test/03-minimal-catalog.ts
- [ ] prisma/seed/test/04-deterministic-data.ts

## Phase 7 — Prod (réécriture du fichier corrompu)
- [ ] prisma/seed/prod/01-super-admin.ts
- [ ] prisma/seed/prod/02-base-categories.ts
- [ ] prisma/seed/prod/03-notification-templates.ts
- [ ] prisma/seed/prod/index.ts (CORRIGER)

## Phase 8 — Scenarios
- [ ] prisma/seed/scenarios/index.ts
- [ ] prisma/seed/scenarios/high-volume-orders.ts
- [ ] prisma/seed/scenarios/inventory-conflict.ts
- [ ] prisma/seed/scenarios/rbac-matrix-test.ts
- [ ] prisma/seed/scenarios/dual-currency-checkout.ts

## Phase 9 — Fixtures JSON
- [ ] prisma/seed/fixtures/system-config.json
- [ ] prisma/seed/fixtures/permissions.json
- [ ] prisma/seed/fixtures/roles.json
- [ ] prisma/seed/fixtures/drc-provinces.json
- [ ] prisma/seed/fixtures/drc-cities.json
- [ ] prisma/seed/fixtures/base-categories.json
- [ ] prisma/seed/fixtures/currencies.json
- [ ] prisma/seed/fixtures/carriers.json
- [ ] prisma/seed/fixtures/email-templates.json
- [ ] prisma/seed/fixtures/sms-templates.json

## Phase 10 — Entrée & config
- [ ] prisma/seed/registry.ts (inscrire les seeds)
- [ ] prisma/seed/index.ts (réécriture orchestrateur)
- [ ] prisma/seed.ts (mise à jour)
- [ ] package.json (scripts db:seed:*)
- [ ] prisma.config.ts (mise à jour)
