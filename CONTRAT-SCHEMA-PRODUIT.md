// CONTRAT-SCHEMA-PRODUIT.md
// =============================================================================
// CONTRAT GELÉ — MODÈLES/ENUMS PRODUIT (Prisma 7.9.1 / PostgreSQL)
// =============================================================================
// Source : prisma/schema.prisma (section PRODUIT + INVENTAIRE)
// Validator : npx prisma validate ✅ (schéma valide)
//
// Ce document récapitule LE SEUL contrat de schéma à consommer dans le code
// métier. Toute lecture/écriture de produit passe par ce contrat — jamais de
// champ « legacy » hors du service dédié (lib/products/*, lib/product-*/).
//

// ═════════════════════════════════════════════════════════════════════════════
// ENUM Currency — conservé tel quel
// ═════════════════════════════════════════════════════════════════════════════

enum Currency {
  USD
  CDF
}

// ═════════════════════════════════════════════════════════════════════════════
// ENUM ProductStatus — WORKFLOW ÉDITEURIAL
// ═════════════════════════════════════════════════════════════════════════════
// ACTIVE et OUT_OF_STOCK SUPPRIMÉS (phase C du contrat).
//   - isActive                 = flag opérationnel commercial
//   - Product_Availability_Projection.isAvailable = rupture (calculée)
//   - ProductStatusHistory.oldStatus/newStatus    = trace immuable

enum ProductStatus {
  DRAFT
  PENDING
  SCHEDULED
  PUBLISHED
  ARCHIVED
  DISCONTINUED
}

// ═════════════════════════════════════════════════════════════════════════════
// ENUM TransactionType — LEDGER INVENTAIRE
// ═════════════════════════════════════════════════════════════════════════════

enum TransactionType {
  RESTOCK
  SALE
  RETURN
  SHRINKAGE
}

// ═════════════════════════════════════════════════════════════════════════════
// ENUM StockMovementType — JOURNAL OPÉRATIONNEL
// ═════════════════════════════════════════════════════════════════════════════

enum StockMovementType {
  IN          // Réception / Achat
  OUT         // Vente / Expédition
  ADJUSTMENT  // Inventaire / Correction
  RESERVATION // Mise de côté (panier validé)
  RELEASE     // Libération (annulation commande)
  RETURN      // Retour client
}

// /* __END_SCHEMA_CONTRACT__ */
// ═════════════════════════════════════════════════════════════════════════════
// MODÈLE Product — SOURCE DE VÉRITÉ (contrats 1-5)
// ═════════════════════════════════════════════════════════════════════════════

