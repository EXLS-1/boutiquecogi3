// lib/exchange-rate/index.ts
// =============================================================================
// Point d'entrée unique pour le module de taux de change.
// Exporte tous les membres publics des sous-modules.
// =============================================================================

export * from "./exchange-rate-service";
export * from "./exchange-rate-types";
export * from "./exchange-rate-validator";
export * from "./exchange-rate-cache";

// Re-exports depuis le module currency pour commodité
export {
  BCC_URL,
  REQUEST_TIMEOUT_MS,
  CACHE_KEY,
  MEMORY_CACHE_TTL_MS,
  DEFAULT_USD_TO_CDF_RATE,
  FALLBACK_EXCHANGE_RATE,
  RATE_BOUNDS,
  MAX_VARIATION_THRESHOLD,
  BCC_USER_AGENT,
} from "../currency/exchange-rate-constants";

export {
  usdToCdf,
  cdfToUsd,
  bulkUsdToCdf,
  bulkCdfToUsd,
} from "../currency/exchange-rate-convert";

export {
  CURRENCIES,
  SUPPORTED_CURRENCY_CODES,
  getCurrencyMetadata,
  formatPrice,
} from "../currency/exchange-rate-currency";

export { updateExchangeRateCronJob } from "../currency/exchange-rate-cron";
