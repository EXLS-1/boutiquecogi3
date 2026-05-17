// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
}

// =====================================================
// ENUMS GLOBAUX
// =====================================================

enum Role {
  USER
  ADMIN
  SUPER_ADMIN
  SUPPORT
}

enum CurrencyCode {
  USD
  CDF
}

enum ProductStatus {
  DRAFT
  ACTIVE
  OUT_OF_STOCK
  ARCHIVED
}

enum VerificationType {
  EMAIL_VERIFICATION
  PASSWORD_RESET
  MAGIC_LINK
  TWO_FACTOR
}

enum InventoryTransactionType {
  RESTOCK
  SALE
  RETURN
  SHRINKAGE
  ADJUSTMENT
  TRANSFER
}

// =====================================================
// AUTHENTIFICATION / BETTER-AUTH
// =====================================================

model User {
  id               String      @id  @db.Uuid
  name             String?
  email            String?     @unique
  emailVerified    DateTime?
  passwordHash     String?     @db.Text
  image            String?
  role             Role        @default(USER)

  isActive         Boolean     @default(true)
  isBlocked        Boolean     @default(false)
  lastLoginAt      DateTime?

  createdAt        DateTime    @default(now())
  updatedAt        DateTime    @updatedAt
  deletedAt        DateTime?

  sessions         Session[]
  accounts         Account[]
  addresses        Address[]
  reviews          Review[]
  orders           Order[]
  notifications    Notification[]
  wishlist         Wishlist?
  cart             Cart?
  auditLogs        AuditLog[]

  @@index([email])
  @@index([role])
  @@map("users")
}

model Session {
  id            String   @id  @db.Uuid
  userId        String   @db.Uuid
  token         String   @unique
  ipAddress     String?
  userAgent     String?
  expiresAt     DateTime

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([expiresAt])
  @@map("sessions")
}

model Account {
  id                 String   @id  @db.Uuid
  userId             String   @db.Uuid
  provider           String
  providerAccountId  String

  accessToken        String?  @db.Text
  refreshToken       String?  @db.Text
  expiresAt          Int?

  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  user               User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@index([userId])
  @@map("accounts")
}

model VerificationToken {
  id          String            @id  @db.Uuid
  identifier  String
  token       String            @unique
  type        VerificationType
  expiresAt   DateTime
  consumedAt  DateTime?

  createdAt   DateTime          @default(now())

  @@index([identifier])
  @@map("verification_tokens")
}

model AuditLog {
  id            String    @id  @db.Uuid
  userId        String?   @db.Uuid

  action        String
  entity        String
  entityId      String?

  metadata      Json?
  ipAddress     String?
  userAgent     String?

  createdAt     DateTime  @default(now())

  user          User?     @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([userId, createdAt])
  @@index([entity, entityId])
  @@map("audit_logs")
}

// =====================================================
// ADRESSES
// =====================================================

model Address {
  id             String   @id  @db.Uuid
  userId         String   @db.Uuid

  label          String?
  fullName       String
  phone          String

  street         String
  commune        String
  city           String   @default("Kinshasa")
  province       String?
  country        String   @default("RDC")
  postalCode     String?

  isDefault      Boolean  @default(false)

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("addresses")
}

// =====================================================
// CATALOGUE PRODUITS
// =====================================================

model Category {
  id               String      @id  @db.Uuid
  parentId         String?     @db.Uuid

  name             String
  slug             String      @unique
  description      String?     @db.Text

  seoTitle         String?
  seoDescription   String?     @db.Text

  isActive         Boolean     @default(true)

  createdAt        DateTime    @default(now())
  updatedAt        DateTime    @updatedAt

  parent           Category?   @relation("CategoryTree", fields: [parentId], references: [id])
  children         Category[]  @relation("CategoryTree")

  products         Product[]

  @@index([parentId])
  @@map("categories")
}

model Brand {
  id            String      @id  @db.Uuid
  name          String      @unique
  slug          String      @unique
  logoUrl       String?

  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  products      Product[]

  @@map("brands")
}

