# TODO: Fix IN (NULL) Prisma Queries

## Problem
Prisma generates separate batched SQL queries (`SELECT ... WHERE id IN (...)`) for each `include` relation, even when the main query returns 0 results. This produces `IN (NULL)` queries in the logs.

## Plan
Modify `catalog-queries.ts` to use a two-step approach:
1. First query only IDs (lightweight, no includes)
2. Only if IDs exist, query the full data with includes
3. If no IDs, return empty result immediately (no relation queries)

## Steps - COMPLETED ✅

### Step 1: Fix `getRecentProducts` (cached homepage query)
- [x] Apply two-step pattern: first IDs, then conditionally full data with includes

### Step 2: Fix `getProductsByCategory` (cached category query)
- [x] Apply same two-step pattern

### Step 3: Fix `getPromotionalProducts` (cached promotions query)
- [x] Apply same two-step pattern

### Step 4: Fix `getNewArrivalProducts` (cached new arrivals query)
- [x] Apply same two-step pattern

### Step 5: Fix `searchCatalogProducts` (main search function)
- [x] Split into two-step: first fetch count + IDs in parallel, then conditionally full data
- [x] Return `products: []` if no IDs found, avoiding IN (NULL) queries

### Step 6: Fix `getFeaturedProducts` (cached featured query)
- [x] Apply same two-step pattern

### Step 7: Verify `getProductBySlug`
- [x] Uses `findFirst` - not affected by IN (NULL) issue (single record)

### Step 8: Verify `getProductCountsByStatus`
- [x] Uses `count` only, no includes - not affected

### Step 9: Verify other files
- [x] `product.repository.ts` - uses includes but for single record, not batch
- [x] `lib/actions/product.actions.ts` - uses `select`, no includes
- [x] `api/product/route.ts` - uses includes, standalone endpoint
- [x] `api/admin/products/route.ts` - uses `ProductService`, not direct queries
