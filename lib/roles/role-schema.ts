// lib/roles/role-schema.ts
// ============================================================
// Schémas Zod (validation stricte côté serveur & client) pour la
// gestion des rôles. Utilisés par les Server Actions et les formulaires.
// ============================================================

import { z } from 'zod';
import type { RoleFormValues, RoleUpdateValues } from '@/types/role';

export const roleRestrictionsSchema = z.object({
  MAX_DAILY_ORDERS: z.number().int().min(0).optional(),
  MAX_PRODUCTS_PER_USER: z.number().int().min(0).optional(),
  MAX_STORAGE_MB: z.number().int().min(0).optional(),
  MAX_TEAM_MEMBERS: z.number().int().min(0).optional(),
  CAN_ACCESS_API: z.boolean().optional(),
  RATE_LIMIT_PER_MINUTE: z.number().int().min(1).optional(),
  SESSION_DURATION_HOURS: z.number().int().min(1).optional(),
  REQUIRE_2FA: z.boolean().optional(),
  REQUIRES_AUDIT_APPROVAL: z.boolean().optional(),
}).strict();

export type RoleRestrictions = z.infer<typeof roleRestrictionsSchema>;

/**
 * Validation du formulaire de création d'un rôle.
 * Le nom respecte la convention `MAJUSCULES_WITH_UNDERSCORES`.
 * Le niveau est borné entre 2 (Admin) et 6 (Utilisateur) —
 * 1 (SUPER_ADMIN) et 7 (GUEST) étant immuables côté service.
 */
export const roleFormSchema = z.object({
  name: z
    .string()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(50, 'Le nom ne doit pas dépasser 50 caractères')
    .regex(
      /^[A-Z_]+$/,
      'Le nom doit être en majuscules avec underscores (ex: MODERATEUR)',
    )
    .transform((val) => val.trim()),

  level: z
    .number()
    .int('Le niveau doit être un entier')
    .min(2, 'Le niveau minimum est 2 (1 est réservé à SUPER_ADMIN)')
    .max(6, 'Le niveau maximum est 6 (7 est réservé à GUEST)'),

  description: z
    .string()
    .max(255, 'La description ne doit pas dépasser 255 caractères')
    .optional()
    .default(''),

  defaultPermissionCodes: z.array(z.string()).default([]),

  isActive: z.boolean().default(true),
});

export type RoleFormSchemaType = z.infer<typeof roleFormSchema>;

/**
 * Validation des champs modifiables lors de l'édition d'un rôle
 * (le nom et le niveau sont immuables après création).
 */
export const roleUpdateSchema = z.object({
  description: z
    .string()
    .max(255, 'La description ne doit pas dépasser 255 caractères')
    .optional(),
  isActive: z.boolean().optional(),
  defaultPermissionCodes: z.array(z.string()).optional(),
  restrictions: roleRestrictionsSchema.optional(),
});

export type RoleUpdateSchemaType = z.infer<typeof roleUpdateSchema>;

// Réexport des types métier pour un import unique depuis ce module.
export type { RoleFormValues, RoleUpdateValues };