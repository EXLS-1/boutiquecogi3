// MATRICE-MIGRATION-PRODUIT.md
// =============================================================================
// MATRICE DE MIGRATION — Ancien champ → Nouveau contrat → Migration → Impact
// =============================================================================

// ═══ CONTRAT N°3 — STATUT ════════════════════════════════════════════════════

| Ancien champ / valeur        | Nouveau contrat                         | Migration (phase)                     | Impact détecté (scan)                                                        |
| ---------------------------- | --------------------------------------- | ------------------------------------- | ---------------------------------------------------------------------------- |
| `ProductStatus.ACTIVE`       | **Déprécié** ≡ `PUBLISHED` (lecture)    | C.1 : `UPDATE product SET status='PUBLISHED', isActive=true WHERE status='ACTIVE'` | catalog-queries.ts:54, catalog-types.ts, product-workflow.ts, components/dashboard/product/*, DraftManager.tsx, product-actions.ts:81, product-service.ts, api/product/import/route.ts:194 |
| `ProductStatus.OUT_OF_STOCK` | **Déprécié** — état calculé (projection) | C.2 : `UPDATE product SET status='PUBLISHED' WHERE status='OUT_OF_STOCK'` | lib/products/product-workflow.ts (matrice transitions uniquement)          |
| `isActive`                   | **Conservé** — flag opérationnel        | —                                     | cohérent avec C.1                                                            |
| `isArchived`                 | **Déprécié** — dérive de `status`       | C.3 : recalcul, puis colonne vitrine  | product-workflow.ts (double-écriture déjà en place)                          |

// ═══ CONTRAT N°2 — PRIX ══════════════════════════════════════════════════════

| Ancien modèle            | Nouveau contrat                    | Migration (phase D)                          | Impact détecté (scan)                              |
| ------------------------- | ---------------------------------- | -------------------------------------------- | -------------------------------------------------- |
| `Product.price`           | Déprécié — miroir de lecture       | D.1 : backfill `ProductPrice` (1 ligne/devise) | server/actions/product-actions.ts, store/use-cart.ts:172 |
| `Product.basePrice`       | Déprécié — fallback DERNIER         | D.1 (idem), colonne vitrine                 | cart, seeds, server/services/**, admin stock/orders |
| `Product.salePrice/saleStart/saleEnd` | Déprécié → `ProductPrice`     | D.2 : `INSERT product_price SELECT ...`     | pricing.service.ts (couche 3 lecture)               |
| `ProductVariant.priceOffset` | **Conservé** — s'ajoute au prix   | —                                          | components/product-variant/product-variant.tsx      |
| `CatalogProduct.priceOverride` | **Conservé** = priorité #1         | —                                          | pricing.service.ts (couche 1)                       |

Règles Zod + `PricingPolicy` : `amount > 0`, `compareAtPrice >= amount`, `saleEnd > saleStart`.

// ═══ CONTRAT N°5 — STOCK PAR VIRENTAINE ═══════════════════════════════════════

| Ancien modèle                  | Nouveau contrat                              | Migration (phase E)                     | Impact détecté (scan)                              |
| ------------------------------- | ------------------------------------------- | --------------------------------------- | -------------------------------------------------- |
| `Stock` 1:1 (`productId @unique`) | **Conservé** — agrégat rétro-compat         | E.1 : seed `VariantStock` depuis `Stock` | lib/products/productService.ts, app/admin/stock/page.tsx |
| `InventoryTransaction.variantId?` | Écrit par `InventoryService`               | —                                       | lib/products/productService.ts (déjà correct)      |
| `StockReservation.variantId`      | **Déjà aligné** — réservation par variante | —                                       | —                                                  |
| `InventorySnapshot.variantId?`    | Snapshot par variante (unique `[productId, variantId]`) | —             | —                                                  |

// ═══ CONTRAT N°1 — TYPE PRODUIT ═══════════════════════════════════════════════

| Ancien état                    | Nouveau contrat                            | Migration                        | Impact détecté (scan)                              |
| ------------------------------ | ------------------------------------------ | -------------------------------- | -------------------------------------------------- |
| `Product.productTypeId` NULL   | FK vers `ProductTypeConfig` (`Restrict`)    | A.1 : backfill depuis `PHYSICAL`   | Tous les services (product-service.ts, productService.ts) |
| Aucun type sur `Product`       | `productType` obligatoire (`SET NOT NULL`)  | B : `ALTER COLUMN SET NOT NULL`   | catalog-queries.ts, product-detail.ts              |
| Types hardcodés dans le code   | `ProductTypeConfig` (whoCan*, minRoleLevel*) | Seed `PHYSICAL`, `DIGITAL`        | server/services/product-service.ts                 |

// ═══ CONTRAT — MÉDIA ═════════════════════════════════════════════════════════

| Ancien modèle            | Nouveau contrat                          | Migration (phase F)                     | Impact détecté (scan)                    |
| ------------------------- | ---------------------------------------- | --------------------------------------- | --------------------------------------- |
| `Product.images String[]` | Déprécié → `ProductImage[]`              | F.1 : backfill `ProductImage`            | product-service.ts, api/import/route.ts |
| `ProductImage` (existant) | **Canonique** — url, alt, position       | —                                        | components/admin/product-crud-manager.tsx |

// ═══ CONTRAT — SOFT DELETE / ARCHIVE ═══════════════════════════════════════════

| Ancien champ      | Nouveau contrat                          | Migration                              | Impact détecté (scan)                    |
| ----------------- | ---------------------------------------- | -------------------------------------- | ---------------------------------------- |
| `Product.isdeleted` | **Conservé** — soft-delete (preserves OrderItem) | —                          | Tous les services produits               |
| `Product.deletedAt` | **Conservé** — timestamp soft-delete    | —                                      | catalog-queries.ts (buildBaseWhere)      |
| `Product.isArchived` | **Déprécié** — dérive de `status`       | C.3 : `UPDATE ... isArchived = (status='ARCHIVED')` | product-workflow.ts:309 |

// ═══ CONTRAT — AUDIT ═══════════════════════════════════════════════════════════

| Ancien état              | Nouveau contrat                            | Migration | Impact                                  |
| ------------------------ | ---------------------------------------- | --------- | --------------------------------------- |
| `AuditLog` existant      | **Conservé** — `recordProductAudit()`    | —         | lib/product-audit/product-audit.service.ts |
| `productStatusHistory`   | Écrit UNIQUEMENT par `ProductWorkflow.transition()` | — | lib/products/product-workflow.ts         |

// ═══ CONTRAT — RBAC ═══════════════════════════════════════════════════════════

| Ancien modèle                | Nouveau contrat                            | Migration | Impact                                    |
| ---------------------------- | ---------------------------------------- | --------- | ----------------------------------------- |
| `server/services/product-service.ts` (RBAC simple) | `lib/product-type/product-type.policy.ts` (3-niveaux) | — | server/actions/product-actions.ts |
| `lib/auth/rbac.ts` PERMISSIONS | `ProductTypeConfig.requiredPermission*` | — | lib/product-type/product-type.policy.ts  |

// ═══ SQL DE MIGRATION (séquence exacte) ═════════════════════════════════════════

Phase A — GEL (sans risque):
  A.1 Backfill type : SELECT @typeId := id FROM product_type_config WHERE type='PHYSICAL';
  UPDATE product SET productTypeId = @typeId WHERE productTypeId IS NULL;

Phase B — Type obligatoire (après A.1):
  ALTER TABLE product ALTER COLUMN productTypeId SET NOT NULL;

Phase C — Statuts dépréciés (data-migration AVANT DROP VALUE):
  C.1 UPDATE product SET status='PUBLISHED', isActive=true WHERE status='ACTIVE';
  C.2 UPDATE product SET status='PUBLISHED' WHERE status='OUT_OF_STOCK';
  C.3 UPDATE product SET isArchived = (status='ARCHIVED');
  C.4 ALTER TYPE product_status DROP VALUE 'ACTIVE';
  C.5 ALTER TYPE product_status DROP VALUE 'OUT_OF_STOCK';

Phase D — Prix (backfill ProductPrice):
  D.1 INSERT INTO product_price SELECT gen_random_uuid(), id, currency, ROUND(basePrice*100)
      FROM product WHERE NOT EXISTS (...);
  D.2 INSERT INTO product_price SELECT gen_random_uuid(), id, currency, salePrice, saleStart, saleEnd
      FROM product WHERE salePrice IS NOT NULL AND salePrice > 0;

Phase E — Seed VariantStock depuis Stock:
  INSERT INTO variant_stock (id, variant_id, warehouse_id, quantity, reserved,
    alert_threshold, updated_by)
  SELECT gen_random_uuid(), v.id, NULL, s.quantity, s.reserved,
    s.alert_threshold, s.updated_by
  FROM product_variant v JOIN product p ON p.id = v.product_id
  JOIN stocks s ON s.product_id = p.id
  WHERE NOT EXISTS (SELECT 1 FROM variant_stock vs WHERE vs.variant_id = v.id);

Phase F — Backfill ProductImage depuis Product.images:
  INSERT INTO product_image (id, product_id, url, position)
  SELECT gen_random_uuid(), id, url, i
  FROM product, jsonb_array_elements_text(images::jsonb) WITH ORDINALITY AS t(url, i)
  WHERE images IS NOT NULL;

Phase G — Nettoyage (optionnel, après validation complète):
  ALTER TABLE product DROP COLUMN IF EXISTS price;
  ALTER TABLE product DROP COLUMN IF EXISTS basePrice;
  ALTER TABLE product DROP COLUMN IF EXISTS salePrice;
  ALTER TABLE product DROP COLUMN IF EXISTS saleStart;
  ALTER TABLE product DROP COLUMN IF EXISTS saleEnd;
  ALTER TABLE product DROP COLUMN IF EXISTS images;
  ALTER TABLE product DROP COLUMN IF EXISTS isArchived;

// /* __END_MIGRATION_MATRIX__ */