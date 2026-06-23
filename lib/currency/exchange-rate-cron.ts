// lib/exchange-rate/exchange-rate-cron.ts

import { forceRefreshExchangeRate } from "./exchange-rate-service";

/**
 * Exécute la tâche de mise à jour forcée du taux de change.
 * Ne lit pas le cache mémoire pour garantir une synchronisation réelle avec la BCC.
 */
export async function updateExchangeRateCronJob(): Promise<boolean> {
  console.log("[CRON] Démarrage du rafraîchissement forcé du taux USD/CDF...");

  const rate = await forceRefreshExchangeRate();

  if (rate) {
    console.log(
      `[CRON] Succès. Nouvelle valeur persistée : ${rate.toFixed()} CDF`,
    );
    return true;
  } else {
    console.warn(
      "[CRON] Échec du rafraîchissement. La BCC est injoignable ou le parsing a échoué. Les fallbacks restent actifs.",
    );
    return false;
  }
}
