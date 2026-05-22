// /lib/constants.ts
// Constantes et utilitaires liés aux devises et à CinetPay

export const DEFAULT_DISPLAY_CURRENCY = "USD"; // devise par défaut d'affichage
export const SUPPORTED_CURRENCIES = ["USD", "CDF"] as const;
export type DisplayCurrency = (typeof SUPPORTED_CURRENCIES)[number];

// CinetPay env vars (do not expose côté client)
export const CINETPAY_SITE_ID = process.env.CINETPAY_SITE_ID || "";
export const CINETPAY_API_KEY = process.env.CINETPAY_API_KEY || "";
export const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "";

/**
 * Récupère le taux de change officiel USD -> targetCurrency.
 * Utilise exchangerate.host (gratuit) comme source par défaut.
 * Côté production, remplace par un fournisseur fiable et cache côté serveur.
 *
 * Retourne un objet { rate, base, target, fetchedAt }
 */
export async function fetchExchangeRateUSDTo(target: string): Promise<{
  rate: number;
  base: string;
  target: string;
  fetchedAt: string;
}> {
  const base = "USD";
  const targetUpper = target.toUpperCase();

  if (base === targetUpper) {
    return { rate: 1, base, target: targetUpper, fetchedAt: new Date().toISOString() };
  }

  // Exemple: https://api.exchangerate.host/convert?from=USD&to=CDF
  const url = `https://api.exchangerate.host/convert?from=${base}&to=${targetUpper}&amount=1`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error("Impossible de récupérer le taux de change");
  }
  const json = await res.json();
  const rate = Number(json?.info?.rate ?? json?.result ?? 0);
  if (!rate || Number.isNaN(rate)) {
    throw new Error("Taux de change invalide");
  }

  return { rate, base, target: targetUpper, fetchedAt: new Date().toISOString() };
}
