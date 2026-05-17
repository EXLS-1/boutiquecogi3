// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
}

// ==========================================
// AUTHENTIFICATION & UTILISATEURS (BetterAuth)
// ==========================================

model User {
  id               String       @id @unique @default(uuid()) @db.Uuid
  name             String?
  email            String?      @unique
  emailVerified    DateTime?
  password         String?      @db.Text
  image            String?
  role             Role         @default(USER)
  sessions         Session[]
  accounts         Account[]
  orders           Order[]
  posts            Post[]
  dashboards       Dashboard[]
  reviews          Review[]
  addresses        Address[]
  couponUsages     CouponUsage[]
  notifications    Notification[]
  abandonedCarts   AbandonedCart[]
  twoFactorEnabled Boolean      @default(false)
  twoFactorSecret  String?      @db.Text
  twoFactor        TwoFactor[]
  cart             Cart?        // un seul panier par utilisateur (optionnel)
  wishlist         Wishlist?    // une seule liste de souhaits
  searchAnalytics  SearchAnalytics?
  deletedAt        DateTime?

  createdAt        DateTime     @default(now())
  updatedAt        DateTime     @updatedAt

  @@index([email])
  @@map("user")
}

model TwoFactor {
  id         String   @id @default(uuid()) @db.Uuid
  userId     String   @unique @db.Uuid
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  secret     String   @db.Text
  enabled    Boolean  @default(false)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  backupCodes TwoFactorBackupCode[]

  @@map("twofactor")
}

model TwoFactorBackupCode {
  id          String    @id @default(uuid()) @db.Uuid
  twoFactorId String    @db.Uuid
  twoFactor   TwoFactor @relation(fields: [twoFactorId], references: [id], onDelete: Cascade)
  codeHash    String
  used        Boolean   @default(false)

  @@map("twofactor_backup_code")
}

model Post {
  id        String   @id @default(uuid()) @db.Uuid
  title     String
  userId    String
  content   String?
  published Boolean  @default(false)
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("post")
}

model Session {
  id           String   @id @default(uuid()) @db.Uuid
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  ipAddress    String?
  userAgent    String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@index([userId])
  @@map("session")
}

model Account {
  id                String  @id @default(uuid()) @db.Uuid
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@index([userId])
  @@map("account")
}

enum Role {
  USER
  ADMIN
}

model VerificationToken {
  identifier String
  token      String           @unique
  type       VerificationType
  expires    DateTime
  consumedAt DateTime?
  createdAt  DateTime         @default(now())

  @@unique([identifier, token])
  @@map("verification_token")
}

enum VerificationType {
  EMAIL_VERIFICATION
  PASSWORD_RESET
  MAGIC_LINK
  TWO_FACTOR
}

model Dashboard {
  id        String   @id @default(uuid()) @db.Uuid
  name      String
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("dashboard")
}

model AuditLog {
  id         String   @id @default(uuid()) @db.Uuid
  userId     String?
  action     String
  entity     String?
  entityType String?
  entityId   String?
  newValue   Json?
  oldValue   Json?
  metadata   Json?
  ip         String?
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

  @@index([userId, createdAt])
  @@index([action, createdAt])
  @@map("audit_log")
}

// ==========================================
// ADRESSES
// ==========================================

