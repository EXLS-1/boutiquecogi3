// lib/format-currency.ts
export type CurrencyCode = 'CDF' | 'USD';

export function formatCurrency(amount: number, currency: CurrencyCode): string {
  // Locale imposée sur 'fr-CD' pour garantir un formatage francophone cohérent (espaces insécables)
  return new Intl.NumberFormat('fr-CD', {
    style: 'currency',
    currency: currency,
    // Le CDF n'utilise généralement pas de centimes dans l'affichage courant
    minimumFractionDigits: currency === 'CDF' ? 0 : 2,
    maximumFractionDigits: currency === 'CDF' ? 0 : 2,
  }).format(amount);
}