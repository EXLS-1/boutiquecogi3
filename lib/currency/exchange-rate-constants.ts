// lib/currency/exchange-rate-constants.ts
// =============================================================================
// Constantes centralisées pour le module de taux de change USD/CDF.
// Toutes les valeurs sont immutables et définies au niveau du module.
// =============================================================================

/** URL officielle de la Banque Centrale du Congo (BCC) */
export const BCC_URL = "https://www.bcc.cd/taux-de-change" as const;

/** Timeout HTTP pour les requêtes vers la BCC (ms) */
export const REQUEST_TIMEOUT_MS = 10_000 as const;

/** Clé de cache en base de données pour le dernier taux valide */
export const CACHE_KEY = "LATEST_USD_CDF_RATE" as const;

/** Durée de vie du cache mémoire L1 (1 heure en ms) */
export const MEMORY_CACHE_TTL_MS = 3_600_000 as const;

/** Taux de fallback par défaut lorsque toutes les sources sont indisponibles */
export const DEFAULT_USD_TO_CDF_RATE = 2_400 as const;

/** Taux de fallback d'urgence depuis les variables d'environnement */
export const FALLBACK_EXCHANGE_RATE = Number(
  process.env.FALLBACK_EXCHANGE_RATE ?? "2400",
);

/** Bornes de validation du taux USD/CDF */
export const RATE_BOUNDS = {
  MIN: 2_100 as const,
  MAX: 3_500 as const,
} as const;

/** Seuil maximal de variation autorisée entre deux taux successifs (10%) */
export const MAX_VARIATION_THRESHOLD = 0.1 as const;

/** User-Agent personnalisé pour les requêtes BCC */
export const BCC_USER_AGENT = "Mozilla/5.0 Boutique-COGI-Sync/1.2" as const;
