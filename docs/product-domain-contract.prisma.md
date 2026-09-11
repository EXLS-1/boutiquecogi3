# CONTRAT GELÉ — Domaine Produit (Prisma)

> Source : `schema.md` + état **réellement appliqué** dans `prisma/schema.prisma` (2125 lignes, vérifié).
> Prisma cible : 7.9.1 — PostgreSQL. Tout `uuid(7)` est en `@db.Uuid`.
> Ce contrat fonde les Server Actions (`app/actions/admin/products/**`) — à ne coder qu'après migration.
>
> ⚠️ Phase 1 du gel est DÉJÀ APPLIQUÉE dans `prisma/schema.prisma` (conformément à
> `CONTRAT-DOMAINE-PRODUIT.md`) : FK `Product.productTypeId` (nullable + index),
> modèle `VariantStock` avec relation réelle `Warehouse`, indexes `ProductPrice`.
> Ce document présente la CIBLE + les deltas restants (Phase 2).


## 0. Décisions gelées (rappel)

| Domaine          | Décision                                                                 |
| ---------------- | ------------------------------------------------------------------------ |
| Type             | `Product.productTypeId → ProductTypeConfig` **obligatoire**, `onDelete: Restrict` |
| Prix             | `ProductPrice` = source de vérité (Int, unités monétaires entières)       |
| Statut           | `DRAFT → PENDING/SCHEDULED → PUBLISHED → ARCHIVED/DISCONTINUED`           |
| OUT_OF_STOCK     | supprimé du workflow → projection `Product_Availability_Projection`       |
| Stock            | par **variante** (`VariantStock`), `Stock` produit déprécié               |
| Ledger métier    | `InventoryTransaction` (immuable)                                         |
| Journal op       | `StockMovement` re-rattaché au variant stock                              |
| Réservation      | `StockReservation` (déjà variant-based)                                   |
| Projection       | `InventorySnapshot` + `Product_Availability_Projection`                   |
| Audit statut     | `ProductStatusHistory` (conservé tel quel)                                |
| Soft delete      | `isDeleted`/`deletedAt` conservés                                         |
| `isArchived`     | déprécié (dérivé de `status === ARCHIVED`)                                |

---

## 1. Enums

```prisma
enum ProductStatus {
  DRAFT        // Brouillon éditorial
  PENDING      // En attente d'approbation (si ProductTypeConfig.requiresApproval)
  SCHEDULED    // Publication programmée (scheduledAt)
  PUBLISHED    // En ligne
  ARCHIVED     // Retiré mais conservé
  DISCONTINUED // Abandonné commercialement, définitif
}
```

> `ACTIVE` et `OUT_OF_STOCK` sont supprimés : « actif commercialement » = `isActive`,
> « en rupture » = projection inventaire (`Product_Availability_Projection.isAvailable`).

`Currency { USD CDF }` — inchangé.

---

## 2. ProductTypeConfig (policy métier)

```prisma
model ProductTypeConfig {
  id                       String   @id @default(uuid(7)) @db.Uuid
  type                     String   @unique
  label                    String
  description              String?
  whoCanCreate             String[]
  whoCanEdit               String[]
  whoCanDelete             String[]
  requiredPermissionCreate String
  requiredPermissionEdit   String
  requiredPermissionDelete String
  minRoleLevelCreate       Int
  minRoleLevelEdit         Int
  minRoleLevelDelete       Int
  maxVariants              Int
  requiresApproval         Boolean  @default(false)
  isDefault                Boolean  @default(false) // PHASE 2 — pas encore appliqué (backfill migration)
  isActive                 Boolean  @default(true)  // PHASE 2 — pas encore appliqué (désactivation douce)
  createdAt                DateTime @default(now())
  updatedAt                DateTime @updatedAt

  products Product[]

  @@index([type])
  @@map("product_type_config")
}
```

> Appliqué : `ProductTypeConfig.products Product[]` + FK nullable `Product.productTypeId`
> (`onDelete: Restrict`) + `@@index([productTypeId])` — phase 1 ✔. Reste phase 2 :
> `isDefault`/`isActive`, backfill SQL, puis `NOT NULL`.


