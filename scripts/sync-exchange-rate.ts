// scripts/sync-exchange-rate.ts
// Script autonome pour forcer la synchronisation du taux de change.
// Utilisation : npx tsx scripts/sync-exchange-rate.ts

import { updateExchangeRateCronJob } from "../lib/exchange-rate/exchange-rate-cron";

async function run() {
  console.log("[SYNC_SCRIPT] Lancement de la synchronisation manuelle...");

  try {
    await updateExchangeRateCronJob();
    console.log("[SYNC_SCRIPT] Synchronisation terminée avec succès.");
    process.exit(0);
  } catch (error) {
    console.error("[SYNC_SCRIPT] Échec de la synchronisation :", error);
    process.exit(1);
  }
}

// Exécution du script
run();
