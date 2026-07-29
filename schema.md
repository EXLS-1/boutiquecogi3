// ============================================================
// SCHÉMA PRISMA - RÉORGANISÉ PAR THÈME MÉTIER
// ============================================================

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
}

// ============================================================
// 1. THÈME : AUTHENTIFICATION & UTILISATEURS
// ============================================================

model User {
  id              String          @id @unique @default(uuid(7)) @db.Uuid
  role            Role            @default(USER)
  roleConfig      RoleConfig?     @relation(fields: [roleConfigId], references: [id])
  roleConfigId    String?         @db.Uuid
  roleAssignment  RoleAssignment?
  sessions        Session[]
  name            String?
  email           String          @unique
  emailVerified   Boolean         @default(false)
  emailVerifiedAt DateTime?
  image           String?
  accounts        Account[]
  twoFactorEnabled Boolean         @default(false)
  twoFactorSecret  String?         @db.Text
  twoFactor        TwoFactor[]
  
  // Audits & métadonnées
  createdAt   DateTime @default(now())
  createdById String?  @db.Uuid
  updatedById String?  @db.Uuid
  deletedById String?  @db.Uuid
  createdBy   User?    @relation("UserCreatedBy", fields: [createdById], references: [id], onDelete: SetNull)
  updatedBy   User?    @relation("UserUpdatedBy", fields: [updatedById], references: [id], onDelete: SetNull)
  deletedBy   User?    @relation("UserDeletedBy", fields: [deletedById], references: [id], onDelete: SetNull)
  createdUsers User[]  @relation("UserCreatedBy")
  updatedUsers User[]  @relation("UserUpdatedBy")
  deletedUsers User[]  @relation("UserDeletedBy")
  
  deletedAt    DateTime?
  blockedAt    DateTime?
  isDeleted    Boolean   @default(false)
  isBlocked    Boolean   @default(false)
  blockedUntil DateTime?
  blockReason  String?
  version      Int      @default(1)
  productCount Int      @default(0)
  
  // Relations
  orders           Order[]
  posts            Post[]
  dashboards       Dashboard[]
  updater          Stock[]
  reviews          Review[]
  addresses        Address[]
  couponUsages     CouponUsage[]
  notifications    Notification[]
  abandonedCarts   AbandonedCart[]
  cart             Cart?
  wishlist         Wishlist?
  searchAnalytics  SearchAnalytics?
  products         Product[]
  productViews     ProductView[]
  createdProducts  Product[]     @relation("ProductCreator")
  editedProducts   Product[]     @relation("ProductEditor")
  auditLogs        AuditLog[]
  stockMovements   StockMovement[]
  deletedAccountRegistries DeletedAccountRegistry[]

  @@map("user")
}

model Account {
  id                    String   @id @default(uuid(7)) @db.Uuid
  userId                String   @db.Uuid
  user                  User?    @relation(fields: [userId], references: [id], onDelete: Cascade)
  type                  String   @default("email")
  provider              String
  accountId             String   @map("providerAccountId")
  password              String?  @db.Text
  refreshToken          String?  @map("refresh_token") @db.Text
  refreshTokenExpiresAt DateTime?
  accessToken           String?  @map("access_token") @db.Text
  accessTokenExpiresAt  DateTime?
  expiresAt             DateTime? @map("expires_at")
  tokenType             String?  @map("token_type")
  scope                 String?
  idToken               String?  @map("id_token") @db.Text
  sessionState          String?  @map("session_state")
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@unique([provider])
  @@index([userId])
  @@map("account")
}

model Session {
  id         String   @id @default(uuid(7)) @db.Uuid
  token      String   @unique
  userId     String   @db.Uuid
  expiresAt  DateTime
  ipAddress  String?
  userAgent  String?
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  lastUsedAt DateTime?

  @@index([userId])
  @@map("session")
}

model Post {
  id        String  @id @default(uuid(7)) @db.Uuid
  title     String
  userId    String  @db.Uuid
  content   String?
  published Boolean @default(false)
  user      User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("post")
}

model Verification {
  id         String           @id @default(uuid(7)) @db.Uuid
  identifier String
  value      String           @db.Text
  type       VerificationType
  expiresAt  DateTime
  consumedAt DateTime?
  createdAt  DateTime         @default(now())
  updatedAt  DateTime         @updatedAt

  @@unique([identifier, type, value])
  @@index([identifier])
  @@index([expiresAt])
  @@map("verification")
}

model TwoFactor {
  id          String                @id @default(uuid(7)) @db.Uuid
  userId      String                @unique @db.Uuid
  user        User                  @relation(fields: [userId], references: [id], onDelete: Cascade)
  secret      String                @db.Text
  enabled     Boolean               @default(false)
  createdAt   DateTime              @default(now())
  updatedAt   DateTime              @updatedAt
  backupCodes TwoFactorBackupCode[]

  @@map("twofactor")
}

model TwoFactorBackupCode {
  id          String    @id @default(uuid(7)) @db.Uuid
  twoFactorId String    @db.Uuid
  twoFactor   TwoFactor @relation(fields: [twoFactorId], references: [id], onDelete: Cascade)
  codeHash    String
  used        Boolean   @default(false)

  @@map("twofactor_backup_code")
}

enum Role {
  SUPER_ADMIN
  ADMIN
  MANAGER
  EDITOR
  SUPERVISOR
  USER
  GUEST
}

enum VerificationType {
  EMAIL_VERIFICATION
  PASSWORD_RESET
  MAGIC_LINK
  EMAIL_CHANGE
  PHONE_VERIFICATION
  TWO_FACTOR
}

model DeletedAccountRegistry {
  id            String   @id @default(uuid(7)) @db.Uuid
  userId        String   @db.Uuid
  userEmail     String
  userName      String?
  deletedUser   String
  deletedBy     String   @db.Uuid
  deletedByRole String
  userSnapshot  Json
  reason        String
  metadata      Json?
  createdAt     DateTime @default(now())
  restoredAt    DateTime?
  restoredBy    String?  @db.Uuid
  restoreNote   String?
  users         User[]

  @@index([userId])
  @@index([deletedBy])
  @@index([createdAt])
  @@index([userEmail])
  @@map("deleted_account_registry")
}

