// Création / restauration du compte SUPER_ADMIN (Level 1).
// Usage : npx tsx scripts/create-super-admin.ts [--email=...] [--password=...] [--name=...] [--force]

import { createRoleAccount } from "./create-role-account";

createRoleAccount({
  role: "SUPER_ADMIN",
  expectedLevel: 1,
  envPrefix: "SUPER_ADMIN",
  fallbackEnvPrefix: "INITIAL_SUPERADMIN",
  defaultName: "SuperAdmin COGI",
  minPasswordLength: 12,
  enforceSingleSuperAdmin: true,
}).catch((error: unknown) => {
  console.error("❌ Échec critique de la restauration du Super Admin :", error);
  process.exitCode = 1;
});
