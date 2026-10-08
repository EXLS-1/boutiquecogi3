// Création / restauration du compte SUPERVISOR (Level 5).
// Usage : npx tsx scripts/create-supervisor.ts [--email=...] [--password=...] [--name=...]

import { createRoleAccount } from "./create-role-account";

createRoleAccount({
  role: "SUPERVISOR",
  expectedLevel: 5,
  envPrefix: "SUPERVISOR",
  defaultName: "Superviseur COGI",
}).catch((error: unknown) => {
  console.error("❌ Échec de la création/restauration du Superviseur :", error);
  process.exitCode = 1;
});