// ============================================================
// 2. THÈME : GESTION DES RÔLES & PERMISSIONS (RBAC)
// ============================================================

model RoleConfig {
  id          String       @id @default(uuid(7)) @db.Uuid
  role        Role         @unique
  level       Int
  users       User[]
  parentId    String?      @db.Uuid
  parent      RoleConfig?  @relation("RoleConfigHierarchy", fields: [parentId], references: [id], onDelete: SetNull)
  children    RoleConfig[] @relation("RoleConfigHierarchy")
  description String
  permissions Json         @default("{}")
  restrictions Json?       @default("{}")
  isSystem    Boolean      @default(false)
  isActive    Boolean      @default(true)
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  createdBy   String?
  updatedBy   String?
  blockedAt   DateTime?
  blockedReason String?
  blockedBy   String?
  unblockedAt DateTime?
  unblockedBy String?
  unblockedReason String?
  
  rolePermissions RolePermission[]

  @@index([role])
  @@index([level])
  @@index([isActive])
  @@index([isSystem])
  @@map("role_config")
}

model RoleDefinition {
  id          String @id @default(uuid(7)) @db.Uuid
  role        Role   @unique
  level       Int    @unique
  assignments RoleAssignment[]
  name        String? @unique
  description String?
  permissions Json   @default("{}")
  restrictions Json  @default("{}")
  isSystem    Boolean @default(false)
  isActive    Boolean @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  createdBy   String?
  updatedBy   String?
  blockedAt   DateTime?
  blockedReason String?
  blockedBy   String?
  unblockedAt DateTime?
  unblockedBy String?
  unblockedReason String?
  
  defaultPermissions RoleDefaultPermission[]
  rolePermissions    RolePermission[]
}

model RoleAssignment {
  id          String @id @default(uuid(7)) @db.Uuid
  userId      String @unique @db.Uuid
  roleId      String @db.Uuid
  user        User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  role        Role
  isBlocked   Boolean @default(false)
  blockedReason String?
  blockedAt   DateTime?
  blockedUntil DateTime?
  assignedBy  String? @db.Uuid
  assignedAt  DateTime @default(now())
  lastVerifiedAt DateTime @default(now())
  
  permissionOverrides PermissionOverride[]
  roleDefinitions RoleDefinition[]
}

model Permission {
  id          String @id @default(uuid(7)) @db.Uuid
  code        String @unique
  name        String
  description String?
  category    String
  isDangerous Boolean @default(false)
  
  roles          RolePermission[]
  roleDefaults   RoleDefaultPermission[]
  overrides      PermissionOverride[]

  @@map("permission")
}

model RolePermission {
  id           String         @id @default(uuid(7)) @db.Uuid
  roleId       String         @db.Uuid
  roleconfigId String         @db.Uuid
  permissionId String         @db.Uuid
  roleconfig   RoleConfig     @relation(fields: [roleconfigId], references: [id], onDelete: Cascade)
  permission   Permission     @relation(fields: [permissionId], references: [id], onDelete: Cascade)
  roleDefinitions RoleDefinition[]

  @@unique([roleconfigId, permissionId])
  @@map("role_permission")
}

model RoleDefaultPermission {
  id           String @id @default(uuid(7)) @db.Uuid
  roleId       String @db.Uuid
  permissionId String @db.Uuid
  role         Role
  permission   Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)
  roleDefinitions RoleDefinition[]

  @@unique([roleId, permissionId])
  @@map("role_default_permission")
}

model PermissionOverride {
  id               String @id @default(uuid(7)) @db.Uuid
  roleAssignmentId String @db.Uuid
  permissionId     String @db.Uuid
  isGranted        Boolean
  grantedBy        String? @db.Uuid
  grantedAt        DateTime @default(now())
  expiresAt        DateTime?
  
  roleAssignment RoleAssignment @relation(fields: [roleAssignmentId], references: [id], onDelete: Cascade)
  permission     Permission     @relation(fields: [permissionId], references: [id], onDelete: Cascade)

  @@unique([roleAssignmentId, permissionId])
}

// ============================================================
// 3. THÈME : CATALOGUE & PRODUITS
// ============================================================

model Catalog {
  id         String           @id @default(uuid(7)) @db.Uuid
  name       String
  imageSrc   String?
  imageAlt   String
  isActive   Boolean          @default(true)
  categoryId String?          @db.Uuid
  category   Category?        @relation(fields: [categoryId], references: [id])
  products   CatalogProduct[]

  @@map("catalog")
}

model Category {
  id          String  @id @default(uuid(7)) @db.Uuid
  name        String  @unique
  slug        String  @unique
  description String? @db.Text
  subtitle    String
  image       String?
  isNavigable Boolean @default(true)
  managedByRoles String[] @default([])
  requiredPermission String @default("products:read")
  minRoleLevel Int @default(6)
  displayOrder Int @default(0)
  OrderBy     String
  parentId    String? @db.Uuid
  parent      Category? @relation("CategoryHierarchy", fields: [parentId], references: [id])
  children    Category[] @relation("CategoryHierarchy")
  seoTitle    String?
  seoDescription String?
  deletedAt   DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  catalogs         Catalog[]
  products         Product[]
  categoryProducts CategoryProduct[]

  @@index([slug])
  @@index([parentId])
  @@map("category")
}

model CategoryProduct {
  productId    String @db.Uuid
  categoryId   String @db.Uuid
  displayOrder Int    @default(0)
  product      Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  category     Category @relation(fields: [categoryId], references: [id], onDelete: Cascade)

  @@id([productId, categoryId])
  @@index([categoryId])
  @@map("category_product")
}

