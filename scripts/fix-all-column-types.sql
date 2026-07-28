-- scripts/fix-all-column-types.sql
-- ============================================
-- Fix all incompatible TEXT/UUID column types in the database
-- for foreign key constraints to work with Prisma schema.
-- ============================================
-- Run with: psql -U postgres -d postgres -f scripts/fix-all-column-types.sql

-- Disable triggers temporarily
SET session_replication_role = 'replica';

-- Fix Account table
ALTER TABLE IF EXISTS "account" ALTER COLUMN "userId" TYPE UUID USING "userId"::uuid;

-- Fix ProductImage table  
ALTER TABLE IF EXISTS "product_image" ALTER COLUMN "productId" TYPE UUID USING "productId"::uuid;
ALTER TABLE IF EXISTS "product_image" ALTER COLUMN "id" TYPE UUID USING "id"::uuid;

-- Fix Product table
ALTER TABLE IF EXISTS "product" ALTER COLUMN "userId" TYPE UUID USING "userId"::uuid;
ALTER TABLE IF EXISTS "product" ALTER COLUMN "id" TYPE UUID USING "id"::uuid;
ALTER TABLE IF EXISTS "product" ALTER COLUMN "categoryId" TYPE UUID USING "categoryId"::uuid;

-- Fix Session table
ALTER TABLE IF EXISTS "session" ALTER COLUMN "userId" TYPE UUID USING "userId"::uuid;

-- Fix Post table
ALTER TABLE IF EXISTS "post" ALTER COLUMN "userId" TYPE UUID USING "userId"::uuid;

-- Fix Dashboard table
ALTER TABLE IF EXISTS "dashboard" ALTER COLUMN "userId" TYPE UUID USING "userId"::uuid;

-- Fix AuditLog table
ALTER TABLE IF EXISTS "audit_log" ALTER COLUMN "userId" TYPE UUID USING "userId"::uuid;

-- Fix Address table
ALTER TABLE IF EXISTS "address" ALTER COLUMN "userId" TYPE UUID USING "userId"::uuid;

-- Fix Review table
ALTER TABLE IF EXISTS "review" ALTER COLUMN "userId" TYPE UUID USING "userId"::uuid;
ALTER TABLE IF EXISTS "review" ALTER COLUMN "productId" TYPE UUID USING "productId"::uuid;

-- Fix CategoryProduct table
ALTER TABLE IF EXISTS "category_product" ALTER COLUMN "productId" TYPE UUID USING "productId"::uuid;
ALTER TABLE IF EXISTS "category_product" ALTER COLUMN "categoryId" TYPE UUID USING "categoryId"::uuid;

-- Fix CatalogProduct table
ALTER TABLE IF EXISTS "catalog_product" ALTER COLUMN "productId" TYPE UUID USING "productId"::uuid;
ALTER TABLE IF EXISTS "catalog_product" ALTER COLUMN "catalogId" TYPE UUID USING "catalogId"::uuid;

-- Fix Stock table
ALTER TABLE IF EXISTS "stocks" ALTER COLUMN "productId" TYPE UUID USING "productId"::uuid;

-- Fix ProductVariant table
ALTER TABLE IF EXISTS "product_variant" ALTER COLUMN "productId" TYPE UUID USING "productId"::uuid;

-- Re-enable triggers
SET session_replication_role = 'origin';