---

## 3. Product

```prisma
model Product {
  id          String   @id @default(uuid(7)) @db.Uuid
  name        String
  sku         String   @unique
  slug        String   @unique
  description String   @db.Text

  // ─── TYPE (CONTRAT N°1) — ACTUEL : nullable (phase 1 appliquée). PHASE 2 : NOT NULL après backfill ───
  productTypeId String?             @db.Uuid
  productType   ProductTypeConfig? @relation(fields: [productTypeId], references: [id], onDelete: Restrict)

  // ─── STATUT (CONTRAT N°2) ───
  // ACTUEL (appliqué) : enum contient encore ACTIVE/OUT_OF_STOCK, default ACTIVE.
  // PHASE 2 : enum réduit à 6 valeurs (data-migration AVANT DROP VALUE), default DRAFT.
  status      ProductStatus @default(DRAFT)
  isActive    Boolean       @default(false) // état opérationnel, distinct du workflow
  isDeleted   Boolean       @default(false) // soft delete (renommé depuis `isdeleted`)
  deletedAt   DateTime?
  scheduledAt DateTime?
  publishedAt DateTime?

  // ─── PRIX : DÉPRÉCIÉ (CONTRAT N°4) — encore présents (appliqué). Ne plus écrire ici. Drop phase 2. ───
  price     Decimal? @db.Decimal(10, 2) // @deprecated → ProductPrice.amount
  basePrice Decimal? @db.Decimal(10, 2) // @deprecated → ProductPrice.amount
  currency  Currency @default(USD)      // @deprecated → ProductPrice.currency
  salePrice Int?                        // @deprecated → ProductPrice (fenêtre startsAt/endsAt)
  saleStart DateTime?                   // @deprecated
  saleEnd   DateTime?                   // @deprecated
  isArchived Boolean    @default(false) // @deprecated → dérivé de status === ARCHIVED

  // ─── AUTRES ───
  images   String[] // @deprecated → ProductImage[] (à purger après reprise des données)
  videoUrl String?
  isFeatured Boolean @default(false)
  soldCount  Int     @default(0)

  seoTitle       String?
  seoDescription String? @db.Text

  userId String @db.Uuid
  user   User   @relation(fields: [userId], references: [id]) // ✔ nom appliqué : `User.products`

  categoryId String?   @db.Uuid // @deprecated → CategoryProduct[] (source unique)
  category   Category? @relation(fields: [categoryId], references: [id])

  taxClassId String?   @db.Uuid
  taxClass   TaxClass? @relation(fields: [taxClassId], references: [id])

  couponId String?  @db.Uuid
  coupon   Coupon?  @relation(fields: [couponId], references: [id])

  createdBy     String? @db.Uuid
  updatedBy     String? @db.Uuid
  publishedById String? @db.Uuid
  creator       User?   @relation("ProductCreator",   fields: [createdBy],     references: [id])
  editor        User?   @relation("ProductEditor",    fields: [updatedBy],     references: [id])
  publisher     User?   @relation("ProductPublisher", fields: [publishedById], references: [id])

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // ─── RELATIONS INVERSES (toutes vérifiées dans schema.md) ───
  catalogs               CatalogProduct[]
  orderItems             OrderItem[]            // onDelete: Restrict côté OrderItem (protège l'historique)
  stock                  Stock?                 // @deprecated → VariantStock[] (transition)
  variants               ProductVariant[]
  statusHistory          ProductStatusHistory[]
  productImages          ProductImage[]
  productOptions         ProductOption[]
  productTags            ProductTag[]
  productAttributeValues ProductAttributeValue[]
  productReviews         Review[]
  inventoryLedger        InventoryTransaction[]
  inventorySnapshots     InventorySnapshot[]
  availabilityProjection Product_Availability_Projection?
  productPrices          ProductPrice[]
  productViews           ProductView[]
  categoryProducts       CategoryProduct[]
  wishlistItems          WishlistItem[]

  @@index([createdBy])
  @@index([updatedBy])
  @@index([publishedById])
  @@index([productTypeId])   // ✔ appliqué (phase 1)
  @@index([status, scheduledAt])
  @@index([status, isActive])   // PHASE 2 — remplace @@index([isArchived, basePrice]) encore présent (appliqué)
  @@map("product")
}
```