model CatalogProduct {
  catalogId     String   @db.Uuid
  productId     String   @db.Uuid
  priceOverride Decimal? @db.Decimal(10, 2)
  isActive      Boolean  @default(true)
  catalog       Catalog  @relation(fields: [catalogId], references: [id], onDelete: Cascade)
  product       Product  @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@id([catalogId, productId])
  @@index([productId])
  @@map("catalog_product")
}

model Product {
  id          String  @id @default(uuid(7)) @db.Uuid
  name        String
  sku         String  @unique
  slug        String  @unique
  description String  @db.Text
  price       Decimal @db.Decimal(10, 2)
  basePrice   Decimal @db.Decimal(10, 2)
  currency    String  @default("USD") @db.VarChar(3)
  categoryId  String? @db.Uuid
  category    Category? @relation(fields: [categoryId], references: [id])
  userId      String  @db.Uuid
  user        User    @relation(fields: [userId], references: [id])
  images      String[]
  videoUrl    String?
  isFeatured  Boolean @default(false)
  isArchived  Boolean @default(false)
  isdeleted   Boolean @default(false)
  deletedAt   DateTime?
  status      ProductStatus @default(ACTIVE)
  seoTitle    String?
  seoDescription String? @db.Text
  taxClassId  String? @db.Uuid
  taxClass    TaxClass? @relation(fields: [taxClassId], references: [id])
  salePrice   Int?
  saleStart   DateTime?
  saleEnd     DateTime?
  soldCount   Int     @default(0)
  createdBy   String? @db.Uuid
  updatedBy   String? @db.Uuid
  creator     User?   @relation("ProductCreator", fields: [createdBy], references: [id])
  editor      User?   @relation("ProductEditor", fields: [updatedBy], references: [id])
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  couponId    String? @db.Uuid
  coupon      Coupon? @relation(fields: [couponId], references: [id])
  
  // Relations
  catalogs               CatalogProduct[]
  stock                  Stock?
  orderItems             OrderItem[]
  variants               ProductVariant[]
  wishlistItems          WishlistItem[]
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

  @@index([createdBy])
  @@index([updatedBy])
  @@index([isArchived, basePrice])
  @@index([slug])
  @@map("product")
}

model ProductVariant {
  id          String   @id @default(uuid(7)) @db.Uuid
  productId   String   @db.Uuid
  product     Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  sku         String   @unique
  attributes  Json
  priceOffset Int      @default(0)
  createdAt   DateTime @default(now())
  
  orderItems            OrderItem[]
  cartItems             CartItem[]
  inventoryTransactions InventoryTransaction[]
  inventorySnapshots    InventorySnapshot[]
  stockReservations     StockReservation[]

  @@index([productId])
  @@map("product_variant")
}

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

model Tag {
  id   String @id @default(uuid(7)) @db.Uuid
  name String @unique
  slug String @unique
  products ProductTag[]

  @@map("tag")
}

model ProductTag {
  productId String  @db.Uuid
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  tagId     String  @db.Uuid
  tag       Tag     @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([productId, tagId])
  @@map("product_tag")
}

model ProductAttribute {
  id   String @id @default(uuid(7)) @db.Uuid
  name String @unique
  type String
  values ProductAttributeValue[]

  @@map("product_attribute")
}

model ProductAttributeValue {
  id          String           @id @default(uuid(7)) @db.Uuid
  productId   String           @db.Uuid
  product     Product          @relation(fields: [productId], references: [id], onDelete: Cascade)
  attributeId String           @db.Uuid
  attribute   ProductAttribute @relation(fields: [attributeId], references: [id], onDelete: Cascade)
  value       String

  @@unique([productId, attributeId])
  @@map("product_attribute_value")
}

model Review {
  id                 String   @id @default(uuid(7)) @db.Uuid
  productId          String   @db.Uuid
  product            Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  userId             String   @db.Uuid
  user               User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  rating             Int      @db.SmallInt
  comment            String?  @db.Text
  isVerifiedPurchase Boolean  @default(false)
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  @@unique([productId, userId])
  @@index([productId, rating])
  @@map("review")
}

model ProductPrice {
  id             String    @id @default(uuid(7)) @db.Uuid
  productId      String    @db.Uuid
  product        Product   @relation(fields: [productId], references: [id], onDelete: Cascade)
  currency       String
  amount         Int
  compareAtPrice Int?
  country        String?
  region         String?
  startsAt       DateTime?
  endsAt         DateTime?

  @@map("product_price")
}

model ProductView {
  id        String @id @default(uuid(7)) @db.Uuid
  productId String @db.Uuid
  sessionId String?
  userId    String? @db.Uuid
  viewedAt  DateTime @default(now())
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  user      User?   @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([productId, viewedAt])
  @@map("product_views")
}

model Product_Availability_Projection {
  productId   String   @id @default(uuid(7)) @db.Uuid
  product     Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  isAvailable Boolean  @default(false)
  updatedAt   DateTime @updatedAt

  @@map("product_availability_projection")
}

enum ProductStatus {
  ACTIVE
  DRAFT
  PUBLISHED
  ARCHIVED
  OUT_OF_STOCK
  DISCONTINUED
}

// ============================================================
// 4. THÈME : STOCK & INVENTAIRE
// ============================================================

model Stock {
  id             String   @id @default(uuid()) @db.Uuid
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
  movements StockMovement[]

  @@index([productId])
  @@index([quantity])
  @@index([warehouse])
  @@map("stocks")
}

model StockMovement {
  id        String            @id @default(uuid()) @db.Uuid
  stockId   String            @db.Uuid
  type      StockMovementType
  quantity  Int
  delta     Int
  reason    String?
  orderId   String?           @db.Uuid
  userId    String?           @db.Uuid
  createdAt DateTime          @default(now())
  
  stock Stock @relation(fields: [stockId], references: [id], onDelete: Cascade)
  user  User? @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([stockId])
  @@index([type])
  @@index([orderId])
  @@index([createdAt])
  @@map("stock_movements")
}

