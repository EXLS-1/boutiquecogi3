# TODO — Ajout enum Currency (USD / CDF)

## Étape 1 — Schéma Prisma (`prisma/schema.prisma`)
- [x] `enum Currency { USD CDF }` (déjà présent)
- [x] `Product.currency` → `Currency @default(USD)`
- [x] `ProductPrice.currency` → `Currency`
- [x] `Order.currency` → `Currency @default(USD)`
- [x] `OrderItem.currency` → `Currency?`
- [x] `Payment.currency` → `Currency @default(USD)`
- [x] `PaymentMethodConfig.currency` → `Currency @default(USD)`
- [x] `FinancialThreshold.currency` → `Currency @default(USD)`
- [x] `Invoice.currency` → `Currency @default(USD)`
- [x] `ExchangeRate.baseCurrency` / `quoteCurrency` → `Currency`
- [x] `UserPreferences`: `preferredCurrency Currency @default(CDF)`

## Étape 2 — Migration PostgreSQL
- [x] `prisma db push` — enum `Currency` créé en PostgreSQL
- [x] `prisma generate`

## Étape 3 — Couche applicative
- [x] `lib/currency/exchange-rate-types.ts` : `DisplayCurrency = Currency`
- [x] `store/use-currency-store.ts` : re-export `DisplayCurrency`
- [x] `lib/cinetpay/types.ts` : `currency: Currency`
- [x] `lib/actions/checkout.action.ts` : `Currency` (normalisation USD/CDF)
- [x] `lib/orders/services.order.ts` : aligné sur le schéma (OrderStatusEnum, payment, Currency)
- [x] `lib/actions/currency.actions.ts` : corrigé (baseCurrency/quoteCurrency/rate/effectiveAt)
- [x] `lib/validations/product.ts` : `z.nativeEnum(Currency)`
- [x] `prisma/seed/treasury.seed.ts` : interfaces `Currency`
- [x] `lib/currency/exchange-rate-currency.ts` : import corrigé (`./exchange-rate-types`)
- [x] `app/checkout/_components/checkout-client.tsx` : imports corrigés (`@/lib/actions/currency.actions`, `@/lib/currency/price-format`, `@/lib/actions/checkout.action`)

## Étape 4 — Vérification
- [x] `prisma validate`
- [x] `prisma generate` (Prisma Client v7.9.1)
- [x] `prisma db push` (enum `Currency` créé en PostgreSQL)
- [x] TypeScript build des fichiers modifiés — OK (les 8 erreurs `tsc --noEmit` restantes sont pré-existantes et non liées)
