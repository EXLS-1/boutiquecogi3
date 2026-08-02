// lib/auth-client.ts (DEPRECATED)
// ============================================
// DÉPRÉCIÉ — Utilisez @/lib/auth/auth-client à la place.
// Ce fichier est conservé pour la rétrocompatibilité.
// ============================================

export {
  authClient,
  normalizeRole,
  getRoleLevel,
  getRoleConfig,
  isAdminOrSuperAdmin,
  isStaffOrAbove,
} from "@/lib/auth/auth-client";

export type { Role, RoleLevelConfigEntry } from "@/lib/auth/auth-client";
