# TODO — Catalog options (Nouveautés & Promotions supprimées)

## Étape 1 — Backend (déjà fait)
- [x] Prisma schema : relation Coupon ↔ Product pour permettre “Promotion”.
- [x] `lib/catalog/catalog-types.ts` : ajout `catalogOption` (generale|nouveautes|promotions).
- [x] `lib/catalog/catalog-queries.ts` : logique `searchCatalogProducts` basée sur `catalogOption`.

## Étape 2 — Wiring serveur (à faire)
- [ ] `app/catalog/[catalog]/page.tsx` : lire `searchParams.catalogOption` et le transmettre.
- [ ] `lib/catalog/catalog-fetchers.ts` : ajouter un paramètre `catalogOption` et utiliser `searchCatalogProducts` au lieu de `getProductsByCategory`.

## Étape 3 — UI (à faire)
- [ ] Ajouter dans `components/catalog/category-controls-section.tsx` un switch/dropdown “Generale / Nouveauté / Promotion” qui met à jour l’URL (searchParams).
- [ ] `app/catalog/page.tsx` (homepage catalogue) : remplacer l’usage des sections `RecentProductsSection` et `FeaturedProductsSection` par des sections utilisant la même logique “Catalog options” (au moins 2 sections : Nouveauté + Promotion), ou une seule section filtrable.

## Étape 4 — Nettoyage
- [ ] Supprimer/neutraliser les anciennes sections `components/catalog/section-nouveautes.tsx` et `components/catalog/section-promotions.tsx` si elles ne servent plus.

## Étape 5 — Tests
- [ ] `npx prisma validate`
- [ ] `npm run build`

