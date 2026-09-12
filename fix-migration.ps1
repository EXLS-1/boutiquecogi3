$p = 'c:\boutiquecogi3\prisma\migrations\20260911120000_product_domain_phase2\migration.sql'
$c = Get-Content $p -Raw -Encoding UTF8

$oldText = @'
-- ─── PHASE C — STATUT (enum ProductStatus : 8 → 6 valeurs) ─────────────────
-- C.1 : Copier les anciennes valeurs dans un type temporaire
CREATE TYPE "product_status_legacy" AS ENUM ('DRAFT', 'ACTIVE', 'PENDING', 'SCHEDULED', 'PUBLISHED', 'OUT_OF_STOCK', 'ARCHIVED', 'DISCONTINUED');

-- C.2 : Convertir product.status vers le type temporaire
ALTER TABLE product ALTER COLUMN status TYPE "product_status_legacy" USING status::text::"product_status_legacy";

-- C.3 : Convertir product_status_history vers le nouveau type
ALTER TABLE product_status_history ALTER COLUMN "oldStatus" TYPE "product_status" USING "oldStatus"::text::"product_status";
ALTER TABLE product_status_history ALTER COLUMN "newStatus" TYPE "product_status" USING "newStatus"::text::"product_status";

ALTER TABLE product ALTER COLUMN status SET DEFAULT 'DRAFT';
DROP TYPE "product_status_legacy";
'@

$newText = @'
-- ─── PHASE C — STATUT (enum ProductStatus : 8 → 6 valeurs) ─────────────────
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
DROP TYPE IF EXISTS "ProductStatus";
'@

if ($c.Contains($oldText)) {
  $c = $c.Replace($oldText, $newText)
  Set-Content $p $c -Encoding UTF8 -NoNewline
  Write-Host 'SUCCESS: Phase C replaced'
} else {
  Write-Host 'ERROR: old text not found'
  $idx = $c.IndexOf('-- ─── PHASE C')
  if ($idx -ge 0) {
    Write-Host "Found PHASE C at index $idx"
    Write-Host $c.Substring($idx, [Math]::Min(300, $c.Length - $idx))
  }
}
