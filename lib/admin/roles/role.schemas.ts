// lib/admin/roles/role.schemas.ts
// ============================================================
// Validation Zod stricte de toutes les entrées du module rôles.
// Alignée sur le moteur RBAC (lib/auth/rbac.ts) : clés de
// restrictions et codes de permissions réels.
// ============================================================

import { z } from 'zod';

import { RESTRICTIONS } from '@/lib/auth/rbac';

const uuid = z.string().uuid('Identifiant invalide');

/** Identifiant de rôle (UUID) — utilisé par toutes les actions ciblées. */
export const roleIdSchema = uuid;

/** Création d'un rôle : niveaux 2-6 (1 et 7 réservés). */
export const createRoleSchema = z.object({
  name: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[A-Z][A-Z_]*$/, 'MAJUSCULES_WITH_UNDERSCORES requis'),
  level: z.number().int().min(2).max(6),
  description: z.string().max(255).default(''),
  permissionIds: z.array(uuid).max(500).default([]),
  isActive: z.boolean().default(true),
});

/** Mise à jour d'un rôle (nom et niveau immuables). */
export const updateRoleSchema = z.object({
  description: z.string().max(255).optional(),
  isActive: z.boolean().optional(),
});

/** Restrictions complètes : quotas, rate limit, API, webhooks,
 *  analytics, export, bulk actions, 2FA, session, approbation,
 *  niveaux d'audit — catégories déjà définies par le RBAC. */
export const roleRestrictionsSchema = z
  .object({
    // Quotas numériques
    [RESTRICTIONS.MAX_DAILY_ORDERS]: z.number().int().min(0).max(1_000_000).optional(),
    [RESTRICTIONS.MAX_PRODUCTS_PER_USER]: z.number().int().min(0).max(100_000).optional(),
    [RESTRICTIONS.MAX_STORAGE_MB]: z.number().int().min(0).max(1_000_000).optional(),
    [RESTRICTIONS.MAX_TEAM_MEMBERS]: z.number().int().min(0).max(10_000).optional(),
    [RESTRICTIONS.RATE_LIMIT_PER_MINUTE]: z.number().int().min(1).max(100_000).optional(),
    [RESTRICTIONS.SESSION_DURATION_HOURS]: z.number().int().min(1).max(720).optional(),
    [RESTRICTIONS.AUDIT_MAX_DURATION_MINUTES]: z.number().int().min(1).max(10_080).optional(),
    [RESTRICTIONS.AUDIT_ALLOWED_TARGET_LEVELS]: z.array(z.number().int().min(1).max(7)).max(7).optional(),
    // Toggles ON/OFF
    [RESTRICTIONS.CAN_ACCESS_API]: z.boolean().optional(),
    [RESTRICTIONS.CAN_ACCESS_WEBHOOKS]: z.boolean().optional(),
    [RESTRICTIONS.CAN_ACCESS_ADVANCED_ANALYTICS]: z.boolean().optional(),
    [RESTRICTIONS.CAN_EXPORT_DATA]: z.boolean().optional(),
    [RESTRICTIONS.CAN_USE_BULK_ACTIONS]: z.boolean().optional(),
    [RESTRICTIONS.RESTRICTED_TO_OWN_DATA]: z.boolean().optional(),
    [RESTRICTIONS.RESTRICTED_TO_DEPARTMENT]: z.string().max(100).optional(),
    [RESTRICTIONS.REQUIRE_2FA]: z.boolean().optional(),
    [RESTRICTIONS.REQUIRE_APPROVAL_FOR_DELETE]: z.boolean().optional(),
    [RESTRICTIONS.REQUIRES_AUDIT_APPROVAL]: z.boolean().optional(),
  })
  .strict();

export type RoleRestrictionsInput = z.infer<typeof roleRestrictionsSchema>;

/** Mise à jour de la matrice permissions d'un rôle. */
export const updateRolePermissionsSchema = z.object({
  roleId: uuid,
  permissionIds: z.array(uuid).max(500),
});

/** Assignation d'un rôle à un utilisateur. */
export const assignRoleSchema = z.object({
  userId: uuid,
  roleId: uuid,
});

/** Révocation d'un assignment. */
export const revokeRoleSchema = z.object({ assignmentId: uuid });

/** Blocage / déblocage d'un assignment. */
export const assignmentBlockSchema = z.object({
  assignmentId: uuid,
  reason: z.string().max(255).optional(),
  blockedUntil: z.string().datetime().nullable().optional(),
});

/** Override de permission (ON/OFF) avec expiration optionnelle. */
export const updatePermissionOverrideSchema = z.object({
  assignmentId: uuid,
  permissionId: uuid,
  isGranted: z.boolean(),
  expiresAt: z.string().datetime().nullable().optional(),
});

/** Filtres de lecture des logs d'audit. */
export const auditLogFilterSchema = z.object({
  roleId: uuid.optional(),
  action: z.string().max(80).optional(),
  take: z.number().int().min(1).max(200).default(100),
});
