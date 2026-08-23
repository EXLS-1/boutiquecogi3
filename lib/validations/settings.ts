// lib/validations/settings.ts
import { z } from 'zod';
import { SETTINGS_KEYS } from '@/lib/constants/settings';

export const generalSettingsSchema = z.object({
  [SETTINGS_KEYS.STORE_NAME]: z
    .string()
    .min(2, 'Le nom de la boutique doit contenir au moins 2 caractères')
    .max(50, 'Le nom ne peut pas dépasser 50 caractères'),
  [SETTINGS_KEYS.SUPPORT_EMAIL]: z
    .string()
    .email('Veuillez fournir une adresse email valide'),
  [SETTINGS_KEYS.CURRENCY]: z
    .string()
    .length(3, 'Le code devise doit faire 3 caractères'),
});

export type GeneralSettingsValues = z.infer<typeof generalSettingsSchema>;