> Côté `User` (déjà appliqué) : `products`, `createdProducts`, `editedProducts`,
> `publishedProducts`, `productStatusHistories` ✔.


---

## 4. ProductPrice — source de vérité du prix

```prisma
model ProductPrice {
  id             String    @id @default(uuid(7)) @db.Uuid
  productId      String    @db.Uuid
  product        Product   @relation(fields: [productId], references: [id], onDelete: Cascade)
  currency       Currency
  amount         Int       // > 0 — validation Zod (pricing.validator.ts)
  compareAtPrice Int?      // >= amount si présent
  country        String?   // priorité 2
  region         String?   // priorité 3
  startsAt       DateTime? // priorité 4 : fenêtre temporelle
  endsAt         DateTime?

  @@index([productId, currency])          // ✔ appliqué
  @@index([productId, startsAt, endsAt])  // ✔ appliqué
  @@index([country, region])              // ✔ appliqué
  @@map("product_price")
}
```

Résolution (fonction unique `resolveProductPrice`) :
`contexte (currency/country/region/now)` → 1. `ProductPrice` actif (country > region > fenêtre > global) → 2. `CatalogProduct.priceOverride` → 3. `+ Variant.priceOffset` → `ResolvedPrice`.

---

## 5. ProductVariant + VariantStock

```prisma
model ProductVariant {
  id          String   @id @default(uuid(7)) @db.Uuid
  productId   String   @db.Uuid
  product     Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  sku         String   @unique
  attributes  Json     // {"taille":"XL","couleur":"Rouge"}
  priceOffset Int      @default(0) // RELATIF au prix résolu du produit
  isActive    Boolean  @default(true) // PHASE 2 — pas encore appliqué (variant « default » de transition)
  createdAt   DateTime @default(now())

  orderItems            OrderItem[]            // onDelete: Restrict
  cartItems             CartItem[]             // variantId obligatoire, onDelete: Cascade
  inventoryTransactions InventoryTransaction[]
  inventorySnapshots    InventorySnapshot[]
  stockReservations     StockReservation[]
  variantStocks         VariantStock[]         // ✔ nom appliqué (back-relation)

  @@index([productId])
  @@map("product_variant")
}

model VariantStock {
  id             String         @id @default(uuid(7)) @db.Uuid
  variantId      String         @db.Uuid
  variant        ProductVariant @relation(fields: [variantId], references: [id], onDelete: Cascade)

  // CONTRAT N°5 — entrepôt cible (null = entrepôt principal) — ✔ appliqué (relation réelle)
  warehouseId String?    @db.Uuid
  warehouse   Warehouse? @relation(fields: [warehouseId], references: [id], onDelete: SetNull)

  quantity       Int      @default(0) // stock physique
  reserved       Int      @default(0)
  alertThreshold Int      @default(10)

  lastMovementAt DateTime @default(now())
  updatedBy      String?  @db.Uuid
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  updater        User?    @relation(fields: [updatedBy], references: [id], onDelete: SetNull)

  @@unique([variantId, warehouseId])
  @@index([variantId])
  @@index([warehouseId])
  @@map("variant_stock")
}
```

> ✔ `VariantStock` est **déjà appliqué** dans `prisma/schema.prisma` (avec `Warehouse.variantStocks`
> en back-relation et `User.variantStockUpdates`). Le `Stock` produit 1:1 est conservé comme
> **agrégat rétro-compat** : toute écriture passe par `InventoryService` qui maintient les deux
> couches transactionnellement. DROP de `Stock` en phase finale.
> ⚠️ Delta restant : `StockMovement.stockId` pointe encore sur `Stock` (appliqué) —
> le re-rattachement à `VariantStock.id` est la cible (phase 2, historique archivé).

