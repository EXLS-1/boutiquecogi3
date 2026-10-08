// Création / restauration du compte EDITOR (Level 4).
// Usage : npx tsx scripts/create-editor.ts [--email=...] [--password=...] [--name=...]

import { createRoleAccount } from "./create-role-account";

createRoleAccount({
  role: "EDITOR",
  expectedLevel: 4,
  envPrefix: "EDITOR",
  defaultName: "Éditeur COGI",
}).catch((error: unknown) => {
  console.error("❌ Échec de la création/restauration de l'Éditeur :", error);
  process.exitCode = 1;
});
