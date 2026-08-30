// lib/constants/settings.ts
export const SETTINGS_KEYS = {
  STORE_NAME: 'storeName',
  SUPPORT_EMAIL: 'supportEmail',
  CURRENCY: 'currency',
} as const;

export const SETTINGS_DEFAULTS = {
  [SETTINGS_KEYS.STORE_NAME]: 'Boutique Cogi',
  [SETTINGS_KEYS.SUPPORT_EMAIL]: 'support@boutiquecogi.com',
  [SETTINGS_KEYS.CURRENCY]: 'XAF',
} as const;

export const CURRENCY_OPTIONS = [
  { value: 'XAF', label: 'Franc CFA (XAF)' },
  { value: 'EUR', label: 'Euro (EUR)' },
  { value: 'USD', label: 'Dollar (USD)' },
] as const;

// ─── Clés `SystemConfiguration` (store clé/valeur partagé page ↔ actions) ───

/** Configuration système (mode maintenance, log, cache) — valeur JSON. */
export const SYSTEM_CONFIG_KEY = 'system';

/** Configuration d'une passerelle de paiement — valeur JSON. */
export const paymentConfigKey = (provider: string): string => `payment.${provider}`;