enum StockMovementType {
  IN
  OUT
  ADJUSTMENT
  RESERVATION
  RELEASE
  RETURN
}

model InventoryTransaction {
  id          String          @id @default(uuid(7)) @db.Uuid
  productId   String          @db.Uuid
  product     Product         @relation(fields: [productId], references: [id], onDelete: Cascade)
  variantId   String?         @db.Uuid
  variant     ProductVariant? @relation(fields: [variantId], references: [id], onDelete: Cascade)
  quantity    Int
  reason      TransactionType
  referenceId String?
  warehouseId String?
  performedBy String?         @db.Uuid
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt

  @@index([productId, variantId, createdAt])
  @@map("inventory_transaction")
}

enum TransactionType {
  RESTOCK
  SALE
  RETURN
  SHRINKAGE
}

model InventorySnapshot {
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

model StockReservation {
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

// ============================================================
// 5. THÈME : PANIER & COMMANDES
// ============================================================

model Cart {
  id           String   @id @default(uuid(7)) @db.Uuid
  userId       String?  @unique @db.Uuid
  sessionToken String?  @unique
  expiresAt    DateTime
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  user           User?           @relation(fields: [userId], references: [id])
  items          CartItem[]
  abandonedCarts AbandonedCart[]

  @@index([expiresAt])
  @@map("cart")
}

model CartItem {
  id                 String         @id @default(uuid(7)) @db.Uuid
  cartId             String         @db.Uuid
  cart               Cart           @relation(fields: [cartId], references: [id], onDelete: Cascade)
  variantId          String         @db.Uuid
  variant            ProductVariant @relation(fields: [variantId], references: [id], onDelete: Cascade)
  quantity           Int            @default(1)
  snapshotPriceAtAdd Json?
  createdAt          DateTime       @default(now())
  updatedAt          DateTime       @updatedAt

  @@unique([cartId, variantId])
  @@index([cartId])
  @@map("cart_item")
}

model AbandonedCart {
  id        String   @id @default(uuid(7)) @db.Uuid
  cartId    String   @unique @db.Uuid
  cart      Cart     @relation(fields: [cartId], references: [id], onDelete: Cascade)
  userId    String?  @db.Uuid
  user      User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
  expiresAt DateTime
  createdAt DateTime @default(now())
  updatedAt DateTime

  @@map("abandoned_cart")
}

model Order {
  id             String          @id @default(uuid(7)) @db.Uuid
  orderNumber    String          @unique
  userId         String?         @db.Uuid
  user           User?           @relation(fields: [userId], references: [id], onDelete: SetNull)
  status         OrderStatusEnum @default(PENDING)
  subtotalAmount Int
  taxAmount      Int
  discountAmount Int
  grandTotal     Int
  shippingCost   Int             @default(0)
  totalAmount    Int
  currency       String          @default("USD") @db.VarChar(3)
  billingMethodId  String?       @db.Uuid
  billingMethod    BillingMethod? @relation(fields: [billingMethodId], references: [id])
  shippingMethodId String?       @db.Uuid
  shippingMethod   ShippingMethod? @relation(fields: [shippingMethodId], references: [id])
  trackingNumber  String?
  cinetpayTransId String? @unique
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  paidAt          DateTime @default(now())
  couponId        String? @db.Uuid
  coupon          Coupon? @relation(fields: [couponId], references: [id])
  
  items                  OrderItem[]
  payment                Payment?
  shipment               Shipment?
  orderStatusHistories   OrderStatusHistory[]
  couponUsage            CouponUsage?
  giftCardRedemptions    GiftCardRedemption[]
  returns                Return[]
  refundItems            RefundItem[]
  orderAddresses         OrderAddress[]
  stockReservations      StockReservation[]
  invoice                Invoice?

  @@index([userId, createdAt])
  @@index([status, createdAt])
  @@map("order")
}

model OrderItem {
  id             String         @id @default(uuid(7)) @db.Uuid
  orderId        String         @db.Uuid
  order          Order          @relation(fields: [orderId], references: [id], onDelete: Cascade)
  productId      String         @db.Uuid
  product        Product        @relation(fields: [productId], references: [id], onDelete: Restrict)
  variantId      String         @db.Uuid
  variant        ProductVariant @relation(fields: [variantId], references: [id], onDelete: Restrict)
  productName    String
  variantSku     String
  productImage   String?
  attributes     Json?
  quantity       Int
  unitPrice      Int
  subtotal       Int
  taxAmount      Int?
  discountAmount Int?
  currency       String?
  exchangeRate   Decimal?       @db.Decimal(10, 4)
  returnItems    ReturnItem[]

  @@index([orderId])
  @@map("order_item")
}

model OrderStatus {
  id                   String               @id @default(uuid(7)) @db.Uuid
  status               String               @unique
  label                String
  description          String?
  color                String
  whoCanSet            String[]
  requiredPermission   String
  minRoleLevel         Int
  isTerminal           Boolean              @default(false)
  triggersNotification Boolean              @default(true)
  createdAt            DateTime             @default(now())
  updatedAt            DateTime             @updatedAt
  histories            OrderStatusHistory[]

  @@map("order_status")
}

model OrderStatusHistory {
  id            String      @id @default(uuid(7)) @db.Uuid
  orderId       String      @db.Uuid
  order         Order       @relation(fields: [orderId], references: [id], onDelete: Cascade)
  status        OrderStatus @relation(fields: [orderStatusId], references: [id])
  note          String?     @db.Text
  createdAt     DateTime    @default(now())
  orderStatusId String      @db.Uuid

  @@index([orderId, createdAt])
  @@map("order_status_history")
}

model OrderAddress {
  id        String   @id @default(uuid(7)) @db.Uuid
  orderId   String   @db.Uuid
  order     Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  street    String
  commune   String
  city      String   @default("Kinshasa")
  country   String   @default("RDC")
  phone     String
  createdAt DateTime @default(now())

  @@index([orderId])
  @@map("order_address")
}

enum OrderStatusEnum {
  PENDING
  CONFIRMED
  PROCESSING
  SHIPPED
  DELIVERED
  CANCELLED
  REFUNDED
}

// ============================================================
// 6. THÈME : PAIEMENTS & FACTURATION
// ============================================================

model Payment {
  id            String            @id @default(uuid(7)) @db.Uuid
  orderId       String            @unique @db.Uuid
  order         Order             @relation(fields: [orderId], references: [id], onDelete: Cascade)
  amount        Int
  currency      String            @default("USD") @db.VarChar(3)
  status        PaymentStatus     @default(PENDING)
  method        PaymentMethodType @default(CINETPAY)
  transactionId String?           @unique
  paidAt        DateTime?
  createdAt     DateTime          @default(now())
  updatedAt     DateTime          @updatedAt
  
  attempts PaymentAttempt[]
  refund   Refund?

  @@map("payment")
}

model PaymentAttempt {
  id        String             @id @default(uuid(7)) @db.Uuid
  paymentId String             @db.Uuid
  payment   Payment            @relation(fields: [paymentId], references: [id], onDelete: Cascade)
  amount    Int
  status    PaymentStatus      @default(PENDING)
  method    PaymentMethodType?
  createdAt DateTime           @default(now())

  @@index([paymentId, createdAt])
  @@map("payment_attempt")
}

enum PaymentStatus {
  PENDING
  COMPLETED
  FAILED
  REFUNDED
}

enum PaymentMethodType {
  CINETPAY
  MPESA
  ORANGE_MONEY
  AIRTEL_MONEY
  CASH_ON_DELIVERY
}

model BillingMethod {
  id            String  @id @default(uuid(7)) @db.Uuid
  name          String
  paymentMethod String?
  orders        Order[]

  @@map("billing_method")
}

model Invoice {
  id            String   @id @default(uuid(7)) @db.Uuid
  orderId       String   @unique @db.Uuid
  order         Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  invoiceNumber String   @unique
  issueDate     DateTime @default(now())
  dueDate       DateTime
  amountDue     Int
  currency      String   @default("USD") @db.VarChar(3)
  status        String
  pdfUrl        String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([invoiceNumber])
  @@map("invoice")
}

// ============================================================
// 7. THÈME : EXPÉDITION & LOGISTIQUE
// ============================================================

model ShippingMethod {
  id            String     @id @default(uuid(7)) @db.Uuid
  name          String
  description   String?
  price         Int
  freeShipping  Boolean    @default(false)
  metadata      Json       @default("{}")
  minAmount     Int?
  carrier       String?
  estimatedDays String?
  isActive      Boolean    @default(true)
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt
  orders        Order[]
  shipments     Shipment[]

  @@map("shipping_method")
}

model Carrier {
  id        String     @id @default(uuid(7)) @db.Uuid
  name      String     @unique
  code      String     @unique
  contact   String?
  isActive  Boolean    @default(true)
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
  shipments Shipment[]

  @@map("carrier")
}

model Shipment {
  id               String          @id @default(uuid(7)) @db.Uuid
  orderId          String          @unique @db.Uuid
  order            Order           @relation(fields: [orderId], references: [id], onDelete: Cascade)
  carrierId        String?         @db.Uuid
  carrier          Carrier?        @relation(fields: [carrierId], references: [id])
  shippingMethodId String?         @db.Uuid
  shippingMethod   ShippingMethod? @relation(fields: [shippingMethodId], references: [id])
  trackingNumber   String?         @unique
  status           ShipmentStatus  @default(PENDING)
  shippedAt        DateTime?
  deliveredAt      DateTime?
  createdAt        DateTime        @default(now())
  updatedAt        DateTime        @updatedAt

  @@map("shipment")
}

enum ShipmentStatus {
  PENDING
  SHIPPED
  IN_TRANSIT
  DELIVERED
  EXCEPTION
}

// ============================================================
// 8. THÈME : RETOURS & REMBOURSEMENTS
// ============================================================

model Return {
  id             String        @id @default(uuid(7)) @db.Uuid
  orderId        String        @db.Uuid
  order          Order         @relation(fields: [orderId], references: [id], onDelete: Cascade)
  reason         String
  status         ReturnStatus  @default(REQUESTED)
  returnReasonId String?       @db.Uuid
  returnReason   ReturnReason? @relation(fields: [returnReasonId], references: [id])
  requestedAt    DateTime      @default(now())
  resolvedAt     DateTime?
  returnItems    ReturnItem[]

  @@map("return")
}

model ReturnItem {
  id             String        @id @default(uuid(7)) @db.Uuid
  returnId       String        @db.Uuid
  return         Return        @relation(fields: [returnId], references: [id], onDelete: Cascade)
  orderItemId    String        @db.Uuid
  orderItem      OrderItem     @relation(fields: [orderItemId], references: [id], onDelete: Restrict)
  quantity       Int           @default(1)
  reason         String
  status         ReturnStatus  @default(REQUESTED)
  returnReasonId String?       @db.Uuid
  returnReason   ReturnReason? @relation(fields: [returnReasonId], references: [id])
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt

  @@index([returnId])
  @@index([orderItemId])
  @@map("return_item")
}

enum ReturnStatus {
  REQUESTED
  APPROVED
  REJECTED
  RECEIVED
  REFUNDED
}

model Refund {
  id             String        @id @default(uuid(7)) @db.Uuid
  paymentId      String        @unique @db.Uuid
  payment        Payment       @relation(fields: [paymentId], references: [id], onDelete: Cascade)
  amount         Int
  reason         String?
  returnReasonId String?       @db.Uuid
  returnReason   ReturnReason? @relation(fields: [returnReasonId], references: [id])
  status         RefundStatus  @default(PENDING)
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt
  refundItems    RefundItem[]

  @@map("refund")
}

model RefundItem {
  id             String        @id @default(uuid(7)) @db.Uuid
  refundId       String        @db.Uuid
  refund         Refund        @relation(fields: [refundId], references: [id], onDelete: Cascade)
  orderId        String        @db.Uuid
  order          Order         @relation(fields: [orderId], references: [id], onDelete: Cascade)
  quantity       Int           @default(1)
  reason         String?
  returnReasonId String?       @db.Uuid
  returnReason   ReturnReason? @relation(fields: [returnReasonId], references: [id])
  status         RefundStatus  @default(PENDING)
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt

  @@index([refundId])
  @@map("refund_item")
}

enum RefundStatus {
  PENDING
  COMPLETED
  FAILED
}

model ReturnReason {
  id          String       @id @default(uuid(7)) @db.Uuid
  reason      String       @unique
  description String?
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  returns     Return[]
  returnItems ReturnItem[]
  refunds     Refund[]
  refundItems RefundItem[]

  @@map("return_reason")
}

// ============================================================
// 9. THÈME : PROMOTIONS & FIDÉLITÉ
// ============================================================

model Coupon {
  id            String       @id @default(uuid(7)) @db.Uuid
  code          String       @unique
  discountType  DiscountType
  discountValue Int
  minOrderValue Int?
  expiresAt     DateTime
  isActive      Boolean      @default(true)
  usageLimit    Int?
  usageCount    Int          @default(0)
  createdAt     DateTime     @default(now())
  
  orders       Order[]
  couponUsages CouponUsage[]
  products     Product[]

  @@map("coupon")
}

model CouponUsage {
  id       String   @id @default(uuid(7)) @db.Uuid
  couponId String   @db.Uuid
  coupon   Coupon   @relation(fields: [couponId], references: [id], onDelete: Cascade)
  userId   String   @db.Uuid
  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  orderId  String   @unique @db.Uuid
  order    Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  usedAt   DateTime @default(now())

  @@unique([couponId, userId, orderId])
  @@index([couponId])
  @@index([userId])
  @@index([orderId])
  @@map("coupon_usage")
}

enum DiscountType {
  PERCENTAGE
  FIXED_AMOUNT
}

model GiftCard {
  id             String               @id @default(uuid(7)) @db.Uuid
  code           String               @unique
  initialBalance Int
  balance        Int
  expiresAt      DateTime?
  isActive       Boolean              @default(true)
  createdAt      DateTime             @default(now())
  updatedAt      DateTime             @updatedAt
  redemptions    GiftCardRedemption[]

  @@map("gift_card")
}

model GiftCardRedemption {
  id         String   @id @default(uuid(7)) @db.Uuid
  giftCardId String   @db.Uuid
  giftCard   GiftCard @relation(fields: [giftCardId], references: [id], onDelete: Cascade)
  orderId    String   @db.Uuid
  order      Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  amount     Int
  createdAt  DateTime @default(now())

  @@index([giftCardId])
  @@map("gift_card_redemption")
}

// ============================================================
// 10. THÈME : LISTE DE SOUHAITS
// ============================================================

model Wishlist {
  id        String         @id @default(uuid(7)) @db.Uuid
  userId    String         @unique @db.Uuid
  user      User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime       @default(now())
  updatedAt DateTime       @updatedAt
  items     WishlistItem[]

  @@map("wishlist")
}

model WishlistItem {
  id         String   @id @default(uuid(7)) @db.Uuid
  wishlistId String   @db.Uuid
  wishlist   Wishlist @relation(fields: [wishlistId], references: [id], onDelete: Cascade)
  productId  String   @db.Uuid
  product    Product  @relation(fields: [productId], references: [id], onDelete: Restrict)
  addedAt    DateTime @default(now())

  @@unique([wishlistId, productId])
  @@map("wishlist_item")
}

// ============================================================
// 11. THÈME : ADRESSES
// ============================================================

model Address {
  id        String   @id @default(uuid(7)) @db.Uuid
  userId    String   @db.Uuid
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  label     String?
  street    String
  commune   String
  city      String   @default("Kinshasa")
  country   String   @default("RDC")
  phone     String
  isDefault Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId])
  @@map("address")
}

