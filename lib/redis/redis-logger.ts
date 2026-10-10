import type { LoggerClass } from "@/lib/logger";
import type { RedisLogger } from "@/lib/redis/redis";

/**
 * Adapte le contrat Redis (message, métadonnées) au logger applicatif.
 * Le Logger central prend `(message, context?: LogContext)` : `source`
 * reste un champ de contexte typé ; les bindings Redis vont dans `meta`.
 * Imports de types uniquement : aucune connexion Redis ni singleton créé ici.
 */
export function createRedisLogger(
  logger: Pick<LoggerClass, "debug" | "info" | "warn" | "error">,
  bindings: Record<string, unknown> = {},
): RedisLogger {
  const defaults = { ...bindings };
  const toContext = (
    meta?: Record<string, unknown>
    // LogContext est structurel : source + meta suffisent.
  ): Parameters<LoggerClass["debug"]>[1] => ({
    source: "redis",
    meta: { ...defaults, ...meta },
  });

  // RedisLogger.error transporte l'erreur éventuelle dans `meta.error` ;
  // le Logger central l'accepte en `unknown` (2ᵉ argument).
  type AppErrorArg = Parameters<LoggerClass["error"]>[1];

  return {
    debug: (message, meta) => logger.debug(message, toContext(meta)),
    info: (message, meta) => logger.info(message, toContext(meta)),
    warn: (message, meta) => logger.warn(message, toContext(meta)),
    error: (message, meta) => {
      const cause = (meta?.error ?? meta) as AppErrorArg;
      logger.error(message, cause, toContext(meta));
    },
    child: (additionalBindings) =>
      createRedisLogger(logger, {
        ...defaults,
        ...additionalBindings,
      }),
  };
}
