# TODO - app/api/products/route.ts (correction erreurs TS)

- [x] Ajuster le type de `basePrice` dans la transformation GET pour accepter `Decimal` (Prisma) au lieu de `number`.
- [x] Supprimer le cast `as any` sur `prisma.product.create`.
- [x] Ajouter des conversions sûres `basePrice` (Decimal -> number) et `images`.