model Product {
  id          String   @id @default(uuid(7)) @db.Uuid
  name        String
  sku         String   @unique
  slug        String   @unique
  description String   @db.Text

  // ── CONTRAT N°1 : Type de produit (policy métier) ──
  productTypeId String            @db.Uuid
  productType   ProductTypeConfig @relation(fields: [productTypeId], references: [id], onDelete: Restrict)

  // ── CONTRAT N°3 : Workflow éditorial ──
  status        ProductStatus @default(DRAFT)
  isActive      Boolean       @default(false)
  isdeleted     Boolean       @default(false)
  deletedAt     DateTime?
  scheduledAt   DateTime?
  publishedAt   DateTime?
  publishedById String?       @db.Uuid
  publisher     User?         @relation("ProductPublisher", fields: [publishedById], references: [id], onDelete: SetNull)

  // ── CONTRAT N°2 : Prix (DEPRÉCIÉ — ProductPrice = source de vérité) ──
  price     Decimal? @db.Decimal(10, 2)   // @deprecated → ProductPrice.amount
  basePrice Decimal? @db.Decimal(10, 2)   // @deprecated → fallback dernier recours
  currency  Currency  @default(USD)
  salePrice Int?
  saleStart DateTime?
  saleEnd   DateTime?
  soldCount Int @default(0)

  // ── Catalogue / classification ──
  categoryId        String?              @db.Uuid
  category          Category?            @relation(fields: [categoryId], references: [id])
  catalogs          CatalogProduct[]
  categoryProducts  CategoryProduct[]

  // ── Contenu média ──
  images          String[]              // @deprecated → ProductImage[]
  videoUrl        String?
  productImages   ProductImage[]        // ── CANONIQUE ──

  // ── Options / attributs / tags ──
  productOptions          ProductOption[]
  productAttributeValues  ProductAttributeValue[]
  productTags             ProductTag[]
  isFeatured Boolean @default(false)

  // ── SEO ──
  seoTitle       String?
  seoDescription String?   @db.Text

  // ── Taxe ──
  taxClassId String?   @db.Uuid
  taxClass   TaxClass? @relation(fields: [taxClassId], references: [id])

  // ── Coupon ──
  couponId String? @db.Uuid
  coupon   Coupon? @relation(fields: [couponId], references: [id])

  // ── Ownership / audit ──
  userId     String    @db.Uuid
  user       User      @relation(fields: [userId], references: [id])
  createdBy  String?   @db.Uuid
  updatedBy  String?   @db.Uuid
  creator    User?     @relation("ProductCreator",  fields: [createdBy],  references: [id], onDelete: SetNull)
  editor     User?     @relation("ProductEditor",   fields: [updatedBy],  references: [id], onDelete: SetNull)
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  // ── Relations domaine ──
  variants               ProductVariant[]
  productPrices          ProductPrice[]
  statusHistory          ProductStatusHistory[]
  availabilityProjection Product_Availability_Projection?
  inventoryTransactions  InventoryTransaction[]
  inventorySnapshots     InventorySnapshot[]
  productReviews         Review[]
  productViews           ProductView[]
  orderItems             OrderItem[]                       // onDelete: Restrict

  @@index([createdBy])
  @@index([updatedBy])
  @@index([publishedById])
  @@index([status, scheduledAt])
  @@index([productTypeId])
  @@index([status, isActive])
  @@map("product")
}

// ═════════════════════════════════════════════════════════════════════════════
// MODÈLE ProductTypeConfig — CONTRAT N°1 (RBAC × type)
// ═════════════════════════════════════════════════════════════════════════════

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
  isDefault                Boolean  @default(false)
  isActive                 Boolean  @default(true)
  createdAt                DateTime @default(now())
  updatedAt                DateTime @updatedAt

    products Product[]
  @@index([type])
  @@map("product_type_config")
}

// ═════════════════════════════════════════════════════════════════════════════
// MODÈLE ProductPrice — CONTRAT N°2 (source de vérité prix)
// CONVENTION : montants en centimes entiers (Int).
// Résolution : 1. CatalogProduct.priceOverride → 2. ProductPrice
//   3. Product.salePrice (déprécié) → 4. Product.basePrice (fallback)

model ProductPrice {
  id             String    @id @default(uuid(7)) @db.Uuid
  productId      String    @db.Uuid
  product        Product   @relation(fields: [productId], references: [id], onDelete: Cascade)
  currency       Currency
  amount         Int              // centimes
  compareAtPrice Int?             // centimes
  country        String?
  region         String?
  startsAt       DateTime?
  endsAt         DateTime?

  @@index([productId, currency])
  @@index([productId, startsAt, endsAt])
  @@index([country, region])
  @@map("product_price")
}

// ═════════════════════════════════════════════════════════════════════════════
// MODÈLE ProductVariant — CONTRAT N°5 (stock par variante)

model ProductVariant {
  id          String   @id @default(uuid(7)) @db.Uuid
  productId   String   @db.Uuid
  product     Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  sku         String   @unique
  attributes  Json
  priceOffset Int      @default(0)   // centimes
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())

  variantStocks         VariantStock[]
  orderItems            OrderItem[]
  cartItems             CartItem[]
  inventoryTransactions InventoryTransaction[]
  inventorySnapshots    InventorySnapshot[]
  stockReservations     StockReservation[]

  @@index([productId])
  @@map("product_variant")
}

// ═════════════════════════════════════════════════════════════════════════════
// MODÈLE VariantStock — CONTRAT N°5 (inventaire au niveau SKU)
// available = quantity - reserved → valeur DÉRIVÉE, jamais persistée.