model Product {
  id                  String                   @id  @db.Uuid
  categoryId          String?                  @db.Uuid
  brandId             String?                  @db.Uuid

  name                String
  slug                String                   @unique
  shortDescription    String?
  description         String                   @db.Text

  sku                 String                   @unique
  barcode             String?

  status              ProductStatus            @default(DRAFT)

  currency            CurrencyCode             @default(USD)
  basePrice           Int
  compareAtPrice      Int?

  costPrice           Int?

  weightGrams         Int?
  widthCm             Decimal?                 @db.Decimal(8,2)
  heightCm            Decimal?                 @db.Decimal(8,2)
  lengthCm            Decimal?                 @db.Decimal(8,2)

  seoTitle            String?
  seoDescription      String?                  @db.Text

  isFeatured          Boolean                  @default(false)
  requiresShipping    Boolean                  @default(true)

  publishedAt         DateTime?

  createdAt           DateTime                 @default(now())
  updatedAt           DateTime                 @updatedAt
  deletedAt           DateTime?

  category            Category?                @relation(fields: [categoryId], references: [id], onDelete: SetNull)
  brand               Brand?                   @relation(fields: [brandId], references: [id], onDelete: SetNull)

  variants            ProductVariant[]
  images              ProductImage[]
  reviews             Review[]
  tags                ProductTag[]

  @@index([categoryId])
  @@index([brandId])
  @@index([status])
  @@index([slug])
  @@map("products")
}

model ProductVariant {
  id                String               @id  @db.Uuid
  productId         String               @db.Uuid

  name              String?
  sku               String               @unique
  barcode           String?

  attributes        Json

  price             Int
  compareAtPrice    Int?
  costPrice         Int?

  weightGrams       Int?

  isDefault         Boolean              @default(false)
  isActive          Boolean              @default(true)

  createdAt         DateTime             @default(now())
  updatedAt         DateTime             @updatedAt

  product           Product              @relation(fields: [productId], references: [id], onDelete: Cascade)

  cartItems         CartItem[]
  orderItems        OrderItem[]
  inventoryItems    InventoryItem[]
  inventoryLogs     InventoryTransaction[]

  @@index([productId])
  @@map("product_variants")
}

model ProductImage {
  id              String      @id  @db.Uuid
  productId       String      @db.Uuid

  url             String
  alt             String?
  position        Int         @default(0)

  createdAt       DateTime    @default(now())

  product         Product     @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@index([productId])
  @@map("product_images")
}

model Tag {
  id            String        @id  @db.Uuid
  name          String        @unique
  slug          String        @unique

  products      ProductTag[]

  @@map("tags")
}

model ProductTag {
  productId     String        @db.Uuid
  tagId         String        @db.Uuid

  product       Product       @relation(fields: [productId], references: [id], onDelete: Cascade)
  tag           Tag           @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([productId, tagId])
  @@map("product_tags")
}

model Review {
  id                    String      @id  @db.Uuid
  productId             String      @db.Uuid
  userId                String      @db.Uuid

  rating                Int         @db.SmallInt
  title                 String?
  comment               String?     @db.Text

  isVerifiedPurchase    Boolean     @default(false)
  isPublished           Boolean     @default(true)

  createdAt             DateTime    @default(now())
  updatedAt             DateTime    @updatedAt

  product               Product     @relation(fields: [productId], references: [id], onDelete: Cascade)
  user                  User        @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([productId, userId])
  @@index([productId, rating])
  @@map("reviews")
}

// =====================================================
// INVENTAIRE
// =====================================================

model Warehouse {
  id              String                   @id  @db.Uuid

  name            String
  code            String                   @unique
  address         String

  isActive        Boolean                  @default(true)

  createdAt       DateTime                 @default(now())
  updatedAt       DateTime                 @updatedAt

  inventoryItems  InventoryItem[]

  @@map("warehouses")
}

model InventoryItem {
  id              String             @id  @db.Uuid
  warehouseId     String             @db.Uuid
  variantId       String             @db.Uuid

  availableQty    Int                @default(0)
  reservedQty     Int                @default(0)

  reorderLevel    Int                @default(0)

  createdAt       DateTime           @default(now())
  updatedAt       DateTime           @updatedAt

  warehouse       Warehouse          @relation(fields: [warehouseId], references: [id], onDelete: Cascade)
  variant         ProductVariant     @relation(fields: [variantId], references: [id], onDelete: Cascade)

  @@unique([warehouseId, variantId])
  @@index([variantId])
  @@map("inventory_items")
}

