// CONTRAT-DOMAINE-PRODUIT.md
// =============================================================================
// CONTRAT GELÉ — DOMAINE PRODUIT (Prisma 7.9.1 / PostgreSQL)
// =============================================================================
// Ce document est la FONDATION de toute implémentation future du portail
// Admin Produits. Il fait suite au diagnostic structurant (prix, type,
// statut, stock). Les Server Actions n'arrivent qu'APRÈS les services
// (voir §7 — ordre d'implémentation).

## 0. Décisions gelées (uniques, non négociables)

| Domaine          | Contrat gelé                                                                        |
| ---------------- | ------------------------------------------------------------------------------------ |
| **Type**         | `Product.productTypeId → ProductTypeConfig` (FK réelle, `onDelete: Restrict`)         |
| **Prix**         | `ProductPrice` = source de vérité commerciale ; `price/basePrice/salePrice` dépréciés |
| **Résolution**   | Catalog override → ProductPrice (geo/fenêtre) → salePrice → basePrice (`resolveProductPrice`) |
| **Statut**       | Workflow éditorial `DRAFT → PENDING/SCHEDULED → PUBLISHED → ARCHIVED/DISCONTINUED`    |
| **Out of stock** | Projection inventaire (`Product_Availability_Projection`), PAS un statut éditorial    |
| **isActive**     | Flag opérationnel commercial (indépendant du workflow éditorial)                      |
| **isdeleted**    | Soft delete uniquement (préserve OrderItem, `onDelete: Restrict`)                     |
| **isArchived**   | DÉPRÉCIÉ — doit dériver de `status === ARCHIVED` (phase 2)                            |
| **Stock**        | Rattaché au `ProductVariant` (`VariantStock`, unique `[variantId, warehouseId]`)      |
| **available**    | Valeur DÉRIVÉE `quantity - reserved` — jamais persistée                               |
| **Ledger**       | `InventoryTransaction` = journal immuable des mouvements                              |
| **Journal op**   | `StockMovement` = journal opérationnel (audit) — pas une seconde source de vérité     |
| **Snapshot**     | `InventorySnapshot` + `Product_Availability_Projection` = read models                 |
| **Réservation**  | `StockReservation` (temporaire, lié à Order)                                          |
| **Audit statut** | `ProductStatusHistory` — écrit UNIQUEMENT par `ProductPublicationService`             |
| **RBAC**         | `ProductTypeConfig` (whoCan*, minRoleLevel*, requiredPermission*) + RBAC central      |
| **Soft delete**  | Conservé — `OrderItem.product`/`variant` sont en `Restrict`                           |

---

## 1. Schéma du domaine Produit (après gel)

```text
Product
├── productTypeId ──────────────► ProductTypeConfig (RBAC × type, maxVariants, approval)
├── status (workflow éditorial) ─► ProductStatusHistory[]
├── ProductPrice[] (source vérité prix : currency, geo, fenêtre)
├── ProductVariant[]
│     └── VariantStock[] (quantity, reserved, alertThreshold, warehouseId)
│           ├── InventoryTransaction[] (ledger)
│           ├── StockMovement[] (journal op, agrégat Stock 1:1 conservé)
│           ├── InventorySnapshot[] (point-in-time)
│           └── StockReservation[] (réservations commande)
├── ProductImage[] (canonique) — Product.images String[] déprécié
├── ProductTag[], ProductAttributeValue[], ProductOption[]
├── CatalogProduct[] (priceOverride), CategoryProduct[] (displayOrder)
└── Product_Availability_Projection (isAvailable)
```

Modifications effectives appliquées à `prisma/schema.prisma` :

1. **`Product.productTypeId`** : FK nullable → `ProductTypeConfig` (`onDelete: Restrict`).
   Remplace l'ancien champ texte `productType String? @default("PHYSICAL")`.
   `ProductTypeConfig.products Product[]` ajouté (back-relation).
