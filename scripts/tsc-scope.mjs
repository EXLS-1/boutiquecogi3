// scripts/tsc-scope.mjs
// Compile une liste de fichiers en isolement.
// Le `tsc` global est inutilisable ici : le tsconfig du projet charge tout le
// repo, qui contient 26 erreurs de SYNTAXE pré-existantes dans des composants
// hors périmètre (DraftManager.tsx, forgot-password-form.tsx, actions.ts…).
// On génère donc un tsconfig temporaire qui n'inclut QUE les fichiers demandés,
// en héritant de tout le reste (paths @/*, jsx, strict…).
// Usage : node scripts/tsc-scope.mjs lib/product/pricing/price.service.ts
import { spawnSync } from "node:child_process";
import { writeFileSync, unlinkSync } from "node:fs";
import path from "node:path";

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("usage: node scripts/tsc-scope.mjs <file...>");
  process.exit(2);
}

const tmpConfig = path.resolve("tsconfig.scope.tmp.json");
writeFileSync(
  tmpConfig,
  JSON.stringify(
    {
      extends: "./tsconfig.json",
      compilerOptions: { noEmit: true, incremental: false, types: ["node"] },
      include: files,
      exclude: ["node_modules", ".next"],
    },
    null,
    2,
  ),
);

const res = spawnSync("npx", ["tsc", "-p", tmpConfig], {
  encoding: "utf8",
  shell: true,
});

try {
  unlinkSync(tmpConfig);
} catch {
  /* le fichier temporaire peut rester si tsc a planté : sans conséquence */
}

const out = `${res.stdout || ""}${res.stderr || ""}`.trim();
console.log(out || "OK — aucune erreur sur le périmètre donné.");
process.exit(res.status ?? 0);