model Address {
  id        String   @id @default(uuid()) @db.Uuid
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

// ==========================================
// PRODUITS & CATALOGUE
// ==========================================

model Category {
  id             String    @id @default(uuid()) @db.Uuid
  name           String
  slug           String    @unique
  description    String?   @db.Text
  seoTitle       String?
  seoDescription String?
  deletedAt      DateTime?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  products       Product[]

  @@index([slug])
  @@map("category")
}

model Product {
  id          String        @id @default(uuid()) @db.Uuid
  name        String
  slug        String        @unique
  description String        @db.Text
  basePrice   Int           // en centimes
  currency    String        @default("USD") @db.VarChar(3)

  isFeatured     Boolean       @default(false)
  isArchived     Boolean       @default(false)
  isdeleted      Boolean       @default(false)
  deletedAt      DateTime?
  status         ProductStatus @default(DRAFT)
  seoTitle       String?
  seoDescription String?       @db.Text

  categoryId     String?       @db.Uuid
  category       Category?     @relation(fields: [categoryId], references: [id], onDelete: SetNull)
  taxClassId     String?       @db.Uuid
  taxClass       TaxClass?     @relation(fields: [taxClassId], references: [id])

  salePrice      Int?
  saleStart      DateTime?
  saleEnd        DateTime?

  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt

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

  @@index([categoryId, isArchived, basePrice])
  @@index([slug])
  @@map("product")
}

model ProductVariant {
  id          String   @id @default(uuid()) @db.Uuid
  productId   String   @db.Uuid
  product     Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  sku         String   @unique
  attributes  Json     // ex: {"taille":"XL","couleur":"Rouge"}
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
  id        String  @id @default(uuid()) @db.Uuid
  productId String
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  url       String
  alt       String?
  position  Int     @default(0)

  @@index([productId])
  @@map("product_image")
}

model ProductOption {
  id        String  @id @default(uuid()) @db.Uuid
  productId String
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  name      String
  value     String

  @@unique([productId, name, value])
  @@index([productId])
  @@map("product_option")
}

model Tag {
  id   String @id @default(uuid()) @db.Uuid
  name String @unique
  slug String @unique

  products ProductTag[]
  @@map("tag")
}

model ProductTag {
  productId String
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  tagId     String
  tag       Tag     @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([productId, tagId])
  @@map("product_tag")
}

model ProductAttribute {
  id   String @id @default(uuid()) @db.Uuid
  name String @unique
  type String // "text","number","boolean","select"

  values ProductAttributeValue[]
  @@map("product_attribute")
}

model ProductAttributeValue {
  id          String           @id @default(uuid()) @db.Uuid
  productId   String
  product     Product          @relation(fields: [productId], references: [id], onDelete: Cascade)
  attributeId String
  attribute   ProductAttribute @relation(fields: [attributeId], references: [id], onDelete: Cascade)
  value       String

  @@unique([productId, attributeId])
  @@map("product_attribute_value")
}

model Review {
  id                 String   @id @default(uuid()) @db.Uuid
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

enum ProductStatus {
  DRAFT
  ACTIVE
  OUT_OF_STOCK
  ARCHIVED
}

model Product_Availability_Projection {
  productId   String   @id @db.Uuid
  product     Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  isAvailable Boolean  @default(false)
  updatedAt   DateTime @updatedAt

  @@map("product_availability_projection")
}

model ProductPrice {
  id             String    @id @default(uuid()) @db.Uuid
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

// ==========================================
// TAXES
// ==========================================

model TaxClass {
  id          String    @id @default(uuid()) @db.Uuid
  name        String    @unique
  description String?
  products    Product[]
  taxRates    TaxRate[]

  @@map("tax_classes")
}

model TaxRate {
  id         String   @id @default(uuid()) @db.Uuid
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

// ==========================================
// INVENTAIRE
// ==========================================

model InventoryTransaction {
  id          String          @id @default(uuid()) @db.Uuid
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
  id          String          @id @default(uuid()) @db.Uuid
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

// ==========================================
// PANIER
// ==========================================

model Cart {
  id           String         @id @default(uuid()) @db.Uuid
  userId       String?        @unique @db.Uuid
  sessionToken String?        @unique
  expiresAt    DateTime
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt

  user           User?            @relation(fields: [userId], references: [id])
  items          CartItem[]
  abandonedCarts AbandonedCart[]

  @@index([expiresAt])
  @@map("cart")
}

model CartItem {
  id                 String         @id @default(uuid()) @db.Uuid
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
  id        String   @id @default(uuid()) @db.Uuid
  cartId    String   @unique @db.Uuid
  cart      Cart     @relation(fields: [cartId], references: [id], onDelete: Cascade)
  userId    String?  @db.Uuid
  user      User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
  expiresAt DateTime
  createdAt DateTime @default(now())
  updatedAt DateTime

  @@map("abandoned_cart")
}

// ==========================================
// COMMANDE
// ==========================================

model Order {
  id               String       @id @default(uuid()) @db.Uuid
  orderNumber      String       @unique
  userId           String?      @db.Uuid
  user             User?        @relation(fields: [userId], references: [id], onDelete: SetNull)
  status           OrderStatus  @default(PENDING)
  subtotalAmount   Int
  taxAmount        Int
  discountAmount   Int
  grandTotal       Int
  shippingCost     Int          @default(0)
  totalAmount      Int          // (subtotal + shipping + tax - discount) – redondant mais pratique
  currency         String       @default("USD") @db.VarChar(3)

  billingMethodId  String?      @db.Uuid
  billingMethod    BillingMethod? @relation(fields: [billingMethodId], references: [id])
  shippingMethodId String?      @db.Uuid
  shippingMethod   ShippingMethod? @relation(fields: [shippingMethodId], references: [id])

  trackingNumber   String?
  cinetpayTransId  String?      @unique

  createdAt        DateTime     @default(now())
  updatedAt        DateTime     @updatedAt

  items                OrderItem[]
  payment              Payment?
  shipment             Shipment?
  orderStatusHistories OrderStatusHistory[]
  couponUsage          CouponUsage?
  giftCardRedemptions  GiftCardRedemption[]
  returns              Return[]
  refundItems          RefundItem[]
  orderAddresses       OrderAddress[]
  stockReservations    StockReservation[]
  invoice              Invoice?

  @@index([userId, createdAt])
  @@index([status, createdAt])
  @@map("order")
}

model OrderItem {
  id             String         @id @default(uuid()) @db.Uuid
  orderId        String         @db.Uuid
  order          Order          @relation(fields: [orderId], references: [id], onDelete: Cascade)
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

model OrderStatusHistory {
  id        String      @id @default(uuid()) @db.Uuid
  orderId   String
  order     Order       @relation(fields: [orderId], references: [id], onDelete: Cascade)
  status    OrderStatus
  note      String?     @db.Text
  createdAt DateTime    @default(now())

  @@index([orderId, createdAt])
  @@map("order_status_history")
}

model OrderAddress {
  id        String   @id @default(uuid()) @db.Uuid
  orderId   String
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

enum OrderStatus {
  PENDING
  CONFIRMED
  PROCESSING
  SHIPPED
  DELIVERED
  CANCELLED
  REFUNDED
}

model StockReservation {
  id        String         @id @default(uuid()) @db.Uuid
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

// ==========================================
// EXPÉDITION & LOGISTIQUE
// ==========================================

model ShippingMethod {
  id            String  @id @default(uuid()) @db.Uuid
  name          String
  description   String?
  price         Int
  freeShipping  Boolean @default(false)
  minAmount     Int?
  carrier       String?
  estimatedDays String?
  isActive      Boolean @default(true)
  orders        Order[]

  @@map("shipping_method")
}

model Carrier {
  id        String     @id @default(uuid()) @db.Uuid
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
  id               String         @id @default(uuid()) @db.Uuid
  orderId          String         @unique @db.Uuid
  order            Order          @relation(fields: [orderId], references: [id], onDelete: Cascade)
  carrierId        String?
  carrier          Carrier?       @relation(fields: [carrierId], references: [id])
  shippingMethodId String?        @db.Uuid
  shippingMethod   ShippingMethod? @relation(fields: [shippingMethodId], references: [id])
  trackingNumber   String?        @unique
  status           ShipmentStatus @default(PENDING)
  shippedAt        DateTime?
  deliveredAt      DateTime?
  createdAt        DateTime       @default(now())
  updatedAt        DateTime       @updatedAt

  @@map("shipment")
}

enum ShipmentStatus {
  PENDING
  SHIPPED
  IN_TRANSIT
  DELIVERED
  EXCEPTION
}

// ==========================================
// PAIEMENTS
// ==========================================

model Payment {
  id            String            @id @default(uuid()) @db.Uuid
  orderId       String            @unique
  order         Order             @relation(fields: [orderId], references: [id], onDelete: Cascade)
  amount        Int
  currency      String            @default("USD") @db.VarChar(3)
  status        PaymentStatus     @default(PENDING)
  method        PaymentMethodType @default(CINETPAY)
  transactionId String?           @unique
  paidAt        DateTime?
  createdAt     DateTime          @default(now())
  updatedAt     DateTime          @updatedAt

  attempts      PaymentAttempt[]
  refund        Refund?

  @@map("payment")
}

model PaymentAttempt {
  id        String             @id @default(uuid()) @db.Uuid
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

model PaymentWebhookEvent {
  id          String    @id @default(uuid()) @db.Uuid
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

model IdempotencyKey {
  id          String   @id @default(uuid()) @db.Uuid
  key         String   @unique
  requestHash String
  response    Json?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("idempotency_key")
}

// ==========================================
// RETOURS & REMBOURSEMENTS
// ==========================================

model Return {
  id          String       @id @default(uuid()) @db.Uuid
  orderId     String
  order       Order        @relation(fields: [orderId], references: [id], onDelete: Cascade)
  reason      String
  status      ReturnStatus @default(REQUESTED)
  requestedAt DateTime     @default(now())
  resolvedAt  DateTime?

  returnItems ReturnItem[]
  @@map("return")
}

model ReturnItem {
  id          String       @id @default(uuid()) @db.Uuid
  returnId    String
  return      Return       @relation(fields: [returnId], references: [id], onDelete: Cascade)
  orderItemId String
  orderItem   OrderItem    @relation(fields: [orderItemId], references: [id], onDelete: Restrict)
  quantity    Int          @default(1)
  reason      String
  status      ReturnStatus @default(REQUESTED)
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

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
  id          String       @id @default(uuid()) @db.Uuid
  paymentId   String       @db.Uuid @unique
  payment     Payment      @relation(fields: [paymentId], references: [id], onDelete: Cascade)
  amount      Int
  reason      String?
  status      RefundStatus @default(PENDING)
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  refundItems RefundItem[]

  @@map("refund")
}

model RefundItem {
  id        String       @id @default(uuid()) @db.Uuid
  refundId  String       @db.Uuid
  refund    Refund       @relation(fields: [refundId], references: [id], onDelete: Cascade)
  orderId   String       @db.Uuid
  order     Order        @relation(fields: [orderId], references: [id], onDelete: Cascade)
  quantity  Int          @default(1)
  reason    String?
  status    RefundStatus @default(PENDING)
  createdAt DateTime     @default(now())
  updatedAt DateTime     @updatedAt

  @@index([refundId])
  @@map("refund_item")
}

enum RefundStatus {
  PENDING
  COMPLETED
  FAILED
}

// ==========================================
// PROMOTIONS & FIDÉLITÉ
// ==========================================

model Coupon {
  id            String       @id @default(uuid()) @db.Uuid
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
  @@map("coupon")
}

model CouponUsage {
  id       String   @id @default(uuid()) @db.Uuid
  couponId String
  coupon   Coupon   @relation(fields: [couponId], references: [id], onDelete: Cascade)
  userId   String
  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  orderId  String   @unique
  order    Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  usedAt   DateTime @default(now())

  @@index([couponId])
  @@index([userId])
  @@map("coupon_usage")
}

enum DiscountType {
  PERCENTAGE
  FIXED_AMOUNT
}

model GiftCard {
  id             String               @id @default(uuid()) @db.Uuid
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
  id         String   @id @default(uuid()) @db.Uuid
  giftCardId String
  giftCard   GiftCard @relation(fields: [giftCardId], references: [id], onDelete: Cascade)
  orderId    String
  order      Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  amount     Int
  createdAt  DateTime @default(now())

  @@index([giftCardId])
  @@map("gift_card_redemption")
}

// ==========================================
// LISTE DE SOUHAITS
// ==========================================

model Wishlist {
  id        String         @id @default(uuid()) @db.Uuid
  userId    String         @unique @db.Uuid
  user      User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime       @default(now())
  updatedAt DateTime       @updatedAt
  items     WishlistItem[]

  @@map("wishlist")
}

model WishlistItem {
  id         String   @id @default(uuid()) @db.Uuid
  wishlistId String
  wishlist   Wishlist @relation(fields: [wishlistId], references: [id], onDelete: Cascade)
  productId  String
  product    Product  @relation(fields: [productId], references: [id], onDelete: Restrict)
  addedAt    DateTime @default(now())

  @@unique([wishlistId, productId])
  @@map("wishlist_item")
}

// ==========================================
// NOTIFICATIONS
// ==========================================

model Notification {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  type      String
  title     String
  message   String   @db.Text
  isRead    Boolean  @default(false)
  createdAt DateTime @default(now())

  @@index([userId, createdAt])
  @@map("notification")
}

// ==========================================
// ANALYTIQUES & RECHERCHE
// ==========================================

model SearchAnalytics {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String?  @unique @db.Uuid
  user      User?    @relation(fields: [userId], references: [id], onDelete: Cascade)
  searches  Json?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("search_analytics")
}

// ==========================================
// FOURNISSEURS & ACHATS
// ==========================================

model Warehouse {
  id        String          @id @default(uuid()) @db.Uuid
  name      String
  location  String
  createdAt DateTime        @default(now())
  updatedAt DateTime        @updatedAt
  purchaseOrders PurchaseOrder[]

  @@map("warehouse")
}

model Supplier {
  id        String          @id @default(uuid()) @db.Uuid
  name      String
  contact   String?
  type      SupplierType    @default(LOCAL)
  createdAt DateTime        @default(now())
  updatedAt DateTime        @updatedAt
  purchaseOrders PurchaseOrder[]

  @@map("supplier")
}

model PurchaseOrder {
  id          String    @id @default(uuid()) @db.Uuid
  supplierId  String
  supplier    Supplier  @relation(fields: [supplierId], references: [id], onDelete: Cascade)
  warehouseId String
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

// ==========================================
// FACTURATION
// ==========================================

model BillingMethod {
  id            String  @id @default(uuid()) @db.Uuid
  name          String
  paymentMethod String? // M-Pesa, Orange Money, etc.
  orders        Order[]

  @@map("billing_method")
}

model Invoice {
  id            String   @id @default(uuid()) @db.Uuid
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

model SearchAnalytics {
  id                String            @id  @db.Uuid
  userId            String?           @db.Uuid
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
