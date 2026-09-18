// lib/auth/rbac/constants.ts
// ============================================
// RBAC CONSTANTS — Centralized exports for RBAC system
// ============================================

export {
  ROLES,
  LEVELS,
  PERMISSIONS,
  RoleLevel,
  RoleLevelConfig,
  ROLE_HIERARCHY,
} from "@/lib/auth/rbac";

export type {
  Role,
  Level,
  Permission,
  PermissionCode,
  RoleEvaluationResult,
  RoleLevelValue,
} from "@/lib/auth/rbac";

// Re-export helper functions
export {
  hasPermission,
  hasPermissionOnResult,
} from "@/lib/auth/rbac";

