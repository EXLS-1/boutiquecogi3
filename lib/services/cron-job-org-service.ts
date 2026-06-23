// lib/services/cron-job-org-service.ts
// =============================================================================
// Service d'intégration avec l'API REST officielle de cron-job.org.
// Documentation : https://docs.cron-job.org/rest-api.html
//
// Rate Limits :
//   - Liste jobs : 5 req/s
//   - Création job : 1 req/s, 5 req/min
//   - Mise à jour : 5 req/s
//   - Historique : 5 req/s
//   - Quota journalier : 100 req/jour (5 000 pour sustaining members)
// =============================================================================

import { z } from "zod";

// ─── Configuration ──────────────────────────────────────────────────────────

const CRON_JOB_API_BASE = "https://api.cron-job.org";
const CRON_JOB_API_KEY = process.env.CRON_JOB_API_KEY;

// ─── Enums officiels cron-job.org ─────────────────────────────────────────────

/** Statut d'exécution d'un job */
export enum JobStatus {
  UNKNOWN = 0,
  OK = 1,
  FAILED_DNS = 2,
  FAILED_CONNECT = 3,
  FAILED_HTTP = 4,
  FAILED_TIMEOUT = 5,
  FAILED_TOO_MUCH_DATA = 6,
  FAILED_INVALID_URL = 7,
  FAILED_INTERNAL = 8,
  FAILED_UNKNOWN = 9,
}

/** Type de job */
export enum JobType {
  DEFAULT = 0,
  MONITORING = 1,
}

/** Méthode HTTP */
export enum RequestMethod {
  GET = 0,
  POST = 1,
  OPTIONS = 2,
  HEAD = 3,
  PUT = 4,
  DELETE = 5,
  TRACE = 6,
  CONNECT = 7,
  PATCH = 8,
}

// ─── Schémas Zod (validation runtime) ───────────────────────────────────────

const ScheduleSchema = z.object({
  timezone: z.string().default("UTC"),
  expiresAt: z.number().default(0),
  hours: z.array(z.number()).default([-1]),
  mdays: z.array(z.number()).default([-1]),
  minutes: z.array(z.number()).default([0]),
  months: z.array(z.number()).default([-1]),
  wdays: z.array(z.number()).default([-1]),
});

const AuthSchema = z.object({
  enable: z.boolean().default(false),
  user: z.string().default(""),
  password: z.string().default(""),
});

const NotificationSchema = z.object({
  onFailure: z.boolean().default(false),
  onFailureCount: z.number().min(1).default(1),
  onSuccess: z.boolean().default(false),
  onDisable: z.boolean().default(false),
  onSslCertExpiry: z.boolean().default(false),
  onSslCertExpirySeconds: z.number().min(0).default(604_800),
});

const ExtendedDataSchema = z.object({
  headers: z.record(z.string()).default({}),
  body: z.string().default(""),
});

/** Job (liste simplifiée) */
export const JobSchema = z.object({
  jobId: z.number(),
  enabled: z.boolean(),
  title: z.string(),
  saveResponses: z.boolean(),
  url: z.string(),
  lastStatus: z.number(),
  lastDuration: z.number(),
  lastExecution: z.number(),
  sslCertExpiry: z.number(),
  nextExecution: z.number().nullable(),
  type: z.number(),
  requestTimeout: z.number(),
  redirectSuccess: z.boolean(),
  folderId: z.number(),
  schedule: ScheduleSchema,
  requestMethod: z.number(),
});

/** Job détaillé (création / mise à jour / détails) */
export const DetailedJobSchema = JobSchema.extend({
  auth: AuthSchema,
  notification: NotificationSchema,
  extendedData: ExtendedDataSchema,
});

/** Entrée d'historique */
export const HistoryItemSchema = z.object({
  jobLogId: z.number(),
  jobId: z.number(),
  identifier: z.string(),
  date: z.number(),
  datePlanned: z.number(),
  jitter: z.number(),
  url: z.string(),
  duration: z.number(),
  status: z.number(),
  statusText: z.string(),
  httpStatus: z.number(),
  headers: z.string().nullable(),
  body: z.string().nullable(),
  sslCertExpiry: z.number(),
  stats: z.object({
    nameLookup: z.number(),
    connect: z.number(),
    appConnect: z.number(),
    preTransfer: z.number(),
    startTransfer: z.number(),
    total: z.number(),
  }),
});

