// lib/exchange-rate/exchange-rate-constants.ts
// Centralise les constantes utilisées par les services de taux de change.

export const BCC_URL = "https://www.bcc.cd/taux-de-change";

// Timeout pour les requêtes HTTP vers la BCC (en ms)
export const REQUEST_TIMEOUT_MS = 10000;

// Clé utilisée pour stocker le taux de change en cache dans la base de données
export const CACHE_KEY = "LATEST_USD_CDF_RATE";

// Durée de vie du cache en mémoire (ex: 1 heure en millisecondes)
export const MEMORY_CACHE_TTL_MS = 60 * 60 * 1000;

//
export const DEFAULT_USD_TO_CDF_RATE = 2400;