model VariantStock {
  id        String         @id @default(uuid(7)) @db.Uuid
  variantId String         @db.Uuid
  variant   ProductVariant @relation(fields: [variantId], references: [id], onDelete: Cascade)

  warehouseId String?    @db.Uuid
  warehouse   Warehouse? @relation(fields: [warehouseId], references: [id], onDelete: SetNull)

  quantity       Int @default(0)
  reserved       Int @default(0)
  alertThreshold Int @default(10)

  lastMovementAt DateTime  @default(now())
  updatedBy      String?   @db.Uuid
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  updater        User?     @relation(fields: [updatedBy], references: [id], onDelete: SetNull)

  movements StockMovement[]

  @@unique([variantId, warehouseId])
  @@index([variantId])
  @@index([warehouseId])
  @@map("variant_stock")
}

// ═════════════════════════════════════════════════════════════════════════════
// MODÈLE Stock — agrégat rétrocompatibilité (1:1 Product)
// Écrit UNIQUEMENT par lib/product-inventory/inventory.service.ts.

model Stock {
  id             String   @id @default(uuid(7)) @db.Uuid
  productId      String   @unique @db.Uuid
  quantity       Int      @default(0)
  reserved       Int      @default(0)
  alertThreshold Int      @default(10)
  warehouse      String?
  lastMovementAt DateTime @default(now())
  updatedAt      DateTime @updatedAt
  updatedBy      String?  @db.Uuid

  product   Product        @relation(fields: [productId], references: [id], onDelete: Cascade)
  updater   User?          @relation(fields: [updatedBy], references: [id], onDelete: SetNull)
  movements StockMovement[]

  @@index([productId])
  @@map("stocks")
}

// ═════════════════════════════════════════════════════════════════════════════
// MODÈLE StockMovement — journal opérationnel

model StockMovement {
  id             String            @id @default(uuid()) @db.Uuid
  stockId        String            @db.Uuid
  type           StockMovementType
  quantity       Int
  delta          Int
  reason         String?
  orderId        String?           @db.Uuid
  userId         String?           @db.Uuid
  variantStockId String?           @db.Uuid

  stock        Stock         @relation(fields: [stockId], references: [id], onDelete: Cascade)
  variantStock VariantStock? @relation(fields: [variantStockId], references: [id], onDelete: SetNull)
  user         User?         @relation(fields: [userId], references: [id], onDelete: SetNull)
  order        Order?        @relation(fields: [orderId], references: [id], onDelete: SetNull)

  @@index([stockId])
  @@index([variantStockId])
  @@index([type])
  @@index([orderId])
    @@index([createdAt])
  @@map("stock_movements")
}

// ═════════════════════════════════════════════════════════════════════════════
// MODÈLE InventoryTransaction — LEDGER IMMUTABLE
// ═════════════════════════════════════════════════════════════════════════════

model InventoryTransaction {
  id           String          @id @default(uuid(7)) @db.Uuid
  productId    String          @db.Uuid
  product      Product         @relation(fields: [productId], references: [id], onDelete: Restrict)
  variantId    String?         @db.Uuid
  variant      ProductVariant? @relation(fields: [variantId], references: [id], onDelete: Restrict)
  quantity     Int
  reason       TransactionType
  referenceId  String?
  warehouseId  String?
  performedBy  String? @db.Uuid
  performedByUser User? @relation(fields: [performedBy], references: [id], onDelete: SetNull)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@index([productId, variantId, createdAt])
    @@map("inventory_transaction")
}

// ═════════════════════════════════════════════════════════════════════════════
// MODÈLE InventorySnapshot — point-in-time (read model)

model InventorySnapshot {
  id          String   @id @default(uuid(7)) @db.Uuid
  productId   String   @db.Uuid
  variantId   String?  @db.Uuid
  available   Int
  reserved    Int
  warehouseId String?
  createdAt   DateTime @default(now())

  product Product? @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@unique([productId, variantId])
  @@index([productId, variantId])
  @@index([createdAt])
  @@map("inventory_snapshot")
}