model InventoryTransaction {
  id              String                      @id  @db.Uuid
  variantId       String                      @db.Uuid
  warehouseId     String?                     @db.Uuid

  type            InventoryTransactionType
  quantity        Int

  reference       String?
  note            String?

  createdAt       DateTime                    @default(now())

  variant         ProductVariant              @relation(fields: [variantId], references: [id], onDelete: Cascade)
  warehouse       Warehouse?                  @relation(fields: [warehouseId], references: [id], onDelete: SetNull)

  @@index([variantId, createdAt])
  @@map("inventory_transactions")
}

// =====================================================
// PANIER
// =====================================================

model Cart {
  id              String          @id  @db.Uuid

  userId          String?         @unique @db.Uuid
  sessionToken    String?         @unique

  expiresAt       DateTime

  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  user            User?           @relation(fields: [userId], references: [id], onDelete: Cascade)

  items           CartItem[]

  @@index([expiresAt])
  @@map("carts")
}

model CartItem {
  id              String             @id  @db.Uuid
  cartId          String             @db.Uuid
  variantId       String             @db.Uuid

  quantity        Int                @default(1)

  snapshotPrice   Int
  currency        CurrencyCode       @default(USD)

  createdAt       DateTime           @default(now())
  updatedAt       DateTime           @updatedAt

  cart            Cart               @relation(fields: [cartId], references: [id], onDelete: Cascade)
  variant         ProductVariant     @relation(fields: [variantId], references: [id], onDelete: Cascade)

  @@unique([cartId, variantId])
  @@map("cart_items")
}

// =====================================================
// COMMANDES
// =====================================================

enum OrderStatus {
  PENDING
  CONFIRMED
  PROCESSING
  SHIPPED
  DELIVERED
  CANCELLED
  REFUNDED
}

model Order {
  id                  String            @id  @db.Uuid
  userId              String?           @db.Uuid

  orderNumber         String            @unique

  status              OrderStatus       @default(PENDING)

  currency            CurrencyCode      @default(USD)

  subtotalAmount      Int
  taxAmount           Int               @default(0)
  shippingAmount      Int               @default(0)
  discountAmount      Int               @default(0)
  totalAmount         Int

  customerEmail       String?
  customerPhone       String?

  notes               String?           @db.Text

  placedAt            DateTime?

  createdAt           DateTime          @default(now())
  updatedAt           DateTime          @updatedAt

  user                User?             @relation(fields: [userId], references: [id], onDelete: SetNull)

  items               OrderItem[]
  payments            Payment[]
  shipments           Shipment[]
  statusHistory       OrderStatusHistory[]
  addresses           OrderAddress[]

  @@index([userId, createdAt])
  @@index([status])
  @@map("orders")
}

model OrderItem {
  id                  String             @id  @db.Uuid
  orderId             String             @db.Uuid
  variantId           String?            @db.Uuid

  productName         String
  variantName         String?
  sku                 String

  quantity            Int

  currency            CurrencyCode       @default(USD)

  unitPrice           Int
  subtotal            Int

  taxAmount           Int                @default(0)
  discountAmount      Int                @default(0)

  attributesSnapshot  Json?

  createdAt           DateTime           @default(now())

  order               Order              @relation(fields: [orderId], references: [id], onDelete: Cascade)
  variant             ProductVariant?    @relation(fields: [variantId], references: [id], onDelete: SetNull)

  @@index([orderId])
  @@map("order_items")
}

model OrderAddress {
  id              String        @id  @db.Uuid
  orderId         String        @db.Uuid

  type            String

  fullName        String
  phone           String

  street          String
  commune         String
  city            String
  province        String?
  country         String

  createdAt       DateTime      @default(now())

  order           Order         @relation(fields: [orderId], references: [id], onDelete: Cascade)

  @@index([orderId])
  @@map("order_addresses")
}

