// scripts/truncate.mjs
// Tronque un fichier à N lignes (1-indexé) — utile pour réparer une insertion
// partielle sans réécrire le fichier entier.
// Usage : node scripts/truncate.mjs lib/product/pricing/price.service.ts 139
import { readFileSync, writeFileSync } from "node:fs";

const [file, n] = process.argv.slice(2);
const keep = Number(n);
if (!file || !Number.isFinite(keep)) {
  console.error("usage: node scripts/truncate.mjs <file> <lines>");
  process.exit(2);
}
const lines = readFileSync(file, "utf8").split(/\r?\n/);
writeFileSync(file, `${lines.slice(0, keep).join("\n")}\n`);
console.log(`${file} tronqué à ${keep} lignes (${lines.length} avant).`);
