// lib/logger.ts
/**
 * =============================================================================
 * @/lib/logger
 * =============================================================================
 * Logger centralisé pour Boutiquecogi3
 * 
 * Architecture : Singleton pattern avec niveaux de log, rotation,
 * formatage structuré (JSON/CLI), et intégration async-safe.
 * 
 * Niveaux : TRACE < DEBUG < INFO < WARN < ERROR < FATAL
 * 
 * Conçu pour : Next.js 16.2.9, Edge Runtime compatible, SSR/CSR safe
 * =============================================================================
 */

'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES & INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Niveaux de sévérité du logger
 */
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * Contexte enrichi pour chaque log entry
 */
export interface LogContext {
  /** Identifiant de requête (correlation ID) */
  requestId?: string;
  /** ID utilisateur si authentifié */
  userId?: string;
  /** Route ou module source */
  source?: string;
  /** Durée d'exécution en ms */
  durationMs?: number;
  /** Métadonnées additionnelles */
  meta?: Record<string, unknown>;
}

/**
 * Entrée de log structurée (format JSON)
 */
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string | number;
  };
  /** Version du schéma de log */
  schemaVersion: string;
  /** Environnement d'exécution */
  env: string;
  /** Hostname ou identifiant d'instance */
  hostname: string;
}

/**
 * Configuration du logger
 */
export interface LoggerConfig {
  /** Niveau minimum de log (défaut: 'info') */
  minLevel: LogLevel;
  /** Format de sortie : 'json' | 'pretty' | 'simple' */
  format: 'json' | 'pretty' | 'simple';
  /** Activer les logs dans la console */
  console: boolean;
  /** Activer l'envoi vers un endpoint externe */
  remote?: {
    endpoint: string;
    apiKey: string;
    batchSize: number;
    flushIntervalMs: number;
  };
  /** Préfixe personnalisé pour les messages */
  prefix?: string;
  /** Inclure le stack trace pour les erreurs */
  includeStackTrace: boolean;
  /** Sanitiser les données sensibles */
  sanitize: boolean;
  /** Champs sensibles à masquer */
  sensitiveFields: string[];
}

/**
 * Handler de transport pour les logs
 */
export type LogTransport = (entry: LogEntry) => void | Promise<void>;

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

/** Ordre de sévérité des niveaux (index = priorité) */
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  trace: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
  fatal: 5,
};

/** Couleurs ANSI pour le formatage pretty */
const LEVEL_COLORS: Record<LogLevel, string> = {
  trace: '\x1b[90m',   // Gris
  debug: '\x1b[36m',   // Cyan
  info: '\x1b[32m',    // Vert
  warn: '\x1b[33m',    // Jaune
  error: '\x1b[31m',   // Rouge
  fatal: '\x1b[35m',   // Magenta
};

const RESET_COLOR = '\x1b[0m';

/** Schéma version pour compatibilité future */
const SCHEMA_VERSION = '1.0.0';

/** Champs sensibles par défaut à masquer */
const DEFAULT_SENSITIVE_FIELDS = [
  'password', 'token', 'secret', 'apiKey', 'api_key',
  'authorization', 'cookie', 'session', 'credit_card',
  'cvv', 'ssn', 'privateKey', 'accessToken', 'refreshToken',
];

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION PAR DÉFAUT
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: LoggerConfig = {
  minLevel: (process.env.LOG_LEVEL as LogLevel) || 'info',
  format: (process.env.LOG_FORMAT as LoggerConfig['format']) || 'pretty',
  console: process.env.LOG_CONSOLE !== 'false',
  includeStackTrace: process.env.LOG_STACK_TRACE !== 'false',
  sanitize: process.env.LOG_SANITIZE !== 'false',
  sensitiveFields: DEFAULT_SENSITIVE_FIELDS,
  prefix: process.env.LOG_PREFIX || 'Boutiquecogi3',
};

// ─────────────────────────────────────────────────────────────────────────────
// UTILITAIRES INTERNES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Détecte l'environnement d'exécution
 */
function detectEnvironment(): string {
  if (typeof process !== 'undefined' && process.env) {
    return process.env.NODE_ENV || 'development';
  }
  if (typeof window !== 'undefined') {
    return 'browser';
  }
  return 'unknown';
}