model OrderStatusHistory {
  id              String          @id  @db.Uuid
  orderId         String          @db.Uuid

  status          OrderStatus
  note            String?

  createdAt       DateTime        @default(now())

  order           Order           @relation(fields: [orderId], references: [id], onDelete: Cascade)

  @@index([orderId, createdAt])
  @@map("order_status_history")
}

// =====================================================
// PAIEMENTS
// =====================================================

enum PaymentMethodType {
  CINETPAY
  MPESA
  ORANGE_MONEY
  AIRTEL_MONEY
  CASH_ON_DELIVERY
}

enum PaymentStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
  CANCELLED
  REFUNDED
}

model Payment {
  id                  String               @id  @db.Uuid
  orderId             String               @db.Uuid

  method              PaymentMethodType
  status              PaymentStatus        @default(PENDING)

  currency            CurrencyCode         @default(USD)
  amount              Int

  providerTransactionId String?
  providerReference     String?

  providerPayload       Json?

  paidAt              DateTime?

  createdAt           DateTime             @default(now())
  updatedAt           DateTime             @updatedAt

  order               Order                @relation(fields: [orderId], references: [id], onDelete: Cascade)

  attempts            PaymentAttempt[]

  @@index([orderId])
  @@index([status])
  @@map("payments")
}

model PaymentAttempt {
  id              String               @id  @db.Uuid
  paymentId       String               @db.Uuid

  status          PaymentStatus
  response        Json?

  createdAt       DateTime             @default(now())

  payment         Payment              @relation(fields: [paymentId], references: [id], onDelete: Cascade)

  @@index([paymentId])
  @@map("payment_attempts")
}

model PaymentWebhookEvent {
  id              String      @id  @db.Uuid

  provider        String
  eventType       String

  payload         Json

  signature       String?

  verified        Boolean     @default(false)
  processed       Boolean     @default(false)

  error           String?

  createdAt       DateTime    @default(now())

  @@index([provider, eventType])
  @@map("payment_webhook_events")
}

// =====================================================
// LIVRAISON
// =====================================================

enum ShipmentStatus {
  PENDING
  PREPARING
  SHIPPED
  IN_TRANSIT
  DELIVERED
  FAILED
  RETURNED
}

model ShippingMethod {
  id                String          @id  @db.Uuid

  name              String
  description       String?

  price             Int

  estimatedDaysMin  Int?
  estimatedDaysMax  Int?

  isActive          Boolean         @default(true)

  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt

  shipments         Shipment[]

  @@map("shipping_methods")
}

model Carrier {
  id                String          @id  @db.Uuid

  name              String          @unique
  code              String          @unique

  trackingUrl       String?

  isActive          Boolean         @default(true)

  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt

  shipments         Shipment[]

  @@map("carriers")
}

model Shipment {
  id                String            @id  @db.Uuid
  orderId           String            @db.Uuid
  shippingMethodId  String?           @db.Uuid
  carrierId         String?           @db.Uuid

  trackingNumber    String?

  status            ShipmentStatus    @default(PENDING)

  shippedAt         DateTime?
  deliveredAt       DateTime?

  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt

  order             Order             @relation(fields: [orderId], references: [id], onDelete: Cascade)
  shippingMethod    ShippingMethod?   @relation(fields: [shippingMethodId], references: [id], onDelete: SetNull)
  carrier           Carrier?          @relation(fields: [carrierId], references: [id], onDelete: SetNull)

  @@index([orderId])
  @@index([status])
  @@map("shipments")
}

// =====================================================
// PROMOTIONS
// =====================================================

enum DiscountType {
  PERCENTAGE
  FIXED_AMOUNT
}

model Coupon {
  id                String            @id  @db.Uuid

  code              String            @unique

  type              DiscountType
  value             Int

  minimumAmount     Int?
  maximumDiscount   Int?

  usageLimit        Int?
  usageCount        Int               @default(0)

  startsAt          DateTime?
  expiresAt         DateTime?

  isActive          Boolean           @default(true)

  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt

  usages            CouponUsage[]

  @@index([code])
  @@map("coupons")
}