2. **`VariantStock`** : `warehouse String?` → `warehouseId String? @db.Uuid` avec
   vraie relation `Warehouse` (`onDelete: SetNull`) + `updater User?` (`SetNull`).
   Table mappée `variant_stock`. Unique `[variantId, warehouseId]`.
   (Aucune donnée existante : renommage sans coût.)
3. **Index pricing** : `ProductPrice @@index([productId, currency])`,
   `@@index([productId, startsAt, endsAt])`, `@@index([country, region])`.
4. **Index produit** : `Product @@index([productTypeId])`.
5. **Back-relations** : `User.variantStockUpdates`, `Warehouse.variantStocks`.

---

## 2. MATRICE ANCIEN → NOUVEAU → MIGRATION → IMPACT

### 2.1 Type produit

| Ancien champ                     | Nouveau champ                | Migration                                        | Impact détecté (scan)                                    |
| -------------------------------- | ---------------------------- | ------------------------------------------------ | --------------------------------------------------------- |
| *(absent — type implicite)*      | `Product.productTypeId` (FK) | Phase A.1 (backfill SQL) puis Phase B (NOT NULL) | `hooks/rbac/use-product-type-rbac.ts`, `lib/product-type/*` |
| `ProductTypeConfig.type` (texte) | **Conservé** (clé unique de config) | —                                         | Seed `ProductTypeConfig` requis avant backfill            |

### 2.2 Statut

| Ancien champ / valeur        | Nouveau contrat                      | Migration (phase 2)                              | Impact détecté (scan)                                                        |
| ----------------------------- | ------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------- |
| `ProductStatus.ACTIVE`       | **Déprécié** ≡ `PUBLISHED` (lecture)  | Phase C.1 : `UPDATE product SET status='PUBLISHED', isActive=true WHERE status='ACTIVE'` | `lib/product-catalog/catalog-queries.ts:54`, `catalog-types.ts`, `product-workflow.ts` (matrice), `components/dashboard/product/*`, `components/admin/DraftManager.tsx`, `server/actions/product-actions.ts:81`, `server/services/product-service.ts`, `app/api/product/import/route.ts:194` |
| `ProductStatus.OUT_OF_STOCK` | **Déprécié** — état calculé (projection) | Phase C.2 : `UPDATE product SET status='PUBLISHED' WHERE status='OUT_OF_STOCK'` | `lib/products/product-workflow.ts` (matrice transitions uniquement) |
| `isActive`                   | **Conservé** — flag opérationnel      | —                                                | cohérent avec C.1                                                            |
| `isArchived`                 | **Déprécié** — dérive de `status`     | Phase C.3 : recalcul, puis colonne vitrine       | `product-workflow.ts` (double-écriture déjà en place)                        |
| `isdeleted` / `deletedAt`    | **Conservé** (soft delete)            | —                                                | Order/Cart protégés par `Restrict`                                           |

> ⚠️ Supprimer des valeurs d'un enum PostgreSQL exige une data-migration AVANT
> (`ALTER TYPE product_status DROP VALUE`). D'où : dépréciation immédiate +
> suppression effective en phase C, JAMAIS avant.

### 2.3 Prix

| Ancien champ            | Nouveau contrat                          | Migration (phase D)                              | Impact détecté (scan)                                                            |
| ----------------------- | ------------------------------------------ | ------------------------------------------------ | ---------------------------------------------------------------------------------- |
| `Product.price`         | Déprécié — miroir de lecture               | Phase D.1 : backfill `ProductPrice` (1 ligne/produit/devise) | `server/actions/product-actions.ts` (price→basePrice), `store/use-cart.ts:172` |
| `Product.basePrice`     | Déprécié — fallback DERNIER de la résolution | Phase D.1 (idem), colonne vitrine             | cart, seeds (`prisma/seed/**`), `server/services/**`, admin stock/orders           |
| `salePrice/saleStart/saleEnd` | Déprécié — translitéré en `ProductPrice` | Phase D.2 : `INSERT product_price SELECT ...` | `pricing.service.ts` (couche 3 conservée en lecture)                               |
| `CatalogProduct.priceOverride` | **Conservé** — couche 1            | Normalisation centimes (`toCents`)               | `lib/product-pricing/*`                                                            |
| `ProductVariant.priceOffset`   | **Conservé** — s'ajoute au prix résolu | —                                        | `components/product-variant/product-variant.tsx`                                   |

