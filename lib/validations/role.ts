// lib/validations/role.ts

import { z } from 'zod'

export const createRoleSchema = z.object({
  name: z
    .string()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(50, 'Le nom ne doit pas dépasser 50 caractères')
    .regex(/^[A-Z_]+$/, 'Le nom doit être en majuscules avec underscores (ex: MODERATEUR)')
    .transform(val => val.trim()),

  level: z
    .number()
    .int()
    .min(2, 'Le niveau minimum est 2 (1 est réservé à SUPER_ADMIN)')
    .max(6, 'Le niveau maximum est 6 (7 est réservé à GUEST)')
    .refine(
      (val) => val !== 1 && val !== 7,
      'Les niveaux 1 (SUPER_ADMIN) et 7 (GUEST) sont immuables'
    ),

  description: z
    .string()
    .max(255, 'La description ne doit pas dépasser 255 caractères')
    .optional()
    .default(''),

  defaultPermissionCodes: z
    .array(z.string())
    .optional()
    .default([]),

  isActive: z
    .boolean()
    .optional()
    .default(true),
})

export type CreateRoleInput = z.infer<typeof createRoleSchema>

// ─── Validation pour le blocage ───

export const blockUserSchema = z.object({
  userId: z.string().uuid('ID utilisateur invalide'),
  reason: z
    .string()
    .min(5, 'La raison doit contenir au moins 5 caractères')
    .max(500, 'La raison ne doit pas dépasser 500 caractères'),

  blockedUntil: z
    .string()
    .iso.datetime()
    .optional()
    .nullable()
    .transform((val: string | number | Date) => val ? new Date(val) : null),

  permanent: z
    .boolean()
    .optional()
    .default(false),
})

export type BlockUserInput = z.infer<typeof blockUserSchema>

export const unblockUserSchema = z.object({
  userId: z.uuid('ID utilisateur invalide'),
  reason: z.string().min(5).max(500).optional(),
})

export type UnblockUserInput = z.infer<typeof unblockUserSchema>

// ─── Validation assignation rôle ───

export const assignRoleSchema = z.object({
  userId: z.string().uuid(),
  roleId: z.string().uuid(),
})

export type AssignRoleInput = z.infer<typeof assignRoleSchema>