model CouponUsage {
  id                String            @id  @db.Uuid
  couponId          String            @db.Uuid
  orderId           String            @db.Uuid
  userId            String?           @db.Uuid

  usedAt            DateTime          @default(now())

  coupon            Coupon            @relation(fields: [couponId], references: [id], onDelete: Cascade)
  order             Order             @relation(fields: [orderId], references: [id], onDelete: Cascade)
  user              User?             @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([couponId])
  @@index([userId])
  @@map("coupon_usages")
}

// =====================================================
// RETOURS / REMBOURSEMENTS
// =====================================================

enum ReturnStatus {
  REQUESTED
  APPROVED
  REJECTED
  RECEIVED
  REFUNDED
}

model ReturnRequest {
  id                String            @id  @db.Uuid
  orderId           String            @db.Uuid

  reason            String
  status            ReturnStatus      @default(REQUESTED)

  customerNote      String?           @db.Text
  adminNote         String?           @db.Text

  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt

  order             Order             @relation(fields: [orderId], references: [id], onDelete: Cascade)

  items             ReturnItem[]

  @@index([orderId])
  @@map("return_requests")
}

model ReturnItem {
  id                String            @id  @db.Uuid
  returnRequestId   String            @db.Uuid
  orderItemId       String            @db.Uuid

  quantity          Int

  reason            String?

  createdAt         DateTime          @default(now())

  returnRequest     ReturnRequest     @relation(fields: [returnRequestId], references: [id], onDelete: Cascade)
  orderItem         OrderItem         @relation(fields: [orderItemId], references: [id], onDelete: Cascade)

  @@index([returnRequestId])
  @@map("return_items")
}

model Refund {
  id                String            @id  @db.Uuid
  paymentId         String            @db.Uuid

  amount            Int

  reason            String?

  status            PaymentStatus     @default(PENDING)

  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt

  payment           Payment           @relation(fields: [paymentId], references: [id], onDelete: Cascade)

  @@index([paymentId])
  @@map("refunds")
}

// =====================================================
// WISHLIST
// =====================================================

model Wishlist {
  id                String            @id  @db.Uuid
  userId            String            @unique @db.Uuid

  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt

  user              User              @relation(fields: [userId], references: [id], onDelete: Cascade)

  items             WishlistItem[]

  @@map("wishlists")
}

model WishlistItem {
  id                String            @id  @db.Uuid
  wishlistId        String            @db.Uuid
  productId         String            @db.Uuid

  createdAt         DateTime          @default(now())

  wishlist          Wishlist          @relation(fields: [wishlistId], references: [id], onDelete: Cascade)
  product           Product           @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@unique([wishlistId, productId])
  @@map("wishlist_items")
}

// =====================================================
// NOTIFICATIONS
// =====================================================

model Notification {
  id                String            @id  @db.Uuid
  userId            String            @db.Uuid

  type              String
  title             String
  message           String            @db.Text

  isRead            Boolean           @default(false)

  createdAt         DateTime          @default(now())

  user              User              @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt])
  @@map("notifications")
}

// =====================================================
// ANALYTICS / TRACKING
// =====================================================

model SearchAnalytics {
  id                String            @id  @db.Uuid

  query             String
  resultsCount      Int               @default(0)

  createdAt         DateTime          @default(now())

  @@index([query])
  @@map("search_analytics")
}

model ProductView {
  id                String            @id  @db.Uuid
  productId         String            @db.Uuid

  sessionId         String?
  userId            String?           @db.Uuid

  viewedAt          DateTime          @default(now())

  product           Product           @relation(fields: [productId], references: [id], onDelete: Cascade)
  user              User?             @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([productId, viewedAt])
  @@map("product_views")
}

model SeoRedirect {
  id                String            @id  @db.Uuid

  fromPath          String            @unique
  toPath            String

  statusCode        Int               @default(301)

  createdAt         DateTime          @default(now())

  @@map("seo_redirects")
}


// Architecture monolithique Prisma robuste, cohérente et extensible pour:
// - Next.js 16.2.6
// - Prisma 7.x
// - Better-Auth
// - Supabase Storage
// - CinetPay
// - Tailwind v4
// - Zod
// - Zustand
// - PostgreSQL

