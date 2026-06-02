// lib/exchange-rate/exchange-rate-cron.ts
// Ce script est conçu pour être exécuté périodiquement (ex: via un job CRON)
// afin de rafraîchir le taux de change USD/CDF depuis la BCC.

import { getUSDToCDFRate } from "./exchange-rate-service";

/**
 * Exécute la tâche de mise à jour du taux de change.
 * Cette fonction devrait être appelée par un job CRON ou une route API dédiée.
 */
export async function updateExchangeRateCronJob(): Promise<void> {
  console.log(
    "[CRON] Démarrage de la mise à jour du taux de change USD/CDF...",
  );
  try {
    const rate = await getUSDToCDFRate();
    console.log(
      `[CRON] Taux de change USD/CDF mis à jour : ${rate.toFixed()} CDF`,
    );
  } catch (error) {
    console.error(
      "[CRON] Erreur lors de la mise à jour du taux de change :",
      error,
    );
    // En cas d'erreur, le service aura déjà utilisé un taux de repli, donc le système reste fonctionnel.
  }
}