// ============================================================
// 12. THÈME : TAXES
// ============================================================

model TaxClass {
  id          String    @id @default(uuid(7)) @db.Uuid
  name        String    @unique
  description String?
  products    Product[]
  taxRates    TaxRate[]

  @@map("tax_classes")
}

model TaxRate {
  id         String   @id @default(uuid(7)) @db.Uuid
  taxClassId String   @db.Uuid
  taxClass   TaxClass @relation(fields: [taxClassId], references: [id], onDelete: Cascade)
  country    String   @default("RDC")
  region     String?
  rate       Decimal  @db.Decimal(5, 4)

  @@unique([taxClassId, country, region])
  @@index([taxClassId])
  @@index([country, region])
  @@index([country, region, taxClassId])
  @@map("tax_rate")
}

// ============================================================
// 13. THÈME : FOURNISSEURS & ACHATS
// ============================================================

model Warehouse {
  id             String          @id @default(uuid(7)) @db.Uuid
  name           String
  location       String
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt
  purchaseOrders PurchaseOrder[]

  @@map("warehouse")
}

model Supplier {
  id             String          @id @default(uuid(7)) @db.Uuid
  name           String
  contact        String?
  type           SupplierType    @default(LOCAL)
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt
  purchaseOrders PurchaseOrder[]

  @@map("supplier")
}

