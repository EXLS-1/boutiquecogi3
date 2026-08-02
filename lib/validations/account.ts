// lib/validations/account.ts
// ============================================
// Zod schemas pour la gestion admin des comptes (Account model)
// ============================================

import { z } from "zod";

// ─── Filtres de liste ───────────────────────

export const listAccountsSchema = z.object({
  search: z
    .string()
    .max(100, "La recherche ne doit pas dépasser 100 caractères")
    .optional()
    .default(""),

  provider: z.string().optional().default("ALL"),

  type: z.string().optional().default("ALL"),

  page: z.coerce.number().int().min(1).optional().default(1),

  pageSize: z.coerce.number().int().min(5).max(100).optional().default(25),

  sortBy: z
    .enum(["createdAt", "provider", "userEmail", "type"])
    .optional()
    .default("createdAt"),

  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

export type ListAccountsInput = z.infer<typeof listAccountsSchema>;

// ─── Suppression d'un compte ────────────────

export const deleteAccountSchema = z.object({
  accountId: z.string().uuid("ID de compte invalide"),
  reason: z
    .string()
    .min(5, "La raison doit contenir au moins 5 caractères")
    .max(500, "La raison ne doit pas dépasser 500 caractères")
    .optional(),
});

export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;

// ─── Détails d'un compte ────────────────────

export const getAccountSchema = z.object({
  accountId: z.string().uuid("ID de compte invalide"),
});

export type GetAccountInput = z.infer<typeof getAccountSchema>;

// ─── Auto-suppression du compte utilisateur ───

export const selfDeleteAccountSchema = z.object({
  reason: z
    .string()
    .min(
      10,
      "La raison doit contenir au moins 10 caractères pour expliquer votre décision"
    )
    .max(1000, "La raison ne doit pas dépasser 1000 caractères"),
  password: z
    .string()
    .min(1, "Le mot de passe est requis pour confirmer la suppression"),
  confirmation: z.literal(true, {
    errorMap: () => ({ message: "Vous devez confirmer la suppression" }),
  }),
});

export type SelfDeleteAccountInput = z.infer<typeof selfDeleteAccountSchema>;

// ─── Restauration d'un compte supprimé (Admin) ───

export const restoreDeletedAccountSchema = z.object({
  registryId: z.string().uuid("ID de registre invalide"),
  note: z
    .string()
    .max(500, "La note ne doit pas dépasser 500 caractères")
    .optional(),
});

export type RestoreDeletedAccountInput = z.infer<
  typeof restoreDeletedAccountSchema
>;

// ─── Consultation du registre (Admin) ───

export const listDeletedAccountsSchema = z.object({
  search: z.string().max(100).optional().default(""),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(5).max(100).optional().default(25),
  sortBy: z
    .enum(["createdAt", "userEmail", "deletedBy"])
    .optional()
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

export type ListDeletedAccountsInput = z.infer<
  typeof listDeletedAccountsSchema
>;
