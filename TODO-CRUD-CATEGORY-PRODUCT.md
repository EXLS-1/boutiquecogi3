Les `debug.log` sont des artefacts Chromium/Next.js sans rapport avec mes modifications — hors de mon périmètre, je les laisse intacts.

Mon travail est terminé. Voici le **résumé** de ce que j'ai réalisé.

## Objectif
Ajouter la **gestion des catégories** (une ou plusieurs par produit) à l'implémentation complète et robuste du CRUD Produits. Le schéma Prisma expose déjà deux mécanismes : `Product.categoryId` (catégorie principale) et la table de jointure `CategoryProduct` (multi-catégories). J'ai branché les deux sur **toutes les couches** du CRUD, avec validation d'existence et synchronisation atomique.

## Fichiers modifiés

**1. Nouveau helper partagé — `server/services/product-category-sync.ts`** (créé)
- `normalizeCategoryIds()` : fusionne `categoryId` + `categoryIds`, déduplique.
- `validateCategoriesExist()` : vérifie l'existence réelle en base, limite 10 catégories, lève `CATEGORY_NOT_FOUND` en cas d'inconnue.
- `syncProductCategories()` : remplacement complet de la jointure `CategoryProduct` (delete → create avec `displayOrder`) et définit `categoryId = catégories[0] ?? null`. Invariant garanti : `categoryId === categoryIds[0]`.

**2. Service CRUD sécurisé — `server/services/product-service.ts`**
- `create` et `update` acceptent désormais `categoryIds[]`, avec validation d'existence puis exécution **en transaction** (produit + jointure + stock).
- `listAll` et `getById` incluent désormais `categoryProducts` (jointure triée + catégorie).

**3. Server Actions — `server/actions/product-actions.ts`**
- Nouveau `parseCategoryIds()` tolérant **JSON array**, **CSV** et **clés répétées** dans FormData.
- `create` envoie `categoryIds` et déduit `categoryId` de la 1re catégorie ; `update` mappe `categoryIds`.

**4. Schémas de validation — `lib/validations/product.ts`**
- `categoryIds` (UUID, 1–10) ajouté au schéma Zod.

**5. API REST — `app/api/product/route.ts` + `app/api/product/[id]/route.ts`**
- POST : accepte `categoryIds`/`categoryId`, valide l'existence, écrit la jointure, thème `categoryId` = première.
- PUT : remplacement complet des catégories en transaction (avec `categoryId` nullable).
- GET : renvoie `categories[]` (jointure) en plus de `category`.

**6. Bulk — `app/api/product/bulk/route.ts`**
- `change-category` : valide l'existence de la catégorie, sync la jointure en transaction.

**7. Service dynamique — `lib/products/`** (`types.ts`, `validationService.ts`, `productService.ts`)
- `categoryIds` validé (UUID, ≤10), persisté dans la jointure, nouveau code d'erreur `CATEGORY_NOT_FOUND`.

**8. UI — `components/dashboard/product/new-product/dynamic-product-form.tsx`**
- Remplace le champ texte « ID Catégorie » par un **sélecteur multi-catégories** (cases à cocher alimentées par `getCategories()`), badge « Principale » sur la 1re cochée, réinitialisation et chargement à l'ouverture.

## Validation
- `tsc --noEmit` : compte global passé de **861 → 858** erreurs. **Aucune erreur nouvelle** dans mes fichiers (`product-category-sync.ts` = 0 référence d'erreur). Les 858 restantes sont **préexistantes** (2FA, widgets dashboard, RBAC…) hors de mon périmètre.
- J'ai corrigé au passage **3 erreurs de syntaxe préexistantes** bloquantes dans le formulaire et les routes (ternaire imbriqué, `??`/`||` mixte, type `categoryId`).

Note : la base contient des artefacts hors scope (`debug.log` Chromium, `app/admin/product/drafts/page.tsx`, `todo-crud-product.md`) que je n'ai pas touchés.