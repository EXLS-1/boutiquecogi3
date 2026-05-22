// Devise d'affichage possible
export type DisplayCurrency = "USD" | "CDF";
// Devise de paiement possible (peut être identique)
export type PaymentCurrency = "USD" | "CDF";

// Taux USD → CDF (à récupérer idéalement via une API externe)
export const USD_TO_CDF_RATE = Number(process.env.USD_TO_CDF_RATE || 2750);

/**
 * Convertit un montant en centimes USD vers la devise cible.
 * - Si la cible est USD, on retourne le montant en centimes (entier).
 * - Si la cible est CDF, on retourne le montant en CDF (float, unités, car pas de centimes).
 */
export function convertFromUSDCents(
  amountInCents: number,
  targetCurrency: DisplayCurrency | PaymentCurrency
): number {
  const usd = amountInCents / 100;
  if (targetCurrency === "USD") return amountInCents;
  return usd * USD_TO_CDF_RATE; // float en CDF
}