---

## 6. Ledger / journal / snapshot

```prisma
model InventoryTransaction { // ledger métier IMMUABLE — jamais d'UPDATE
  id          String          @id @default(uuid(7)) @db.Uuid
  productId   String          @db.Uuid
  product     Product         @relation(fields: [productId], references: [id], onDelete: Cascade) // ACTUEL (appliqué) : Cascade
  variantId   String?         @db.Uuid
  variant     ProductVariant? @relation(fields: [variantId], references: [id], onDelete: Cascade) // ACTUEL (appliqué) : Cascade
  quantity    Int
  reason      TransactionType // RESTOCK | SALE | RETURN | SHRINKAGE (inchangé)
  referenceId String?
  warehouseId String?
  performedBy String?         @db.Uuid
  performedByUser User?       @relation(fields: [performedBy], references: [id], onDelete: SetNull)
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt

  @@index([productId, variantId, createdAt])
  @@map("inventory_transaction")
}
```

> PHASE 2 : passer les FK product/variant en `onDelete: Restrict` (empêche toute purge
> destructrice du ledger). Le variantId doit être **renseigné** à chaque écriture de
> `InventoryService`.

```prisma
model StockMovement { // journal opérationnel/audit — pas une seconde source de vérité
  id        String            @id @default(uuid()) @db.Uuid
  stockId   String            @db.Uuid // ACTUEL (appliqué) → Stock.id (agrégat produit)
  stock     Stock             @relation(fields: [stockId], references: [id], onDelete: Cascade)
  type      StockMovementType // IN | OUT | ADJUSTMENT | RESERVATION | RELEASE | RETURN (inchangé)
  quantity  Int
  delta     Int
  reason    String?
  orderId   String?           @db.Uuid
  order     Order?            @relation(fields: [orderId], references: [id], onDelete: SetNull)
  userId    String?           @db.Uuid
  user      User?             @relation(fields: [userId], references: [id], onDelete: SetNull)
  createdAt DateTime          @default(now())

  @@index([stockId])
  @@index([type])
  @@index([orderId])
  @@index([createdAt])
  @@map("stock_movements")
}
```

> PHASE 2 : re-rattacher `stockId` à `VariantStock.id` (historique archivé sur `Stock`,
> double écriture transitoire pilotée par `InventoryService`).

```prisma
  id          String          @id @default(uuid(7)) @db.Uuid
  productId   String          @db.Uuid
  variantId   String?         @db.Uuid
  available   Int             @default(0)
  reserved    Int             @default(0)
  warehouseId String?
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt
  product     Product         @relation(fields: [productId], references: [id], onDelete: Cascade)
  variant     ProductVariant? @relation(fields: [variantId], references: [id])

  @@unique([productId, variantId])
  @@index([productId])
  @@index([createdAt])
  @@map("inventory_snapshot")
}

model StockReservation { // inchangé — déjà variant-based ✔
  id        String         @id @default(uuid(7)) @db.Uuid
  orderId   String         @db.Uuid
  variantId String         @db.Uuid
  quantity  Int
  expiresAt DateTime
  createdAt DateTime       @default(now())
  order     Order          @relation(fields: [orderId], references: [id], onDelete: Cascade)
  variant   ProductVariant @relation(fields: [variantId], references: [id], onDelete: Cascade)

  @@index([expiresAt])
  @@map("stock_reservation")
}

model Product_Availability_Projection {
  productId   String   @id @db.Uuid
  product     Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  isAvailable Boolean  @default(false)
  updatedAt   DateTime @updatedAt

  @@map("product_availability_projection")
}
```

---

## 7. Conservés tels quels

`ProductStatusHistory`, `ProductImage`, `ProductOption`, `ProductTag`, `Tag`,
`ProductAttribute(+Value)`, `ProductView`, `CategoryProduct`, `CatalogProduct`,
`VariantAttributeConfig` — **aucun changement** (relations inverses déjà vérifiées dans `schema.md`).

---

