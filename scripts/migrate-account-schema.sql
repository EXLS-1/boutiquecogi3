-- scripts/migrate-account-schema.sql
-- ============================================
-- Correction manuelle du schéma de la table "account"
-- Problème : userId était en TEXT alors que user.id est en UUID
-- ============================================
-- Exécuter avec: psql -d postgres -f scripts/migrate-account-schema.sql
-- OU via: npx prisma db execute --file=scripts/migrate-account-schema.sql
-- 1. Supprimer l'ancienne contrainte FK si elle existe
ALTER TABLE
  IF EXISTS "account" DROP CONSTRAINT IF EXISTS "account_userId_fkey";

-- 2. Supprimer les index existants qui pourraient bloquer
DROP INDEX IF EXISTS "account"."account_userId_idx";

-- 3. Ajouter la colonne providerAccountId si elle n'existe pas encore
ALTER TABLE
  IF EXISTS "account"
ADD
  COLUMN IF NOT EXISTS "providerAccountId" TEXT;

-- 4. Migrer les données de l'ancien champ "provider" (qui était mappé à providerAccountId) vers le nouveau
-- L'ancien modèle avait: provider String @map("providerAccountId")
-- Ce qui signifie que la colonne s'appelle "providerAccountId" en DB
-- Mais le nouveau modèle a: provider et providerAccountId séparés
-- "providerAccountId" existait déjà comme nom de colonne via le @map
-- "provider" est une NOUVELLE colonne qu'il faut ajouter
ALTER TABLE
  IF EXISTS "account"
ADD
  COLUMN IF NOT EXISTS "provider" TEXT;

-- Si l'ancienne colonne s'appelait déjà "providerAccountId" (via le @map),
-- alors copier son contenu dans les deux nouveaux champs
-- (provider = 'email' pour les credentials, providerAccountId = email)
UPDATE
  "account"
SET
  "provider" = COALESCE("provider", 'email'),
  "providerAccountId" = COALESCE("providerAccountId", "userId")
WHERE
  "provider" IS NULL
  OR "providerAccountId" IS NULL;

-- 5. Ajouter la contrainte UNIQUE sur (provider, providerAccountId)
-- D'abord supprimer les doublons éventuels
DELETE FROM
  "account" a1 USING "account" a2
WHERE
  a1."id" < a2."id"
  AND a1."provider" = a2."provider"
  AND a1."providerAccountId" = a2."providerAccountId";

-- 6. Maintenant, le Prisma push devrait fonctionner
-- Note : la colonne userId doit être de type UUID pour correspondre à user.id
-- Si elle est en TEXT, il faut la convertir
ALTER TABLE
  IF EXISTS "account"
ALTER COLUMN
  "userId" TYPE UUID USING "userId" :: uuid;