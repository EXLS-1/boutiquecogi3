// Création / restauration du compte ADMIN (Level 2).
// Usage : npx tsx scripts/create-admin.ts [--email=...] [--password=...] [--name=...]

import { createRoleAccount } from "./create-role-account";

createRoleAccount({
  role: "ADMIN",
  expectedLevel: 2,
  envPrefix: "ADMIN",
  defaultName: "Admin COGI",
}).catch((error: unknown) => {
  console.error("❌ Échec de la création/restauration de l'Admin :", error);
  process.exitCode = 1;
});
