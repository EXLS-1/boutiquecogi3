// lib/rbac.ts
// ============================================
// RBAC SHARED (formulaires) — module PUR client + server
// ============================================
// Schéma de validation du formulaire RBAC + ré-export des constantes pures.
// Ne doit contenir AUCUN import server-only (voir lib/auth/rbac-shared.ts).

import { z } from 'zod';

export { ROLES, PERMISSIONS } from '@/lib/auth/rbac-shared';

export const rbacSchema = z.object({
  roleId: z.string().uuid(),
  permissions: z.array(z.string()),
});

export type RbacValues = z.infer<typeof rbacSchema>;