## 8. `Stock` (produit) — dépréciation

```prisma
model Stock { // @deprecated → conserver pendant la migration, puis DROP
  id             String   @id @default(uuid(7)) @db.Uuid
  productId      String   @unique @db.Uuid
  quantity       Int      @default(0)
  reserved       Int      @default(0)
  alertThreshold Int      @default(10)
  warehouse      String?
  lastMovementAt DateTime @default(now())
  updatedAt      DateTime @updatedAt
  updatedBy      String?  @db.Uuid

  product   Product         @relation(fields: [productId], references: [id], onDelete: Cascade)
  updater   User?           @relation(fields: [updatedBy], references: [id], onDelete: SetNull)
  movements StockMovement[] // transition : les NOUVEAUX mouvements vont sur VariantStock

  @@index([productId])
  @@index([quantity])
  @@index([warehouse])
  @@map("stocks")
}
```

---

## 9. Côté `User` (déjà appliqué ✔ dans `prisma/schema.prisma`)

```prisma
// model User (BetterAuth) — relations effectivement présentes :
products                 Product[]              // propriétaire
createdProducts          Product[]              @relation("ProductCreator")
editedProducts           Product[]              @relation("ProductEditor")
publishedProducts        Product[]              @relation("ProductPublisher")
productStatusHistories   ProductStatusHistory[]
variantStockUpdates      VariantStock[]
stockMovements           StockMovement[]
inventoryTransactions    InventoryTransaction[]
updater                  Stock[]                // agrégat Stock (à retirer avec Stock en phase finale)
```

---

## 10. MATRICE DE MIGRATION — ancien → nouveau → migration → impact

### 10.0 État appliqué (vérifié dans `prisma/schema.prisma`) et deltas Phase 2 restants

| Élément | État actuel (appliqué) | Delta Phase 2 restant |
|---|---|---|
| `Product.productTypeId` (FK nullable + `@@index`) | ✔ appliqué | Seed `PHYSICAL` → backfill SQL → `NOT NULL` (phases A/B) |
| `ProductTypeConfig.products` back-relation | ✔ appliqué | `isDefault`/`isActive` à ajouter |
| `VariantStock` (+ relation réelle `Warehouse` SetNull) | ✔ appliqué | Seed depuis `Stock` (phase E) ; double écriture via `InventoryService` |
| `ProductPrice` (3 indexes geo/fenêtre) | ✔ appliqué | Backfill depuis `basePrice`/`salePrice` (phase D) |
| `ProductStatus` (8 valeurs, default ACTIVE) | enum intact | Data-migration C.1–C.3 PUIS `DROP VALUE 'ACTIVE'`/`'OUT_OF_STOCK'`, default `DRAFT` |
| Champs prix dépréciés (`price/basePrice/salePrice/…`) | encore présents | NULL-able → DROP (fin de phase 2) |
| `isdeleted` / `isArchived` / `images` / `categoryId` | encore présents | Rename `isDeleted`, dérivation status, reprise `ProductImage`/`CategoryProduct`, puis DROP |
| `Stock` 1:1 produit | conservé (agrégat rétro-compat) | DROP final après reprise + validation |
| `StockMovement.stockId → Stock` | appliqué | Re-attach à `VariantStock.id` (historique archivé) |
| `InventoryTransaction` FK Cascade | appliqué | FK product/variant → `Restrict` |
| `User` relations (products/creator/editor/publisher/variantStockUpdates/…) | ✔ appliqué | — |
| `Warehouse` (+ `variantStocks` back-relation) | ✔ appliqué | — |

### 10.1 Matrice complète — ancien → nouveau → migration → impact

