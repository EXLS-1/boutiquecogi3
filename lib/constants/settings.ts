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