// ═════════════════════════════════════════════════════════════════════════════
// MODÈLE StockReservation — réservations temporaires (commandes)

model StockReservation {
  id        String   @id @default(uuid(7)) @db.Uuid
  variantId String   @db.Uuid
  variant   ProductVariant @relation(fields: [variantId], references: [id], onDelete: Cascade)
  orderId   String?  @db.Uuid
  quantity  Int
  expiresAt DateTime
  createdAt DateTime @default(now())

  @@index([variantId])
  @@index([orderId])
  @@index([expiresAt])
  @@map("stock_reservation")
}

// ═════════════════════════════════════════════════════════════════════════════
// MODÈLE Product_Availability_Projection — rupture = projection (O(1))

model Product_Availability_Projection {
  productId   String   @id @default(uuid(7)) @db.Uuid
  product     Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  isAvailable Boolean  @default(false)
  updatedAt   DateTime @updatedAt

  @@map("product_availability_projection")
}

// ═════════════════════════════════════════════════════════════════════════════
// MODÈLE ProductStatusHistory — audit trail workflow

model ProductStatusHistory {
  id          String        @id @default(uuid(7)) @db.Uuid
  productId   String        @db.Uuid
  product     Product       @relation(fields: [productId], references: [id], onDelete: Cascade)
  oldStatus   ProductStatus
  newStatus   ProductStatus
  reason      String?       @db.Text
  changedById String?       @db.Uuid
  changedBy   User?         @relation(fields: [changedById], references: [id], onDelete: SetNull)
  changedAt   DateTime      @default(now())

  @@index([productId, changedAt])
    @@map("product_status_history")
}

// ═════════════════════════════════════════════════════════════════════════════
// MODÈLE ProductImage — médias canoniques (ordonnés + ALT)

model ProductImage {
  id        String  @id @default(uuid(7)) @db.Uuid
  productId String  @db.Uuid
  product   Product @relation(fields: [productId], references: [id])
  url       String
  alt       String?
  position  Int     @default(0)

  @@index([productId])
  @@map("product_image")
}

// ═════════════════════════════════════════════════════════════════════════════
// MODÈLE VariantAttributeConfig — configuration attributs de variante

model VariantAttributeConfig {
  id              String   @id @default(uuid(7)) @db.Uuid
  attribute       String   @unique
  label           String
  type            String
  isRequired      Boolean  @default(false)
  whoCanConfigure String[]
  minRoleLevel    Int
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([attribute])
  @@map("variant_attribute_config")
}

// ═════════════════════════════════════════════════════════════════════════════
// MODÈLE ProductOption — options produit (nom/valeur)

model ProductOption {
  id        String  @id @default(uuid(7)) @db.Uuid
  productId String  @db.Uuid
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  name      String
  value     String

  @@unique([productId, name, value])
  @@index([productId])
  @@map("product_option")
}

// ═════════════════════════════════════════════════════════════════════════════
// MODÈLE ProductView — analytics (compteur de vues)

model ProductView {
  id        String   @id @default(uuid(7)) @db.Uuid
  productId String   @db.Uuid
  sessionId String?
  userId    String?  @db.Uuid
  viewedAt  DateTime @default(now())

  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  user    User?   @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([productId, viewedAt])
  @@map("product_views")
}

// ═════════════════════════════════════════════════════════════════════════════
// CONTRAT — RELATIONS BACKREF (modèles qui référencent Product)
// ═════════════════════════════════════════════════════════════════════════════
// OrderItem     ← onDelete: Restrict (commande conserve snapshot produit)
// CartItem      ← onDelete: Cascade
// WishlistItem  ← onDelete: Cascade
// Tag           ← via ProductTag (many-to-many)
// Category      ← via CategoryProduct (many-to-many)
// Catalog       ← via CatalogProduct (many-to-many)
// TaxClass      ← onDelete: SetNull
// Coupon        ← onDelete: SetNull
// Review        ← onDelete: Cascade
// AuditLog      ← targetType = "PRODUCT"
// Media         ← ProductImage dérive de Media

// /* __END_SCHEMA_CONTRACT__ */
}