Règles Zod + `PricingPolicy` (étape 3) : `amount > 0`, `compareAtPrice >= amount`, `saleEnd > saleStart`.

### 2.4 Stock par variante

| Ancien modèle                  | Nouveau contrat                             | Migration (phase E)                            | Impact détecté (scan)                                            |
| ------------------------------- | --------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------- |
| `Stock` 1:1 (`productId @unique`) | **Conservé** — agrégat rétro-compat, écrit UNIQUEMENT par `InventoryService` | Phase E.1 : seed `VariantStock` depuis `Stock` | `lib/products/productService.ts` (OK), `app/admin/stock/page.tsx` (lecture OK) |
| `InventoryTransaction.variantId?` | Écrit par `InventoryService`, variantId renseigné | —                                    | `lib/products/productService.ts` (déjà correct)                     |
| `InventorySnapshot.variantId?`    | Snapshot par variante (unique `[productId, variantId]`) | —                              | —                                                                   |
| `StockReservation.variantId`      | **Déjà aligné** — réservation par variante      | —                                    | —                                                                   |

---

## 3. SQL de migration (séquence exacte)

```sql
-- ═══ PHASE A — GEL (application immédiate, sans risque) ═══
-- A.1 Backfill type (requiert 1 ligne ProductTypeConfig seedée : PHYSICAL)
--   SELECT @typeId := id FROM product_type_config WHERE type='PHYSICAL';
--   UPDATE product SET productTypeId = @typeId WHERE productTypeId IS NULL;

-- ═══ PHASE B — Type obligatoire (après backfill A.1) ═══
--   ALTER TABLE product ALTER COLUMN productTypeId SET NOT NULL;

-- ═══ PHASE C — Statuts dépréciés (data-migration AVANT DROP VALUE) ═══
-- C.1  UPDATE product SET status='PUBLISHED', isActive=true WHERE status='ACTIVE';
-- C.2  UPDATE product SET status='PUBLISHED'  WHERE status='OUT_OF_STOCK';
-- C.3  UPDATE product SET isArchived = (status='ARCHIVED');
-- C.4  ALTER TYPE product_status DROP VALUE 'ACTIVE';
-- C.5  ALTER TYPE product_status DROP VALUE 'OUT_OF_STOCK';

-- ═══ PHASE D — Prix (backfill ProductPrice) ═══
-- D.1  INSERT INTO product_price (id, product_id, currency, amount)
--      SELECT gen_random_uuid(), id, currency, ROUND(basePrice * 100)
--      FROM product WHERE NOT EXISTS (
--        SELECT 1 FROM product_price pp
--        WHERE pp.product_id = product.id AND pp.currency = product.currency);
-- D.2  INSERT INTO product_price (id, product_id, currency, amount, starts_at, ends_at)
--      SELECT gen_random_uuid(), id, currency, salePrice, saleStart, saleEnd
--      FROM product WHERE salePrice IS NOT NULL AND salePrice > 0;

-- ═══ PHASE E — Seed VariantStock depuis Stock ═══
--   INSERT INTO variant_stock (id, variant_id, warehouse_id, quantity, reserved, alert_threshold, updated_by)
--   SELECT gen_random_uuid(), v.id, NULL, s.quantity, s.reserved, s.alert_threshold, s.updated_by
--   FROM product_variant v
--   JOIN product p ON p.id = v.product_id
--   JOIN stocks s ON s.product_id = p.id
--   WHERE NOT EXISTS (SELECT 1 FROM variant_stock vs WHERE vs.variant_id = v.id);
```

/* __PART5__ */



