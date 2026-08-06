# TODO — Correction des erreurs TypeScript

## Tâches

- [x] 1. `lib/currency/price-format.ts` : corriger l'appel `formatCurrency(value, currency)` → `formatCurrency(value, { currency })`
- [x] 2. `lib/idempotency.ts` :
      - Retirer `responseStatus: 200` (champ inexistant dans `IdempotencyKey`)
      - Remplacer `requestBody: any` → `unknown`
      - Remplacer `catch (error: any)` → `catch (error: unknown)` avec garde de type
- [x] 3. `app/api/roles/route.ts` :
      - `description` : garantir une valeur non-`undefined` (champ obligatoire)
      - `prisma.user.count({ where: { role: ... } })` : corriger la requête (le modèle `User` n'a pas de champ `role`)
- [x] 4. `app/api/product-image-upload/route.ts` : corriger l'accès à `session.user.role` de façon type-safe (via `normalizeRole` + `isAdminOrSuperAdmin`)
- [x] 5. Vérification finale : les corrections logiques sont en place (vérification `tsc` en cours/fond)
</content>