model PurchaseOrder {
  id          String    @id @default(uuid(7)) @db.Uuid
  supplierId  String    @db.Uuid
  supplier    Supplier  @relation(fields: [supplierId], references: [id], onDelete: Cascade)
  warehouseId String    @db.Uuid
  warehouse   Warehouse @relation(fields: [warehouseId], references: [id], onDelete: Cascade)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([supplierId, warehouseId])
  @@map("purchase_order")
}

enum SupplierType {
  LOCAL
  INTERNATIONAL
}

// ============================================================
// 14. THÈME : NOTIFICATIONS & ANALYTIQUES
// ============================================================

model Notification {
  id        String   @id @default(uuid(7)) @db.Uuid
  userId    String   @db.Uuid
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  type      String
  title     String
  message   String   @db.Text
  isRead    Boolean  @default(false)
  createdAt DateTime @default(now())

  @@index([userId, createdAt])
  @@map("notification")
}

model SearchAnalytics {
  id        String   @id @default(uuid(7)) @db.Uuid
  userId    String?  @unique @db.Uuid
  user      User?    @relation(fields: [userId], references: [id], onDelete: Cascade)
  searches  Json?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("search_analytics")
}

// ============================================================
// 15. THÈME : DASHBOARD & AUDITS
// ============================================================

