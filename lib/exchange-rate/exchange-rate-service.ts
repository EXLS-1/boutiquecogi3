"use server";

// Alias de compatibilité pour résoudre les erreurs d'import.
// Le projet possède déjà une implémentation sous lib/currency.

export { getFastUSDToCDFRate, forceRefreshExchangeRate } from "@/lib/currency/exchange-rate-service";

