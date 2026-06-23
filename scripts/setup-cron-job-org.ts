// scripts/setup-cron-job-org.ts
// =============================================================================
// Script de configuration automatique du job CRON sur cron-job.org.
// À exécuter une fois lors du déploiement ou de la mise à jour.
//
// Usage :
//   npx tsx scripts/setup-cron-job-org.ts [--frequency=4h|hourly|daily|weekdays|15min]
//
// Prérequis :
//   - CRON_JOB_API_KEY dans .env
//   - CRON_SECRET dans .env
//   - APP_URL dans .env (ex: https://boutiquecogi3.com)
// =============================================================================

import {
  listJobs,
  createJob,
  updateJob,
  hourly,
  dailyAt,
  everyNMinutes,
  everyNHours,
  weekdaysAt,
  RequestMethod,
  type CronJobCreateInput,
} from "@/lib/services/cron-job-org-service";

// ─── Configuration ────────────────────────────────────────────────────────────

const APP_URL =
  process.env.APP_URL ?? process.env.VERCEL_URL ?? "http://localhost:3000";
const CRON_SECRET = process.env.CRON_SECRET;
const CRON_JOB_TITLE = "Boutique-COGI-Exchange-Rate-Sync";

// Parse argument --frequency
const args = process.argv.slice(2);
const frequencyArg = args.find((a) => a.startsWith("--frequency="));
const frequency = (frequencyArg?.split("=")[1] ?? "4h").toLowerCase();

// URL de la route CRON avec token en query param
const CRON_ENDPOINT = `${APP_URL}/api/cron/exchange-rate?token=${CRON_SECRET}`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function logInfo(message: string): void {
  console.log(`[SETUP_CRON] ${message}`);
}

function logError(message: string): void {
  console.error(`[SETUP_CRON_ERROR] ${message}`);
}

function logSuccess(message: string): void {
  console.log(`✅ [SETUP_CRON] ${message}`);
}

function getSchedule(frequency: string) {
  switch (frequency) {
    case "15min":
      logInfo(
        "Fréquence : toutes les 15 minutes (développement/test uniquement)",
      );
      return everyNMinutes(15);
    case "4h":
      logInfo("Fréquence : toutes les 4 heures");
      return everyNHours(4);
    case "daily":
      logInfo("Fréquence : quotidienne à 06:00");
      return dailyAt(6, 0);
    case "weekdays":
      logInfo("Fréquence : jours de semaine à 06:00");
      return weekdaysAt(6, 0);
    case "hourly":
    default:
      logInfo("Fréquence : toutes les 4 heures (défaut)");
      return everyNHours(4);
  }
}

// ─── Script principal ─────────────────────────────────────────────────────────

async function setupCronJob(): Promise<void> {
  logInfo("═══════════════════════════════════════════════════════════");
  logInfo("  Configuration cron-job.org — Boutique COGI");
  logInfo("═══════════════════════════════════════════════════════════");
  logInfo(`APP_URL    : ${APP_URL}`);
  logInfo(`Fréquence  : ${frequency}`);

  if (!CRON_SECRET) {
    logError("CRON_SECRET non défini dans les variables d'environnement.");
    process.exit(1);
  }

  if (CRON_SECRET.length < 32) {
    logError(
      "CRON_SECRET doit faire au moins 32 caractères pour sécuriser l'endpoint CRON.",
    );
    process.exit(1);
  }

  if (!process.env.CRON_JOB_API_KEY) {
    logError("CRON_JOB_API_KEY non défini dans les variables d'environnement.");
    process.exit(1);
  }

  try {
    // 1. Lister les jobs existants
    logInfo("Récupération des jobs existants...");
    const { jobs, someFailed } = await listJobs();
    logInfo(
      `${jobs.length} job(s) trouvé(s).${someFailed ? " (certains en échec de lecture)" : ""}`,
    );

    // 2. Chercher un job existant avec le même titre
    const existingJob = jobs.find((j) => j.title === CRON_JOB_TITLE);

    const schedule = getSchedule(frequency);

    const jobConfig: CronJobCreateInput = {
      title: CRON_JOB_TITLE,
      url: CRON_ENDPOINT,
      enabled: true,
      saveResponses: true,
      requestMethod: RequestMethod.GET,
      requestTimeout: 30,
      redirectSuccess: false,
      folderId: 0,
      schedule,
      auth: {
        enable: false,
        user: "",
        password: "",
      },
      notification: {
        onFailure: true,
        onFailureCount: 3,
        onSuccess: false,
        onDisable: true,
        onSslCertExpiry: true,
        onSslCertExpirySeconds: 604_800,
      },
      extendedData: {
        headers: {
          "User-Agent": "Cron-Job.org/1.0 (Boutique-COGI)",
          "X-Cron-Source": "cron-job.org",
          Accept: "application/json",
        },
      },
    };

    if (existingJob) {
      logInfo(`Job existant trouvé (ID: ${existingJob.jobId}). Mise à jour...`);
      await updateJob(existingJob.jobId, jobConfig);
      logSuccess(`Job mis à jour avec succès (ID: ${existingJob.jobId}).`);
      logInfo(
        `Prochaine exécution : ${existingJob.nextExecution ? new Date(existingJob.nextExecution * 1000).toISOString() : "N/A"}`,
      );
    } else {
      logInfo("Aucun job existant trouvé. Création d'un nouveau job...");
      const { jobId } = await createJob(jobConfig);
      logSuccess(`Job créé avec succès (ID: ${jobId}).`);
    }

    logInfo("Configuration terminée avec succès.");
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

setupCronJob();
