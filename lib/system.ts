// lib/system.ts
import { z } from 'zod';

export const LOG_LEVELS = { ERROR: 'ERROR', WARN: 'WARN', INFO: 'INFO', DEBUG: 'DEBUG' } as const;

export const systemConfigSchema = z.object({
  isMaintenanceMode: z.boolean(),
  logLevel: z.enum(Object.values(LOG_LEVELS) as [string, ...string[]]),
  cacheTtl: z.number().int().min(0).max(86400), // Max 24h en secondes
});
export type SystemConfigValues = z.infer<typeof systemConfigSchema>;

export const SYSTEM_DEFAULTS: SystemConfigValues = {
  isMaintenanceMode: false, logLevel: LOG_LEVELS.INFO, cacheTtl: 3600,
};
