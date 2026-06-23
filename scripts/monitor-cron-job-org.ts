// scripts/monitor-cron-job-org.ts
// =============================================================================
// Script de monitoring du job CRON sur cron-job.org.
// Affiche l'historique d'exécution et les statistiques de performance.
//
// Usage :
//   npx tsx scripts/monitor-cron-job-org.ts [jobId]
// =============================================================================

import {
  listJobs,
  getJobHistory,
  getHistoryItemDetails,
  JobStatus,
  type CronHistoryItem,
} from "@/lib/services/cron-job-org-service";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function logInfo(message: string): void {
  console.log(`[MONITOR] ${message}`);
}

function logError(message: string): void {
  console.error(`[MONITOR_ERROR] ${message}`);
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString("fr-FR", {
    timeZone: "Africa/Kinshasa",
    dateStyle: "short",
    timeStyle: "medium",
  });
}

function statusEmoji(status: number): string {
  switch (status) {
    case JobStatus.OK:
      return "✅";
    case JobStatus.FAILED_TIMEOUT:
      return "⏱️";
    case JobStatus.FAILED_DNS:
    case JobStatus.FAILED_CONNECT:
    case JobStatus.FAILED_HTTP:
    case JobStatus.FAILED_INVALID_URL:
      return "❌";
    default:
      return "⚠️";
  }
}

function statusLabel(status: number): string {
  const labels: Record<number, string> = {
    [JobStatus.UNKNOWN]: "Inconnu",
    [JobStatus.OK]: "Succès",
    [JobStatus.FAILED_DNS]: "Erreur DNS",
    [JobStatus.FAILED_CONNECT]: "Connexion échouée",
    [JobStatus.FAILED_HTTP]: "Erreur HTTP",
    [JobStatus.FAILED_TIMEOUT]: "Timeout",
    [JobStatus.FAILED_TOO_MUCH_DATA]: "Données trop volumineuses",
    [JobStatus.FAILED_INVALID_URL]: "URL invalide",
    [JobStatus.FAILED_INTERNAL]: "Erreur interne",
    [JobStatus.FAILED_UNKNOWN]: "Erreur inconnue",
  };
  return labels[status] ?? `Statut ${status}`;
}

// ─── Script principal ─────────────────────────────────────────────────────────

async function monitorCronJob(jobId?: number): Promise<void> {
  logInfo("═══════════════════════════════════════════════════════════");
  logInfo("  Monitoring cron-job.org — Boutique COGI");
  logInfo("═══════════════════════════════════════════════════════════");

  try {
    // Si pas de jobId fourni, chercher par titre
    if (!jobId) {
      const { jobs } = await listJobs();
      const targetJob = jobs.find((j) =>
        j.title.includes("Boutique-COGI-Exchange-Rate"),
      );
      if (!targetJob) {
        logError(
          "Aucun job trouvé avec le titre 'Boutique-COGI-Exchange-Rate'.",
        );
        logInfo(
          `Jobs disponibles : ${jobs.map((j) => j.title).join(", ") || "(aucun)"}`,
        );
        process.exit(1);
      }
      jobId = targetJob.jobId;
      logInfo(`Job trouvé : ${targetJob.title} (ID: ${jobId})`);
      logInfo(`État        : ${targetJob.enabled ? "✅ Actif" : "❌ Inactif"}`);
      logInfo(`URL         : ${targetJob.url}`);
      logInfo(
        `Dernière exécution : ${targetJob.lastExecution ? formatDate(targetJob.lastExecution) : "Jamais"}`,
      );
      logInfo(
        `Prochaine exécution : ${targetJob.nextExecution ? formatDate(targetJob.nextExecution) : "N/A"}`,
      );
      logInfo(`Dernier statut HTTP : ${targetJob.lastStatus}`);
    }

    // Récupérer l'historique
    const { history, predictions } = await getJobHistory(jobId);

    console.log("\n📊 Historique des 10 dernières exécutions :");
    console.log("─".repeat(100));

    for (const item of history.slice(0, 10)) {
      const emoji = statusEmoji(item.status);
      console.log(
        `${emoji} ${formatDate(item.date)} | HTTP ${item.httpStatus} | ` +
          `Durée: ${formatDuration(item.duration)} | Jitter: ${item.jitter}ms | ${statusLabel(item.status)}`,
      );

      // Afficher les stats de performance
      if (item.stats) {
        const {
          nameLookup,
          connect,
          appConnect,
          preTransfer,
          startTransfer,
          total,
        } = item.stats;
        console.log(
          `   └─ DNS: ${formatDuration(nameLookup / 1000)} | ` +
            `Connect: ${formatDuration(connect / 1000)} | ` +
            `SSL: ${appConnect ? formatDuration(appConnect / 1000) : "N/A"} | ` +
            `TTFB: ${formatDuration(startTransfer / 1000)} | ` +
            `Total: ${formatDuration(total / 1000)}`,
        );
      }
    }

    console.log("\n🔮 Prochaines exécutions prévues :");
    predictions.forEach((ts, i) => {
      console.log(`   ${i + 1}. ${formatDate(ts)}`);
    });

    // Statistiques
    const successCount = history.filter(
      (h) => h.status === JobStatus.OK,
    ).length;
    const totalCount = history.length;
    const successRate =
      totalCount > 0 ? ((successCount / totalCount) * 100).toFixed(1) : "0";
    const timeoutCount = history.filter(
      (h) => h.status === JobStatus.FAILED_TIMEOUT,
    ).length;
    const errorCount = totalCount - successCount - timeoutCount;

    console.log(`\n📈 Statistiques globales :`);
    console.log(
      `   Taux de succès : ${successRate}% (${successCount}/${totalCount})`,
    );
    console.log(`   Timeouts       : ${timeoutCount}`);
    console.log(`   Autres erreurs : ${errorCount}`);

    // Durée moyenne
    const avgDuration =
      history.length > 0
        ? history.reduce((sum, h) => sum + h.duration, 0) / history.length
        : 0;
    console.log(`   Durée moyenne  : ${formatDuration(avgDuration)}`);
  } catch (error) {
    if (error instanceof Error) {
      logError(error.message);
    } else {
      logError(String(error));
    }
    process.exit(1);
  }
}

// ─── Exécution ────────────────────────────────────────────────────────────────

const jobIdArg = process.argv[2] ? parseInt(process.argv[2], 10) : undefined;
if (jobIdArg !== undefined && Number.isNaN(jobIdArg)) {
  logError("L'argument jobId doit être un nombre valide.");
  process.exit(1);
}
monitorCronJob(jobIdArg);

/**
 * Historique d'exécution avec statistiques de performance (DNS, connect, SSL, TTFB)
 * Taux de succès, timeouts, durée moyenne
 */
