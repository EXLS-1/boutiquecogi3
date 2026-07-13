// lib/validations/role.ts
import { z } from 'zod';
import { type RoleLevel } from '@/lib/auth/rbac';

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
    .min(1, 'Le niveau minimum est 1')
    .max(6, 'Seul le propriétaire peut créer un rôle de niveau 1') 
    .refine(
      (val) => val !== 1,
      'Le niveau 1 (SUPER_ADMIN) est immuable et ne peut pas être créé'
    ) as z.ZodType<RoleLevel>,
    
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
    .datetime()
    .optional()
    .nullable()
    .transform((val) => val ? new Date(val) : null),
    
  permanent: z
    .boolean()
    .optional()
    .default(false),
})

export type BlockUserInput = z.infer<typeof blockUserSchema>

export const unblockUserSchema = z.object({
  userId: z.string().uuid('ID utilisateur invalide'),
  reason: z.string().min(5).max(500).optional(),
})

export type UnblockUserInput = z.infer<typeof unblockUserSchema>