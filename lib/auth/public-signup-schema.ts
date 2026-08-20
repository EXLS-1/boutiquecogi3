import { z } from "zod";

export const PUBLIC_SIGNUP_FORBIDDEN_FIELDS = ["role", "level"] as const;

export const publicSignupSchema = z.object({
  name: z
    .string()
    .min(2, "Le nom doit contenir au moins 2 caractères")
    .max(100, "Le nom ne doit pas dépasser 100 caractères"),
  email: z
    .string()
    .email("Adresse email invalide")
    .max(255, "L'email ne doit pas dépasser 255 caractères"),
  password: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères")
    .max(128, "Le mot de passe ne doit pas dépasser 128 caractères"),
  role: z.never().optional(),
  level: z.never().optional(),
});

export type PublicSignupInput = z.infer<typeof publicSignupSchema>;

export function hasPublicSignupPrivilegeFields(body: unknown): boolean {
  if (body === null || typeof body !== "object") return false;

  return PUBLIC_SIGNUP_FORBIDDEN_FIELDS.some((field) =>
    Object.prototype.hasOwnProperty.call(body, field)
  );
}