model Dashboard {
  id        String   @id @default(uuid(7)) @db.Uuid
  name      String
  userId    String   @db.Uuid
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("dashboard")
}

model AuditLog {
  id         String  @id @default(uuid(7)) @db.Uuid
  userId     String  @db.Uuid
  user       User?   @relation(fields: [userId], references: [id], onDelete: Cascade)
  roleLevel  Int     @default(0)
  action     String
  targetId   String? @db.Uuid
  targetType String?
  entity     String?
  entityType String?
  entityId   String?
  newValue   Json?
  oldValue   Json?
  metadata   Json?
  ip         String?
  details    String?
  ipAddress  String?
  userAgent  String?
  location   String?
  browser    String?
  os         String?
  device     String?
  referrer   String?
  screenRes  String?
  duration   Int?
  status     String?
  error      String?
  payload    Json?
  response   Json?
  context    Json?
  sessionId  String?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@index([userId])
  @@index([action])
  @@index([entity])
  @@index([createdAt])
  @@index([targetId, targetType])
  @@map("audit_log")
}

// ============================================================
// 16. THÈME : CONFIGURATION & SÉCURITÉ
// ============================================================

model AppConfig {
  id                    String   @id @default(uuid(7)) @db.Uuid
  usdToCdfRate          Decimal  @db.Decimal(12, 4)
  exchangeRateSource    String
  exchangeRateUpdatedAt DateTime?
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}

model SystemConfiguration {
  id        String   @id @default(uuid(7)) @db.Uuid
  key       String   @unique
  value     String
  updatedAt DateTime @updatedAt
}

model ExchangeRate {
  id            String @id @default(uuid(7)) @db.Uuid
  baseCurrency  String
  quoteCurrency String
  rate          Decimal @db.Decimal(18, 6)
  source        String
  effectiveAt   DateTime
  createdAt     DateTime @default(now())

  @@index([baseCurrency, quoteCurrency])
  @@index([effectiveAt])
}

model NewsletterSubscriber {
  id        String   @id @default(uuid(7)) @db.Uuid
  email     String   @unique
  createdAt DateTime @default(now()) @db.Timestamptz(6)
  updatedAt DateTime @updatedAt @db.Timestamptz(6)

  @@map("newsletter_subscriber")
}

model SeoRedirect {
  id         String @id @default(uuid(7)) @db.Uuid
  fromPath   String @unique
  toPath     String
  statusCode Int    @default(301)
  createdAt  DateTime @default(now())

  @@map("seo_redirects")
}

model IdempotencyKey {
  id          String            @id @default(uuid(7)) @db.Uuid
  key         String            @unique
  scope       String
  status      IdempotencyStatus @default(PENDING)
  userId      String?
  method      String?
  route       String?
  requestHash String
  responseBody Json?
  errorBody   Json?
  metadata    Json?
  retryCount  Int               @default(0)
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt
  lockedAt    DateTime          @default(now())
  completedAt DateTime?
  expiresAt   DateTime?

  @@index([scope])
  @@index([status])
  @@index([expiresAt])
  @@index([userId])
  @@index([key])
  @@map("idempotency_key")
}

enum IdempotencyStatus {
  PENDING
  COMPLETED
  FAILED
}

// ============================================================
// 17. THÈME : MÉDIAS & STOCKAGE
// ============================================================

model Media {
  id         String   @id @default(uuid(7)) @db.Uuid
  name       String
  url        String
  mimeType   String
  sizeBytes  Int      @default(0)
  bucket     String
  type       String?
  metadata   Json?
  uploadedBy String?  @db.Uuid
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@index([bucket])
  @@index([mimeType])
  @@index([createdAt])
  @@map("media")
}

// ============================================================
// 18. THÈME : CONFIGURATIONS MÉTIER (POLICIES)
// ============================================================

model AuditApprovalRequest {
  id                     String    @id @default(uuid(7)) @db.Uuid
  requesterId            String
  requesterRole          String
  requesterLevel         Int
  targetRole             String
  targetLevel            Int
  reason                 String
  status                 String
  approvedById           String?
  approvedByRole         String?
  approvalToken          String?   @unique
  approvalTokenExpiresAt DateTime?
  expiresAt              DateTime
  createdAt              DateTime  @default(now())
  updatedAt              DateTime  @updatedAt

  @@index([requesterId, status])
  @@index([status, expiresAt])
  @@index([approvalToken])
  @@map("audit_approval_request")
}

model AuditApprovalPolicy {
  id                        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  policyName                String   @unique
  label                     String
  description               String?
  approvalTokenTtlMinutes   Int
  requestTtlMinutes         Int
  whoCanApprove             String[]
  requiredPermissionApprove String
  minRoleLevelApprove       Int
  requiresDualApproval      Boolean  @default(false)
  isActive                  Boolean  @default(true)
  createdAt                 DateTime @default(now())
  updatedAt                 DateTime @updatedAt

  @@index([policyName, isActive, createdAt])
  @@index([isActive, createdAt])
  @@index([policyName])
  @@map("audit_approval_policy")
}