/** Dossier */
export const FolderSchema = z.object({
  folderId: z.number(),
  title: z.string(),
});

// ─── Types dérivés ────────────────────────────────────────────────────────────

export type CronSchedule = z.infer<typeof ScheduleSchema>;
export type CronJobAuth = z.infer<typeof AuthSchema>;
export type CronJobNotification = z.infer<typeof NotificationSchema>;
export type CronJobExtendedData = z.infer<typeof ExtendedDataSchema>;
export type CronJob = z.infer<typeof JobSchema>;
export type CronDetailedJob = z.infer<typeof DetailedJobSchema>;
export type CronHistoryItem = z.infer<typeof HistoryItemSchema>;
export type CronFolder = z.infer<typeof FolderSchema>;

/** Input pour création de job (tous les champs optionnels sauf url) */
export type CronJobCreateInput = Partial<Omit<CronDetailedJob, "jobId">> & {
  url: string;
};

// ─── Erreurs personnalisées ───────────────────────────────────────────────────

export class CronJobOrgError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly responseBody?: string,
  ) {
    super(message);
    this.name = "CronJobOrgError";
  }
}

// ─── Client HTTP interne ──────────────────────────────────────────────────────

async function apiRequest<T>(
  method: string,
  endpoint: string,
  body?: unknown,
): Promise<T> {
  if (!CRON_JOB_API_KEY) {
    throw new CronJobOrgError(
      "CRON_JOB_API_KEY non configuré. Ajoutez-la dans vos variables d'environnement.",
      500,
    );
  }

  const url = `${CRON_JOB_API_BASE}${endpoint}`;
  const options: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${CRON_JOB_API_KEY}`,
      "User-Agent": "Boutique-COGI-CronSync/1.0",
    },
  };

  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const responseText = await response.text();

  if (!response.ok) {
    throw new CronJobOrgError(
      `Erreur API cron-job.org [${response.status}]: ${response.statusText}`,
      response.status,
      responseText,
    );
  }

  try {
    return JSON.parse(responseText) as T;
  } catch {
    // Réponse vide (ex: DELETE, PATCH) → retourner {} casté
    return {} as T;
  }
}

// ─── Fonctions publiques ────────────────────────────────────────────────────

/**
 * Liste tous les jobs de l'account.
 * Rate limit : 5 req/s
 */
export async function listJobs(): Promise<{
  jobs: CronJob[];
  someFailed: boolean;
}> {
  return apiRequest("GET", "/jobs");
}

/**
 * Récupère les détails d'un job.
 * Rate limit : 5 req/s
 */
export async function getJobDetails(
  jobId: number,
): Promise<{ jobDetails: CronDetailedJob }> {
  return apiRequest("GET", `/jobs/${jobId}`);
}

/**
 * Crée un nouveau job.
 * Rate limit : 1 req/s, 5 req/min
 */
export async function createJob(
  job: CronJobCreateInput,
): Promise<{ jobId: number }> {
  const validated = DetailedJobSchema.partial()
    .extend({ url: z.string().url() })
    .parse(job);
  return apiRequest("PUT", "/jobs", { job: validated });
}

/**
 * Met à jour un job existant (PATCH partiel).
 * Rate limit : 5 req/s
 */
export async function updateJob(
  jobId: number,
  partialJob: Partial<CronJobCreateInput>,
): Promise<void> {
  await apiRequest<Record<string, never>>("PATCH", `/jobs/${jobId}`, {
    job: partialJob,
  });
}

/**
 * Supprime un job.
 * Rate limit : 5 req/s
 */
export async function deleteJob(jobId: number): Promise<void> {
  await apiRequest<Record<string, never>>("DELETE", `/jobs/${jobId}`);
}

/**
 * Récupère l'historique d'exécution d'un job.
 * Rate limit : 5 req/s
 */
export async function getJobHistory(
  jobId: number,
): Promise<{ history: CronHistoryItem[]; predictions: number[] }> {
  return apiRequest("GET", `/jobs/${jobId}/history`);
}

/**
 * Récupère les détails complets d'une exécution (headers + body).
 * Rate limit : 5 req/s
 */
export async function getHistoryItemDetails(
  jobId: number,
  identifier: string,
): Promise<{ jobHistoryDetails: CronHistoryItem }> {
  return apiRequest("GET", `/jobs/${jobId}/history/${identifier}`);
}

// ─── Fonctions dossiers ─────────────────────────────────────────────────────

/**
 * Liste tous les dossiers.
 * Rate limit : 5 req/s
 */
export async function listFolders(): Promise<{ folders: CronFolder[] }> {
  return apiRequest("GET", "/folders");
}

/**
 * Crée un dossier.
 * Rate limit : 1 req/s, 10 req/min
 */
export async function createFolder(
  title: string,
): Promise<{ folderId: number }> {
  return apiRequest("PUT", "/folders", { folder: { title } });
}

/**
 * Met à jour un dossier.
 * Rate limit : 1 req/s
 */
export async function updateFolder(
  folderId: number,
  title: string,
): Promise<void> {
  await apiRequest<Record<string, never>>("PATCH", `/folders/${folderId}`, {
    folder: { title },
  });
}

/**
 * Supprime un dossier.
 * Rate limit : 1 req/s
 */
export async function deleteFolder(folderId: number): Promise<void> {
  await apiRequest<Record<string, never>>("DELETE", `/folders/${folderId}`);
}

// ─── Helpers de schedule (builders) ───────────────────────────────────────────

/**
 * Génère un schedule pour une exécution toutes les N minutes.
 * @param n - Intervalle en minutes (1-59)
 */
export function everyNMinutes(n: number): CronSchedule {
  if (n < 1 || n > 59)
    throw new Error("Intervalle doit être entre 1 et 59 minutes");
  const minutes: number[] = [];
  for (let i = 0; i < 60; i += n) minutes.push(i);
  return {
    timezone: "Africa/Kinshasa",
    expiresAt: 0,
    hours: [-1],
    mdays: [-1],
    minutes,
    months: [-1],
    wdays: [-1],
  };
}

/**
 * Génère un schedule pour une exécution quotidienne à une heure fixe.
 * @param hour - Heure (0-23)
 * @param minute - Minute (0-59, défaut 0)
 */
export function dailyAt(hour: number, minute: number = 0): CronSchedule {
  if (hour < 0 || hour > 23) throw new Error("Heure doit être entre 0 et 23");
  if (minute < 0 || minute > 59)
    throw new Error("Minute doit être entre 0 et 59");
  return {
    timezone: "Africa/Kinshasa",
    expiresAt: 0,
    hours: [hour],
    mdays: [-1],
    minutes: [minute],
    months: [-1],
    wdays: [-1],
  };
}

/**
 * Génère un schedule pour une exécution toutes les heures.
 */
export function hourly(): CronSchedule {
  return {
    timezone: "Africa/Kinshasa",
    expiresAt: 0,
    hours: [-1],
    mdays: [-1],
    minutes: [0],
    months: [-1],
    wdays: [-1],
  };
}

/**
 * Génère un schedule pour une exécution chaque jour de semaine (Lun-Ven) à une heure fixe.
 */
export function weekdaysAt(hour: number, minute: number = 0): CronSchedule {
  if (hour < 0 || hour > 23) throw new Error("Heure doit être entre 0 et 23");
  if (minute < 0 || minute > 59)
    throw new Error("Minute doit être entre 0 et 59");
  return {
    timezone: "Africa/Kinshasa",
    expiresAt: 0,
    hours: [hour],
    mdays: [-1],
    minutes: [minute],
    months: [-1],
    wdays: [1, 2, 3, 4, 5], // Lundi = 1 ... Vendredi = 5
  };
}

/**
 * Génère un schedule pour une exécution toutes les N heures.
 * @param n - Intervalle en heures (1-23)
 */
export function everyNHours(n: number): CronSchedule {
  if (!Number.isInteger(n) || n < 1 || n > 23) {
    throw new Error("Intervalle doit être un entier entre 1 et 23 heures");
  }
  const hours: number[] = [];
  for (let i = 0; i < 24; i += n) hours.push(i);
  return {
    timezone: "Africa/Kinshasa",
    expiresAt: 0,
    hours,
    mdays: [-1],
    minutes: [0],
    months: [-1],
    wdays: [-1],
  };
}

/** 
 * Table
Export	            Ligne	Type
listJobs	          ~L215	async function
createJob	          ~L227	async function
updateJob	          ~L235	async function
RequestMethod	      ~L35	enum
CronJobCreateInput	~L125	type
 */