/**
 * Obtient l'identifiant d'hôte/instance
 */
function getHostname(): string {
  if (typeof process !== 'undefined' && process.env) {
    return process.env.HOSTNAME || process.env.VERCEL_URL || 'localhost';
  }
  if (typeof window !== 'undefined') {
    return window.location?.hostname || 'browser';
  }
  return 'edge';
}

/**
 * Génère un timestamp ISO 8601 avec précision milliseconde
 */
function getTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Génère un correlation ID unique
 */
function generateCorrelationId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}`;
}

/**
 * Vérifie si un niveau doit être loggué selon la config
 */
function shouldLog(level: LogLevel, minLevel: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[minLevel];
}

/**
 * Sanitise récursivement les objets pour masquer les champs sensibles
 */
function sanitizeObject(
  obj: unknown,
  sensitiveFields: string[]
): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    // Masquer les tokens JWT-like
    if (/^[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*$/.test(obj)) {
      return '***JWT_TOKEN***';
    }
    return obj;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, sensitiveFields));
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = sensitiveFields.some(
      field => lowerKey.includes(field.toLowerCase())
    );

    if (isSensitive && typeof value === 'string') {
      sanitized[key] = '***REDACTED***';
    } else {
      sanitized[key] = sanitizeObject(value, sensitiveFields);
    }
  }

  return sanitized;
}

/**
 * Extrait les informations structurées d'une erreur
 */
function extractErrorInfo(error: unknown): LogEntry['error'] {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: (error as Error & { code?: string | number }).code,
    };
  }

  if (typeof error === 'string') {
    return {
      name: 'StringError',
      message: error,
    };
  }

  if (error && typeof error === 'object') {
    const obj = error as Record<string, unknown>;
    return {
      name: String(obj.name || 'UnknownError'),
      message: String(obj.message || 'Unknown error'),
      code: obj.code as string | number | undefined,
    };
  }

  return {
    name: 'UnknownError',
    message: String(error),
  };
}

/**
 * Formate une entrée de log en pretty print
 */
function formatPretty(entry: LogEntry): string {
  const color = LEVEL_COLORS[entry.level];
  const levelStr = entry.level.toUpperCase().padEnd(5);
  const prefix = entry.context?.source ? `[${entry.context.source}]` : '';

  let output = `${color}[${levelStr}]${RESET_COLOR} ${entry.timestamp} ${prefix} ${entry.message}`;

  if (entry.context?.requestId) {
    output += `\n  ↳ reqId: ${entry.context.requestId}`;
  }
  if (entry.context?.userId) {
    output += `\n  ↳ user: ${entry.context.userId}`;
  }
  if (entry.context?.durationMs !== undefined) {
    output += `\n  ↳ duration: ${entry.context.durationMs}ms`;
  }
  if (entry.error) {
    output += `\n  ↳ error: ${entry.error.name}: ${entry.error.message}`;
    if (entry.error.stack) {
      output += `\n  ↳ stack: ${entry.error.stack.split('\n').slice(0, 3).join('\n     ')}`;
    }
  }
  if (entry.context?.meta && Object.keys(entry.context.meta).length > 0) {
    output += `\n  ↳ meta: ${JSON.stringify(entry.context.meta, null, 2).replace(/\n/g, '\n     ')}`;
  }

  return output;
}

/**
 * Formate une entrée de log en format simple
 */
function formatSimple(entry: LogEntry): string {
  const parts = [
    `[${entry.level.toUpperCase()}]`,
    entry.timestamp,
    entry.message,
  ];
  if (entry.context?.source) parts.push(`(${entry.context.source})`);
  return parts.join(' ');
}

/**
 * Formate une entrée de log selon le format configuré
 */
function formatEntry(entry: LogEntry, format: LoggerConfig['format']): string {
  switch (format) {
    case 'json':
      return JSON.stringify(entry);
    case 'pretty':
      return formatPretty(entry);
    case 'simple':
      return formatSimple(entry);
    default:
      return JSON.stringify(entry);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CLASSE PRINCIPALE : Logger
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Logger singleton avec support multi-transport, batching,
 * sanitisation automatique, et contexte enrichi.
 * 
 * Thread-safe pour Node.js, safe pour Edge Runtime.
 */
export class Logger {
  private static instance: Logger | null = null;
  private config: LoggerConfig;
  private transports: LogTransport[] = [];
  private buffer: LogEntry[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private correlationId: string | null = null;

  /**
   * Constructeur privé (pattern Singleton)
   */
  private constructor(config?: Partial<LoggerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.setupRemoteFlush();
  }

  /**
   * Obtient l'instance singleton du logger
   */
  public static getInstance(config?: Partial<LoggerConfig>): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(config);
    } else if (config) {
      // Fusionner la nouvelle config avec l'existante
      Logger.instance.config = { ...Logger.instance.config, ...config };
    }
    return Logger.instance;
  }

  /**
   * Réinitialise l'instance (utile pour les tests)
   */
  public static resetInstance(): void {
    if (Logger.instance) {
      Logger.instance.destroy();
      Logger.instance = null;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // CONFIGURATION
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Met à jour la configuration du logger
   */
  public configure(config: Partial<LoggerConfig>): this {
    this.config = { ...this.config, ...config };
    this.setupRemoteFlush();
    return this;
  }

  /**
   * Retourne la configuration actuelle
   */
  public getConfig(): Readonly<LoggerConfig> {
    return Object.freeze({ ...this.config });
  }

  /**
   * Définit le niveau minimum de log dynamiquement
   */
  public setLevel(level: LogLevel): this {
    this.config.minLevel = level;
    return this;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TRANSPORTS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Ajoute un transport personnalisé
   */
  public addTransport(transport: LogTransport): this {
    this.transports.push(transport);
    return this;
  }

  /**
   * Supprime tous les transports
   */
  public clearTransports(): this {
    this.transports = [];
    return this;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // CORRELATION ID
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Définit le correlation ID pour le contexte courant
   */
  public setCorrelationId(id: string): this {
    this.correlationId = id;
    return this;
  }

  /**
   * Génère et définit un nouveau correlation ID
   */
  public generateCorrelationId(): string {
    const id = generateCorrelationId();
    this.correlationId = id;
    return id;
  }

  /**
   * Récupère le correlation ID courant
   */
  public getCorrelationId(): string | null {
    return this.correlationId;
  }

  /**
   * Efface le correlation ID courant
   */
  public clearCorrelationId(): this {
    this.correlationId = null;
    return this;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // MÉTHODES DE LOG PRINCIPALES
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Log de niveau TRACE (débogage très détaillé)
   */
  public trace(message: string, context?: LogContext): void {
    this.log('trace', message, undefined, context);
  }

  /**
   * Log de niveau DEBUG (débogage)
   */
  public debug(message: string, context?: LogContext): void {
    this.log('debug', message, undefined, context);
  }

  /**
   * Log de niveau INFO (information générale)
   */
  public info(message: string, context?: LogContext): void {
    this.log('info', message, undefined, context);
  }

  /**
   * Log de niveau WARN (avertissement)
   */
  public warn(message: string, context?: LogContext): void {
    this.log('warn', message, undefined, context);
  }

  /**
   * Log de niveau ERROR (erreur)
   */
  public error(message: string, error?: unknown, context?: LogContext): void {
    this.log('error', message, error, context);
  }

  /**
   * Log de niveau FATAL (erreur critique)
   */
  public fatal(message: string, error?: unknown, context?: LogContext): void {
    this.log('fatal', message, error, context);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // MÉTHODES UTILITAIRES AVANCÉES
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Mesure le temps d'exécution d'une fonction et log le résultat
   */
  public async timed<T>(
    label: string,
    fn: () => T | Promise<T>,
    context?: Omit<LogContext, 'durationMs'>
  ): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = Math.round(performance.now() - start);
      this.info(`${label} completed`, { ...context, durationMs: duration });
      return result;
    } catch (error) {
      const duration = Math.round(performance.now() - start);
      this.error(`${label} failed`, error, { ...context, durationMs: duration });
      throw error;
    }
  }

  /**
   * Crée un logger enfant avec un contexte pré-rempli
   */
  public child(defaultContext: LogContext): ChildLogger {
    return new ChildLogger(this, defaultContext);
  }

  /**
   * Log avec vérification de condition
   */
  public conditional(
    condition: boolean,
    level: LogLevel,
    message: string,
    error?: unknown,
    context?: LogContext
  ): void {
    if (condition) {
      this.log(level, message, error, context);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // MÉTHODE CENTRALE DE LOG
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Méthode centrale de logging — thread-safe, atomic
   */
  private log(
    level: LogLevel,
    message: string,
    error?: unknown,
    context?: LogContext
  ): void {
    // Vérifier le niveau minimum
    if (!shouldLog(level, this.config.minLevel)) {
      return;
    }

    // Construire l'entrée de log
    const entry = this.buildEntry(level, message, error, context);

    // Sanitiser si activé
    const finalEntry = this.config.sanitize
      ? this.sanitizeEntry(entry)
      : entry;

    // Écrire dans la console si activé
    if (this.config.console) {
      this.writeToConsole(finalEntry);
    }

    // Envoyer aux transports
    this.dispatchToTransports(finalEntry);

    // Buffer pour envoi distant
    if (this.config.remote) {
      this.buffer.push(finalEntry);
      this.flushIfNeeded();
    }
  }

  /**
   * Construit une entrée de log structurée
   */
  private buildEntry(
    level: LogLevel,
    message: string,
    error?: unknown,
    context?: LogContext
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: getTimestamp(),
      level,
      message: this.config.prefix ? `[${this.config.prefix}] ${message}` : message,
      schemaVersion: SCHEMA_VERSION,
      env: detectEnvironment(),
      hostname: getHostname(),
    };

    // Fusionner le correlation ID dans le contexte
    if (this.correlationId || context) {
      entry.context = {
        ...context,
        requestId: context?.requestId || this.correlationId || undefined,
      };
      // Nettoyer les undefined
      if (!entry.context.requestId) delete entry.context.requestId;
      if (Object.keys(entry.context).length === 0) {
        delete entry.context;
      }
    }

    // Ajouter les infos d'erreur
    if (error !== undefined) {
      entry.error = extractErrorInfo(error);
      if (!this.config.includeStackTrace) {
        delete entry.error.stack;
      }
    }

    return entry;
  }

  /**
   * Sanitise une entrée de log
   */
  private sanitizeEntry(entry: LogEntry): LogEntry {
    const sanitized = { ...entry };

    if (sanitized.context?.meta) {
      sanitized.context = {
        ...sanitized.context,
        meta: sanitizeObject(
          sanitized.context.meta,
          this.config.sensitiveFields
        ) as Record<string, unknown>,
      };
    }

    if (sanitized.error?.message) {
      // Masquer les tokens potentiels dans les messages d'erreur
      const sensitivePattern = new RegExp(
        `(${this.config.sensitiveFields.join('|')})[=:]\s*[^\s&]+`,
        'gi'
      );
      sanitized.error = {
        ...sanitized.error,
        message: sanitized.error.message.replace(sensitivePattern, '$1=***REDACTED***'),
      };
    }

    return sanitized;
  }

  /**
   * Écrit dans la console avec le format approprié
   */
  private writeToConsole(entry: LogEntry): void {
    const formatted = formatEntry(entry, this.config.format);

    switch (entry.level) {
      case 'trace':
      case 'debug':
        // eslint-disable-next-line no-console
        console.debug(formatted);
        break;
      case 'info':
        // eslint-disable-next-line no-console
        console.info(formatted);
        break;
      case 'warn':
        // eslint-disable-next-line no-console
        console.warn(formatted);
        break;
      case 'error':
      case 'fatal':
        // eslint-disable-next-line no-console
        console.error(formatted);
        break;
    }
  }

  /**
   * Dispatch vers tous les transports enregistrés
   */
  private dispatchToTransports(entry: LogEntry): void {
    for (const transport of this.transports) {
      try {
        const result = transport(entry);
        if (result instanceof Promise) {
          result.catch(err => {
            // eslint-disable-next-line no-console
            console.error('Transport error:', err);
          });
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Transport sync error:', err);
      }
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // REMOTE LOGGING (BATCHING)
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Configure le timer de flush pour le logging distant
   */
  private setupRemoteFlush(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    if (this.config.remote?.flushIntervalMs) {
      this.flushTimer = setInterval(
        () => this.flushRemote(),
        this.config.remote.flushIntervalMs
      );
    }
  }

  /**
   * Flush le buffer si la taille du batch est atteinte
   */
  private flushIfNeeded(): void {
    if (
      this.config.remote &&
      this.buffer.length >= this.config.remote.batchSize
    ) {
      this.flushRemote();
    }
  }

  /**
   * Envoie les logs bufferisés vers le endpoint distant
   */
  private async flushRemote(): Promise<void> {
    if (this.buffer.length === 0 || !this.config.remote) return;

    const batch = this.buffer.splice(0, this.config.remote.batchSize);

    try {
      const response = await fetch(this.config.remote.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.config.remote.apiKey,
        },
        body: JSON.stringify({ logs: batch }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (err) {
      // Remettre les logs dans le buffer en cas d'échec
      this.buffer.unshift(...batch);
      // Limiter la taille du buffer pour éviter la fuite mémoire
      if (this.buffer.length > this.config.remote.batchSize * 10) {
        this.buffer = this.buffer.slice(-this.config.remote.batchSize * 10);
      }
      this.error('Failed to flush logs to remote', err);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // NETTOYAGE
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Force le flush du buffer et nettoie les ressources
   */
  public async destroy(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    await this.flushRemote();
    this.transports = [];
    this.buffer = [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CHILD LOGGER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Logger enfant qui hérite du parent avec un contexte par défaut.
 * Utile pour scoper les logs par module/feature.
 */
export class ChildLogger {
  constructor(
    private parent: Logger,
    private defaultContext: LogContext
  ) {}

  public trace(message: string, context?: LogContext): void {
    this.parent.trace(message, this.mergeContext(context));
  }

  public debug(message: string, context?: LogContext): void {
    this.parent.debug(message, this.mergeContext(context));
  }

  public info(message: string, context?: LogContext): void {
    this.parent.info(message, this.mergeContext(context));
  }

  public warn(message: string, context?: LogContext): void {
    this.parent.warn(message, this.mergeContext(context));
  }

  public error(message: string, error?: unknown, context?: LogContext): void {
    this.parent.error(message, error, this.mergeContext(context));
  }

  public fatal(message: string, error?: unknown, context?: LogContext): void {
    this.parent.fatal(message, error, this.mergeContext(context));
  }

  public async timed<T>(
    label: string,
    fn: () => T | Promise<T>,
    context?: Omit<LogContext, 'durationMs'>
  ): Promise<T> {
    return this.parent.timed(label, fn, this.mergeContext(context));
  }

  public child(additionalContext: LogContext): ChildLogger {
    return new ChildLogger(this.parent, this.mergeContext(additionalContext));
  }

  private mergeContext(context?: LogContext): LogContext {
    return {
      ...this.defaultContext,
      ...context,
      meta: {
        ...this.defaultContext.meta,
        ...context?.meta,
      },
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// INSTANCE EXPORTÉE (SINGLETON)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Instance singleton du logger — utiliser ceci dans 99% des cas
 * 
 * @example
 * ```ts
 * import { logger } from '@/lib/logger';
 * 
 * logger.info('Server started', { source: 'server' });
 * logger.error('DB connection failed', err, { source: 'database' });
 * 
 * // Logger enfant pour un module
 * const dbLogger = logger.child({ source: 'database' });
 * dbLogger.info('Query executed');
 * 
 * // Mesure de performance
 * const result = await logger.timed('fetchUser', () => fetchUser(id));
 * ```
 */
export const logger = Logger.getInstance();

// ─────────────────────────────────────────────────────────────────────────────
// TRANSPORTS PRÉDÉFINIS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Transport vers un fichier (Node.js uniquement)
 * 
 * @example
 * ```ts
 * import { logger, createFileTransport } from '@/lib/logger';
 * logger.addTransport(createFileTransport('/var/log/app.log'));
 * ```
 */
export function createFileTransport(filepath: string): LogTransport {
  // Lazy import pour compatibilité Edge Runtime
  let fs: typeof import('fs') | null = null;

  return (entry: LogEntry) => {
    try {
      if (!fs) {
        fs = require('fs');
      }
      const line = JSON.stringify(entry) + '\n';
      fs.appendFileSync(filepath, line, { encoding: 'utf-8' });
    } catch {
      // Silently fail in browser/edge environments
    }
  };
}

/**
 * Transport vers la mémoire (utile pour les tests)
 * 
 * @example
 * ```ts
 * import { logger, createMemoryTransport } from '@/lib/logger';
 * const memory = createMemoryTransport();
 * logger.addTransport(memory.transport);
 * // ... exécuter du code ...
 * console.log(memory.getLogs());
 * ```
 */
export function createMemoryTransport(options?: { maxSize?: number }) {
  const logs: LogEntry[] = [];
  const maxSize = options?.maxSize ?? 1000;

  const transport: LogTransport = (entry: LogEntry) => {
    logs.push(entry);
    if (logs.length > maxSize) {
      logs.shift();
    }
  };

  return {
    transport,
    getLogs: () => [...logs],
    clear: () => logs.length = 0,
    getLast: (n: number = 1) => logs.slice(-n),
  };
}

/**
 * Transport vers un callback personnalisé
 * 
 * @example
 * ```ts
 * import { logger, createCallbackTransport } from '@/lib/logger';
 * logger.addTransport(createCallbackTransport((entry) => {
 *   sendToSlack(entry);
 * }));
 * ```
 */
export function createCallbackTransport(
  callback: (entry: LogEntry) => void | Promise<void>
): LogTransport {
  return callback;
}

// ─────────────────────────────────────────────────────────────────────────────
// MIDDLEWARE / HELPERS POUR NEXT.JS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Middleware de logging pour les API routes Next.js
 * 
 * @example
 * ```ts
 * // app/api/users/route.ts
 * import { withLogging } from '@/lib/logger';
 * 
 * export const GET = withLogging(async (req) => {
 *   // ...
 * }, { source: 'api/users' });
 * ```
 */
export function withLogging<T extends (...args: any[]) => any>(
  handler: T,
  context?: LogContext
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    const req = args[0] as Request;
    const correlationId = req.headers.get('x-correlation-id') || generateCorrelationId();
    logger.setCorrelationId(correlationId);

    const start = performance.now();
    try {
      const result = await handler(...args);
      const duration = Math.round(performance.now() - start);
      logger.info(`API ${req.method} ${req.url}`, {
        ...context,
        requestId: correlationId,
        durationMs: duration,
      });
      return result;
    } catch (error) {
      const duration = Math.round(performance.now() - start);
      logger.error(`API ${req.method} ${req.url} failed`, error, {
        ...context,
        requestId: correlationId,
        durationMs: duration,
      });
      throw error;
    } finally {
      logger.clearCorrelationId();
    }
  }) as T;
}

/**
 * Décorateur de fonction pour le logging automatique
 * 
 * @example
 * ```ts
 * import { logMethod } from '@/lib/logger';
 * 
 * class UserService {
 *   @logMethod({ source: 'UserService' })
 *   async getUser(id: string) {
 *     // ...
 *   }
 * }
 * ```
 */
export function logMethod(context?: LogContext) {
  return function <T extends (...args: any[]) => any>(
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]): Promise<unknown> {
      const methodContext: LogContext = {
        ...context,
        source: context?.source || target?.constructor?.name || 'Unknown',
        meta: {
          ...context?.meta,
          method: propertyKey,
          args: args.map(arg =>
            typeof arg === 'object' ? '[Object]' : String(arg).slice(0, 100)
          ),
        },
      };

      return logger.timed(`${propertyKey}()`, () => originalMethod.apply(this, args), methodContext);
    };

    return descriptor;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS NOMMÉS SUPPLÉMENTAIRES
// ─────────────────────────────────────────────────────────────────────────────

export { Logger as LoggerClass };
export type { LogTransport, LoggerConfig, LogEntry, LogContext, LogLevel };

// Export par défaut
export default logger;