model AuditEventType {
  id                       String   @id @default(uuid(7)) @db.Uuid
  event                    String   @unique
  label                    String
  description              String?
  severity                 String
  whoCanView               String[]
  whoCanDelete             String[]
  requiredPermissionView   String
  requiredPermissionDelete String
  minRoleLevelView         Int
  minRoleLevelDelete       Int
  retentionDays            Int
  isImmutable              Boolean  @default(true)
  createdAt                DateTime @default(now())
  updatedAt                DateTime @updatedAt

  @@index([event, severity, createdAt])
  @@map("audit_event_type")
}

model RetentionPolicy {
  id              String   @id @default(uuid(7)) @db.Uuid
  policyName      String   @unique
  label           String
  description     String?
  retentionDays   Int
  whoCanConfigure String[]
  minRoleLevel    Int
  autoArchive     Boolean  @default(true)
  autoDelete      Boolean  @default(false)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@map("retention_policy")
}

model FinancialThreshold {
  id                         String   @id @default(uuid(7)) @db.Uuid
  thresholdName              String   @unique
  label                      String
  description                String?
  amount                     Int
  currency                   String   @default("USD")
  whoCanOverride             String[]
  requiredPermissionOverride String
  minRoleLevelOverride       Int
  triggersAlert              Boolean  @default(true)
  alertRecipients            String[]
  createdAt                  DateTime @default(now())
  updatedAt                  DateTime @updatedAt

  @@map("financial_threshold")
}

model MediaTypeConfig {
  id                       String   @id @default(uuid(7)) @db.Uuid
  mediaType                String   @unique
  label                    String
  description              String?
  allowedExtensions        String[]
  maxFileSize              Int
  maxDimensions            Json?
  whoCanUpload             String[]
  whoCanDelete             String[]
  requiredPermissionUpload String
  requiredPermissionDelete String
  minRoleLevelUpload       Int
  minRoleLevelDelete       Int
  storageBucket            String
  isPublic                 Boolean  @default(true)
  requiresCompression      Boolean  @default(true)
  createdAt                DateTime @default(now())
  updatedAt                DateTime @updatedAt

  @@map("media_type_config")
}

model StorageQuota {
  id                    String   @id @default(uuid(7)) @db.Uuid
  quotaName             String   @unique
  label                 String
  description           String?
  maxStorageMB          Int
  maxFiles              Int
  whoCanConfigure       String[]
  minRoleLevelConfigure Int
  appliesToRoles        String[]
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@map("storage_quota")
}

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
  createdAt                DateTime @default(now())
  updatedAt                DateTime @updatedAt

  @@index([type])
  @@map("product_type_config")
}

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

model PaymentMethodConfig {
  id                          String   @id @default(uuid(7)) @db.Uuid
  method                      String   @unique
  label                       String
  description                 String?
  provider                    String
  isActive                    Boolean  @default(true)
  whoCanConfigure             String[]
  whoCanViewTransactions      String[]
  requiredPermissionConfigure String
  requiredPermissionView      String
  minRoleLevelConfigure       Int
  minRoleLevelView            Int
  requiresApproval            Boolean  @default(false)
  maxTransactionAmount        Int
  currency                    String   @default("USD")
  createdAt                   DateTime @default(now())
  updatedAt                   DateTime @updatedAt

  @@map("payment_method_config")
}

model PaymentWebhookEvent {
  id          String    @id @default(uuid(7)) @db.Uuid
  provider    String
  eventType   String
  payload     Json
  processed   Boolean   @default(false)
  processedAt DateTime?
  signature   String?
  verified    Boolean   @default(false)
  error       String?   @db.Text
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([provider, eventType])
  @@map("payment_webhook_event")
}

model CheckoutStep {
  id                 String   @id @default(uuid(7)) @db.Uuid
  step               String   @unique
  label              String
  description        String?
  requiredPermission String
  minRoleLevel       Int
  isGuestAllowed     Boolean  @default(false)
  requiresAuth       Boolean  @default(true)
  displayOrder       Int      @default(0)
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  @@index([displayOrder])
  @@map("checkout_step")
}

model WishlistConfig {
  id                 String   @id @default(uuid(7)) @db.Uuid
  feature            String   @unique
  label              String
  description        String?
  requiredPermission String
  minRoleLevel       Int
  maxItems           Int
  isSharedAllowed    Boolean  @default(false)
  requiresAuth       Boolean  @default(true)
  managedByRoles     String[]
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  @@index([feature])
  @@index([requiredPermission, minRoleLevel])
  @@index([isSharedAllowed])
  @@index([requiresAuth])
  @@index([maxItems])
  @@map("wishlist_config")
}

model VideoTypeConfig {
  id                         String   @id @default(uuid(7)) @db.Uuid
  videoType                  String   @unique
  label                      String
  description                String?
  allowedFormats             String[]
  maxDuration                Int
  maxFileSize                Int
  maxResolution              String
  whoCanUpload               String[]
  whoCanModerate             String[]
  whoCanDelete               String[]
  requiredPermissionUpload   String
  requiredPermissionModerate String
  requiredPermissionDelete   String
  minRoleLevelUpload         Int
  minRoleLevelModerate       Int
  minRoleLevelDelete         Int
  autoTranscode              Boolean  @default(true)
  generateThumbnails         Boolean  @default(true)
  isPublicByDefault          Boolean  @default(true)
  requiresApproval           Boolean  @default(true)
  createdAt                  DateTime @default(now())
  updatedAt                  DateTime @updatedAt

  @@map("video_type_config")
}

model StreamingConfig {
  id                 String   @id @default(uuid(7)) @db.Uuid
  configName         String   @unique
  label              String
  description        String?
  provider           String
  whoCanConfigure    String[]
  requiredPermission String
  minRoleLevel       Int
  isActive           Boolean  @default(false)
  settings           Json     @default("{}")
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  @@map("streaming_config")
}