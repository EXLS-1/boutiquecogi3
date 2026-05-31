// lib/currency/rawbank-provider.ts
// Ce fichier est un exemple de provider pour RAWBANK. Il doit être implémenté pour fournir des taux de change réels.

export interface ExchangeRateResult {
  rate: number;
  source: string;
  fetchedAt: Date;
}

export async function fetchRawbankRate(): Promise<ExchangeRateResult> {
  /**
   * Implémentation réelle :
   *
   * - API RAWBANK si disponible
   * - Flux XML
   * - Endpoint JSON
   * - Scraping validé juridiquement
   */

  throw new Error("RAWBANK provider not implemented");
}
