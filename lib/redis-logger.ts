import type { LoggerClass } from "@/lib/logger";
import type { RedisLogger } from "@/lib/redis";

/**
 * Adapte le contrat Redis (message, métadonnées) au logger applicatif.
 * `source` reste un champ de contexte typé ; les bindings Redis vont dans `meta`.
 * Imports de types uniquement : aucune connexion Redis ni singleton créé ici.
 */
export function createRedisLogger(
  logger: Pick<LoggerClass, "debug" | "info" | "warn" | "error">,
  bindings: Record<string, unknown> = {},
): RedisLogger {
  const defaults = { ...bindings };
  const context = (meta?: Record<string, unknown>) => ({
    source: "redis",
    meta: { ...defaults, ...meta },
  });

  return {
    debug: (message, meta) => logger.debug(message, context(meta)),
    info: (message, meta) => logger.info(message, context(meta)),
    warn: (message, meta) => logger.warn(message, context(meta)),
    error: (message, meta) => {
      // Le second argument du logger applicatif est l'erreur, pas le contexte.
      logger.error(message, meta?.error, context(meta));
    },
    child: (additionalBindings) => createRedisLogger(logger, {
      ...defaults,
      ...additionalBindings,
    }),
  };
}
