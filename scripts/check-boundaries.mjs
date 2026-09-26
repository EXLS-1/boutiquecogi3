// scripts/check-boundaries.mjs
// =============================================================================
// GARDE-FOU D'ARCHITECTURE — lib/product/
// =============================================================================
// La règle du domaine produit est simple et doit rester vraie :
//
//     UI → Action/API → RBAC → Validation → Service → Repository → Prisma
//
// Autrement dit : **seul un fichier `*.repository.ts` a le droit d'importer
// Prisma.** Un service qui importe `@/lib/prisma` court-circute la couche et
// rend les tests impossibles à isoler.
//
// Ce script remplace la discipline : il échoue (code 1) dès qu'un service,
// une policy ou une validation touche la base directement.
//
// Usage : node scripts/check-boundaries.mjs
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve("lib/product");

/** Fichiers autorisés à importer Prisma (suffixe `.repository.ts`). */
const ALLOWED_PRISMA = /\.repository\.ts$/;

/** Sous-dossiers qui ne sont pas des couches du domaine produit. */
const SKIP_DIRS = new Set(["node_modules", "__tests__"]);

/** Suffixes qui ne sont pas des couches. */
const SKIP_FILES = new Set([".d.ts"]);

const violations = [];

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full);
      continue;
    }
    if (SKIP_FILES.has(path.extname(entry))) continue;
    if (!/\.(ts|tsx)$/.test(entry)) continue;
    if (ALLOWED_PRISMA.test(entry)) continue;

    const src = readFileSync(full, "utf8");
    // On ignore les commentaires : seul le code exécutable est contrôlé.
    const code = src
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");

    const rel = path.relative(process.cwd(), full);

    // Les imports de TYPE n'ont aucune dépendance à l'exécution : ils sont
    // autorisés partout (ex: `Prisma.TransactionClient`, `Prisma.Decimal`).
    // Ce qu'on interdit, c'est le couplage RUNTIME à la base.
    const runtime = code
      .replace(/import\s+type\s+[^;]*from\s+["'][^"']+["'];?/g, "")
      .replace(/import\s*\{[^}]*\}\s*from\s*["'][^"']+["'];?/g, (m) =>
        /^\s*import\s+type\b/.test(m) ? "" : m,
      );

    if (/from\s+["']@\/lib\/prisma["']/.test(runtime)) {
      violations.push(
        `${rel} : importe @/lib/prisma (réservé aux *.repository.ts ; ` +
          `pour ouvrir une transaction, utiliser prisma.$transaction via ` +
          `inventory.repository)`,
      );
    }
    if (/from\s+["']@prisma\/client["']/.test(runtime)) {
      violations.push(`${rel} : importe @prisma/client à l'exécution (réservé aux *.repository.ts)`);
    }

    // Même autorisées, les requêtes directes sur un modèle sont interdites
    // hors repository : seul `$transaction` est toléré côté service.
    if (!ALLOWED_PRISMA.test(entry) && /\bprisma\.[a-zA-Z]+\.[a-zA-Z]+\(/.test(runtime)) {
      violations.push(
        `${rel} : requête Prisma directe (prisma.<modèle>.<op>) hors repository`,
      );
    }
  }
}

walk(ROOT);

if (violations.length > 0) {
  console.error(`✗ ${violations.length} violation(s) de la règle des couches :\n`);
  for (const v of violations) console.error(`  - ${v}`);
  process.exit(1);
}

console.log("✓ Règle des couches respectée : Prisma est confiné aux repositories.");
