const fs = require('fs');
const p = 'c:\\boutiquecogi3\\prisma\\migrations\\20260911120000_product_domain_phase2\\migration.sql';
let c = fs.readFileSync(p, 'utf8');

const oldText = `-- ─── PHASE C — STATUT (enum ProductStatus : 8 → 6 valeurs) ─────────────────
-- C.1 : Copier les anciennes valeurs dans un type temporaire
CREATE TYPE "product_status_legacy" AS ENUM ('DRAFT', 'ACTIVE', 'PENDING', 'SCHEDULED', 'PUBLISHED', 'OUT_OF_STOCK', 'ARCHIVED', 'DISCONTINUED');

-- C.2 : Convertir product.status vers le type temporaire
ALTER TABLE product ALTER COLUMN status TYPE "product_status_legacy" USING status::text::"product_status_legacy";

-- C.3 : Convertir product_status_history vers le nouveau type
ALTER TABLE product_status_history ALTER COLUMN "oldStatus" TYPE "product_status" USING "oldStatus"::text::"product_status";
ALTER TABLE product_status_history ALTER COLUMN "newStatus" TYPE "product_status" USING "newStatus"::text::"product_status";

ALTER TABLE product ALTER COLUMN status SET DEFAULT 'DRAFT';
DROP TYPE "product_status_legacy";`;

const newText = `-- ─── PHASE C — STATUT (enum ProductStatus : 8 → 6 valeurs) ─────────────────
-- C.1 : Créer le nouvel enum (6 valeurs cibles) si absent
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_status') THEN
    CREATE TYPE "product_status" AS ENUM ('DRAFT', 'PENDING', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED', 'DISCONTINUED');
  END IF;
END$$;

-- C.2 : Convertir product.status avec mapping
-- ACTIVE → PUBLISHED, OUT_OF_STOCK → PUBLISHED, autres → tel quel
-- (gère tous les cas : type original "ProductStatus", "product_status_legacy", ou déjà converti)
ALTER TABLE product ALTER COLUMN status DROP DEFAULT;
ALTER TABLE product ALTER COLUMN status TYPE "product_status" USING
  CASE status::text
    WHEN 'ACTIVE' THEN 'PUBLISHED'::"product_status"
    WHEN 'OUT_OF_STOCK' THEN 'PUBLISHED'::"product_status"
    ELSE status::text::"product_status"
  END;
ALTER TABLE product ALTER COLUMN status SET DEFAULT 'DRAFT'::"product_status";

-- C.3 : Convertir product_status_history avec mapping
ALTER TABLE product_status_history ALTER COLUMN "oldStatus" TYPE "product_status" USING
  CASE "oldStatus"::text
    WHEN 'ACTIVE' THEN 'PUBLISHED'::"product_status"
    WHEN 'OUT_OF_STOCK' THEN 'PUBLISHED'::"product_status"
    ELSE "oldStatus"::text::"product_status"
  END;
ALTER TABLE product_status_history ALTER COLUMN "newStatus" TYPE "product_status" USING
  CASE "newStatus"::text
    WHEN 'ACTIVE' THEN 'PUBLISHED'::"product_status"
    WHEN 'OUT_OF_STOCK' THEN 'PUBLISHED'::"product_status"
    ELSE "newStatus"::text::"product_status"
  END;

-- C.4 : Nettoyer les types obsolètes (s'ils existent encore)
DROP TYPE IF EXISTS "product_status_legacy";
DROP TYPE IF EXISTS "ProductStatus";`;

if (c.includes(oldText)) {
  c = c.replace(oldText, newText);
  fs.writeFileSync(p, c, 'utf8');
  console.log('SUCCESS: Phase C replaced');
} else {
  console.log('ERROR: old text not found');
  const idx = c.indexOf('-- ─── PHASE C');
  if (idx >= 0) {
    console.log('Found PHASE C at index', idx);
    console.log(JSON.stringify(c.substring(idx, idx + 200)));
  } else {
    console.log('PHASE C not found at all');
  }
}