| Ancien champ/modèle                    | Nouveau                                       | Migration | Impact Order / Cart / Admin |
|----------------------------------------|-----------------------------------------------|-----------|------------------------------|
| `Product.price`, `basePrice` (Decimal) | `ProductPrice.amount` (Int)                   | 1. Créer `ProductPrice` depuis `basePrice` (devise par défaut) ; 2. Rendre colonnes NULL ; 3. Drop phase 2 | Order : `OrderItem.unitPrice Int` déjà snapshot ✔ ; Cart : `snapshotPriceAtAdd` ✔ ; Admin : écritures uniquement via `PricingService` |
| `Product.salePrice/saleStart/saleEnd`  | `ProductPrice` avec `startsAt/endsAt`         | Convertir en lignes `ProductPrice` fenêtrées | Aucun — lecture via `resolveProductPrice` |
| `Product.currency`                     | `ProductPrice.currency`                       | Copier | `Order.currency` reste indépendante ✔ |
| `ProductStatus.ACTIVE`                 | `PUBLISHED` + `isActive`                      | Backfill : ACTIVE → PUBLISHED (isActive=true). Migrer l'enum AVANT alter (historique `ProductStatusHistory` référence les anciennes valeurs) | Admin : badge basé sur le status |
| `ProductStatus.OUT_OF_STOCK`           | supprimé → `Product_Availability_Projection`  | Backfill projection depuis `Stock`/inventaire, puis alter enum | Cart : dispo lue via projection, plus le statut |
| `Product.isArchived`                   | dérivé `status === ARCHIVED`                  | Backfill status, puis déprécier | Admin : plus de boolean à cocher |
| `Product.isdeleted` (typo)             | `Product.isDeleted`                           | Rename column | Filtres soft-delete inchangés |
| `Product.images String[]`              | `ProductImage[]` (position)                   | Copier avec ordre, puis drop | `OrderItem.productImage` déjà snapshot ✔ |
| `Product.categoryId`                   | `CategoryProduct[]` (displayOrder)            | Créer la ligne jointe pour chaque produit | Listes/homepage : requêtes via join |
| `Product` sans type                    | `productTypeId` NOT NULL                      | 1. Seed `ProductTypeConfig` `isDefault` ; 2. Backfill ; 3. NOT NULL | Admin : type requis dans le formulaire ; RBAC via type |
| `ProductTypeConfig` sans relation      | `Product.productTypeId` + index               | Add column + FK | `maxVariants`, `requiresApproval` appliqués par type |
| `Stock` 1:1 produit                    | `VariantStock` par variante                   | Produits sans variant → 1 variant « default » + création `VariantStock` ; sinon agrégat sur le variant par défaut | Panier/checkout : dispo lue par variant ; `StockReservation` déjà variant ✔ |
| `StockMovement.stockId → Stock`        | `stockId → VariantStock.id`                   | Historique archivé sur Stock ; nouveaux mouvements sur VariantStock (double écriture transitoire) | Audit conservé |
| `InventoryTransaction` FK Cascade      | FK `onDelete: Restrict` (product + variant)   | Alter FK | Empêche toute purge destructrice du ledger |
| `InventorySnapshot` (variantId null)   | conservé, densifié par variant                | Backfill par variant | Read model only |
| — (nouveau)                            | `ProductTypeConfig.isDefault/isActive`        | Add columns | Backfill + désactivation douce des types |

### Séquence de migration recommandée (compatible online)

1. Seed `ProductTypeConfig` par défaut → backfill `productTypeId` → NOT NULL.
2. Backfill `ProductPrice` depuis `basePrice`/`price` (ventes → lignes fenêtrées `startsAt/endsAt`).
3. Backfill `status` (ACTIVE→PUBLISHED+isActive, OUT_OF_STOCK→PUBLISHED+projection `isAvailable=false`, isArchived→ARCHIVED) — migrer l'enum après backfill de l'historique.
4. Créer variantes par défaut + `VariantStock` depuis `Stock` (1:1 par défaut produit).
5. Backfill `CategoryProduct` et `ProductImage` depuis `categoryId`/`images`.
6. `prisma validate` + `prisma generate` + tests de contraintes (FK Restrict, unicité `[variantId, warehouseId]`, `compareAtPrice >= amount`).
7. Phase 2 (commits suivants) : DROP `price/basePrice/currency/salePrice/saleStart/saleEnd/isArchived/images/categoryId`, puis `Stock`.

