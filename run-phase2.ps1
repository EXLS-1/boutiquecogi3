# ═════════════════════════════════════════════════════════════════════════════
# run-phase2.ps1 — Exécution de la migration PHASE 2 (journalisée)
# Toute la sortie est écrite dans phase2-execution.log (le terminal n'observe
# pas les complétions ; on journalise dans un fichier lisible).
# ═════════════════════════════════════════════════════════════════════════════

$ErrorActionPreference = "Continue"
Set-Location "c:\boutiquecogi3"
$log = "c:\boutiquecogi3\phase2-execution.log"
Remove-Item $log -ErrorAction SilentlyContinue

function Log([string]$section) {
  ("`n=== {0} — {1} ===" -f $section, (Get-Date -Format "HH:mm:ss")) | Tee-Object -FilePath $log -Append
}
function Run($name, $argsStr) {
  Log $name
  try {
    $out = Invoke-Expression "npx $argsStr" 2>&1 | Out-String
    $out | Tee-Object -FilePath $log -Append
    Log "$name exit=$LASTEXITCODE"
  } catch {
    ("ERROR: {0}" -f $_.Exception.Message) | Tee-Object -FilePath $log -Append
    Log "$name exit=EXCEPTION"
  }
}

Log "PHASE 2 — démarrage"

Run "PRISMA VERSION" "prisma -v"
# 1. Backfills A-E + DDL deltas (SQL idempotent)
Run "DB EXECUTE (backfills A-E + DDL)" "prisma db execute --file prisma/migrations/20260911120000_product_domain_phase2/migration.sql --verbose"
# 2. Alignement final du schéma (applique tout delta manqué, accepte la perte de données)
Run "DB PUSH (alignement)" "prisma db push --accept-data-loss"
# 3. Validation du schéma
Run "PRISMA VALIDATE" "prisma validate"
# 4. Régénération du client (types TS alignés sur l'enum réduit)
Run "PRISMA GENERATE" "prisma generate"

Log "PHASE 2 — terminée (voir détails au-dessus)"
